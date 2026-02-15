
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/edit" | "/edit/[id]" | "/matters" | "/templates" | "/templates/[id]";
		RouteParams(): {
			"/edit/[id]": { id: string };
			"/templates/[id]": { id: string }
		};
		LayoutParams(): {
			"/": { id?: string };
			"/edit": { id?: string };
			"/edit/[id]": { id: string };
			"/matters": Record<string, never>;
			"/templates": { id?: string };
			"/templates/[id]": { id: string }
		};
		Pathname(): "/" | `/edit/${string}` & {} | "/matters" | "/templates" | `/templates/${string}` & {};
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/robots.txt" | string & {};
	}
}