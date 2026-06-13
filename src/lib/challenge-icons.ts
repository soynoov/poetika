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
		path: 'M6 10.5a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5Zm4.5-3A1.75 1.75 0 1 0 10.5 4a1.75 1.75 0 0 0 0 3.5Zm3 0A1.75 1.75 0 1 0 13.5 4a1.75 1.75 0 0 0 0 3.5Zm4.5 3a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5ZM12 20c-2.9 0-5-1.65-5-3.65 0-1.7 1.45-2.85 3.15-2.85.95 0 1.45.3 1.85.6.35.25.58.4 1 .4s.65-.15 1-.4c.4-.3.9-.6 1.85-.6 1.7 0 3.15 1.15 3.15 2.85C17 18.35 14.9 20 12 20Z',
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
