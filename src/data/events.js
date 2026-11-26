/**
 * Structured Events Archive Data.
 * Only displays video embeds and external links when explicitly populated.
 */

export const eventsData = [
  {
    slug: 'techtalk-26',
    title: "TechTalk '26",
    subtitle: 'An inspiring keynote series with engineering leaders and alumni.',
    date: 'February 18, 2026',
    year: '2026',
    category: 'Keynote & Dialogue',
    featured: true,
    coverImage: '/images/event-techtalk.jpg',
    description:
      "TechTalk '26 brings together systems engineers, researchers, and CSE alumni for an evening of candid technical dialogue on distributed computing, AI reliability, and building meaningful careers from campus.",
    highlights: [
      'Live Q&A panel connecting E1–E4 students with practicing software architects.',
      'Focused breakout tracks on open-source engineering and research pathways.',
      'Student-moderated discussions documented for the department archive.',
    ],
    gallery: [
      {
        src: '/images/event-techtalk.jpg',
        caption: 'Main auditorium keynote address under evening stage lights.',
      },
      {
        src: '/images/hero-auditorium.jpg',
        caption: 'Interactive student Q&A session during the open floor.',
      },
      {
        src: '/images/campus-cse.jpg',
        caption: 'Department of CSE academic block hosting afternoon breakout tracks.',
      },
    ],
    videos: [
      // Populate YouTube/Vimeo embed URLs when recordings are published:
      // { title: 'Keynote Recording', embedUrl: 'https://www.youtube.com/embed/...' }
    ],
    links: [
      {
        label: 'Event Archive Notes (Placeholder)',
        url: 'mailto:src@rguktrkv.ac.in?subject=TechTalk%2026%20Archive',
      },
    ],
  },
  {
    slug: 'cse-hackathon-2026',
    title: 'Hackathon 2026',
    subtitle: 'Code. Build. Innovate. 24 hours of student-led problem solving.',
    date: 'January 24–25, 2026',
    year: '2026',
    category: 'Hackathon',
    featured: false,
    coverImage: '/images/event-hackathon.jpg',
    description:
      'A 24-hour departmental build sprint challenging mixed-batch teams to ship working prototypes addressing campus accessibility, developer tooling, and local community needs.',
    highlights: [
      'Cross-batch teams pairing E1/E2 builders with E3/E4 mentors.',
      'Midnight design critiques and architecture checkpoints with faculty & seniors.',
      'Live demo expo showcasing functional prototypes rather than slide decks.',
    ],
    gallery: [
      {
        src: '/images/event-hackathon.jpg',
        caption: 'Teams collaborating through the night on working prototypes.',
      },
      {
        src: '/images/campus-cse.jpg',
        caption: 'CSE labs opened continuously for the 24-hour sprint.',
      },
    ],
    videos: [],
    links: [],
  },
  {
    slug: 'cse-cultural-evening',
    title: 'Annual Cultural Night',
    subtitle: 'Celebrating community, creativity, and student spirit across batches.',
    date: 'November 14, 2025',
    year: '2025',
    category: 'Cultural & Community',
    featured: false,
    coverImage: '/images/event-cultural.jpg',
    description:
      'Bringing together performers, organizers, and students from every engineering year to celebrate music, theater, and departmental camaraderie beyond the labs.',
    highlights: [
      'Student-directed stage production and acoustic showcases.',
      'Recognition of student clubs and peer-mentorship volunteers.',
      'Shared celebration welcoming incoming batches into the CSE community.',
    ],
    gallery: [
      {
        src: '/images/event-cultural.jpg',
        caption: 'Main stage evening performance with the CSE community.',
      },
      {
        src: '/images/hero-auditorium.jpg',
        caption: 'Packed auditorium cheering for student ensembles.',
      },
    ],
    videos: [],
    links: [],
  },
  {
    slug: 'student-townhall-2025',
    title: 'Open Council Town Hall',
    subtitle: 'Transparent dialogue between batches and the elected SRC panel.',
    date: 'September 09, 2025',
    year: '2025',
    category: 'Governance',
    featured: false,
    coverImage: '/images/hero-auditorium.jpg',
    description:
      'An open semester forum where students directly raise lab infrastructure proposals, elective feedback, and campus welfare priorities with documented follow-up action items.',
    highlights: [
      'Published semester action tracker shared with all class representatives.',
      'Direct Q&A with executive council leads and faculty liaison.',
      'Structured feedback intake for lab timings and technical club resources.',
    ],
    gallery: [
      {
        src: '/images/hero-auditorium.jpg',
        caption: 'Students raising proposals during the semester open floor.',
      },
    ],
    videos: [],
    links: [],
  },
];
