import { loadDailyChallenge } from '../lib/challenge';
import {
	appendStory,
	clearDraft,
	countWords,
	loadDraft,
	loadStoryList,
	saveDraft,
	syncStoryToSupabase,
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

function renderStoryList(stories: StoryRecord[], challengeDate: string) {
	const container = getElement<HTMLElement>('[data-story-list]');
	if (!container) return;

	const filtered = stories.filter((story) => story.challengeDate === challengeDate);

	if (!filtered.length) {
		container.innerHTML =
			"<p class='text-sm text-[#6e6259]'>Aún no has guardado ningún relato para este día.</p>";
		return;
	}

	container.innerHTML = filtered
		.map(
			(story) => `
				<article class="rounded-3xl border border-[#dbc9b9] bg-white/80 p-5 shadow-[0_12px_30px_rgba(43,28,20,0.06)]">
					<div class="flex items-start justify-between gap-4 mb-3">
						<div>
							<p class="text-[10px] uppercase tracking-[0.24em] text-[#8a7767] mb-2">${escapeHtml(
								story.authorName,
							)}</p>
							<h4 class="text-xl italic font-bold text-[#201611]">${escapeHtml(story.title || 'Sin título')}</h4>
						</div>
						<span class="text-[11px] uppercase tracking-[0.24em] text-[#8a7767]">${story.wordCount} palabras</span>
					</div>
					<p class="text-sm leading-7 text-[#5f5248] whitespace-pre-wrap">${escapeHtml(story.body)}</p>
				</article>
			`,
		)
		.join('');
}

async function saveCurrentStory(challengeDate: string, sourceLabel: string) {
	const title = getInputValue('[data-story-title]').trim();
	const body = getInputValue('[data-story-body]').trim();
	const authorName = getInputValue('[data-story-author]').trim() || 'Anónimo';

	if (!body) {
		setText('[data-save-status]', 'Escribe un relato antes de guardarlo.');
		return;
	}

	const story: StoryRecord = {
		id: crypto.randomUUID(),
		title: title || 'Sin título',
		body,
		authorName,
		wordCount: countWords(body),
		challengeDate,
		createdAt: new Date().toISOString(),
		source: sourceLabel === 'supabase' ? 'supabase' : 'local',
	};

	const stories = appendStory(story);
	await syncStoryToSupabase(story);
	clearDraft(challengeDate);
	setInputValue('[data-story-title]', '');
	setInputValue('[data-story-body]', '');
	setText('[data-word-count]', '0');
	setText('[data-save-status]', 'Relato guardado.');
	renderStoryList(stories, challengeDate);
}

export async function initWriteStory() {
	const root = getElement<HTMLElement>('[data-write-page]');
	if (!root) return;

	const challenge = await loadDailyChallenge();
	const draft = loadDraft(challenge.dateKey);

	setText('[data-write-date]', challenge.dateKey);
	setText('[data-write-summary]', challenge.summary);
	setText('[data-write-source]', challenge.source === 'database' ? 'desde base de datos' : 'con fallback local');
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
	setInputValue('[data-story-author]', draft.authorName);
	setText('[data-word-count]', String(countWords(draft.body)));

	renderStoryList(loadStoryList(), challenge.dateKey);

	const autosave = () => {
		saveDraft(challenge.dateKey, {
			title: getInputValue('[data-story-title]'),
			body: getInputValue('[data-story-body]'),
			authorName: getInputValue('[data-story-author]') || 'Anónimo',
		});
		setText('[data-word-count]', String(countWords(getInputValue('[data-story-body]'))));
		setText('[data-save-status]', 'Borrador guardado.');
	};

	getElement('[data-story-title]')?.addEventListener('input', autosave);
	getElement('[data-story-body]')?.addEventListener('input', autosave);
	getElement('[data-story-author]')?.addEventListener('input', autosave);

	getElement<HTMLFormElement>('[data-story-form]')?.addEventListener('submit', async (event) => {
		event.preventDefault();
		setText('[data-save-status]', 'Guardando relato...');
		await saveCurrentStory(challenge.dateKey, challenge.source);
	});
}
