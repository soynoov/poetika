export type ChallengeWordCategory = {
  slug: string;
  name: string;
  words: string[];
};

export const challengeWordCategories: ChallengeWordCategory[] = [
  {
    slug: 'clima',
    name: 'Clima',
    words: [
      'niebla espesa',
      'tormenta electrica',
      'calor sofocante',
      'lluvia fina',
      'viento salado',
    ],
  },
  {
    slug: 'lugar',
    name: 'Lugar',
    words: [
      'cabana',
      'puerto',
      'hospital abandonado',
      'azotea',
      'estacion vacia',
    ],
  },
  {
    slug: 'objeto',
    name: 'Objeto',
    words: ['espejo', 'llave', 'carta', 'reloj roto', 'anillo dorado'],
  },
  {
    slug: 'emocion',
    name: 'Emocion',
    words: ['miedo', 'culpa', 'deseo', 'esperanza', 'rabia'],
  },
  {
    slug: 'personaje',
    name: 'Personaje',
    words: ['anciana', 'marinero', 'niño perdido', 'detective', 'heredera'],
  },
  {
    slug: 'objeto',
    name: 'Objeto',
    words: [
      'cuchara',
      'palo',
      'cuaderno',
      'pluma',
      'manzana',
      'vaso',
      'destornillador',
      'moneda',
      'collar',
      'dados',
    ],
  },
  {
    slug: 'animal',
    name: 'Animal',
    words: [
      'perro',
      'gato',
      'rinoceronte',
      'caballo',
      'serpiente',
      'ajolote',
      'mapache',
      'oveja',
    ],
  },
];
