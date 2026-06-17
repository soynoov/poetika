export type ChallengeIcon = {
	label: string;
	path: string;
};

const fallbackIcon: ChallengeIcon = {
	label: 'bookmark',
	path: 'M7 4.5h10A1.5 1.5 0 0 1 18.5 6v14l-6.5-3.8L5.5 20V6A1.5 1.5 0 0 1 7 4.5Z',
};

const challengeIconsByCategory: Record<string, ChallengeIcon> = {
	clima: {
		label: 'cloud',
		path: 'M7 18a4.6 4.6 0 1 1 .94-9.1A5.5 5.5 0 0 1 18 11.5 3.5 3.5 0 1 1 18 18Z',
	},
	lugar: {
		label: 'map-pin',
		path: 'M12 21s6-4.35 6-10a6 6 0 1 0-12 0c0 5.65 6 10 6 10Zm0-7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
	},
	objeto: {
		label: 'lock',
		path: 'M8 10V8a4 4 0 1 1 8 0v2M7 10h10a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z',
	},
	emocion: {
		label: 'sparkles',
		path: 'M12 3l1.3 3.7L17 8l-3.7 1.3L12 13l-1.3-3.7L7 8l3.7-1.3L12 3Zm6 9 .75 2.25L21 15l-2.25.75L18 18l-.75-2.25L15 15l2.25-.75L18 12ZM6 14l1 2.5L9.5 17 7 18l-1 2.5L5 18l-2.5-1L5 16.5 6 14Z',
	},
	personaje: {
		label: 'user',
		path: 'M12 12a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 12 12Zm-6 8a6 6 0 0 1 12 0Z',
	},
	animal: {
		label: 'paw',
		path: 'M8 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm8 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM6 16a1.75 1.75 0 1 0 0-3.5A1.75 1.75 0 0 0 6 16Zm12 0a1.75 1.75 0 1 0 0-3.5A1.75 1.75 0 0 0 18 16Zm-6 4c2.7 0 4.5-1.3 4.5-3.2 0-1.65-1.1-2.8-2.6-2.8-.88 0-1.25.27-1.9.8-.65-.53-1.02-.8-1.9-.8-1.5 0-2.6 1.15-2.6 2.8C7.5 18.7 9.3 20 12 20Z',
	},
};

function normalizeCategoryKey(category: string) {
	return category
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.trim()
		.toLowerCase();
}

export function getChallengeIcon(category: string) {
	return challengeIconsByCategory[normalizeCategoryKey(category)] ?? fallbackIcon;
}
