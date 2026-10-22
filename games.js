// Public game list — hand-edited, no secrets. Separate from data.js so the app generator never
// touches it. A game shows only its genre and a few objects from inside it (image/games/) —
// no name, no screenshots, nothing that says which game it is.
window.DINO_GAMES = [
  {
    genre: 'Roguelike',
    items: ['image/games/a-1.png', 'image/games/a-2.png', 'image/games/a-3.png', 'image/games/a-4.png'],
  },
  {
    genre: 'Simulation',
    items: ['image/games/b-1.png', 'image/games/b-2.png', 'image/games/b-3.png', 'image/games/b-4.png'],
  },
  {
    genre: 'Roguelike',
    pixel: true,
    items: ['image/games/c-1.png', 'image/games/c-2.png', 'image/games/c-3.png', 'image/games/c-4.png'],
  },
];
