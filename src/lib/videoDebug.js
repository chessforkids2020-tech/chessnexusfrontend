// Live-classroom video debug: reads WebRTC stats for what this browser SENDS
// (own camera) and RECEIVES (everyone else), and grades each into issues.
// Frame rates are computed from frame COUNTERS between samples, never from
// framesPerSecond — Firefox reports 0 there for perfectly healthy cameras.

export function createSampler() {
  const prev = new Map();
  return {
    delta(key, value, ts) {
      if (typeof value !== 'number' || typeof ts !== 'number') return null;
      const p = prev.get(key);
      prev.set(key, { value, ts });
      // A counter that went backwards means the track was resubscribed.
      if (!p || ts <= p.ts || value < p.value) return null;
      return { dv: value - p.value, dt: ts - p.ts };
    },
  };
}

const kbpsOf = (d) => (d ? Math.round((d.dv * 8) / d.dt) : null);
const fpsOf = (d) => (d ? Math.round((d.dv * 1000) / d.dt) : null);

async function readStats(track) {
  try { return (await track?.getRTCStatsReport?.()) || null; } catch { return null; }
}

function codecOf(stats, codecId) {
  try {
    const c = codecId && stats.get(codecId);
    return c?.mimeType ? c.mimeType.replace(/^(video|audio)\//, '') : null;
  } catch { return null; }
}

export async function collectLocal(room, sampler) {
  const lp = room?.localParticipant;
  const pub = lp?.getTrackPublication?.('camera');
  const track = pub?.videoTrack || pub?.track;
  const raw = track?.mediaStreamTrack;
  let st = {};
  try { st = raw?.getSettings?.() || {}; } catch { /* */ }
  const out = {
    camEnabled: !!lp?.isCameraEnabled,
    micEnabled: !!lp?.isMicrophoneEnabled,
    published: !!pub,
    muted: pub ? !!pub.isMuted : null,
    readyState: raw?.readyState || null,
    device: raw?.label || '',
    capture: st.width ? `${st.width}x${st.height}@${Math.round(st.frameRate || 0)}` : null,
    layers: [],
    codec: null,
    rttMs: null,
    availOutKbps: null,
  };
  const stats = await readStats(track);
  stats?.forEach((r) => {
    if (r.type === 'outbound-rtp' && r.kind === 'video') {
      out.layers.push({
        rid: r.rid || '-',
        w: r.frameWidth || 0,
        h: r.frameHeight || 0,
        fps: fpsOf(sampler.delta(`of:${r.id}`, r.framesEncoded, r.timestamp)),
        kbps: kbpsOf(sampler.delta(`ob:${r.id}`, r.bytesSent, r.timestamp)),
        limit: r.qualityLimitationReason || 'none',
        active: r.active !== false,
      });
      out.codec = out.codec || codecOf(stats, r.codecId);
    }
    if (r.type === 'candidate-pair' && (r.nominated || r.selected) && r.state === 'succeeded') {
      if (typeof r.currentRoundTripTime === 'number') out.rttMs = Math.round(r.currentRoundTripTime * 1000);
      if (typeof r.availableOutgoingBitrate === 'number') out.availOutKbps = Math.round(r.availableOutgoingBitrate / 1000);
    }
  });
  out.layers.sort((a, b) => b.w - a.w);
  return out;
}

export async function collectRemotes(room, sampler) {
  const list = [];
  const parts = room?.remoteParticipants ? Array.from(room.remoteParticipants.values()) : [];
  for (const p of parts) {
    let cam = null, mic = null;
    p.trackPublications?.forEach((pub) => {
      if (pub.source === 'screen_share' || pub.source === 'screen_share_audio') return;
      if (pub.kind === 'video') cam = pub;
      else if (pub.kind === 'audio') mic = pub;
    });
    const e = {
      id: String(p.identity),
      name: p.name || String(p.identity),
      quality: p.connectionQuality || 'unknown',
      cam: cam ? {
        muted: !!cam.isMuted, subscribed: !!cam.isSubscribed, hasTrack: !!cam.track,
        fps: null, w: 0, h: 0, kbps: null, lossPct: null, freezes: null, codec: null,
      } : null,
      mic: mic ? { muted: !!mic.isMuted, subscribed: !!mic.isSubscribed } : null,
      tile: null,
    };
    if (cam?.track) {
      const stats = await readStats(cam.track);
      const k = e.id;
      stats?.forEach((r) => {
        if (r.type !== 'inbound-rtp' || r.kind !== 'video') return;
        const c = e.cam;
        c.w = r.frameWidth || 0;
        c.h = r.frameHeight || 0;
        c.fps = fpsOf(sampler.delta(`if:${k}`, r.framesDecoded, r.timestamp));
        c.kbps = kbpsOf(sampler.delta(`ib:${k}`, r.bytesReceived, r.timestamp));
        const lost = sampler.delta(`il:${k}`, r.packetsLost, r.timestamp);
        const recv = sampler.delta(`ir:${k}`, r.packetsReceived, r.timestamp);
        if (lost && recv) {
          const tot = lost.dv + recv.dv;
          c.lossPct = tot > 0 ? Math.round((lost.dv * 1000) / tot) / 10 : 0;
        }
        c.freezes = typeof r.freezeCount === 'number' ? r.freezeCount : null;
        c.codec = codecOf(stats, r.codecId);
      });
    }
    try {
      const v = document.querySelector(`video[data-remotetile="${CSS.escape(e.name)}"]`);
      if (v) e.tile = { w: v.videoWidth || 0, black: v.dataset.black === '1' };
    } catch { /* */ }
    list.push(e);
  }
  return list;
}

function shortUA() {
  const ua = navigator.userAgent || '';
  const b = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows'
    : /Mac OS/.test(ua) ? 'Mac' : /CrOS/.test(ua) ? 'ChromeOS' : /Linux/.test(ua) ? 'Linux' : '?';
  const v = (ua.match(/(?:Edg|OPR|Firefox|Chrome|Version)\/(\d+)/) || [])[1] || '';
  return `${b} ${v} / ${os}`;
}

export async function collectStudentReport(room, sampler, { hostIdentity, audioBlocked }) {
  const local = await collectLocal(room, sampler);
  const remotes = await collectRemotes(room, sampler);
  return {
    at: Date.now(),
    room: room?.state || 'none',
    quality: room?.localParticipant?.connectionQuality || 'unknown',
    hidden: document.visibilityState === 'hidden',
    audioBlocked: !!audioBlocked,
    browser: shortUA(),
    local,
    coach: remotes.find(r => r.id === String(hostIdentity)) || null,
    remoteCount: remotes.length,
  };
}

// ── Grading: each returns [{ level: 'bad' | 'warn', msg }] ──

export function evalLocal(local, roomState) {
  const out = [];
  const bad = (msg) => out.push({ level: 'bad', msg });
  const warn = (msg) => out.push({ level: 'warn', msg });
  if (roomState && roomState !== 'connected') bad(`video room ${roomState}`);
  if (!local) return out;
  if (!local.camEnabled) { warn('camera is off'); return out; }
  if (!local.published) bad('camera not published');
  if (local.readyState === 'ended') bad('camera track ended (device lost / taken by another app)');
  if (local.muted) bad('camera published but muted');
  const active = local.layers.filter(l => l.active);
  if (local.layers.length && !active.length) warn('all layers paused — nobody is watching');
  const measured = active.filter(l => l.fps != null);
  if (measured.length && measured.every(l => l.fps === 0)) bad('sending 0 frames');
  else if (measured.length && Math.max(...measured.map(l => l.fps)) < 12) warn('low frame rate');
  if (active.some(l => l.limit === 'cpu')) warn('CPU is limiting video quality');
  if (active.some(l => l.limit === 'bandwidth')) warn('upload bandwidth is limiting video');
  if (local.rttMs != null && local.rttMs > 400) warn(`high latency ${local.rttMs}ms`);
  return out;
}

export function evalRemote(e) {
  const out = [];
  const bad = (msg) => out.push({ level: 'bad', msg });
  const warn = (msg) => out.push({ level: 'warn', msg });
  if (!e) return out;
  if (e.quality === 'lost') bad('connection lost');
  else if (e.quality === 'poor') warn('poor connection');
  const c = e.cam;
  if (!c) { warn('camera not published (off or never started)'); return out; }
  if (c.muted) { warn('camera turned off'); return out; }
  if (!c.subscribed) bad('not subscribed — video not arriving');
  else if (!c.hasTrack) bad('subscribed but no track');
  else if (c.fps === 0) bad('no frames arriving');
  else if (c.fps != null && c.fps < 10) warn(`low frame rate (${c.fps}fps)`);
  if (c.lossPct != null && c.lossPct > 10) bad(`packet loss ${c.lossPct}%`);
  else if (c.lossPct != null && c.lossPct > 3) warn(`packet loss ${c.lossPct}%`);
  if (e.tile && (e.tile.w === 0 || e.tile.black)) bad('tile is black on screen');
  return out;
}

export const REPORT_STALE_MS = 12000;

export function evalStudentReport(rep, now = Date.now()) {
  if (!rep) return [{ level: 'bad', msg: 'no report — student page may be old (ask them to reload)' }];
  const out = [];
  const age = now - rep.at;
  if (age > REPORT_STALE_MS) out.push({ level: 'bad', msg: `no report for ${Math.round(age / 1000)}s — disconnected?` });
  if (rep.room !== 'connected') out.push({ level: 'bad', msg: `their video room is ${rep.room}` });
  if (rep.hidden) out.push({ level: 'warn', msg: 'their tab is hidden/minimized — video paused' });
  if (rep.audioBlocked) out.push({ level: 'warn', msg: 'sound blocked by browser — they must click the page' });
  if (!rep.coach) out.push({ level: 'bad', msg: 'they cannot see you in the room' });
  else evalRemote(rep.coach).forEach(i => out.push({ ...i, msg: `your video: ${i.msg}` }));
  evalLocal(rep.local, null).forEach(i => out.push({ ...i, msg: `their camera: ${i.msg}` }));
  return out;
}

export const worst = (issues) =>
  issues.some(i => i.level === 'bad') ? 'bad' : issues.some(i => i.level === 'warn') ? 'warn' : 'ok';

// ── Diagnosis: WHERE in the pipeline it broke ──
// Pipeline: sender camera → sender upload → server → receiver download →
// receiver decode → receiver screen. Each check walks it in order and names the
// first broken stage. Returns { side, label, why, fix } or null when healthy.

export const SIDE_LABEL = {
  you: 'YOUR SIDE',
  'student-net': "STUDENT'S INTERNET",
  'student-device': "STUDENT'S DEVICE",
  'student-page': "STUDENT'S PAGE",
  'student-cam': "STUDENT'S CAMERA",
  server: 'SERVER',
  ok: 'OK',
};

const verdict = (side, why, fix) => ({ side, label: SIDE_LABEL[side], why, fix });

// Is the coach's own outgoing video healthy? null = yes, else a verdict.
export function diagnoseSender(local, roomState) {
  if (roomState && roomState !== 'connected') {
    return verdict('you', `your video connection is ${roomState}`, 'check your internet; if it stays down, reload the class page');
  }
  if (!local) return verdict('you', 'your video is not connected', 'reload the class page');
  if (!local.camEnabled) return verdict('you', 'your camera is switched off', 'turn your camera on');
  if (local.readyState === 'ended') return verdict('you', 'your camera stopped (another app took it, or it was unplugged)', 'close Zoom/Teams/other camera apps, then turn your camera off and on');
  if (!local.published || local.muted) return verdict('you', 'your camera is not being sent', 'turn your camera off and on');
  const measured = local.layers.filter(l => l.active && l.fps != null);
  if (measured.length && measured.every(l => l.fps === 0)) {
    return verdict('you', 'your camera is producing 0 frames (frozen camera)', 'turn your camera off and on; if it repeats, switch camera or reconnect it');
  }
  return null;
}

// Coach's video → this student. Uses the coach's own state + the student's report.
export function diagnoseStudentView(local, roomState, rep, now = Date.now()) {
  const mine = diagnoseSender(local, roomState);
  if (mine) return mine;
  if (!rep) return verdict('student-page', 'this student is not sending debug reports', 'ask them to reload the page (they may have an old version cached)');
  const age = Math.round((now - rep.at) / 1000);
  if (now - rep.at > REPORT_STALE_MS) return verdict('student-net', `lost contact with this student ${age}s ago`, 'their internet dropped or they closed the tab — ask them to rejoin');
  if (rep.room === 'disconnected' || rep.room === 'none') {
    return verdict('student-net', 'their video connection dropped and did not come back (board/chat still work for them)', 'ask them to reload the page');
  }
  if (rep.room !== 'connected') return verdict('student-net', `their video connection is ${rep.room}`, 'wait a few seconds; if it does not recover, ask them to reload');
  if (!rep.coach) return verdict('server', 'they are connected but the server is not giving them you at all', 'ask them to reload; if many students show this, the video server needs checking');
  const c = rep.coach.cam;
  if (!c) return verdict('server', 'you are sending, but the server does not list your camera for them', 'ask them to reload');
  if (c.muted) return verdict('server', 'the server tells them your camera is off, but it is on', 'turn your camera off and on');
  if (!c.subscribed || !c.hasTrack) {
    if (rep.hidden) return verdict('student-page', 'their tab is minimized/hidden, so their browser stopped requesting your video', 'ask them to bring the class tab back to the front');
    return verdict('student-page', 'their browser stopped requesting your video (subscription dropped)', 'it auto-repairs within ~10s; if not, ask them to reload');
  }
  if (c.fps === 0 && c.kbps === 0) {
    return verdict('student-net', 'your video is not reaching their device — no data arriving', 'their internet/wifi is blocking or too weak — try mobile data or move closer to the router');
  }
  if (c.fps === 0 && c.kbps > 0) {
    return verdict('student-device', `data arrives but their device cannot play it (${c.codec || 'codec'} decode failing)`, 'ask them to use updated Chrome, or another device');
  }
  if (rep.coach.tile && (rep.coach.tile.w === 0 || rep.coach.tile.black) && c.fps > 0) {
    return verdict('student-page', 'video arrives and plays, but their screen shows it black', 'ask them to reload the page');
  }
  if (c.lossPct != null && c.lossPct > 10) return verdict('student-net', `their internet is losing ${c.lossPct}% of your video`, 'weak wifi — ask them to move closer to the router or use mobile data');
  if (rep.quality === 'poor' || rep.quality === 'lost') return verdict('student-net', `their connection quality is ${rep.quality}`, 'weak wifi — move closer to the router or use mobile data');
  if (c.fps != null && c.fps < 10) {
    return c.lossPct != null && c.lossPct > 3
      ? verdict('student-net', `choppy: ${c.fps}fps with ${c.lossPct}% loss`, 'their internet is weak')
      : verdict('student-device', `choppy: only ${c.fps}fps decoded`, 'their device is struggling — close other apps/tabs');
  }
  if (rep.hidden) return verdict('student-page', 'their tab is hidden — they are not looking at the class', 'ask them to bring the class tab to the front');
  return null;
}

// This student's camera → coach's screen. Uses the coach's view + the student's report.
export function diagnoseIncoming(e, rep, roomState) {
  if (roomState && roomState !== 'connected') return verdict('you', `your video connection is ${roomState}`, 'check your internet; reload if it stays down');
  if (!e) {
    if (rep && rep.room !== 'connected') return verdict('student-net', `their video connection is ${rep.room}`, 'ask them to reload the page');
    return verdict('student-net', 'this student is not in the video room', 'ask them to reload the page');
  }
  const c = e.cam;
  const theirs = rep?.local;
  if (!c || c.muted) {
    if (theirs && !theirs.camEnabled) return verdict('student-cam', 'their camera is switched off', 'ask them to turn it on');
    if (theirs?.readyState === 'ended') return verdict('student-cam', 'their camera stopped (another app took it)', 'ask them to close other camera apps and turn the camera off/on');
    return verdict('student-cam', 'their camera is not being sent', 'ask them to turn their camera on');
  }
  if (theirs) {
    const m = theirs.layers.filter(l => l.active && l.fps != null);
    if (m.length && m.every(l => l.fps === 0)) return verdict('student-cam', 'their camera is frozen (sending 0 frames)', 'ask them to turn their camera off and on');
  }
  if (!c.subscribed || !c.hasTrack) return verdict('you', 'your browser stopped requesting their video', 'it auto-repairs within ~10s; if not, reload your page');
  if (c.fps === 0 && c.kbps === 0) {
    return theirs && theirs.layers.some(l => l.active && l.kbps > 0)
      ? verdict('server', 'they are sending, but nothing reaches you', 'if many students show this, it is your download or the server')
      : verdict('student-net', 'their video is not leaving their device (upload stuck)', 'their internet upload is blocked or too weak');
  }
  if (c.fps === 0 && c.kbps > 0) return verdict('you', `data arrives but your device cannot play it (${c.codec || 'codec'})`, 'update Chrome on your machine');
  if (e.tile && (e.tile.w === 0 || e.tile.black) && c.fps > 0) return verdict('you', 'their video arrives but your screen shows it black', 'click 🔄 on their tile, or reload');
  if (c.lossPct != null && c.lossPct > 10) return verdict('student-net', `${c.lossPct}% of their video is lost on the way`, 'their internet is weak');
  if (e.quality === 'poor' || e.quality === 'lost') return verdict('student-net', `their connection quality is ${e.quality}`, 'their internet is weak');
  return null;
}

// One-line answer for the whole class.
export function diagnoseSummary(local, roomState, studentIds, reportsById, now = Date.now()) {
  const mine = diagnoseSender(local, roomState);
  const n = studentIds.length;
  if (mine) return { level: 'bad', text: `${mine.label}: ${mine.why}. Nobody can see you properly. Fix: ${mine.fix}.` };
  if (!n) return { level: 'ok', text: 'Your video is sending fine. No students in the room yet.' };
  const broken = studentIds.map(id => diagnoseStudentView(local, roomState, reportsById[id] || null, now)).filter(Boolean);
  if (!broken.length) return { level: 'ok', text: `Your video is sending fine and all ${n} student${n > 1 ? 's' : ''} are receiving it.` };
  const sides = {};
  broken.forEach(v => { sides[v.label] = (sides[v.label] || 0) + 1; });
  const parts = Object.entries(sides).map(([k, v]) => `${v} × ${k}`).join(', ');
  if (broken.length === n && n >= 3 && broken.every(v => v.side === 'server')) {
    return { level: 'bad', text: `Your camera is fine but NO student receives it — likely the SERVER or your upload. (${parts})` };
  }
  const where = broken.every(v => v.side.startsWith('student')) ? ' on THEIR side' : '';
  return { level: 'bad', text: `Your side is fine. ${broken.length} of ${n} student${n > 1 ? 's have' : ' has'} a problem${where}: ${parts}.` };
}

// ── Plain-text export for the Copy button ──

const fmtLayers = (layers) => layers.length
  ? layers.map(l => `${l.rid}:${l.w}x${l.h} ${l.fps ?? '?'}fps ${l.kbps ?? '?'}kbps${l.active ? '' : ' (paused)'}${l.limit !== 'none' ? ` limit=${l.limit}` : ''}`).join(' | ')
  : 'none';

const fmtCam = (c) => !c ? 'not published'
  : c.muted ? 'off'
  : `sub=${c.subscribed} track=${c.hasTrack} ${c.w}x${c.h} ${c.fps ?? '?'}fps ${c.kbps ?? '?'}kbps loss=${c.lossPct ?? '?'}% freezes=${c.freezes ?? '?'} ${c.codec || ''}`;

const fmtIssues = (issues) => issues.length ? issues.map(i => `    [${i.level === 'bad' ? 'BAD' : 'WARN'}] ${i.msg}`).join('\n') : '    [OK]';
const fmtVerdict = (v) => v ? `    >> ${v.label}: ${v.why}. FIX: ${v.fix}` : '    >> OK';

export function formatDebugText({ at, roomState, local, remotes, reports, coachName }) {
  const L = [];
  const allIds = Array.from(new Set([...remotes.map(r => r.id), ...Object.keys(reports)]));
  const repMap = Object.fromEntries(allIds.map(id => [id, reports[id]?.report || null]));
  L.push(`ChessNexus live class — video debug @ ${new Date(at).toISOString()}`);
  L.push(`Coach: ${coachName || '?'}  |  room: ${roomState}  |  browser: ${shortUA()}`);
  L.push(`DIAGNOSIS: ${diagnoseSummary(local, roomState, allIds, repMap, at).text}`);
  allIds.forEach(id => {
    const v = diagnoseStudentView(local, roomState, repMap[id], at);
    if (v) L.push(`  - ${remotes.find(r => r.id === id)?.name || reports[id]?.name || id}: ${v.label} — ${v.why}. FIX: ${v.fix}`);
  });
  L.push('');
  L.push('== COACH SENDING ==');
  if (local) {
    L.push(`  cam=${local.camEnabled} published=${local.published} muted=${local.muted} track=${local.readyState} mic=${local.micEnabled}`);
    L.push(`  device: ${local.device || '?'}  capture: ${local.capture || '?'}  codec: ${local.codec || '?'}`);
    L.push(`  layers: ${fmtLayers(local.layers)}`);
    L.push(`  rtt: ${local.rttMs ?? '?'}ms  available upload: ${local.availOutKbps ?? '?'}kbps`);
  }
  L.push(fmtIssues(evalLocal(local, roomState)));
  L.push('');
  L.push('== COACH RECEIVING (each student\'s camera on my screen) ==');
  if (!remotes.length) L.push('  (no students in the video room)');
  remotes.forEach(e => {
    L.push(`  ${e.name} [${e.id}] quality=${e.quality}`);
    L.push(`    cam: ${fmtCam(e.cam)}  tile: ${e.tile ? `${e.tile.w}px${e.tile.black ? ' BLACK' : ''}` : 'not on screen'}`);
    L.push(`    mic: ${e.mic ? (e.mic.muted ? 'muted' : `sub=${e.mic.subscribed}`) : 'not published'}`);
    L.push(fmtIssues(evalRemote(e)));
    L.push(fmtVerdict(diagnoseIncoming(e, reports[e.id]?.report || null, roomState)));
  });
  L.push('');
  L.push('== STUDENTS RECEIVING MY VIDEO (their own reports) ==');
  const ids = new Set([...remotes.map(r => r.id), ...Object.keys(reports)]);
  if (!ids.size) L.push('  (none)');
  ids.forEach(id => {
    const rep = reports[id]?.report || null;
    const name = remotes.find(r => r.id === id)?.name || reports[id]?.name || id;
    L.push(`  ${name} [${id}]${rep ? ` ${rep.browser} room=${rep.room} quality=${rep.quality} age=${Math.round((at - rep.at) / 1000)}s` : ''}`);
    if (rep) {
      L.push(`    my video on their screen: ${fmtCam(rep.coach?.cam)}  tile: ${rep.coach?.tile ? `${rep.coach.tile.w}px${rep.coach.tile.black ? ' BLACK' : ''}` : 'not on screen'}`);
      L.push(`    their camera sending: cam=${rep.local?.camEnabled} track=${rep.local?.readyState} layers: ${fmtLayers(rep.local?.layers || [])}`);
      L.push(`    tabHidden=${rep.hidden} audioBlocked=${rep.audioBlocked} seesPeople=${rep.remoteCount}`);
    }
    L.push(fmtIssues(evalStudentReport(rep, at)));
    L.push(fmtVerdict(diagnoseStudentView(local, roomState, rep, at)));
  });
  return L.join('\n');
}
