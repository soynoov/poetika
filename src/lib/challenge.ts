import { challengeWordCategories } from '../data/challengeWords';

export type DailyChallengeSlot = {
	category: string;
	marker: string;
	word: string;
};

export type DailyChallenge = {
	dateKey: string;
	generatedAt: string;
	slots: [DailyChallengeSlot, DailyChallengeSlot, DailyChallengeSlot];
	summary: string;
	source: 'local';
};

const MADRID_TIME_ZONE = 'Europe/Madrid';
const CHALLENGE_INTERVAL_MINUTES = 5;

export function getMadridDateKey(date = new Date()) {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: MADRID_TIME_ZONE,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23',
	}).formatToParts(date);

	const year = parts.find((part) => part.type === 'year')?.value;
	const month = parts.find((part) => part.type === 'month')?.value;
	const day = parts.find((part) => part.type === 'day')?.value;
	const hour = parts.find((part) => part.type === 'hour')?.value;
	const minute = parts.find((part) => part.type === 'minute')?.value;

	if (!year || !month || !day || !hour || !minute) {
		return date.toISOString().slice(0, 16);
	}

	const minuteBucket = Math.floor(Number(minute) / CHALLENGE_INTERVAL_MINUTES) * CHALLENGE_INTERVAL_MINUTES;
	const paddedMinuteBucket = String(minuteBucket).padStart(2, '0');

	return `${year}-${month}-${day} ${hour}:${paddedMinuteBucket}`;
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
		generatedAt: new Date().toISOString(),
		slots,
		summary: buildSummary(slots),
		source: 'local',
	};
}

export function mapRpcChallenge(row: {
	challenge_date: string;
	first_category: string;
	first_word: string;
	second_category: string;
	second_word: string;
	third_category: string;
	third_word: string;
	generated_at: string;
}): DailyChallenge {
	const slots: DailyChallenge['slots'] = [
		{
			category: row.first_category,
			marker: markerFor(row.first_category),
			word: row.first_word,
		},
		{
			category: row.second_category,
			marker: markerFor(row.second_category),
			word: row.second_word,
		},
		{
			category: row.third_category,
			marker: markerFor(row.third_category),
			word: row.third_word,
		},
	];

	return {
		dateKey: row.challenge_date,
		generatedAt: row.generated_at,
		slots,
		summary: buildSummary(slots),
		source: 'local',
	};
}

export async function loadDailyChallenge(dateKey = getMadridDateKey()) {
	return getFallbackDailyChallenge(dateKey);
}
