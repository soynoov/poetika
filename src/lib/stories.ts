import { supabase } from './supabase';

export type StoryRecord = {
	id: string;
	title: string;
	body: string;
	authorName: string;
	wordCount: number;
	challengeDate: string;
	createdAt: string;
	source: 'local' | 'supabase';
};

export type StoryDraft = {
	title: string;
	body: string;
	authorName: string;
};

const STORY_STORAGE_KEY = 'poetika:stories';
const DRAFT_STORAGE_PREFIX = 'poetika:draft:';

function hasWindow() {
	return typeof window !== 'undefined';
}

function safeRead<T>(key: string, fallback: T): T {
	if (!hasWindow()) return fallback;

	try {
		const raw = window.localStorage.getItem(key);
		if (!raw) return fallback;
		return JSON.parse(raw) as T;
	} catch {
		return fallback;
	}
}

function safeWrite(key: string, value: unknown) {
	if (!hasWindow()) return;

	try {
		window.localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// Ignore storage quota and serialization errors.
	}
}

export function countWords(text: string) {
	return text
		.trim()
		.split(/\s+/)
		.filter(Boolean).length;
}

export function loadStoryList() {
	return safeRead<StoryRecord[]>(STORY_STORAGE_KEY, []);
}

export function saveStoryList(stories: StoryRecord[]) {
	safeWrite(STORY_STORAGE_KEY, stories);
}

export function appendStory(story: StoryRecord) {
	const stories = loadStoryList();
	const nextStories = [story, ...stories];
	saveStoryList(nextStories);
	return nextStories;
}

export function loadDraft(dateKey: string) {
	return safeRead<StoryDraft>(`${DRAFT_STORAGE_PREFIX}${dateKey}`, {
		title: '',
		body: '',
		authorName: 'Anónimo',
	});
}

export function saveDraft(dateKey: string, draft: StoryDraft) {
	safeWrite(`${DRAFT_STORAGE_PREFIX}${dateKey}`, draft);
}

export function clearDraft(dateKey: string) {
	if (!hasWindow()) return;
	window.localStorage.removeItem(`${DRAFT_STORAGE_PREFIX}${dateKey}`);
}

export async function syncStoryToSupabase(story: StoryRecord) {
	if (!supabase) {
		return null;
	}

	const { data, error } = await supabase
		.from('stories')
		.insert({
			title: story.title,
			body: story.body,
			author_name: story.authorName,
			word_count: story.wordCount,
			challenge_date: story.challengeDate,
			source: story.source,
		})
		.select()
		.maybeSingle();

	if (error) {
		return null;
	}

	return data;
}
