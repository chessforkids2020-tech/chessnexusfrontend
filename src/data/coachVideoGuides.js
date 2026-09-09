// data/coachVideoGuides.js
//
// The walkthrough recordings, in ONE place.
//
// Two screens show these — the pre-onboarding "are you a coach?" prompt and the
// Help → Video guides page — and a coach who watched one before signing up
// should find the same list afterwards. Keeping the array here means adding a
// video is a single edit, not two that can drift apart.
//
// ─────────────────────────────────────────────────────────────────────────────
// ADDING A VIDEO: paste the YouTube id (the part after `watch?v=` or
// `youtu.be/`) into `videoId`. A new entry appears on both screens
// automatically. Leave `videoId` empty and it renders a "coming soon" state
// rather than a broken player.
// ─────────────────────────────────────────────────────────────────────────────
//
// Ordered as a coach NEEDS them (onboard → set up → see the student's view),
// which is not the order they were recorded in.
export const COACH_VIDEO_GUIDES = [
  {
    id: 'onboarding',
    title: 'How to onboard as a coach',
    blurb: 'Signing up as a coach on chessnexus.in and getting your account ready.',
    videoId: 'HWzd6DbqCZA',
    covers: ['Coach onboarding', 'Your profile', 'Getting started'],
    // Shown on the pre-onboarding prompt: this is the one that answers
    // "what am I signing up for?" before the decision is made.
    preOnboarding: true,
  },
  {
    id: 'setup',
    title: 'Students, batches, schedule & assignments',
    blurb: 'Adding students, creating batches, scheduling classes and assigning work.',
    videoId: 'bFtB4PwwZgk',
    covers: ['Adding students', 'Batches', 'Class schedule', 'Assignments'],
    preOnboarding: true,
  },
  {
    id: 'student-view',
    title: 'How students use the coach page',
    blurb: 'What your students see — their classes, assignments and how they submit work.',
    videoId: 'hrk8m2cW4fY',
    covers: ['The student view', 'Classes', 'Assignments', 'Submissions'],
    preOnboarding: true,
  },
];

// Mirrors lessonEmbedUrl() in components/StudentCourses.jsx: the nocookie host,
// no related-video wall at the end, no annotations, plays inline on iOS.
export function coachVideoEmbedUrl(videoId) {
  const params = new URLSearchParams({
    modestbranding: '1',
    rel: '0',
    playsinline: '1',
    iv_load_policy: '3',
    fs: '1',
  });
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params}`;
}

// The channel handle (e.g. '@chessnexus'). Empty = the subscribe affordance is
// not rendered at all, so a wrong guess never ships a dead link.
export const YOUTUBE_HANDLE = '';

export function youtubeSubscribeUrl() {
  return YOUTUBE_HANDLE
    ? `https://www.youtube.com/${YOUTUBE_HANDLE}?sub_confirmation=1`
    : null;
}
