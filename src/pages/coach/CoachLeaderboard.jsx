// pages/coach/CoachLeaderboard.jsx
// The coach's own view of their class leaderboard — the same board their
// students see on My Coach, from the other side of the desk.
//
// The backend endpoint (GET /api/coach/leaderboard) already existed and was
// simply never wired to a page, so coaches could not see the board they were
// being ranked on by their own students' app. Same component as the student
// view, in `mode="coach"`: one board, one scoring rule, no second copy to drift.
import React from 'react';
import { Link } from 'react-router-dom';
import ClassLeaderboard from '../../components/coach/ClassLeaderboard';
import './CoachDashboard.css';

export default function CoachLeaderboard() {
  return (
    <div className="coach-dash">
      <div className="coach-dash-header">
        <div>
          <h1>🏆 Leaderboard</h1>
          <p className="coach-dash-sub">
            Practice, homework, events and attendance — the same board your students see.
          </p>
        </div>
        <Link to="/coach/dashboard" className="btn-ghost">← Dashboard</Link>
      </div>

      <ClassLeaderboard mode="coach" />
    </div>
  );
}
