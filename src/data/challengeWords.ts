export type ChallengeWordCategory = {
	slug: string;
	name: string;
	words: string[];
};

export const challengeWordCategories: ChallengeWordCategory[] = [
	{
		slug: 'clima',
		name: 'Clima',
		words: ['niebla espesa', 'tormenta electrica', 'calor sofocante', 'lluvia fina', 'viento salado'],
	},
	{
		slug: 'estilo',
		name: 'Estilo',
		words: ['primera persona', 'tercera persona', 'monologo interior', 'tono poetico', 'realismo sucio'],
	},
	{
		slug: 'tematica',
		name: 'Tematica',
		words: ['misterio', 'terror', 'nostalgia', 'supervivencia', 'traicion'],
	},
	{
		slug: 'lugar',
		name: 'Lugar',
		words: ['cabana', 'puerto', 'hospital abandonado', 'azotea', 'estacion vacia'],
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
		slug: 'restriccion',
		name: 'Restriccion',
		words: ['un solo lugar', 'sin dialogo', 'solo una noche', 'sin nombres propios', 'final inesperado'],
	},
];
