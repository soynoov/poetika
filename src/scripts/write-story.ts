import { loadDailyChallenge } from '../lib/challenge';
import {
	appendStory,
	clearDraft,
	countWords,
	getStoriesForChallengeDate,
	hasLikedStory,
	loadDraft,
	saveDraft,
	toggleStoryLike,
	type StoryRecord,
} from '../lib/stories';

function getElement<T extends HTMLElement>(selector: string) {
	return document.querySelector<T>(selector);
}

function setText(selector: string, value: string) {
	const node = getElement<HTMLElement>(selector);
	if (node) node.textContent = value;
}

function setInputValue(selector: string, value: string) {
	const node = getElement<HTMLInputElement | HTMLTextAreaElement>(selector);
	if (node) node.value = value;
}

function getInputValue(selector: string) {
	const node = getElement<HTMLInputElement | HTMLTextAreaElement>(selector);
	return node?.value ?? '';
}

function escapeHtml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function renderStoryList(challengeDate: string) {
	const container = getElement<HTMLElement>('[data-story-list]');
	if (!container) return;

	const stories = getStoriesForChallengeDate(challengeDate);

	if (!stories.length) {
		container.innerHTML =
			"<div class='rounded-[2rem] border border-dashed border-[#d6c3b3] bg-white/60 p-6 text-sm leading-7 text-[#6e6259]'>Todavia no has publicado nada hoy. Guarda tu relato y aparecera aqui con likes activos.</div>";
		return;
	}

	container.innerHTML = stories
		.map((story, index) => {
			const liked = hasLikedStory(story.id);

			return `
				<article class="rounded-[2rem] border border-[#dbc9b9] bg-white/80 p-5 shadow-[0_12px_30px_rgba(43,28,20,0.06)]">
					<div class="mb-4 flex items-start justify-between gap-4">
						<div>
							<div class="mb-2 flex items-center gap-3">
								${index === 0 ? '<span class="inline-flex rounded-full bg-[#201611] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#f1d7ca]">Mas votado</span>' : ''}
								<p class="text-[10px] uppercase tracking-[0.24em] text-[#8a7767]">Anonimo</p>
							</div>
							<h4 class="text-xl italic font-bold text-[#201611]">${escapeHtml(story.title || 'Sin titulo')}</h4>
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
					<p class="mb-3 text-[11px] uppercase tracking-[0.24em] text-[#8a7767]">${story.wordCount} palabras</p>
					<p class="text-sm leading-7 text-[#5f5248] whitespace-pre-wrap">${escapeHtml(story.body)}</p>
				</article>
			`;
		})
		.join('');
}

async function saveCurrentStory(challengeDate: string) {
	const title = getInputValue('[data-story-title]').trim();
	const body = getInputValue('[data-story-body]').trim();

	if (!body) {
		setText('[data-save-status]', 'Escribe un relato antes de publicarlo.');
		return;
	}

	const story: StoryRecord = {
		id: crypto.randomUUID(),
		title: title || 'Sin titulo',
		body,
		authorName: 'Anonimo',
		wordCount: countWords(body),
		likes: 0,
		challengeDate,
		createdAt: new Date().toISOString(),
		source: 'local',
	};

	appendStory(story);
	clearDraft(challengeDate);
	setInputValue('[data-story-title]', '');
	setInputValue('[data-story-body]', '');
	setText('[data-word-count]', '0');
	setText('[data-save-status]', 'Relato publicado en local.');
	renderStoryList(challengeDate);
}

export async function initWriteStory() {
	const root = getElement<HTMLElement>('[data-write-page]');
	if (!root) return;

	const challenge = await loadDailyChallenge();
	const draft = loadDraft(challenge.dateKey);

	setText('[data-write-date]', challenge.dateKey);
	setText('[data-write-summary]', challenge.summary);
	setText('[data-write-source]', 'seleccion local cada 5 min');
	setText('[data-write-word-1]', challenge.slots[0].word);
	setText('[data-write-word-2]', challenge.slots[1].word);
	setText('[data-write-word-3]', challenge.slots[2].word);
	setText('[data-write-category-1]', challenge.slots[0].category);
	setText('[data-write-category-2]', challenge.slots[1].category);
	setText('[data-write-category-3]', challenge.slots[2].category);
	setText('[data-write-marker-1]', challenge.slots[0].marker);
	setText('[data-write-marker-2]', challenge.slots[1].marker);
	setText('[data-write-marker-3]', challenge.slots[2].marker);
	setInputValue('[data-story-title]', draft.title);
	setInputValue('[data-story-body]', draft.body);
	setText('[data-word-count]', String(countWords(draft.body)));

	renderStoryList(challenge.dateKey);

	const autosave = () => {
		saveDraft(challenge.dateKey, {
			title: getInputValue('[data-story-title]'),
			body: getInputValue('[data-story-body]'),
		});
		setText('[data-word-count]', String(countWords(getInputValue('[data-story-body]'))));
		setText('[data-save-status]', 'Borrador guardado en este navegador.');
	};

	getElement('[data-story-title]')?.addEventListener('input', autosave);
	getElement('[data-story-body]')?.addEventListener('input', autosave);

	getElement<HTMLFormElement>('[data-story-form]')?.addEventListener('submit', async (event) => {
		event.preventDefault();
		setText('[data-save-status]', 'Publicando relato...');
		await saveCurrentStory(challenge.dateKey);
	});

	getElement<HTMLElement>('[data-story-list]')?.addEventListener('click', (event) => {
		const target = event.target;
		if (!(target instanceof HTMLElement)) return;

		const button = target.closest<HTMLElement>('[data-like-button]');
		const storyId = button?.dataset.storyId;

		if (!button || !storyId) {
			return;
		}

		toggleStoryLike(storyId);
		renderStoryList(challenge.dateKey);
	});
}
