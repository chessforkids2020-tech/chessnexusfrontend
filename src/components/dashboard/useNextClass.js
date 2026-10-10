// The student's soonest upcoming class (from /api/coach-schedule/my), skipping
// holiday dates. Kept out of DockViews.jsx so that file exports only components.
import { useEffect, useState } from 'react';
import api from '../../api';
import { soonestClass } from '../../utils/istSchedule';

export function useNextClass(enabled) {
  const [state, setState] = useState({ loaded: false, classes: [], next: null });
  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    api.get('/api/coach-schedule/my')
      .then(r => {
        if (!alive) return;
        const classes = r.data?.classes || [];
        const holidays = new Set((r.data?.holidays || []).map(h => h.date));
        const pad = n => String(n).padStart(2, '0');
        // Soonest class, skipping holiday dates — same rule as MyCoachPortal.
        let from = Date.now();
        let next = null;
        for (let guard = 0; guard < 60; guard++) {
          const s = soonestClass(classes, from);
          if (!s) break;
          const iso = `${s.when.getFullYear()}-${pad(s.when.getMonth() + 1)}-${pad(s.when.getDate())}`;
          if (!holidays.has(iso)) { next = s; break; }
          from = s.when.getTime() + 2 * 60000;
        }
        setState({ loaded: true, classes, next });
      })
      .catch(() => { if (alive) setState({ loaded: true, classes: [], next: null }); });
    return () => { alive = false; };
  }, [enabled]);
  return state;
}
