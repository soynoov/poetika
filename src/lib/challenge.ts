import { challengeWordCategories } from '../data/challengeWords';

export type DailyChallengeSlot = {
	category: string;
	marker: string;
	word: string;
};

export type DailyChallenge = {
	dateKey: string;
	slots: [DailyChallengeSlot, DailyChallengeSlot, DailyChallengeSlot];
	summary: string;
};

const MADRID_TIME_ZONE = 'Europe/Madrid';

export function getMadridDateKey(date = new Date()) {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: MADRID_TIME_ZONE,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).formatToParts(date);

	const year = parts.find((part) => part.type === 'year')?.value;
	const month = parts.find((part) => part.type === 'month')?.value;
	const day = parts.find((part) => part.type === 'day')?.value;

	if (!year || !month || !day) {
		return date.toISOString().slice(0, 10);
	}

	return `${year}-${month}-${day}`;
}

function markerFor(category: string) {
	return category.trim().slice(0, 1).toUpperCase() || 'P';
}

function buildSummary(slots: DailyChallengeSlot[]) {
	return `${slots[0].word}, ${slots[1].word}, ${slots[2].word}.`;
}

function hashString(value: string) {
	let hash = 2166136261;

	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}

	return hash >>> 0;
}

function createSeededRandom(seed: string) {
	let state = hashString(seed) || 1;

	return () => {
		// Keep the same seed producing the same daily words on every client.
		state += 0x6d2b79f5;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function pickWord(words: string[], random: () => number) {
	if (!words.length) {
		return '';
	}

	return words[Math.floor(random() * words.length)] ?? words[0];
}

function pickDistinctCategories(dateKey: string) {
	const random = createSeededRandom(dateKey);
	const pool = [...challengeWordCategories];
	const chosen: typeof challengeWordCategories = [];

	while (pool.length && chosen.length < 3) {
		const index = Math.floor(random() * pool.length);
		const [item] = pool.splice(index, 1);

		if (item) {
			chosen.push(item);
		}
	}

	return chosen;
}

export function getFallbackDailyChallenge(dateKey = getMadridDateKey()): DailyChallenge {
	const random = createSeededRandom(dateKey);
	const categories = pickDistinctCategories(dateKey);
	const slots = categories.map((category) => ({
		category: category.name,
		marker: markerFor(category.name),
		word: pickWord(category.words, random),
	})) as DailyChallenge['slots'];

	return {
		dateKey,
		slots,
		summary: buildSummary(slots),
	};
}

export async function loadDailyChallenge(dateKey = getMadridDateKey()) {
	return getFallbackDailyChallenge(dateKey);
}
