export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export type Database = {
	__InternalSupabase: {
		PostgrestVersion: '14.1';
	};
	public: {
		Tables: {
			profiles: {
				Row: {
					avatar_url: string | null;
					bio: string | null;
					created_at: string;
					display_name: string;
					updated_at: string;
					user_id: string;
					username: string;
				};
				Insert: {
					avatar_url?: string | null;
					bio?: string | null;
					created_at?: string;
					display_name: string;
					updated_at?: string;
					user_id: string;
					username: string;
				};
				Update: {
					avatar_url?: string | null;
					bio?: string | null;
					created_at?: string;
					display_name?: string;
					updated_at?: string;
					user_id?: string;
					username?: string;
				};
				Relationships: [];
			};
			stories: {
				Row: {
					author_id: string;
					body: string;
					challenge_date: string;
					created_at: string;
					id: string;
					title: string;
					updated_at: string;
					word_count: number;
				};
				Insert: {
					author_id: string;
					body: string;
					challenge_date: string;
					created_at?: string;
					id?: string;
					title: string;
					updated_at?: string;
					word_count?: number;
				};
				Update: {
					author_id?: string;
					body?: string;
					challenge_date?: string;
					created_at?: string;
					id?: string;
					title?: string;
					updated_at?: string;
					word_count?: number;
				};
				Relationships: [];
			};
			story_likes: {
				Row: {
					created_at: string;
					story_id: string;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					story_id: string;
					user_id: string;
				};
				Update: {
					created_at?: string;
					story_id?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'story_likes_story_id_fkey';
						columns: ['story_id'];
						isOneToOne: false;
						referencedRelation: 'stories';
						referencedColumns: ['id'];
					},
				];
			};
		};
		Views: Record<string, never>;
		Functions: Record<string, never>;
		Enums: Record<string, never>;
		CompositeTypes: Record<string, never>;
	};
};
