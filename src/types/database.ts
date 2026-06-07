export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

type TableShape = {
	Row: Record<string, unknown>;
	Insert: Record<string, unknown>;
	Update: Record<string, unknown>;
	Relationships: Array<Record<string, unknown>>;
};

export interface Database {
	public: {
		Tables: Record<string, TableShape>;
		Views: Record<string, TableShape>;
		Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>;
		Enums: Record<string, string>;
		CompositeTypes: Record<string, Record<string, unknown>>;
	};
}
