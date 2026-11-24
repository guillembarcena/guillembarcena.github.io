// All copy lives here. Facts only.
export const TRACKS = [
  { artist: 'Paris Is for Lovers', title: 'My Love (feat. Tomas Høffding)' },
  { artist: 'Octave One', title: 'Blackwater (Strings Vocal Mix)' },
  { artist: 'Rozlyne Clarke', title: 'Dancing Is Like Making Love (Dub 1)' },
  { artist: 'Snakebite', title: 'The Bit Goes On (Ispirazione (XVX) Remix)' },
];

export const CARDS = {
  marathon: { name: 'Marathon bib and medal', title: 'Barcelona Marathon 2026', lines: ['Finished in 3:15:33.'], year: '2026', cv: 'beyond' },
  basketball: { name: 'Basketball and shoes', title: 'Basketball', lines: ['Several years playing at the highest category.'], year: '', cv: 'beyond' },
  diploma: { name: 'Degree', title: 'Economics at Universitat Pompeu Fabra', lines: ['Bilingual degree in Economics.', 'Dissertation on the efficiency of public health expenditure in the Spanish autonomous communities, a DEA analysis.'], year: '2022 to 2026', cv: 'education' },
  edinburgh: { name: 'Photo of the Highlands', title: 'University of Edinburgh', lines: ['Exchange semester.', 'Coursework: Economics of Health and Health Care.'], year: 'Autumn 2025', cv: 'education' },
  binders: { name: 'Project binders', title: 'KPMG, Strategy and Transformation', lines: ['A strategic action plan for the Catalan wine industry, for INCAVI.', 'Next Generation EU funding advisory and procurement checks for the Agència Catalana de l’Aigua.', 'A new document management model for the same agency.', 'The technical office for Next Generation EU funds for Barcelona City Council.'], year: 'January to June 2026', cv: 'experience' },
  rumia: { name: 'RUMIA prototype box', title: 'RUMIA', lines: ['A health and AI spin-off.', 'I lead go-to-market: organisation, funding and clients.'], year: '', cv: 'experience' },
  scout: { name: 'Scout neckerchief', title: 'Scout leader at AEiG Pau Claris', lines: ['Groups of 20 children aged 8 to 17.', 'I planned a two-week summer camp every year.'], year: '2023 to 2025', cv: 'experience' },
  dj: { name: 'DJ setup', title: 'I mix house music.', lines: ['Two club-style media players and a four-channel mixer.', 'With sound enabled, click the setup to hear a short loop. You can also enjoy listening to one of the above.'], year: '', cv: 'beyond' },
  vinyl: { name: 'Record wall', title: 'My record wall.', lines: TRACKS.map(t => t.artist + ' - ' + t.title), year: '', cv: 'beyond' },
  gauguin: { name: 'Le Cheval blanc, Paul Gauguin (1898). Click to look closer', title: '', lines: [], year: '', cv: '' },
  pissarro: { name: 'Femme dans un clos, Camille Pissarro (1887). Click to look closer', title: '', lines: [], year: '', cv: '' },
  skis: { name: 'Skis. Click to play', title: '', lines: [], year: '', cv: '' },
  computer: { name: 'Computer. Click to go in', title: '', lines: [], year: '', cv: '' },
};

export const ABOUT = [
  'I am Guillem Bárcena Folia, an economist from Barcelona. My work leans towards health and public policy, and also towards startups, technology and innovation.',
  'I studied the bilingual degree in Economics at Universitat Pompeu Fabra and spent an autumn semester at the University of Edinburgh. My dissertation, written as a group, measured how efficiently the Spanish autonomous communities spend on public health.',
  'I worked as a Strategy and Transformation consultant at KPMG, mostly for public bodies in Catalonia. At RUMIA, a health and AI spin-off, I lead go-to-market: organisation, funding and clients.',
  'Away from the desk I mix house music, I ran the Barcelona Marathon 2026 in 3:15:33, and I was a scout leader at AEiG Pau Claris from 2023 to 2025.',
  'This room and the computer in it were built with Claude Code.',
].join('\n\n');

