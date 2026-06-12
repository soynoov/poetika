import { supabase } from './supabase';
import type { Database } from '../types/database';

export type StoryRow = Database['public']['Tables']['stories']['Row'];
export type StoryLikeRow = Database['public']['Tables']['story_likes']['Row'];

export type StoryAuthor = {
	id: string;
	username: string;
	displayName: string;
	avatarUrl: string | null;
};

export type StoryRecord = {
	id: string;
	title: string;
	body: string;
	wordCount: number;
	likes: number;
	challengeDate: string;
	createdAt: string;
	updatedAt: string;
	author: StoryAuthor;
	viewerHasLiked: boolean;
	isOwnedByViewer: boolean;
};

export type StoryDraft = {
	title: string;
	body: string;
};

export type ProfileStoryStats = {
	totalStories: number;
	totalLikes: number;
	topStories: number;
	activeDays: number;
};

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
		// Ignore quota and serialization errors.
	}
}

export function countWords(text: string) {
	return text
		.trim()
		.split(/\s+/)
		.filter(Boolean).length;
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

export function buildStoryPreview(body: string, limit = 180) {
	const normalized = body.replace(/\s+/g, ' ').trim();

	if (normalized.length <= limit) {
		return normalized;
	}

	return `${normalized.slice(0, limit).trimEnd()}...`;
}

async function getProfilesMap(userIds: string[]) {
	if (!supabase || !userIds.length) {
		return new Map<string, StoryAuthor>();
	}

	const uniqueUserIds = [...new Set(userIds)];
	const { data, error } = await supabase
		.from('profiles')
		.select('user_id, username, display_name, avatar_url')
		.in('user_id', uniqueUserIds);

	if (error) {
		throw error;
	}

	return new Map(
		(data ?? []).map((profile) => [
			profile.user_id,
			{
				id: profile.user_id,
				username: profile.username,
				displayName: profile.display_name,
				avatarUrl: profile.avatar_url,
			},
		]),
	);
}

async function getLikesMap(storyIds: string[]) {
	if (!supabase || !storyIds.length) {
		return new Map<string, StoryLikeRow[]>();
	}

	const { data, error } = await supabase
		.from('story_likes')
		.select('story_id, user_id, created_at')
		.in('story_id', storyIds);

	if (error) {
		throw error;
	}

	const likesByStory = new Map<string, StoryLikeRow[]>();

	for (const like of data ?? []) {
		const likes = likesByStory.get(like.story_id) ?? [];
		likes.push(like);
		likesByStory.set(like.story_id, likes);
	}

	return likesByStory;
}

function mapStoryRecord(
	story: StoryRow,
	author: StoryAuthor | undefined,
	likes: StoryLikeRow[],
	viewerId?: string,
): StoryRecord {
	return {
		id: story.id,
		title: story.title,
		body: story.body,
		wordCount: story.word_count,
		likes: likes.length,
		challengeDate: story.challenge_date,
		createdAt: story.created_at,
		updatedAt: story.updated_at,
		author:
			author ?? {
				id: story.author_id,
				username: 'writer',
				displayName: 'Writer',
				avatarUrl: null,
			},
		viewerHasLiked: viewerId ? likes.some((like) => like.user_id === viewerId) : false,
		isOwnedByViewer: viewerId === story.author_id,
	};
}

export async function fetchStoriesForChallengeDate(challengeDate: string, viewerId?: string) {
	if (!supabase) {
		return [];
	}

	const { data, error } = await supabase
		.from('stories')
		.select('*')
		.eq('challenge_date', challengeDate)
		.order('created_at', { ascending: false });

	if (error) {
		throw error;
	}

	const stories = data ?? [];
	const [profilesMap, likesMap] = await Promise.all([
		getProfilesMap(stories.map((story) => story.author_id)),
		getLikesMap(stories.map((story) => story.id)),
	]);

	return stories
		.map((story) =>
			mapStoryRecord(
				story,
				profilesMap.get(story.author_id),
				likesMap.get(story.id) ?? [],
				viewerId,
			),
		)
		.sort((left, right) => {
			if (right.likes !== left.likes) {
				return right.likes - left.likes;
			}

			return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
		});
}

export async function fetchStoriesByAuthorId(authorId: string, viewerId?: string) {
	if (!supabase) {
		return [];
	}

	const { data, error } = await supabase
		.from('stories')
		.select('*')
		.eq('author_id', authorId)
		.order('created_at', { ascending: false });

	if (error) {
		throw error;
	}

	const stories = data ?? [];
	const [profilesMap, likesMap] = await Promise.all([
		getProfilesMap([authorId]),
		getLikesMap(stories.map((story) => story.id)),
	]);

	return stories.map((story) =>
		mapStoryRecord(
			story,
			profilesMap.get(story.author_id),
			likesMap.get(story.id) ?? [],
			viewerId,
		),
	);
}

export async function publishStory(input: {
	authorId: string;
	title: string;
	body: string;
	challengeDate: string;
}) {
	if (!supabase) {
		throw new Error('Supabase no esta configurado.');
	}

	const { data, error } = await supabase
		.from('stories')
		.insert({
			author_id: input.authorId,
			title: input.title.trim() || 'Sin titulo',
			body: input.body.trim(),
			challenge_date: input.challengeDate,
			word_count: countWords(input.body),
		})
		.select('*')
		.maybeSingle();

	if (error) {
		throw error;
	}

	return data;
}

export async function toggleStoryLike(storyId: string, viewerId: string) {
	if (!supabase) {
		throw new Error('Supabase no esta configurado.');
	}

	const { data: existing, error: readError } = await supabase
		.from('story_likes')
		.select('story_id, user_id')
		.eq('story_id', storyId)
		.eq('user_id', viewerId)
		.maybeSingle();

	if (readError) {
		throw readError;
	}

	if (existing) {
		const { error } = await supabase
			.from('story_likes')
			.delete()
			.eq('story_id', storyId)
			.eq('user_id', viewerId);

		if (error) {
			throw error;
		}

		return false;
	}

	const { error } = await supabase.from('story_likes').insert({
		story_id: storyId,
		user_id: viewerId,
	});

	if (error) {
		throw error;
	}

	return true;
}

export async function getProfileStoryStats(authorId: string) {
	const stories = await fetchStoriesByAuthorId(authorId);
	const totalLikes = stories.reduce((sum, story) => sum + story.likes, 0);
	const activeDays = new Set(stories.map((story) => story.challengeDate)).size;
	const topStories = stories.filter((story) => story.likes > 0).length;

	return {
		totalStories: stories.length,
		totalLikes,
		topStories,
		activeDays,
	} satisfies ProfileStoryStats;
}
