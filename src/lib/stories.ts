import { supabase } from './supabase';

export type StoryRecord = {
	id: string;
	title: string;
	body: string;
	authorName: 'Anonimo';
	wordCount: number;
	likes: number;
	challengeDate: string;
	createdAt: string;
	source: 'local' | 'supabase';
};

export type StoryDraft = {
	title: string;
	body: string;
};

const STORY_STORAGE_KEY = 'poetika:stories';
const DRAFT_STORAGE_PREFIX = 'poetika:draft:';
const STORY_LIKES_STORAGE_KEY = 'poetika:story-likes';

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
	const stories = safeRead<StoryRecord[]>(STORY_STORAGE_KEY, []);

	return stories.map((story) => ({
		...story,
		authorName: 'Anonimo' as const,
		likes: Number.isFinite(story.likes) ? story.likes : 0,
	}));
}

export function saveStoryList(stories: StoryRecord[]) {
	safeWrite(STORY_STORAGE_KEY, stories);
}

export function sortStories(stories: StoryRecord[]) {
	return [...stories].sort((left, right) => {
		if (right.likes !== left.likes) {
			return right.likes - left.likes;
		}

		return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
	});
}

export function appendStory(story: StoryRecord) {
	const stories = sortStories([story, ...loadStoryList()]);
	saveStoryList(stories);
	return stories;
}

export function getStoriesForChallengeDate(challengeDate: string) {
	return sortStories(loadStoryList().filter((story) => story.challengeDate === challengeDate));
}

export function loadDraft(dateKey: string) {
	return safeRead<StoryDraft>(`${DRAFT_STORAGE_PREFIX}${dateKey}`, {
		title: '',
		body: '',
	});
}

export function saveDraft(dateKey: string, draft: StoryDraft) {
	safeWrite(`${DRAFT_STORAGE_PREFIX}${dateKey}`, draft);
}

export function clearDraft(dateKey: string) {
	if (!hasWindow()) return;
	window.localStorage.removeItem(`${DRAFT_STORAGE_PREFIX}${dateKey}`);
}

export function loadLikedStoryIds() {
	return safeRead<string[]>(STORY_LIKES_STORAGE_KEY, []);
}

function saveLikedStoryIds(storyIds: string[]) {
	safeWrite(STORY_LIKES_STORAGE_KEY, storyIds);
}

export function hasLikedStory(storyId: string) {
	return loadLikedStoryIds().includes(storyId);
}

export function toggleStoryLike(storyId: string) {
	const likedStoryIds = new Set(loadLikedStoryIds());
	const stories = loadStoryList();
	const story = stories.find((item) => item.id === storyId);

	if (!story) {
		return {
			stories,
			liked: likedStoryIds.has(storyId),
		};
	}

	if (likedStoryIds.has(storyId)) {
		likedStoryIds.delete(storyId);
		story.likes = Math.max(0, story.likes - 1);
	} else {
		likedStoryIds.add(storyId);
		story.likes += 1;
	}

	saveStoryList(sortStories(stories));
	saveLikedStoryIds([...likedStoryIds]);

	return {
		stories: sortStories(stories),
		liked: likedStoryIds.has(storyId),
	};
}

export function buildStoryPreview(body: string, limit = 180) {
	const normalized = body.replace(/\s+/g, ' ').trim();

	if (normalized.length <= limit) {
		return normalized;
	}

	return `${normalized.slice(0, limit).trimEnd()}...`;
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
