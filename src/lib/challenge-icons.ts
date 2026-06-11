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
		label: 'paperclip',
		path: 'm10 13.5 4.75-4.75a2.3 2.3 0 1 1 3.25 3.25l-7.2 7.2a4.25 4.25 0 1 1-6-6l7.2-7.2',
	},
	emocion: {
		label: 'heart',
		path: 'm12 20-1.1-1C5.15 13.85 2 11 2 7.5A4.5 4.5 0 0 1 6.5 3 4.9 4.9 0 0 1 12 6.1 4.9 4.9 0 0 1 17.5 3 4.5 4.5 0 0 1 22 7.5c0 3.5-3.15 6.35-8.9 11.5Z',
	},
	personaje: {
		label: 'user',
		path: 'M12 12a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 12 12Zm-6 8a6 6 0 0 1 12 0Z',
	},
	animal: {
		label: 'paw',
		path: 'M6.6 11.2a1.9 1.9 0 1 0-1.9-1.9 1.9 1.9 0 0 0 1.9 1.9Zm4.1-4A2.1 2.1 0 1 0 8.6 5.1a2.1 2.1 0 0 0 2.1 2.1Zm4.7 0a2.1 2.1 0 1 0-2.1-2.1 2.1 2.1 0 0 0 2.1 2.1Zm2.9 4a1.9 1.9 0 1 0-1.9-1.9 1.9 1.9 0 0 0 1.9 1.9Zm-6.3 2.1c-1.9 0-5 1.1-5 3.6A2.9 2.9 0 0 0 10 20h4a2.9 2.9 0 0 0 3-3.1c0-2.5-3.1-3.6-5-3.6Z',
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
