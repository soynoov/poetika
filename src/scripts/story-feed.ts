import { getMadridDateKey } from '../lib/challenge';
import {
	buildStoryPreview,
	getStoriesForChallengeDate,
	hasLikedStory,
	toggleStoryLike,
	type StoryRecord,
} from '../lib/stories';

type FeedMode = 'home' | 'home-editorial' | 'full' | 'compact';

function getElement<T extends HTMLElement>(selector: string, root: ParentNode = document) {
	return root.querySelector<T>(selector);
}

function setText(selector: string, value: string) {
	const node = getElement<HTMLElement>(selector);
	if (node) {
		node.textContent = value;
	}
}

function escapeHtml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function formatTime(value: string) {
	return new Intl.DateTimeFormat('es-ES', {
		hour: '2-digit',
		minute: '2-digit',
	}).format(new Date(value));
}

function buildEmptyState(mode: FeedMode) {
	if (mode === 'compact') {
		return `
			<div class="app-panel rounded-[2rem] border-dashed p-6 text-sm leading-7 text-[var(--ink-soft)]">
				Tu primer relato publicado aparecera aqui. Cuando lo guardes, tambien podras darle likes desde el feed.
			</div>
		`;
	}

	if (mode === 'home') {
		return `
			<div class="app-panel rounded-[2rem] border-dashed p-8 text-center text-sm leading-7 text-[var(--ink-soft)]">
				Aun no hay relatos publicados hoy. Publica el primero y abre el feed del dia.
			</div>
		`;
	}

	if (mode === 'home-editorial') {
		return `
			<div class="app-panel rounded-[2rem] p-10 text-center">
				<p class="mb-3 text-[11px] uppercase tracking-[0.35em] text-[var(--ink-muted)]">Sin relatos aun</p>
				<p class="text-base leading-8 text-[var(--ink-soft)]">Publica el primer relato del bloque actual y aparecera aqui.</p>
			</div>
		`;
	}

	return `
		<div class="app-panel rounded-[2rem] border-dashed p-10 text-center">
			<p class="mb-3 text-[11px] uppercase tracking-[0.35em] text-[var(--ink-muted)]">Feed vacio</p>
			<p class="text-sm leading-7 text-[var(--ink-soft)]">Todavia no hay relatos anonimos para el reto de hoy. Publica uno desde la pagina de escritura.</p>
		</div>
	`;
}

function buildStoryCard(story: StoryRecord, index: number, mode: FeedMode) {
	const liked = hasLikedStory(story.id);
	const preview = buildStoryPreview(story.body, mode === 'home' ? 140 : 220);
	const crown = index === 0 && mode !== 'compact';
	const crownMarkup =
		mode === 'home-editorial'
			? crown
				? '<span class="text-[1.35rem] leading-none text-[#d8b400]">♕</span>'
				: ''
			: crown
				? '<span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#201611] text-xs font-semibold text-[#f1d7ca]">TOP</span>'
				: '';

	if (mode === 'home-editorial') {
		return `
			<article class="app-panel rounded-[1.9rem] px-7 py-6">
				<div class="mb-4 flex items-start justify-between gap-4">
					<div class="min-w-0">
						<div class="mb-2 flex items-center gap-3">
							${crownMarkup}
							<h3 class="serif text-[2.25rem] font-semibold leading-none tracking-[-0.03em] text-[var(--ink-strong)]">${escapeHtml(story.title || 'Sin titulo')}</h3>
						</div>
						<p class="text-sm tracking-[0.03em] text-[var(--ink-muted)]">Anonimo · ${story.wordCount} palabras</p>
					</div>
					<button
						type="button"
						data-like-button
						data-story-id="${story.id}"
						class="inline-flex items-center gap-1.5 text-[1.05rem] text-[var(--ink-muted)] transition hover:text-[var(--ink-strong)]"
						aria-pressed="${liked ? 'true' : 'false'}"
					>
						<span>${liked ? '&#9829;' : '&#9825;'}</span>
						<span class="text-base">${story.likes}</span>
					</button>
				</div>
				<p class="max-w-5xl text-[1.15rem] leading-9 text-[var(--ink-soft)]">${escapeHtml(preview)}</p>
			</article>
		`;
	}

	return `
		<article class="app-panel rounded-[2rem] p-6">
			<div class="flex items-start justify-between gap-4 mb-5">
				<div class="min-w-0">
					<div class="flex items-center gap-3 mb-3">
						${crownMarkup}
						<p class="text-[10px] uppercase tracking-[0.28em] text-[var(--ink-muted)]">Anonimo</p>
					</div>
					<h3 class="serif text-2xl font-bold italic text-[var(--ink-strong)]">${escapeHtml(story.title || 'Sin titulo')}</h3>
				</div>
				<button
					type="button"
					data-like-button
					data-story-id="${story.id}"
					class="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
						liked
							? 'border-[var(--surface-inverse)] bg-[var(--surface-inverse)] text-[var(--surface-base)]'
							: 'border-[var(--frame-border)] bg-[var(--surface-strong)] text-[var(--ink-soft)] hover:border-[var(--frame-border-strong)] hover:text-[var(--ink-strong)]'
					}"
					aria-pressed="${liked ? 'true' : 'false'}"
				>
					<span>${liked ? '&#9829;' : '&#9825;'}</span>
					<span>${story.likes}</span>
				</button>
			</div>
			<p class="mb-4 text-[11px] uppercase tracking-[0.24em] text-[var(--ink-muted)]">${story.wordCount} palabras / ${formatTime(story.createdAt)}</p>
			<p class="text-sm leading-7 text-[var(--ink-soft)]">${escapeHtml(preview)}</p>
		</article>
	`;
}

function renderFeed(root: HTMLElement, stories: StoryRecord[], mode: FeedMode) {
	if (!stories.length) {
		root.innerHTML = buildEmptyState(mode);
		return;
	}

	const limit = mode === 'home' || mode === 'home-editorial' ? 3 : stories.length;
	root.innerHTML = stories
		.slice(0, limit)
		.map((story, index) => buildStoryCard(story, index, mode))
		.join('');
}

function updateHomeStats(stories: StoryRecord[]) {
	setText('[data-home-total]', String(stories.length));
	setText(
		'[data-home-likes]',
		String(stories.reduce((total, story) => total + story.likes, 0)),
	);
}

function refreshStoryFeeds() {
	const dateKey = getMadridDateKey();
	const todayStories = getStoriesForChallengeDate(dateKey);

	document.querySelectorAll<HTMLElement>('[data-story-feed]').forEach((root) => {
		const mode = (root.dataset.feedMode as FeedMode | undefined) ?? 'full';
		renderFeed(root, todayStories, mode);
	});

	if (document.querySelector('[data-home-total]')) {
		updateHomeStats(todayStories);
	}

	if (document.querySelector('[data-story-total]')) {
		setText('[data-story-total]', String(todayStories.length));
	}
}

export function initStoryFeed() {
	if (!document.querySelector('[data-story-feed]')) {
		return;
	}

	refreshStoryFeeds();

	document.addEventListener('click', (event) => {
		const target = event.target;
		if (!(target instanceof HTMLElement)) return;

		const button = target.closest<HTMLElement>('[data-like-button]');
		const storyId = button?.dataset.storyId;

		if (!button || !storyId) {
			return;
		}

		toggleStoryLike(storyId);
		refreshStoryFeeds();
	});
}
