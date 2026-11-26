/**
 * Current SRC Panel Data (SRC 2026–2027)
 * Kept strictly separate from historical Vault archive batches.
 * Replace placeholder member names, photos, and bios with confirmed council entries.
 */

export const CURRENT_TERM = 'SRC 2026–2027';

export const currentTeam = [
  {
    id: 'president',
    name: 'President [Placeholder]',
    role: 'President',
    designationSplit: ['PRESI', 'DENT'],
    dept: 'CSE • E4',
    image: '/images/member-portrait-1.jpg',
    featured: true,
    bentoSpan: 'lg:col-span-5 lg:row-span-2',
    about:
      'Represents the Computer Science and Engineering student body before the institute administration and guides council priorities across the academic year.',
    responsibilities: [
      'Represent student concerns before department and institute administration.',
      'Coordinate major SRC decisions, open forums, and council meetings.',
      'Align executive leads and batch representatives on campus-wide initiatives.',
    ],
    email: 'president.src@rguktrkv.ac.in',
    area: 'Student Affairs & Governance',
    term: CURRENT_TERM,
    quote: 'A strong student voice begins with listening.',
    socials: {},
  },
  {
    id: 'vice-president',
    name: 'Vice President [Placeholder]',
    role: 'Vice President',
    designationSplit: ['VICE', 'PRESIDENT'],
    dept: 'CSE • E4',
    image: '/images/member-portrait-2.jpg',
    featured: true,
    bentoSpan: 'lg:col-span-4 lg:row-span-1',
    about:
      'Supports council operations and coordinates direct communication between batch representatives, student committees, and faculty advisors.',
    responsibilities: [
      'Oversee cross-committee execution and initiative tracking.',
      'Follow up on academic and hostel welfare action items.',
      'Facilitate joint planning sessions across batches.',
    ],
    email: 'vp.src@rguktrkv.ac.in',
    area: 'Student Affairs & Coordination',
    term: CURRENT_TERM,
    quote: 'Representation means turning concerns into measurable action.',
    socials: {},
  },
  {
    id: 'general-secretary',
    name: 'General Secretary [Placeholder]',
    role: 'General Secretary',
    designationSplit: ['GENERAL', 'SECRETARY'],
    dept: 'CSE • E3',
    image: '/images/member-portrait-3.jpg',
    featured: true,
    bentoSpan: 'lg:col-span-3 lg:row-span-1',
    about:
      'Maintains institutional memory by documenting council meetings, drafting formal proposals, and ensuring decisions translate into scheduled follow-ups.',
    responsibilities: [
      'Maintain council records, minutes, and transparent documentation.',
      'Coordinate official meeting schedules and departmental agendas.',
      'Track resolution timelines for raised student requests.',
    ],
    email: 'gensec.src@rguktrkv.ac.in',
    area: 'Administration & Records',
    term: CURRENT_TERM,
    quote: 'Clear documentation and follow-through turn ideas into outcomes.',
    socials: {},
  },
  {
    id: 'technical-coordinator',
    name: 'Manvitha Kopela',
    role: 'Technical Coordinator',
    designationSplit: ['TECHNICAL', 'COORDINATOR'],
    dept: 'CSE • E3',
    image: '/images/member-portrait-4.jpg',
    featured: true,
    bentoSpan: 'lg:col-span-4 lg:row-span-1',
    about:
      'Leads technology-focused initiatives for students and builds accessible, student-driven digital platforms, workshops, and technical infrastructure for the council.',
    responsibilities: [
      'Coordinate technical initiatives, hackathons, and coding tracks for the SRC.',
      'Design and maintain student-facing digital platforms and archival tools.',
      'Explore practical engineering solutions for everyday campus needs.',
    ],
    email: 'manvitha.kopela@rguktrkv.ac.in',
    area: 'Technical Affairs',
    term: CURRENT_TERM,
    quote: 'Building thoughtful solutions for a stronger student experience.',
    socials: {},
  },
  {
    id: 'cultural-secretary',
    name: 'Cultural Secretary [Placeholder]',
    role: 'Cultural Secretary',
    designationSplit: ['CULTURAL', 'SECRETARY'],
    dept: 'CSE • E3',
    image: '/images/member-portrait-1.jpg',
    featured: false,
    bentoSpan: 'lg:col-span-3 lg:row-span-1',
    about:
      'Curates departmental cultural programming and creative forums so students across every batch can collaborate and showcase talent beyond coursework.',
    responsibilities: [
      'Coordinate cultural showcases and department celebration events.',
      'Support creative clubs, arts, and student-led productions.',
      'Promote inclusive cross-batch participation.',
    ],
    email: 'cultural.src@rguktrkv.ac.in',
    area: 'Culture & Community',
    term: CURRENT_TERM,
    quote: 'Campus life becomes memorable when everyone has a place in it.',
    socials: {},
  },
  {
    id: 'media-coordinator',
    name: 'Media Coordinator [Placeholder]',
    role: 'Media Coordinator',
    designationSplit: ['MEDIA', 'COORDINATOR'],
    dept: 'CSE • E2',
    image: '/images/member-portrait-2.jpg',
    featured: false,
    bentoSpan: 'lg:col-span-4 lg:row-span-1',
    about:
      'Shapes SRC communications, editorial announcements, and event photography so council decisions and student milestones remain visible to everyone.',
    responsibilities: [
      'Coordinate official SRC announcements and visual identity.',
      'Document departmental events for The Vault historical archive.',
      'Ensure transparent communication of council outcomes.',
    ],
    email: 'media.src@rguktrkv.ac.in',
    area: 'Media & Communications',
    term: CURRENT_TERM,
    quote: 'Honest communication makes student representation visible.',
    socials: {},
  },
  {
    id: 'sports-secretary',
    name: 'Sports Secretary [Placeholder]',
    role: 'Sports Secretary',
    designationSplit: ['SPORTS', 'SECRETARY'],
    dept: 'CSE • E2',
    image: '/images/member-portrait-1.jpg',
    featured: false,
    bentoSpan: 'lg:col-span-4 lg:row-span-1',
    about:
      'Advocates for student athletics and recreational access while organizing inter-batch tournaments and department sporting participation.',
    responsibilities: [
      'Coordinate CSE inter-batch and campus sporting events.',
      'Collect and communicate athletic facility concerns.',
      'Encourage balanced student wellness alongside academics.',
    ],
    email: 'sports.src@rguktrkv.ac.in',
    area: 'Sports & Recreation',
    term: CURRENT_TERM,
    quote: 'Participation matters most when every batch gets a chance to play.',
    socials: {},
  },
  {
    id: 'joint-secretary',
    name: 'Joint Secretary [Placeholder]',
    role: 'Joint Secretary',
    designationSplit: ['JOINT', 'SECRETARY'],
    dept: 'CSE • E2',
    image: '/images/member-portrait-3.jpg',
    featured: false,
    bentoSpan: 'lg:col-span-4 lg:row-span-1',
    about:
      'Supports day-to-day council administration, coordinating working groups and maintaining steady execution across academic and student affairs.',
    responsibilities: [
      'Assist in council administration and batch coordination.',
      'Coordinate communication with class representatives.',
      'Track assigned working-group deliverables.',
    ],
    email: 'jointsec.src@rguktrkv.ac.in',
    area: 'Administration',
    term: CURRENT_TERM,
    quote: 'Consistent follow-through creates lasting institutional trust.',
    socials: {},
  },
  {
    id: 'event-coordinator',
    name: 'Event Coordinator [Placeholder]',
    role: 'Event Coordinator',
    designationSplit: ['EVENT', 'COORDINATOR'],
    dept: 'CSE • E1',
    image: '/images/member-portrait-2.jpg',
    featured: false,
    bentoSpan: 'lg:col-span-6 lg:row-span-1',
    about:
      'Plans logistics, volunteer teams, and scheduling for departmental keynotes, workshops, hackathons, and student town halls.',
    responsibilities: [
      'Manage venue logistics, schedules, and speaker hospitality.',
      'Coordinate volunteer teams across E1–E4 batches.',
      'Ensure smooth execution of flagship SRC programs.',
    ],
    email: 'events.src@rguktrkv.ac.in',
    area: 'Events & Logistics',
    term: CURRENT_TERM,
    quote: 'Memorable campus milestones are built on quiet teamwork.',
    socials: {},
  },
  {
    id: 'class-rep-e4',
    name: 'E4 Representative [Placeholder]',
    role: 'Class Representative',
    designationSplit: ['CLASS', 'REP'],
    dept: 'CSE • E4',
    image: '/images/member-portrait-1.jpg',
    featured: false,
    bentoSpan: 'lg:col-span-3 lg:row-span-1',
    about:
      'Connects final-year student priorities — placements, capstone labs, and academic electives — directly with the wider council.',
    responsibilities: [
      'Collect E4 batch feedback on academics and career support.',
      'Communicate council outcomes promptly to peers.',
      'Mentor junior representatives on council process.',
    ],
    email: 'cr.e4@rguktrkv.ac.in',
    area: 'Batch Representation (E4)',
    term: CURRENT_TERM,
    quote: 'Every graduating batch leaves a stronger foundation behind.',
    socials: {},
  },
  {
    id: 'class-rep-e2',
    name: 'E2 Representative [Placeholder]',
    role: 'Class Representative',
    designationSplit: ['CLASS', 'REP'],
    dept: 'CSE • E2',
    image: '/images/member-portrait-2.jpg',
    featured: false,
    bentoSpan: 'lg:col-span-3 lg:row-span-1',
    about:
      'Bridges second-year students with SRC discussions, ensuring lab resources, coursework pacing, and student initiatives reflect batch needs.',
    responsibilities: [
      'Gather batch-level concerns and constructive proposals.',
      'Relay SRC updates and event opportunities to classmates.',
      'Contribute student perspective in monthly council reviews.',
    ],
    email: 'cr.e2@rguktrkv.ac.in',
    area: 'Batch Representation (E2)',
    term: CURRENT_TERM,
    quote: 'Listening closely is the first act of real leadership.',
    socials: {},
  },
];

/**
 * Splits a designation into two balanced halves for the desktop collision choreography.
 */
export function getDesignationHalves(member) {
  if (Array.isArray(member.designationSplit) && member.designationSplit.length === 2) {
    return member.designationSplit.map((part) => part.toUpperCase());
  }

  const clean = (member.role || '').trim().toUpperCase();
  const words = clean.split(/\s+/);

  if (words.length >= 2) {
    const mid = Math.ceil(words.length / 2);
    return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
  }

  const midChar = Math.ceil(clean.length / 2);
  return [clean.slice(0, midChar), clean.slice(midChar)];
}
