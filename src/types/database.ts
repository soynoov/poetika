export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export type Database = {
	public: {
		Tables: {
			challenge_categories: {
				Row: {
					active: boolean;
					created_at: string;
					description: string | null;
					id: string;
					name: string;
					slug: string;
					sort_order: number;
					updated_at: string;
				};
				Insert: {
					active?: boolean;
					created_at?: string;
					description?: string | null;
					id?: string;
					name: string;
					slug: string;
					sort_order?: number;
					updated_at?: string;
				};
				Update: {
					active?: boolean;
					created_at?: string;
					description?: string | null;
					id?: string;
					name?: string;
					slug?: string;
					sort_order?: number;
					updated_at?: string;
				};
				Relationships: [];
			};
			challenge_words: {
				Row: {
					active: boolean;
					category_id: string;
					created_at: string;
					id: string;
					sort_order: number;
					updated_at: string;
					word: string;
				};
				Insert: {
					active?: boolean;
					category_id: string;
					created_at?: string;
					id?: string;
					sort_order?: number;
					updated_at?: string;
					word: string;
				};
				Update: {
					active?: boolean;
					category_id?: string;
					created_at?: string;
					id?: string;
					sort_order?: number;
					updated_at?: string;
					word?: string;
				};
				Relationships: [];
			};
				daily_challenges: {
				Row: {
					challenge_date: string;
					first_category_id: string;
					first_word_id: string;
					second_category_id: string;
					second_word_id: string;
					third_category_id: string;
					third_word_id: string;
					generated_at: string;
				};
				Insert: {
					challenge_date?: string;
					first_category_id: string;
					first_word_id: string;
					second_category_id: string;
					second_word_id: string;
					third_category_id: string;
					third_word_id: string;
					generated_at?: string;
				};
				Update: {
					challenge_date?: string;
					first_category_id?: string;
					first_word_id?: string;
					second_category_id?: string;
					second_word_id?: string;
					third_category_id?: string;
					third_word_id?: string;
					generated_at?: string;
				};
					Relationships: [];
				};
				stories: {
					Row: {
						author_name: string;
						body: string;
						challenge_date: string;
						created_at: string;
						id: string;
						source: string;
						title: string;
						updated_at: string;
						word_count: number;
					};
					Insert: {
						author_name?: string;
						body: string;
						challenge_date: string;
						created_at?: string;
						id?: string;
						source?: string;
						title: string;
						updated_at?: string;
						word_count?: number;
					};
					Update: {
						author_name?: string;
						body?: string;
						challenge_date?: string;
						created_at?: string;
						id?: string;
						source?: string;
						title?: string;
						updated_at?: string;
						word_count?: number;
					};
					Relationships: [];
				};
			};
		Views: Record<string, never>;
		Functions: {
			get_daily_challenge: {
				Args: {
					requested_date?: string;
				};
				Returns: {
					challenge_date: string;
					first_category: string;
					first_word: string;
					second_category: string;
					second_word: string;
					third_category: string;
					third_word: string;
					generated_at: string;
				}[];
			};
		};
		Enums: Record<string, never>;
		CompositeTypes: Record<string, never>;
	};
};
