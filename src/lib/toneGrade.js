// lib/toneGrade.js
// A WebGL colour-grade that reproduces the "Zoom-white / clean bright" look — the
// part a CSS filter() CANNOT do. Analysis of a raw webcam frame vs. the same person on
// Zoom shows Zoom is NOT just "brighter": it (1) LIFTS shadows (fills dark skin/wall
// areas), (2) raises GAMMA so midtones brighten more than highlights, (3) slightly
// DESATURATES, (4) uses a NEUTRAL/slightly-cool white balance (no warm cast), and
// (5) rolls highlights toward white without harsh clipping.
//
// CSS brightness() is a flat MULTIPLY — it darkens shadows relatively and blows
// highlights; that's why numeric brightness/whiten tweaks never matched Zoom. A real
// tone curve (lift + gamma + roll-off) is required, so we do it per-pixel in a shader.
//
// The curve, in order (all in 0..1 linear-ish sRGB space, which is fine for a look):
//   1. white balance:  per-channel gain (neutralise/cool the cast)
//   2. lift:           c = lift + c*(1-lift)          → raises the black point (shadows)
//   3. gamma:          c = pow(c, 1/gamma)            → brightens mids (gamma>1)
//   4. gain:           c = c * gain                    → overall exposure
//   5. soft highlight roll-off: keeps near-whites clean instead of hard-clipping
//   6. desaturate:     mix toward luma by (1-sat)

const VERT = `
attribute vec2 aPos;
varying vec2 vUV;
void main() { vUV = (aPos + 1.0) * 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
varying vec2 vUV;
uniform sampler2D uTex;
uniform vec3  uWB;      // per-channel white-balance gain (r,g,b)
uniform float uLift;    // shadow lift 0..~0.15
uniform float uGamma;   // >1 brightens midtones
uniform float uGain;    // overall exposure multiplier
uniform float uSat;     // saturation (1 = unchanged, <1 = desaturate)

void main() {
  vec3 c = texture2D(uTex, vUV).rgb;

  // 1. white balance (neutralise the warm cast)
  c *= uWB;

  // 2. shadow lift — raise the black point so dark skin/wall fills toward light
  c = uLift + c * (1.0 - uLift);

  // 3. gamma — brighten midtones more than highlights (the "clean bright" core)
  c = pow(max(c, 0.0), vec3(1.0 / uGamma));

  // 4. overall gain (exposure)
  c *= uGain;

  // 5. soft highlight roll-off: as values approach/exceed 1, ease them toward 1
  //    instead of hard-clipping (keeps near-whites clean, avoids blown edges).
  c = c / (1.0 + max(c - 0.85, 0.0));   // gentle compression of the top range
  c = clamp(c, 0.0, 1.0);

  // 6. desaturate slightly toward luma (Rec.709)
  float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(luma), c, uSat);

  gl_FragColor = vec4(c, 1.0);
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error('toneGrade shader compile failed: ' + log);
  }
  return sh;
}

// Create a reusable WebGL tone-grader. render(source, w, h, params) → canvas.
// params: { wb:[r,g,b], lift, gamma, gain, sat }. Returns null if WebGL unavailable.
export function createToneGrader() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl', { premultipliedAlpha: false, alpha: false })
          || canvas.getContext('experimental-webgl');
  if (!gl) return null;

  let program;
  try {
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    program = gl.createProgram();
    gl.attachShader(program, vs); gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('toneGrade link failed: ' + gl.getProgramInfoLog(program));
    }
  } catch { return null; }

  gl.useProgram(program);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  const uWB = gl.getUniformLocation(program, 'uWB');
  const uLift = gl.getUniformLocation(program, 'uLift');
  const uGamma = gl.getUniformLocation(program, 'uGamma');
  const uGain = gl.getUniformLocation(program, 'uGain');
  const uSat = gl.getUniformLocation(program, 'uSat');
  const uTex = gl.getUniformLocation(program, 'uTex');

  let destroyed = false;
  return {
    render(source, w, h, p) {
      if (destroyed || !w || !h) return null;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source); }
      catch { return null; }
      gl.uniform1i(uTex, 0);
      gl.uniform3f(uWB, p.wb[0], p.wb[1], p.wb[2]);
      gl.uniform1f(uLift, p.lift);
      gl.uniform1f(uGamma, p.gamma);
      gl.uniform1f(uGain, p.gain);
      gl.uniform1f(uSat, p.sat);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      return canvas;
    },
    destroy() {
      destroyed = true;
      try { gl.deleteProgram(program); gl.deleteBuffer(buf); gl.deleteTexture(tex); } catch { /* */ }
    },
  };
}
