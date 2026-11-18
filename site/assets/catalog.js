// What the site shows. Edit this file to change colours, models or wording.
// early = BDM-010 and BDM-020; later = BDM-030, BDM-040 and BDM-050.
window.CHAMELEON = {
  email: 'clearsense@dailyos.uk',
  fromPrice: 30,
  express: '2 to 5 days after we receive your controller',
  standard: '2 to 5 weeks after we receive your controller',
  models: [
    { id: 'BDM-010', group: 'early', note: 'The first PS5 controllers, from launch in 2020.' },
    { id: 'BDM-020', group: 'early', note: 'An early revision, much like the BDM-010.' },
    { id: 'BDM-030', group: 'later', note: 'The redesigned board, from around 2022.' },
    { id: 'BDM-040', group: 'later', note: 'A later revision with a lighter build.' },
    { id: 'BDM-050', group: 'later', note: 'The newest DualSense revision.' }
  ],
  colours: [
    { name: 'Clear', hex: '#E4EBEF', group: 'early', standard: true, express: false, blurb: 'See every part inside. The classic.' },
    { name: 'Purple Tinted Clear', hex: '#CDB8E8', group: 'early', standard: true, express: false, blurb: 'Clear with a soft violet glow.' },
    { name: 'Black', hex: '#1F1F23', group: 'later', standard: false, express: true, blurb: 'Deep, matte and understated.' },
    { name: 'Scarlet', hex: '#C8102E', group: 'later', standard: false, express: true, blurb: 'Loud, glossy, unmistakable red.' },
    { name: 'Grey with Black Buttons', hex: '#9C9CA3', group: 'later', standard: true, express: true, blurb: 'Retro grey with contrast buttons.' },
    { name: 'Emerald Clear', hex: '#3FBF8A', group: 'later', standard: true, express: false, blurb: 'Clear green, like sea glass.' },
    { name: 'Purple Clear', hex: '#9B6BD6', group: 'later', standard: true, express: false, blurb: 'A bold see-through purple.' },
    { name: 'Black Clear', hex: '#55555C', group: 'later', standard: true, express: false, blurb: 'Smoked see-through black.' },
    { name: 'Lime Green Clear', hex: '#A6DD2E', group: 'later', standard: true, express: true, blurb: 'Bright, zesty and clear.' },
    { name: 'Dragon', hex: '#B8452A', group: 'later', standard: false, express: true, blurb: 'Scaled, fiery and full of texture.' },
    { name: 'Anime', hex: '#F27AB0', group: 'later', standard: false, express: true, blurb: 'Halftone pink with sparkles.' }
  ]
};
