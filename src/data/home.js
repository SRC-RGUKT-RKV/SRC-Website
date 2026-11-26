/**
 * Structured content for the Home page.
 * Historical dates and milestones are clearly structured for easy editing by the council.
 */

export const HOME_DATA = {
  hero: {
    eyebrow: 'Department of Computer Science & Engineering · RGUKT RK Valley',
    wordmark: 'SRC',
    titleLines: ['Student', 'Representative', 'Council'],
    accentWord: 'Council',
    tagline: 'Represent · Lead · Inspire',
    image: '/images/hero-auditorium.jpg',
    imageAlt: 'Students participating in a Student Representative Council assembly',
  },

  whatIsSrc: {
    eyebrow: '01 — IDENTITY',
    headingPrefix: 'What is',
    headingAccent: 'SRC?',
    lead:
      'The Student Representative Council (SRC) is the official elected voice of Computer Science and Engineering students — bridging the student community, faculty, and department administration.',
    paragraphs: [
      'Formed by students and accountable to students, the council carries academic, laboratory, hostel, and campus-life priorities directly to decision-makers, while bringing department policies and opportunities clearly back to every batch.',
      'Beyond representation, SRC coordinates technical initiatives, student forums, peer-learning spaces, and annual departmental milestones that shape student life across the engineering years.',
    ],
    image: '/images/campus-cse.jpg',
    imageAlt: 'Computer Science and Engineering academic block architecture',
    metrics: [
      { value: 'CSE', label: 'Department Body' },
      { value: 'E1–E4', label: 'Batches Represented' },
      { value: '100%', label: 'Student-Elected' },
    ],
  },

  howItStarted: {
    eyebrow: '02 — ORIGIN',
    heading: 'How It Started',
    intro:
      'Established to give every engineering batch a structured, transparent channel of representation. Milestones below can be updated directly as archival records are compiled.',
    milestones: [
      {
        year: 'Foundation',
        tag: 'Charter',
        title: 'Establishing a Unified Student Voice',
        description:
          'Students and faculty coordinators recognized the need for an accountable departmental council capable of organizing technical culture and representing student concerns constructively.',
      },
      {
        year: 'Structure',
        tag: 'Elections',
        title: 'Democratic Batch-Wide Representation',
        description:
          'Annual nomination and selection frameworks were introduced across engineering batches so executive leads and class representatives could collaborate under one council.',
      },
      {
        year: 'Initiatives',
        tag: 'Community',
        title: 'Technical Forums, Hackathons & Campus Dialogue',
        description:
          'SRC expanded its scope to curate speaker sessions, coding competitions, peer workshops, and structured feedback dialogues with department administration.',
      },
      {
        year: '2026–2027',
        tag: 'Present Panel',
        title: 'Digital Transparency & Living Archive',
        description:
          'The current panel continues the mandate with a dedicated digital platform documenting active initiatives, events, and the historical legacy of past batches in The Vault.',
      },
    ],
  },

  purposeAndVision: {
    eyebrow: '03 — MANDATE',
    heading: 'Purpose & Vision',
    statement:
      'To foster an accountable, technically ambitious, and inclusive Computer Science community where every student voice translates into measurable action.',
    pillars: [
      {
        index: '01',
        title: 'Student Representation',
        description:
          'Serve as the transparent, formal channel between batches and department leadership on academic schedules, infrastructure, and student welfare.',
        span: 'lg:col-span-7',
        tone: 'navy',
      },
      {
        index: '02',
        title: 'Technical Development',
        description:
          'Build spaces for real-world engineering through hackathons, system design talks, open-source sprints, and peer mentorship.',
        span: 'lg:col-span-5',
        tone: 'paper',
      },
      {
        index: '03',
        title: 'Leadership & Accountability',
        description:
          'Cultivate principled student leaders who document council decisions, track follow-through, and pass down institutional memory.',
        span: 'lg:col-span-5',
        tone: 'cream',
      },
      {
        index: '04',
        title: 'Collaboration & Engagement',
        description:
          'Unite students across E1 to E4, student clubs, alumni, and faculty around shared academic, cultural, and technical milestones.',
        span: 'lg:col-span-7',
        tone: 'maroon',
      },
    ],
  },
};
