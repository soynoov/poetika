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
		label: 'box',
		path: 'M12 3 4.5 7 12 11 19.5 7 12 3ZM4.5 7v10L12 21l7.5-4V7M12 11v10',
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
		label: 'bug',
		path: 'M9 6.5V5a3 3 0 1 1 6 0v1.5M8 9h8a2 2 0 0 1 2 2v4a6 6 0 1 1-12 0v-4a2 2 0 0 1 2-2Zm4 0v10M3 13h3M18 13h3M4.5 8.5l2 2M17.5 8.5l-2 2M4.5 18.5l2-2M17.5 18.5l-2-2',
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
