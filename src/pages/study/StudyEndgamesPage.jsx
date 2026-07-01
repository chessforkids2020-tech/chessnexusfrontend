// src/pages/study/StudyEndgamesPage.jsx
//
// Student-facing Endgames browser inside the Study section (/study/endgames).
// Reuses the shared Endgames browser component (same board + type browsing as
// the admin page); only the back-link points to /study instead of /admin.
import React from "react";
import EndgamesBrowser from "../AdminEndgamesPage";

export default function StudyEndgamesPage() {
  return <EndgamesBrowser backTo="/study" backLabel="← Back to Study" compact />;
}
