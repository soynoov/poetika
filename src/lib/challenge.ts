import { supabase } from './supabase';

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
	source: 'fallback' | 'database';
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

export function getFallbackDailyChallenge(dateKey = getMadridDateKey()): DailyChallenge {
	const slots: DailyChallenge['slots'] = [
		{ category: 'Clima', marker: 'C', word: 'Niebla espesa' },
		{ category: 'Estilo', marker: 'E', word: 'Primera persona' },
		{ category: 'Temática', marker: 'T', word: 'Misterio' },
	];

	return {
		dateKey,
		generatedAt: new Date().toISOString(),
		slots,
		summary: buildSummary(slots),
		source: 'fallback',
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
		source: 'database',
	};
}

export async function loadDailyChallenge(dateKey = getMadridDateKey()) {
	if (!supabase) {
		return getFallbackDailyChallenge(dateKey);
	}

	try {
		const { data, error } = await supabase.rpc('get_daily_challenge', {
			requested_date: dateKey,
		});

		if (error || !data?.length) {
			return getFallbackDailyChallenge(dateKey);
		}

		return mapRpcChallenge(data[0]);
	} catch {
		return getFallbackDailyChallenge(dateKey);
	}
}
