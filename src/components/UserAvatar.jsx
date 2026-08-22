// src/components/UserAvatar.jsx
// Single source of truth for rendering a user's avatar everywhere in the app.
//
// Render priority:
//   1. profilePhotoUrl (custom uploaded photo)
//   2. basic avatar image (activeAvatarUrl, or activeAvatar key resolved)
//   3. active3dModel  → live (auto-rotating) or frozen <model-viewer>
//   4. initials
//
// `live` makes the 3D model auto-rotate (use ONLY on the owner dashboard and the
// public profile). Everywhere else (lists, chat, games) leave `live` off so the
// model renders as a still, non-interactive frame and stays cheap in long lists.
//
// If a .glb is missing or fails to load, we fall back to the 🌌 emoji — never a
// broken element.
import React, { useState } from 'react';
import { resolveApiAssetUrl } from '../api';

// LOADED ON DEMAND, not at module scope.
//
// @google/model-viewer is ~1MB and only registers a custom element. Importing
// it here pulled that megabyte into the FIRST load of every page, because
// avatars appear in the header, sidebar, chat and coach cards — even though a
// 3D avatar is rare. It is now fetched only when a user actually has one, which
// keeps it out of the initial download for everyone else.
let modelViewerLoad = null;
const ensureModelViewer = () => {
  if (!modelViewerLoad) modelViewerLoad = import('@google/model-viewer').catch(() => {});
  return modelViewerLoad;
};

const initialOf = (name) => (name || '?').toString().trim()[0]?.toUpperCase() || '?';

// Derive the .glb URL from the stored key, e.g. "model3d-01" → absolute URL.
const model3dUrl = (key) =>
  key ? resolveApiAssetUrl(`/api/public/3d-models/${key}.glb`) : '';

export default function UserAvatar({
  user,
  // allow passing fields directly too (some call sites don't have a full user object)
  profilePhotoUrl,
  activeAvatarUrl,
  active3dModel,
  displayName,
  username,
  size = 48,
  live = false,
  className = '',
  style = {},
}) {
  const [model3dFailed, setModel3dFailed] = useState(false);

  const photo = profilePhotoUrl ?? user?.profilePhotoUrl;
  const basicUrl = activeAvatarUrl ?? user?.activeAvatarUrl;
  const model3d = active3dModel ?? user?.active3dModel;
  const name = displayName ?? user?.displayName ?? username ?? user?.username;

  const box = {
    width: size,
    height: size,
    borderRadius: 'var(--radius-circle)',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    background: 'var(--color-black-a20)',
    ...style,
  };

  // 1 + 2: photo or basic avatar image
  const imageSrc = photo || basicUrl;
  if (imageSrc) {
    return (
      <div className={className} style={box}>
        <img
          src={resolveApiAssetUrl(imageSrc)}
          alt="avatar"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    );
  }

  // 3: 3D model (live = auto-rotate; frozen = still). Falls back to emoji on error.
  if (model3d && !model3dFailed) {
    // Start fetching the custom-element definition. Until it resolves the tag
    // renders as an inert unknown element, which is exactly the placeholder we
    // want — no layout shift, and the emoji fallback still covers failure.
    ensureModelViewer();
    const src = model3dUrl(model3d);
    return (
      <div className={className} style={box}>
        <model-viewer
          ref={(el) => {
            if (!el || el.__cnDbg) return;
            el.__cnDbg = true;
            const r = el.getBoundingClientRect();
            console.log('[CN model-viewer] mounted', { src, w: r.width, h: r.height });
            el.addEventListener('load', (e) => console.log('[CN model-viewer] LOAD ok', e.detail));
            el.addEventListener('error', (e) => console.log('[CN model-viewer] ERROR', e.detail));
          }}
          src={src}
          camera-controls={false}
          disable-zoom
          disable-pan
          disable-tap
          interaction-prompt="none"
          auto-rotate={live ? true : undefined}
          rotation-per-second={live ? '24deg' : undefined}
          loading="eager"
          reveal="auto"
          style={{ width: '100%', height: '100%', backgroundColor: 'transparent', '--poster-color': 'transparent' }}
          onError={() => setModel3dFailed(true)}
        />
      </div>
    );
  }

  // 3b: 3D selected but asset missing/failed → themed emoji placeholder.
  if (model3d && model3dFailed) {
    return (
      <div className={className} style={{ ...box, fontSize: size * 0.5 }}>
        <span>🌌</span>
      </div>
    );
  }

  // 4: initials
  return (
    <div className={className} style={{ ...box, fontSize: size * 0.42, color: 'var(--color-text)', fontWeight: 700 }}>
      <span>{initialOf(name)}</span>
    </div>
  );
}
