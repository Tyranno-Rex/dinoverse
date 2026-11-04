// Public game list — hand-edited, no secrets. Separate from data.js so the app generator never
// touches it. Each game gets a card of its own after the apps (assets/app.js buildGamePanel).
// `mosaic`: the name is shown only as a mosaic — and the names here are gibberish stand-ins, so
// neither the source nor an un-blurred mosaic says which game it is. Images live in image/games/.
// `stickers` go up on the hero with the apps' ones.
window.DINO_GAMES = [
  {
    id: 'g1',
    name: 'Qabuqy',
    mosaic: true,
    description: 'A roguelike where every moment is a gamble with fate — payoffs that burst, effects that hit hard.',
    version: '0.1.0',
    platforms: ['steam', 'android', 'ios'],
    icon: 'image/games/g1-icon.png',
    image: 'image/games/g1-mascot.png',
    stickers: ['image/games/g1-token.png', 'image/games/g1-joker.png'],
  },
  {
    id: 'g2',
    name: 'Kavypy\nQuzyzuj',
    mosaic: true,
    description: 'A simulation game: a small town grows into a big city, and you carve it into truck routes to keep every parcel moving.',
    version: '0.0.13',
    platforms: ['steam', 'android', 'ios'],
    icon: 'image/games/g2-icon.png',
    image: 'image/games/g2-mascot.png',
    stickers: ['image/games/g2-truck.png', 'image/games/g2-boxes.png'],
  },
  {
    id: 'g3',
    name: 'Zyq\nNehesegu',
    mosaic: true,
    description: 'A roguelike where your weakest card climbs a tower of hidden cards to take down the King.',
    version: '0.1.0',
    platforms: ['steam', 'android', 'ios'],
    icon: 'image/games/g3-icon.png',
    image: 'image/games/g3-mascot.png',
    stickers: ['image/games/g3-ace.png', 'image/games/g3-joker.png'],
  },
  {
    id: 'g4',
    name: 'Fujo\nKemadi',
    mosaic: true,
    description: 'A management game: a one-person video studio grows into a production company, one video at a time.',
    version: '0.0.1',
    platforms: ['win'],
    icon: 'image/games/g4-icon.png',
    image: 'image/games/g4-mascot.png',
    stickers: ['image/games/g4-camera.png', 'image/games/g4-chair.png'],
  },
];
