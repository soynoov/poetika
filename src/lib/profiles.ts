import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Database } from '../types/database';

export type ProfileRecord = Database['public']['Tables']['profiles']['Row'];

function normalizeUsername(value: string) {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9_]/g, '')
		.slice(0, 24);
}

export function formatProfileHandle(profile: Pick<ProfileRecord, 'username'>) {
	return `@${profile.username}`;
}

export async function getCurrentProfile(userId: string) {
	if (!supabase) {
		return null;
	}

	const { data, error } = await supabase
		.from('profiles')
		.select('*')
		.eq('user_id', userId)
		.maybeSingle();

	if (error) {
		throw error;
	}

	return data;
}

export async function getProfileByUsername(username: string) {
	if (!supabase) {
		return null;
	}

	const { data, error } = await supabase
		.from('profiles')
		.select('*')
		.ilike('username', username)
		.maybeSingle();

	if (error) {
		throw error;
	}

	return data;
}

export async function ensureProfileForUser(user: User) {
	const existing = await getCurrentProfile(user.id);

	if (existing) {
		return existing;
	}

	const displayName =
		typeof user.user_metadata.display_name === 'string' && user.user_metadata.display_name.trim()
			? user.user_metadata.display_name.trim()
			: user.email?.split('@')[0] ?? 'Writer';
	const usernameSeed =
		typeof user.user_metadata.username === 'string' && user.user_metadata.username.trim()
			? user.user_metadata.username
			: user.email?.split('@')[0] ?? 'writer';
	const username = normalizeUsername(usernameSeed).padEnd(3, 'x');

	if (!supabase) {
		return null;
	}

	const { data, error } = await supabase
		.from('profiles')
		.upsert(
			{
				user_id: user.id,
				display_name: displayName,
				username,
			},
			{ onConflict: 'user_id' },
		)
		.select('*')
		.maybeSingle();

	if (error) {
		throw error;
	}

	return data;
}

export async function updateCurrentProfile(
	userId: string,
	input: Pick<ProfileRecord, 'display_name' | 'bio' | 'avatar_url'> & { username: string },
) {
	if (!supabase) {
		throw new Error('Supabase no esta configurado.');
	}

	const payload: Database['public']['Tables']['profiles']['Update'] = {
		display_name: input.display_name.trim(),
		bio: input.bio?.trim() || null,
		avatar_url: input.avatar_url?.trim() || null,
		username: normalizeUsername(input.username),
	};

	const { data, error } = await supabase
		.from('profiles')
		.update(payload)
		.eq('user_id', userId)
		.select('*')
		.maybeSingle();

	if (error) {
		throw error;
	}

	return data;
}
