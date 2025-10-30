import type { Movie } from '../types';

export const fakeMovieDatabase: Movie[] = [
  {
    title: 'Blade Runner 2049',
    year: 2017,
    genre: ['Science Fiction', 'Drama', 'Thriller'],
    rating: 8.0,
    director: 'Denis Villeneuve',
    description:
      "A young blade runner's discovery of a long-buried secret leads him to track down former blade runner Rick Deckard.",
    familyRating: 'R',
    themes: ['Artificial Intelligence', 'Identity', 'Future dystopia', 'Philosophical'],
  },
  {
    title: 'Arrival',
    year: 2016,
    genre: ['Science Fiction', 'Drama'],
    rating: 7.9,
    director: 'Denis Villeneuve',
    description:
      'A linguist works with the military to communicate with alien lifeforms after twelve mysterious spacecraft land around the world.',
    familyRating: 'PG-13',
    themes: ['Communication', 'Time', 'Language', 'First contact'],
  },
  {
    title: 'Interstellar',
    year: 2014,
    genre: ['Science Fiction', 'Drama', 'Adventure'],
    rating: 8.6,
    director: 'Christopher Nolan',
    description:
      "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    familyRating: 'PG-13',
    themes: ['Space exploration', 'Time dilation', 'Family bonds', 'Survival'],
  },
  {
    title: 'The Martian',
    year: 2015,
    genre: ['Science Fiction', 'Drama', 'Adventure'],
    rating: 8.0,
    director: 'Ridley Scott',
    description:
      'An astronaut becomes stranded on Mars after his team assume him dead, and must rely on his ingenuity to find a way to signal to Earth.',
    familyRating: 'PG-13',
    themes: ['Survival', 'Problem solving', 'Optimism', 'Science'],
  },
  {
    title: 'Ex Machina',
    year: 2014,
    genre: ['Science Fiction', 'Drama', 'Thriller'],
    rating: 7.7,
    director: 'Alex Garland',
    description:
      'A young programmer is selected to participate in a ground-breaking experiment in synthetic intelligence.',
    familyRating: 'R',
    themes: ['Artificial Intelligence', 'Consciousness', 'Manipulation', 'Ethics'],
  },
  {
    title: 'Ready Player One',
    year: 2018,
    genre: ['Science Fiction', 'Adventure', 'Action'],
    rating: 7.4,
    director: 'Steven Spielberg',
    description:
      'When the creator of a virtual reality world dies, he releases a video challenge to all users.',
    familyRating: 'PG-13',
    themes: ['Virtual reality', 'Gaming', 'Pop culture', 'Adventure'],
  },
  {
    title: 'Star Wars: A New Hope',
    year: 1977,
    genre: ['Science Fiction', 'Adventure', 'Fantasy'],
    rating: 8.6,
    director: 'George Lucas',
    description:
      'Luke Skywalker joins forces with a Jedi Knight, a cocky pilot, a Wookiee and two droids to save the galaxy.',
    familyRating: 'PG',
    themes: ['Good vs evil', 'Coming of age', 'Space opera', 'Adventure'],
  },
  {
    title: 'The Matrix',
    year: 1999,
    genre: ['Science Fiction', 'Action'],
    rating: 8.7,
    director: 'Lana Wachowski, Lilly Wachowski',
    description:
      'A computer hacker learns from mysterious rebels about the true nature of his reality.',
    familyRating: 'R',
    themes: ['Reality vs simulation', 'Rebellion', 'Philosophy', 'Action'],
  },
  {
    title: 'WALL-E',
    year: 2008,
    genre: ['Animation', 'Science Fiction', 'Family'],
    rating: 8.4,
    director: 'Andrew Stanton',
    description:
      'In the distant future, a small waste-collecting robot inadvertently embarks on a space journey.',
    familyRating: 'G',
    themes: ['Environmental', 'Love', 'Technology', 'Hope'],
  },
  {
    title: 'Gravity',
    year: 2013,
    genre: ['Science Fiction', 'Thriller', 'Drama'],
    rating: 7.7,
    director: 'Alfonso Cuarón',
    description:
      'Two astronauts work together to survive after an accident leaves them stranded in space.',
    familyRating: 'PG-13',
    themes: ['Survival', 'Isolation', 'Resilience', 'Space'],
  },
];
