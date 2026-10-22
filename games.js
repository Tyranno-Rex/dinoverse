// Public game list — hand-edited, no secrets. Separate from data.js so the app generator never
// touches it. A game gets the same card as an app (assets/app.js buildPanel); `soon` = not out yet.
// `stickers` go up on the hero with the apps' ones. Images live in image/games/.
window.DINO_GAMES = [
  {
    id: 'batota',
    name: 'Batota',
    description: 'A roguelike where every moment is a gamble with fate — payoffs that burst, effects that hit hard.',
    version: '0.1.0',
    platforms: ['steam', 'android', 'ios'],
    soon: true,
    icon: 'image/games/batota-icon.png',
    image: 'image/games/batota-mascot.png',
    stickers: ['image/games/batota-token.png', 'image/games/batota-logo.png'],
  },
  {
    id: 'parcel-heights',
    name: 'Parcel\nHeights',
    description: 'A simulation game: a small town grows into a big city, and you carve it into truck routes to keep every parcel moving.',
    version: '0.0.13',
    platforms: ['steam', 'android', 'ios'],
    soon: true,
    icon: 'image/games/parcel-heights-icon.png',
    image: 'image/games/parcel-heights-mascot.png',
    stickers: ['image/games/parcel-heights-truck.png', 'image/games/parcel-heights-boxes.png'],
  },
  {
    id: 'ace-ascendant',
    name: 'Ace\nAscendant',
    description: 'A roguelike where your weakest card climbs a tower of hidden cards to take down the King.',
    version: '0.1.0',
    platforms: ['steam', 'android', 'ios'],
    soon: true,
    icon: 'image/games/ace-ascendant-icon.png',
    image: 'image/games/ace-ascendant-mascot.png',
    stickers: ['image/games/ace-ascendant-ace.png', 'image/games/ace-ascendant-joker.png'],
  },
];
