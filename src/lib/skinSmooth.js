// lib/skinSmooth.js
// True "touch up my appearance" — EDGE-PRESERVING skin smoothing, done in WebGL so
// it runs live at 30fps. This is the real Zoom-style effect: flat areas (cheeks,
// forehead) are smoothed while high-contrast edges (eyes, mouth, nostrils, hair,
// glasses) stay SHARP. A plain canvas blur() can't do this — it softens everything,
// which is why the old touch-up read as "blurred face" instead of "smooth skin".
//
// How it works — a BILATERAL FILTER. Each output pixel is the average of its
// neighbours, but each neighbour is weighted by TWO things:
//   • spatial closeness (a normal gaussian — nearer pixels count more), AND
//   • colour similarity  (neighbours with a SIMILAR colour count more; a neighbour
//     across an edge, i.e. very different colour, is almost ignored).
// The colour-similarity term is what preserves edges: at an eye/skin boundary the
// colours differ a lot, so the filter won't blend across it — the edge stays crisp.
// Inside flat skin every neighbour is a similar colour, so it averages freely and
// evens out pores/blotches. That is exactly the difference between "smooth" and "blur".
//
// The shader output is then blended back over the original by `strength` (the
// touchUp slider), and we deliberately DON'T smooth the whole frame at full strength
// so it reads as "even skin", never "plastic".

const VERT = `
attribute vec2 aPos;
varying vec2 vUV;
void main() {
  vUV = (aPos + 1.0) * 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

// Bilateral filter fragment shader. RADIUS is the neighbourhood half-width in pixels.
// sigmaColor controls how "different" a neighbour's colour can be before it stops
// counting — small = only very-similar pixels blend (edges very safe, gentle smooth);
// larger = more aggressive smoothing. sigmaSpace is the spatial falloff.
const FRAG = `
precision highp float;
varying vec2 vUV;
uniform sampler2D uTex;
uniform vec2 uTexel;        // 1.0 / resolution
uniform float uSigmaColor;  // colour similarity tolerance
uniform float uSigmaSpace;  // spatial falloff
uniform float uStrength;    // 0..1 blend of smoothed result over the original

const int RADIUS = 4;       // 9x9 neighbourhood — enough to even skin, still fast

void main() {
  vec3 center = texture2D(uTex, vUV).rgb;
  vec3 sum = vec3(0.0);
  float wsum = 0.0;
  float sc = 2.0 * uSigmaColor * uSigmaColor;
  float ss = 2.0 * uSigmaSpace * uSigmaSpace;
  for (int dx = -RADIUS; dx <= RADIUS; dx++) {
    for (int dy = -RADIUS; dy <= RADIUS; dy++) {
      vec2 off = vec2(float(dx), float(dy));
      vec3 s = texture2D(uTex, vUV + off * uTexel).rgb;
      // spatial weight (gaussian on distance)
      float d2 = dot(off, off);
      float ws = exp(-d2 / ss);
      // colour weight (gaussian on colour difference) — THIS preserves edges
      vec3 dc = s - center;
      float wc = exp(-dot(dc, dc) / sc);
      float w = ws * wc;
      sum += s * w;
      wsum += w;
    }
  }
  vec3 smoothed = sum / max(wsum, 0.0001);
  // Blend smoothed over original by strength. Because the smoothed result already
  // preserves edges, this evens skin without wiping detail.
  gl_FragColor = vec4(mix(center, smoothed, uStrength), 1.0);
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error('skinSmooth shader compile failed: ' + log);
  }
  return sh;
}

// Create a reusable WebGL skin smoother. Returns { render(source, w, h, strength) →
// canvas, destroy() }. `source` is anything drawImage/texImage2D accepts (a <video>,
// <canvas>, or ImageBitmap). Returns its own canvas holding the smoothed frame.
// Returns null if WebGL isn't available (caller falls back to no smoothing).
export function createSkinSmoother() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl', { premultipliedAlpha: false, alpha: false })
          || canvas.getContext('experimental-webgl');
  if (!gl) return null;

  let program;
  try {
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('skinSmooth link failed: ' + gl.getProgramInfoLog(program));
    }
  } catch {
    return null; // shader unsupported — caller falls back
  }

  gl.useProgram(program);

  // Full-screen triangle-pair.
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, -1, -1, 1,
    -1, 1, 1, -1, 1, 1,
  ]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  const uTexel = gl.getUniformLocation(program, 'uTexel');
  const uSigmaColor = gl.getUniformLocation(program, 'uSigmaColor');
  const uSigmaSpace = gl.getUniformLocation(program, 'uSigmaSpace');
  const uStrength = gl.getUniformLocation(program, 'uStrength');
  const uTex = gl.getUniformLocation(program, 'uTex');

  let destroyed = false;

  return {
    // Smooth `source` into this smoother's canvas and return the canvas.
    render(source, w, h, strength) {
      if (destroyed || !w || !h) return null;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      // Flip Y so the WebGL output matches the source orientation.
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
      } catch {
        return null; // source not ready this frame
      }
      gl.uniform1i(uTex, 0);
      gl.uniform2f(uTexel, 1 / w, 1 / h);
      // Tie the filter's aggressiveness to the slider. Colour tolerance grows a
      // little with strength (more smoothing) but stays low enough to keep edges.
      gl.uniform1f(uSigmaColor, 0.06 + strength * 0.10);
      gl.uniform1f(uSigmaSpace, 3.0);
      gl.uniform1f(uStrength, Math.min(1, Math.max(0, strength)));
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      return canvas;
    },
    destroy() {
      destroyed = true;
      try { gl.deleteProgram(program); gl.deleteBuffer(buf); gl.deleteTexture(tex); } catch { /* */ }
    },
  };
}
