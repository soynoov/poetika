import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type AuthChangeHandler = (session: Session | null) => void;

const configuredSiteUrl = normalizeBaseUrl(import.meta.env.PUBLIC_SITE_URL ?? '');

function normalizeBaseUrl(value: string) {
	const trimmed = value.trim();
	if (!trimmed) {
		return '';
	}

	if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
		return trimmed.replace(/\/+$/, '');
	}

	return `https://${trimmed}`.replace(/\/+$/, '');
}

function getAuthRedirectOrigin() {
	if (typeof window === 'undefined') {
		return configuredSiteUrl || undefined;
	}

	const currentOrigin = window.location.origin;
	const isLocalHost =
		window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

	if (isLocalHost) {
		return currentOrigin;
	}

	return configuredSiteUrl || currentOrigin;
}

export function isSupabaseConfigured() {
	return Boolean(supabase);
}

export async function getSession() {
	if (!supabase) {
		return null;
	}

	const { data } = await supabase.auth.getSession();
	return data.session;
}

export async function getUser() {
	return (await getSession())?.user ?? null;
}

export async function signUpWithEmail(input: {
	email: string;
	password: string;
	username: string;
	displayName: string;
}) {
	if (!supabase) {
		throw new Error('Supabase no esta configurado.');
	}

	const { data, error } = await supabase.auth.signUp({
		email: input.email,
		password: input.password,
		options: {
			data: {
				username: input.username,
				display_name: input.displayName,
			},
		},
	});

	if (error) {
		throw error;
	}

	return data;
}

export async function signInWithEmail(email: string, password: string) {
	if (!supabase) {
		throw new Error('Supabase no esta configurado.');
	}

	const { data, error } = await supabase.auth.signInWithPassword({
		email,
		password,
	});

	if (error) {
		throw error;
	}

	return data;
}

export async function signInWithGoogle() {
	if (!supabase) {
		throw new Error('Supabase no esta configurado.');
	}

	const redirectOrigin = getAuthRedirectOrigin();
	const redirectTo = redirectOrigin ? `${redirectOrigin}/profile` : undefined;

	const { data, error } = await supabase.auth.signInWithOAuth({
		provider: 'google',
		options: {
			redirectTo,
		},
	});

	if (error) {
		throw error;
	}

	return data;
}

export async function signOut() {
	if (!supabase) {
		return;
	}

	const { error } = await supabase.auth.signOut();
	if (error) {
		throw error;
	}
}

export function onAuthStateChange(handler: AuthChangeHandler) {
	if (!supabase) {
		return () => undefined;
	}

	const {
		data: { subscription },
	} = supabase.auth.onAuthStateChange((_event, session) => {
		handler(session);
	});

	return () => subscription.unsubscribe();
}

export function getUserEmail(user: User | null) {
	return user?.email ?? '';
}
