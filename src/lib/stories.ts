import { supabase } from './supabase';
import type { Database } from '../types/database';
import { getMadridDateKey } from './challenge';

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
	body: string;
};

export type ProfileStoryStats = {
	totalStories: number;
	currentStreak: number;
	streakActive: boolean;
};

export type LeaderboardEntry = {
	author: StoryAuthor;
	points: number;
	totalLikes: number;
	totalStories: number;
	highlight: string;
	preview: string;
	rank: number;
	isViewer: boolean;
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

export async function hasAuthorStoryForChallengeDate(authorId: string, challengeDate: string) {
	if (!supabase) {
		return false;
	}

	const { data, error } = await supabase
		.from('stories')
		.select('id')
		.eq('author_id', authorId)
		.eq('challenge_date', challengeDate)
		.limit(1)
		.maybeSingle();

	if (error) {
		throw error;
	}

	return Boolean(data?.id);
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
	const uniqueDates = [...new Set(stories.map((story) => story.challengeDate))].sort((left, right) =>
		right.localeCompare(left),
	);
	const todayKey = getMadridDateKey();
	const streakActive = uniqueDates[0] === todayKey;
	let currentStreak = 0;

	if (uniqueDates.length) {
		let previousDate = new Date(`${uniqueDates[0]}T00:00:00`);
		currentStreak = 1;

		for (let index = 1; index < uniqueDates.length; index += 1) {
			const currentDate = new Date(`${uniqueDates[index]}T00:00:00`);
			const diffInDays =
				(previousDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24);

			if (diffInDays !== 1) {
				break;
			}

			currentStreak += 1;
			previousDate = currentDate;
		}
	}

	return {
		totalStories: stories.length,
		currentStreak,
		streakActive,
	} satisfies ProfileStoryStats;
}

function createHighlight(totalStories: number, totalLikes: number, rank: number, isViewer: boolean) {
	if (isViewer && rank > 1) {
		return `Faltan ${Math.max(1, rank - 1)} puestos para la corona`;
	}

	if (totalLikes >= 25) {
		return 'Virtuoso';
	}

	if (totalStories >= 3) {
		return 'Escribe';
	}

	return 'Ascenso';
}

export async function fetchLeaderboard(viewerId?: string) {
	if (!supabase) {
		return [];
	}

	const { data, error } = await supabase.from('stories').select('*');

	if (error) {
		throw error;
	}

	const stories = data ?? [];
	if (!stories.length) {
		return [];
	}

	const [profilesMap, likesMap] = await Promise.all([
		getProfilesMap(stories.map((story) => story.author_id)),
		getLikesMap(stories.map((story) => story.id)),
	]);

	const grouped = new Map<
		string,
		{
			author: StoryAuthor;
			totalLikes: number;
			totalStories: number;
			totalWords: number;
			latestStory: StoryRow;
		}
	>();

	for (const story of stories) {
		const author =
			profilesMap.get(story.author_id) ?? {
				id: story.author_id,
				username: 'writer',
				displayName: 'Writer',
				avatarUrl: null,
			};
		const likes = likesMap.get(story.id)?.length ?? 0;
		const current = grouped.get(story.author_id);

		if (!current) {
			grouped.set(story.author_id, {
				author,
				totalLikes: likes,
				totalStories: 1,
				totalWords: story.word_count,
				latestStory: story,
			});
			continue;
		}

		current.totalLikes += likes;
		current.totalStories += 1;
		current.totalWords += story.word_count;
		if (new Date(story.created_at).getTime() > new Date(current.latestStory.created_at).getTime()) {
			current.latestStory = story;
		}
	}

	return [...grouped.values()]
		.map((entry) => ({
			author: entry.author,
			points: entry.totalLikes,
			totalLikes: entry.totalLikes,
			totalStories: entry.totalStories,
			preview: buildStoryPreview(entry.latestStory.body, 56),
			isViewer: viewerId === entry.author.id,
		}))
		.sort((left, right) => {
			if (right.points !== left.points) {
				return right.points - left.points;
			}

			if (right.totalStories !== left.totalStories) {
				return right.totalStories - left.totalStories;
			}

			return left.author.displayName.localeCompare(right.author.displayName, 'es');
		})
		.map((entry, index) => ({
			...entry,
			rank: index + 1,
			highlight: createHighlight(entry.totalStories, entry.totalLikes, index + 1, entry.isViewer),
		}))
		.slice(0, 50) satisfies LeaderboardEntry[];
}
