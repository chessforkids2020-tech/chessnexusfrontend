import { Navigate } from 'react-router-dom';

// The Race Hub moved into the Puzzles Hub (see components/RacesSection.jsx).
// Kept as a redirect because /race is linked from the dashboard, the social
// hub, banners and old bookmarks.
export default function Race() {
  return <Navigate to="/puzzles-hub" replace />;
}
