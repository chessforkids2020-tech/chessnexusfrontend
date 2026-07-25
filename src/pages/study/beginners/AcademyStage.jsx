import React from 'react';
import NexusCoach from './NexusCoach';
import './beginners.css';

// Shared lesson layout used by EVERY academy lesson: the board / content fills the
// LEFT, and the RIGHT column holds the lesson TITLE (top), the Nexus Coach avatar
// (middle), and the ACTION buttons (bottom). The lesson passes its narration state
// (from useNarration) so the coach speaks + animates in sync.
//   children = the board/content (left)
//   title    = optional heading shown above the coach (right)
//   actions  = optional buttons shown below the coach (right)
export default function AcademyStage({ narration, children, title, actions }) {
  const n = narration || {};
  return (
    <div className="ba-stage">
      <div className="ba-stage-main">{children}</div>
      <div className="ba-stage-coach">
        {title && <div className="ba-stage-title">{title}</div>}
        <NexusCoach
          speaking={!!n.speaking}
          line={n.lineText}
          muted={!!n.muted}
          onToggleMute={n.toggleMute}
          onReplay={n.replay}
          hasTTS={n.hasTTS !== false}
        />
        {actions && <div className="ba-stage-actions">{actions}</div>}
      </div>
    </div>
  );
}
