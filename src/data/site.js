/**
 * Site-wide configuration, navigation, and official contact metadata.
 * Keep official contact details factual and editable; do not fabricate social accounts.
 */

export const SITE_CONFIG = {
  shortName: 'SRC',
  fullName: 'Student Representative Council',
  department: 'Department of Computer Science and Engineering',
  institution: 'RGUKT RK Valley',
  tagline: 'Represent · Lead · Inspire',
  footerSignoff: 'Together. Always.',
  contact: {
    email: 'src@rguktrkv.ac.in',
    office: 'SRC Office, CSE Block / Admin Block, RGUKT RK Valley',
  },
  // Populate official URLs when confirmed by the council; empty entries are gracefully omitted or marked
  socials: [
    // { label: 'LinkedIn', href: 'https://linkedin.com/...', icon: 'linkedin' },
  ],
  navigation: [
    { label: 'Home', path: '/' },
    { label: 'Team', path: '/team' },
    { label: 'Events', path: '/events' },
    { label: 'Vault', path: '/vault' },
  ],
};
