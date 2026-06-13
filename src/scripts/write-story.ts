import { getSession, onAuthStateChange } from '../lib/auth';
import { loadDailyChallenge } from '../lib/challenge';
import { ensureProfileForUser } from '../lib/profiles';
import {
	clearDraft,
	countWords,
	fetchStoriesForChallengeDate,
	loadDraft,
	publishStory,
	saveDraft,
	toggleStoryLike,
	type StoryRecord,
} from '../lib/stories';
import { formatMadridDateTime } from '../lib/time';

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

function normalizeForWordMatch(value: string) {
	return value
		.toLocaleLowerCase('es-ES')
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.replace(/[^\p{L}\p{N}]+/gu, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

let activeChallengeDate = '';
let publishEnabledBySession = false;
let requiredChallengeWords: string[] = [];

function getMissingChallengeWords(body: string) {
	const normalizedBody = normalizeForWordMatch(body);
	if (!normalizedBody) {
		return [...requiredChallengeWords];
	}

	const paddedBody = ` ${normalizedBody} `;
	return requiredChallengeWords.filter((word) => {
		const normalizedWord = normalizeForWordMatch(word);
		return !normalizedWord || !paddedBody.includes(` ${normalizedWord} `);
	});
}

function renderWordRequirementStatus(body: string) {
	const field = getElement<HTMLTextAreaElement>('[data-story-body]');
	const status = getElement<HTMLElement>('[data-required-words-status]');
	const submitButton = getElement<HTMLButtonElement>('[data-story-submit]');
	const missingWords = getMissingChallengeWords(body);
	const canSubmit = publishEnabledBySession && missingWords.length === 0;

	if (submitButton) {
		submitButton.disabled = !canSubmit;
	}

	if (field) {
		field.setAttribute('aria-invalid', missingWords.length > 0 ? 'true' : 'false');
	}

	if (!status) {
		return;
	}

	if (!body.trim()) {
		status.textContent = `Tu pagina debe integrar estas 3 palabras: ${requiredChallengeWords.join(', ')}.`;
		return;
	}

	if (missingWords.length) {
		const noun = missingWords.length > 1 ? 'palabras' : 'palabra';
		status.textContent = `Falta integrar esta ${noun}: ${missingWords.join(', ')}.`;
		return;
	}

	status.textContent = 'Las 3 palabras del dia ya estan integradas.';
}

function renderPublishGate(isSignedIn: boolean, label: string) {
	getElement<HTMLElement>('[data-auth-gate]')?.classList.toggle('hidden', isSignedIn);
	getElement<HTMLElement>('[data-editor-shell]')?.classList.toggle('opacity-60', !isSignedIn);
	publishEnabledBySession = isSignedIn;
	renderWordRequirementStatus(getInputValue('[data-story-body]'));
	setText('[data-write-author]', label);
}

function renderStoryList(stories: StoryRecord[]) {
	const container = getElement<HTMLElement>('[data-story-list]');
	if (!container) return;

	if (!stories.length) {
		container.innerHTML =
			"<div class='app-panel rounded-[2rem] border-dashed p-6 text-sm leading-7 text-[var(--ink-soft)]'>Todavia no hay paginas en este bloque. Publica la primera y abre la ronda.</div>";
		return;
	}

	container.innerHTML = stories
		.map((story, index) => `
			<article class="app-panel rounded-[2rem] p-5">
				<div class="mb-4 flex items-start justify-between gap-4">
					<div>
						<div class="mb-2 flex items-center gap-3">
							${index === 0 ? '<span class="inline-flex rounded-full bg-[var(--surface-inverse)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--surface-base)]">Mas votada</span>' : ''}
							<a href="/profile?u=${encodeURIComponent(story.author.username)}" class="text-[10px] uppercase tracking-[0.24em] text-[var(--ink-muted)] transition hover:text-[var(--ink-strong)]">@${escapeHtml(story.author.username)}</a>
						</div>
						<h4 class="serif text-xl font-bold italic text-[var(--ink-strong)]">${escapeHtml(story.title || 'Sin titulo')}</h4>
						<p class="mt-2 text-sm text-[var(--ink-soft)]">${escapeHtml(story.author.displayName)}</p>
					</div>
					<button
						type="button"
						data-like-button
						data-story-id="${story.id}"
						class="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
							story.viewerHasLiked
								? 'border-[var(--surface-inverse)] bg-[var(--surface-inverse)] text-[var(--surface-base)]'
								: 'border-[var(--frame-border)] bg-[var(--surface-strong)] text-[var(--ink-soft)] hover:border-[var(--frame-border-strong)] hover:text-[var(--ink-strong)]'
						}"
						aria-pressed="${story.viewerHasLiked ? 'true' : 'false'}"
					>
						<span>${story.viewerHasLiked ? '&#9829;' : '&#9825;'}</span>
						<span>${story.likes}</span>
					</button>
				</div>
				<p class="mb-3 text-[11px] uppercase tracking-[0.24em] text-[var(--ink-muted)]">${story.wordCount} palabras / ${formatMadridDateTime(story.createdAt)}</p>
				<p class="text-sm leading-7 whitespace-pre-wrap text-[var(--ink-soft)]">${escapeHtml(story.body)}</p>
			</article>
		`)
		.join('');
}

async function refreshStoryList() {
	const session = await getSession();
	const stories = await fetchStoriesForChallengeDate(activeChallengeDate, session?.user.id);
	renderStoryList(stories);
}

async function saveCurrentStory(challengeDate: string) {
	const session = await getSession();
	if (!session?.user) {
		setText('[data-save-status]', 'Necesitas entrar para publicar.');
		return;
	}

	const title = getInputValue('[data-story-title]').trim();
	const body = getInputValue('[data-story-body]').trim();

	if (!body) {
		setText('[data-save-status]', 'Escribe una pagina antes de publicarla.');
		return;
	}

	const missingWords = getMissingChallengeWords(body);
	if (missingWords.length) {
		const noun = missingWords.length > 1 ? 'palabras' : 'palabra';
		setText(
			'[data-save-status]',
			`No puedes publicar todavia. Falta esta ${noun}: ${missingWords.join(', ')}.`,
		);
		return;
	}

	await publishStory({
		authorId: session.user.id,
		title: title || 'Sin titulo',
		body,
		challengeDate,
	});

	clearDraft(challengeDate);
	setInputValue('[data-story-title]', '');
	setInputValue('[data-story-body]', '');
	setText('[data-word-count]', '0');
	renderWordRequirementStatus('');
	setText('[data-save-status]', 'Pagina publicada en Poetika.');
	await refreshStoryList();
}

export async function initWriteStory() {
	const root = getElement<HTMLElement>('[data-write-page]');
	if (!root) return;

	const challenge = await loadDailyChallenge();
	const draft = loadDraft(challenge.dateKey);
	activeChallengeDate = challenge.dateKey;
	requiredChallengeWords = challenge.slots.map((slot) => slot.word);

	setText('[data-write-date]', challenge.dateKey);
	setText('[data-write-summary]', challenge.summary);
	setText('[data-write-source]', 'seleccion local diaria');
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
	renderWordRequirementStatus(draft.body);

	const session = await getSession();
	if (session?.user) {
		const profile = await ensureProfileForUser(session.user);
		renderPublishGate(true, profile?.display_name ?? session.user.email ?? 'Escritor');
	} else {
		renderPublishGate(false, 'Entrar para publicar');
	}

	await refreshStoryList();

	const autosave = () => {
		const body = getInputValue('[data-story-body]');
		saveDraft(challenge.dateKey, {
			title: getInputValue('[data-story-title]'),
			body,
		});
		setText('[data-word-count]', String(countWords(body)));
		renderWordRequirementStatus(body);
		setText('[data-save-status]', 'Borrador guardado en este navegador.');
	};

	getElement('[data-story-title]')?.addEventListener('input', autosave);
	getElement('[data-story-body]')?.addEventListener('input', autosave);

	getElement<HTMLFormElement>('[data-story-form]')?.addEventListener('submit', async (event) => {
		event.preventDefault();
		setText('[data-save-status]', 'Publicando pagina...');
		await saveCurrentStory(challenge.dateKey);
	});

	getElement<HTMLElement>('[data-story-list]')?.addEventListener('click', async (event) => {
		const target = event.target;
		if (!(target instanceof HTMLElement)) return;

		const button = target.closest<HTMLElement>('[data-like-button]');
		const storyId = button?.dataset.storyId;
		if (!button || !storyId) {
			return;
		}

		const currentSession = await getSession();
		if (!currentSession?.user) {
			setText('[data-save-status]', 'Entra para dar likes.');
			return;
		}

		await toggleStoryLike(storyId, currentSession.user.id);
		await refreshStoryList();
	});

	onAuthStateChange(async (nextSession) => {
		if (!nextSession?.user) {
			renderPublishGate(false, 'Entrar para publicar');
			await refreshStoryList();
			return;
		}

		const profile = await ensureProfileForUser(nextSession.user);
		renderPublishGate(true, profile?.display_name ?? nextSession.user.email ?? 'Escritor');
		await refreshStoryList();
	});
}
