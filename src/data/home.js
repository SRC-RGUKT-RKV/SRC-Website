/**
 * Structured content for the Home page.
 * Grounded in the official RGUKT RK Valley CSE Student Recreation Center (Aadhya_SRC_Club) inauguration record.
 */

export const HOME_DATA = {
  hero: {
    eyebrow: 'Department of Computer Science & Engineering · RGUKT RK Valley',
    wordmark: 'SRC',
    titleLines: ['Student', 'Recreation', 'Center'],
    accentWord: 'Center',
    tagline: 'Innovate · Collaborate · Inspire',
    image: '/images/hero-src-event.jpg',
    imageAlt:
      'RGUKT RK Valley CSE students gathered during an SRC technical session and hackathon',
  },

  whatIsSrc: {
    eyebrow: '01 — IDENTITY',
    headingPrefix: 'What is',
    headingAccent: 'SRC?',
    lead:
      'The Student Recreation Center (Aadhya_SRC_Club) of the Department of Computer Science and Engineering at RGUKT RK Valley is a student-driven initiative dedicated to fostering innovation, creativity, and collaboration.',
    paragraphs: [
      'Conceived within the CSE department, SRC connects students across engineering batches with faculty mentors and real-world problem solving — organizing hackathons, peer-learning sessions, technical workshops, and campus-focused software projects.',
      'Beyond academics, SRC serves as a bridge for student voices, departmental initiatives, and collaborative campus culture across every batch from E1 through E4.',
    ],
    image: '/images/campus-cse.webp',
    imageAlt: 'Department of Computer Science and Engineering building at RGUKT RK Valley',
    metrics: [
      { value: 'CSE', label: 'Department Body' },
      { value: 'Apr 2024', label: 'Inaugurated' },
      { value: 'E1–E4', label: 'Student Community' },
    ],
  },

  howItStarted: {
    eyebrow: '02 — ORIGIN',
    heading: 'How It Started',
    intro:
      'On April 30, 2024, the Computer Science and Engineering Department celebrated a landmark moment with the inauguration of the Student Recreation Center (Aadhya_SRC_Club).',
    milestones: [
      {
        year: 'April 30, 2024',
        tag: 'Inauguration',
        title: 'Launch of Aadhya_SRC_Club',
        description:
          'The Department of Computer Science and Engineering formally inaugurated the Student Recreation Center to cultivate innovation, creativity, and collaborative student leadership on campus.',
      },
      {
        year: 'Esteemed Guests',
        tag: 'Mentorship & Leadership',
        title: 'Honored by Institute & Faculty Dignitaries',
        description:
          'The inauguration was graced by Prof. Kumara Swami Gupta Ayyapu (Director), Dr. Penugonda Ravikumar, Dr. Ch Rathna Kumari, and Mr. Satyanandaram Nandigam, affirming strong institutional support for student initiatives.',
      },
      {
        year: 'Inaugural Event',
        tag: 'Hackathon',
        title: 'Hostel-Challenge Problem-Solving Hackathon',
        description:
          'As part of the inauguration, students organized a campus Hackathon tackling pressing hostel-related challenges — demonstrating technical depth and creative problem-solving that set the tone for all future SRC programs.',
      },
      {
        year: '2026–2027',
        tag: 'Present Panel',
        title: 'Growing Technical Culture & Living Archive',
        description:
          'Today, the working team continues expanding hackathons, workshops, student representation, and campus projects while preserving every batch’s legacy inside The Vault.',
      },
    ],
  },

  purposeAndVision: {
    eyebrow: '03 — MANDATE',
    heading: 'Purpose & Vision',
    statement:
      'To foster an innovative, creative, and collaborative Computer Science community where student ideas translate into real campus impact.',
    pillars: [
      {
        index: '01',
        title: 'Innovation & Problem Solving',
        description:
          'Channel engineering talent toward practical campus and community challenges through hackathons, rapid prototyping, and student-built software.',
        span: 'lg:col-span-7',
        tone: 'navy',
      },
      {
        index: '02',
        title: 'Technical Development',
        description:
          'Create hands-on learning environments with workshops, system design sessions, coding tracks, and peer mentorship across batches.',
        span: 'lg:col-span-5',
        tone: 'paper',
      },
      {
        index: '03',
        title: 'Leadership & Representation',
        description:
          'Empower accountable student working teams who connect student priorities with faculty guidance and pass down institutional memory.',
        span: 'lg:col-span-5',
        tone: 'cream',
      },
      {
        index: '04',
        title: 'Creativity & Collaboration',
        description:
          'Unite students from E1 to E4, faculty advisors, and department clubs in a vibrant academic and recreational community.',
        span: 'lg:col-span-7',
        tone: 'maroon',
      },
    ],
  },
};