const E = (org, role, place, dates, items) => ({ org, role, place, dates, items });
export const CV = [
  { id: 'education', title: 'Education', entries: [
    E('Universitat Pompeu Fabra', 'Bilingual degree in Economics', 'Barcelona, Spain', 'Sept 2022 – June 2026', ['Final dissertation: Efficiency of Public Health Expenditure in the Spanish Autonomous Communities: a DEA analysis (RStudio)']),
    E('University of Edinburgh', 'Exchange abroad program (Economics)', 'Edinburgh, United Kingdom', 'Sept 2025 – Dec 2025', ['Relevant coursework: Economics of Health and Health Care']),
  ] },
  { id: 'experience', title: 'Experience', entries: [
    E('Rumia', 'Business Development & Strategy', 'Barcelona, Spain', 'Oct 2026 – Present', [
      'Early-stage healthtech spin-off building explainable AI models to forecast primary-care demand, currently piloted with the Catalan public health system',
      'Lead go-to-market strategy, competitive landscape analysis and positioning',
      'Built and prioritised the client pipeline across public health systems and private providers',
      'Identified public funding opportunities and supported grant applications and business model definition',
      'Structured internal processes and automated workflows using generative and agentic AI tools']),
    E('KPMG', 'Strategy & Transformation Consultant', 'Barcelona, Spain', 'Jan 2026 – June 2026', [
      'Development of a strategic action plan for the wine industry on behalf of INCAVI',
      'Provided advisory services on Next Generation EU funding and verified procurement documentation for the Agència Catalana de l’Aigua',
      'Implementation of a new organisational model for document management at the Agència Catalana de l’Aigua',
      'Participated in client meetings and supported the follow-up of the project',
      'Technical Office for Next Generation EU funds for the Barcelona City Council']),
    E('AEiG Pau Claris', 'Monitor', 'Barcelona, Spain', 'Sept 2023 – Sept 2025', [
      'Managed groups of 20 children of a wide range of ages (from 8 to 17 y/o)',
      'Developed leadership, organizational, communication and collaboration skills',
      'Coordinated and planned a 2 weeks summer camp every year, in addition to weekend trips and other activities']),
  ] },
  { id: 'additional', title: 'Additional information', entries: [
    E('Norrsken Impact Week', 'Volunteer', 'Barcelona, Spain', 'Oct 2026', ['Supported the organisation of the event, engaging with founders, investors and the European startup ecosystem']),
    E('PostCrash UPF', 'Member', 'Barcelona, Spain', 'Oct 2023 – Present', ['Organized and moderated workshops with distinguished speakers in economics and other fields']),
    E('180 Degrees Consulting UPF', 'Client Acquisition Department', 'Barcelona, Spain', 'Sept 2025 – Feb 2026', ['Had the opportunity to carry out projects for non-profit organisations', 'Lead prospecting and qualification, client relationship management and developing new business opportunities']),
    E('Ateneu Barcelonès', 'Member', 'Barcelona, Spain', 'Jan 2024 – Present', ['Connected with an inspiring community of youth talent in a leading cultural centre']),
  ] },
  { id: 'skills', title: 'Skills & languages', plain: [
    ['Skills', 'Generative & Agentic AI, Stata, RStudio, Word, Excel, Powerpoint, Leadership, Teamwork and Communication Skills'],
    ['Languages', 'Fluent in English and native in Catalan and Spanish'],
  ] },
  { id: 'beyond', title: 'Beyond work', plain: [
    ['Running', 'Barcelona Marathon 2026, finished in 3:15:33'],
    ['Basketball', 'Several years playing at a high level, in the Preferente category'],
    ['Music', 'I mix house music at home on two club-style media players and a four-channel mixer'],
  ] },
];

export function cvHTML() {
  let h = '<header class="cv-head"><h1>Guillem Bárcena Folia</h1><p>Economist · Barcelona</p></header>';
  for (const s of CV) {
    h += `<section id="cv-${s.id}" class="cv-sec"><h2>${s.title}</h2>`;
    if (s.entries) for (const e of s.entries) {
      h += `<article class="cv-entry"><div class="cv-row"><div><b>${e.org}</b>, <i>${e.role}</i></div><div class="cv-meta">${e.place}${e.dates ? '<span class="sep"> · </span><br>' + e.dates : ''}</div></div><ul>${e.items.map(i => `<li>${i}</li>`).join('')}</ul></article>`;
    }
    if (s.plain) h += s.plain.map(p => `<p class="cv-plain"><b>${p[0]}:</b> ${p[1]}</p>`).join('');
    h += '</section>';
  }
  return h;
}
