import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl =
	import.meta.env.PUBLIC_SUPABASE_URL ?? import.meta.env.SUPABASE_URL ?? '';
const supabaseAnonKey =
	import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? import.meta.env.SUPABASE_ANON_KEY ?? '';

export const supabase = supabaseUrl && supabaseAnonKey
	? createClient<Database>(supabaseUrl, supabaseAnonKey, {
			auth: {
				persistSession: true,
				autoRefreshToken: true,
				detectSessionInUrl: true,
			},
		})
	: null;
