import { getMadridDateKey } from '../lib/challenge';
import {
	buildStoryPreview,
	getStoriesForChallengeDate,
	hasLikedStory,
	toggleStoryLike,
	type StoryRecord,
} from '../lib/stories';

type FeedMode = 'home' | 'full' | 'compact';

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
			<div class="rounded-[2rem] border border-dashed border-[#d6c3b3] bg-white/70 p-6 text-sm leading-7 text-[#6e6259]">
				Tu primer relato publicado aparecera aqui. Cuando lo guardes, tambien podras darle likes desde el feed.
			</div>
		`;
	}

	if (mode === 'home') {
		return `
			<div class="rounded-[2rem] border border-dashed border-[#d6c3b3] bg-white/75 p-8 text-center text-sm leading-7 text-[#6e6259]">
				Aun no hay relatos publicados hoy. Publica el primero y abre el feed del dia.
			</div>
		`;
	}

	return `
		<div class="rounded-[2rem] border border-dashed border-[#d6c3b3] bg-white/75 p-10 text-center">
			<p class="text-[11px] uppercase tracking-[0.35em] text-[#8a7767] mb-3">Feed vacio</p>
			<p class="text-sm leading-7 text-[#6e6259]">Todavia no hay relatos anonimos para el reto de hoy. Publica uno desde la pagina de escritura.</p>
		</div>
	`;
}

function buildStoryCard(story: StoryRecord, index: number, mode: FeedMode) {
	const liked = hasLikedStory(story.id);
	const preview = buildStoryPreview(story.body, mode === 'home' ? 140 : 220);
	const crown = index === 0 && mode !== 'compact';
	const crownMarkup = crown
		? '<span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#201611] text-xs font-semibold text-[#f1d7ca]">TOP</span>'
		: '';

	return `
		<article class="rounded-[2rem] border border-[#dbc9b9] bg-white/90 p-6 shadow-[0_18px_40px_rgba(43,28,20,0.08)]">
			<div class="flex items-start justify-between gap-4 mb-5">
				<div class="min-w-0">
					<div class="flex items-center gap-3 mb-3">
						${crownMarkup}
						<p class="text-[10px] uppercase tracking-[0.28em] text-[#8a7767]">Anonimo</p>
					</div>
					<h3 class="text-2xl italic font-bold text-[#201611]">${escapeHtml(story.title || 'Sin titulo')}</h3>
				</div>
				<button
					type="button"
					data-like-button
					data-story-id="${story.id}"
					class="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
						liked
							? 'border-[#9f4f34] bg-[#9f4f34] text-[#fffaf4]'
							: 'border-[#dbc9b9] bg-[#fffaf4] text-[#6e6259] hover:border-[#9f4f34] hover:text-[#9f4f34]'
					}"
					aria-pressed="${liked ? 'true' : 'false'}"
				>
					<span>${liked ? '&#9829;' : '&#9825;'}</span>
					<span>${story.likes}</span>
				</button>
			</div>
			<p class="mb-4 text-[11px] uppercase tracking-[0.24em] text-[#8a7767]">${story.wordCount} palabras / ${formatTime(story.createdAt)}</p>
			<p class="text-sm leading-7 text-[#5f5248]">${escapeHtml(preview)}</p>
		</article>
	`;
}

function renderFeed(root: HTMLElement, stories: StoryRecord[], mode: FeedMode) {
	if (!stories.length) {
		root.innerHTML = buildEmptyState(mode);
		return;
	}

	const limit = mode === 'home' ? 3 : stories.length;
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
