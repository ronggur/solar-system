import type { PlanetData } from '@/types';

export const planets: PlanetData[] = [
  {
    id: 'mercury',
    name: 'Mercury',
    radius: 0.38,
    distance: 12,
    orbitalSpeed: 4.1,
    rotationSpeed: 0.01,
    color: '#8C8C8C',
    emissive: '#4A4A4A',
    emissiveIntensity: 0.1,
    description: 'The smallest planet in our solar system and closest to the Sun.',
    facts: [
      'Mercury has no atmosphere to retain heat',
      'Temperatures range from -173°C to 427°C',
      'A day on Mercury lasts 59 Earth days',
      'Mercury has a solid, cratered surface'
    ],
    moons: 0,
    temperature: '-173°C to 427°C',
    dayLength: '59 Earth days',
    yearLength: '88 Earth days'
  },
  {
    id: 'venus',
    name: 'Venus',
    radius: 0.95,
    distance: 18,
    orbitalSpeed: 1.6,
    rotationSpeed: -0.004,
    color: '#E6E6B8',
    emissive: '#D4D4A0',
    emissiveIntensity: 0.15,
    description: 'The hottest planet in our solar system with a thick, toxic atmosphere.',
    facts: [
      'Venus rotates backwards compared to other planets',
      'Surface temperature is 462°C - hot enough to melt lead',
      'A day on Venus is longer than its year',
      'Venus has crushing atmospheric pressure'
    ],
    moons: 0,
    temperature: '462°C',
    dayLength: '243 Earth days',
    yearLength: '225 Earth days'
  },
  {
    id: 'earth',
    name: 'Earth',
    radius: 1,
    distance: 25,
    orbitalSpeed: 1,
    rotationSpeed: 0.02,
    color: '#1E90FF',
    emissive: '#4A90E2',
    emissiveIntensity: 0.4,
    description: 'Our home planet, the only known planet to support life.',
    facts: [
      'Earth is 71% water and 29% land',
      'The atmosphere is 78% nitrogen and 21% oxygen',
      'Earth has one natural satellite - the Moon',
      'Earth\'s magnetic field protects us from solar radiation'
    ],
    moons: 1,
    temperature: '-88°C to 58°C',
    dayLength: '24 hours',
    yearLength: '365.25 days'
  },
  {
    id: 'mars',
    name: 'Mars',
    radius: 0.53,
    distance: 35,
    orbitalSpeed: 0.53,
    rotationSpeed: 0.018,
    color: '#C1440E',
    emissive: '#8B2E00',
    emissiveIntensity: 0.15,
    description: 'The Red Planet, known for its iron oxide surface and polar ice caps.',
    facts: [
      'Mars has the largest volcano in the solar system - Olympus Mons',
      'The planet has two moons: Phobos and Deimos',
      'Mars experiences dust storms that can cover the entire planet',
      'Evidence suggests Mars once had liquid water'
    ],
    moons: 2,
    temperature: '-153°C to 20°C',
    dayLength: '24.6 hours',
    yearLength: '687 Earth days'
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    radius: 4,
    distance: 55,
    orbitalSpeed: 0.08,
    rotationSpeed: 0.04,
    color: '#D4A574',
    emissive: '#8B6914',
    emissiveIntensity: 0.1,
    description: 'The largest planet in our solar system, a gas giant with iconic bands.',
    facts: [
      'Jupiter has 95 known moons including the four Galilean moons',
      'The Great Red Spot is a storm larger than Earth',
      'Jupiter\'s magnetic field is 20,000 times stronger than Earth\'s',
      'Jupiter is mostly hydrogen and helium'
    ],
    moons: 95,
    temperature: '-110°C',
    dayLength: '9.9 hours',
    yearLength: '11.9 Earth years'
  },
  {
    id: 'saturn',
    name: 'Saturn',
    radius: 3.5,
    distance: 80,
    orbitalSpeed: 0.03,
    rotationSpeed: 0.038,
    color: '#F4D03F',
    emissive: '#B8860B',
    emissiveIntensity: 0.1,
    description: 'Famous for its spectacular ring system, the second largest planet.',
    facts: [
      'Saturn has 146 known moons',
      'Its rings are made of ice, rock, and dust particles',
      'Saturn is less dense than water - it would float',
      'The rings extend up to 282,000 km from the planet'
    ],
    moons: 146,
    temperature: '-140°C',
    dayLength: '10.7 hours',
    yearLength: '29.5 Earth years'
  },
  {
    id: 'uranus',
    name: 'Uranus',
    radius: 2.5,
    distance: 110,
    orbitalSpeed: 0.01,
    rotationSpeed: -0.03,
    color: '#AED6F1',
    emissive: '#5DADE2',
    emissiveIntensity: 0.15,
    description: 'An ice giant that rotates on its side, with a faint ring system.',
    facts: [
      'Uranus rotates on its side at a 98-degree angle',
      'It has 27 known moons',
      'Uranus has faint rings discovered in 1977',
      'The planet is made of water, methane, and ammonia ices'
    ],
    moons: 27,
    temperature: '-195°C',
    dayLength: '17.2 hours',
    yearLength: '84 Earth years'
  },
  {
    id: 'neptune',
    name: 'Neptune',
    radius: 2.4,
    distance: 140,
    orbitalSpeed: 0.006,
    rotationSpeed: 0.032,
    color: '#5B7CFF',
    emissive: '#2E4A8F',
    emissiveIntensity: 0.2,
    description: 'The windiest planet, a deep blue ice giant at the edge of our solar system.',
    facts: [
      'Neptune has winds up to 2,100 km/h - the fastest in the solar system',
      'It has 14 known moons, with Triton being the largest',
      'Neptune was the first planet predicted by mathematics',
      'The planet takes 165 Earth years to orbit the Sun'
    ],
    moons: 14,
    temperature: '-200°C',
    dayLength: '16.1 hours',
    yearLength: '165 Earth years'
  },
  {
    id: 'pluto',
    name: 'Pluto',
    radius: 0.18,
    distance: 170,
    orbitalSpeed: 0.004,
    rotationSpeed: 0.015,
    color: '#E8D4B8',
    emissive: '#C4A574',
    emissiveIntensity: 0.15,
    description: 'A dwarf planet in the Kuiper belt, once considered the ninth planet.',
    facts: [
      'Pluto was reclassified as a dwarf planet in 2006',
      'It has five known moons: Charon, Styx, Nix, Kerberos, and Hydra',
      'Pluto\'s orbit is highly elliptical and tilted',
      'A year on Pluto lasts 248 Earth years',
      'The New Horizons spacecraft flew by Pluto in 2015'
    ],
    moons: 5,
    temperature: '-223°C to -233°C',
    dayLength: '6.4 Earth days',
    yearLength: '248 Earth years'
  }
];

export const sunData = {
  id: 'sun',
  name: 'Sun',
  radius: 6,
  distance: 0,
  color: '#FDB813',
  emissive: '#FF6B00',
  emissiveIntensity: 2,
  description: 'The star at the center of our solar system, containing 99.86% of the system\'s mass.',
  facts: [
    'The Sun is 109 times wider than Earth',
    'It takes 8 minutes and 20 seconds for light to reach Earth',
    'The Sun is 4.6 billion years old',
    'The Sun converts 4 million tons of matter into energy every second'
  ],
  temperature: '5,500°C (surface), 15 million°C (core)',
  type: 'Yellow Dwarf Star'
};

export const scaleFactors = {
  distanceScale: 2,
  sizeScale: 0.3,
  orbitScale: 0.8
};
