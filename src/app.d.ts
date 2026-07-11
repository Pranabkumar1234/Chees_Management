// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

// Vite ?raw imports (used to bundle schema.sql as a string).
declare module '*.sql?raw' {
	const content: string;
	export default content;
}

export {};
