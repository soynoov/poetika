import { getSession } from '../lib/auth';
import {
	ensureProfileForUser,
	getCurrentProfile,
	getProfileByUsername,
	updateCurrentProfile,
} from '../lib/profiles';
import {
	buildStoryPreview,
	fetchStoriesByAuthorId,
	getProfileStoryStats,
} from '../lib/stories';
import { formatMadridDateTime } from '../lib/time';

function getElement<T extends HTMLElement>(selector: string, root: ParentNode = document) {
	return root.querySelector<T>(selector);
}

function setText(selector: string, value: string) {
	const node = getElement<HTMLElement>(selector);
	if (node) {
		node.textContent = value;
	}
}

function setInputValue(selector: string, value: string) {
	const field = getElement<HTMLInputElement | HTMLTextAreaElement>(selector);
	if (field) {
		field.value = value;
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

function toggleGuestState(showGuest: boolean) {
	getElement<HTMLElement>('[data-profile-guest-card]')?.classList.toggle('hidden', !showGuest);
	getElement<HTMLElement>('[data-profile-editor]')?.classList.toggle('hidden', showGuest);
}

function renderStoryList(
	markupSelector: string,
	stories: Awaited<ReturnType<typeof fetchStoriesByAuthorId>>,
) {
	const root = getElement<HTMLElement>(markupSelector);
	if (!root) {
		return;
	}

	if (!stories.length) {
		root.innerHTML =
			"<div class='app-panel rounded-[2rem] border-dashed p-6 text-sm leading-7 text-[var(--ink-soft)]'>Todavia no hay relatos publicados en este perfil.</div>";
		return;
	}

	root.innerHTML = stories
		.map(
			(story) => `
				<article class="app-panel rounded-[2rem] p-6">
					<div class="mb-4 flex items-start justify-between gap-4">
						<div>
							<p class="text-[10px] uppercase tracking-[0.24em] text-[var(--ink-muted)]">@${escapeHtml(story.author.username)}</p>
							<p class="mt-2 text-[11px] uppercase tracking-[0.24em] text-[var(--ink-muted)]">${story.wordCount} palabras / ${story.likes} likes / ${formatMadridDateTime(story.createdAt)}</p>
						</div>
						<a href="/write" class="app-link-button inline-flex items-center justify-center rounded-full border border-[var(--frame-border)] bg-[var(--surface-strong)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-strong)] transition hover:bg-[var(--surface-hover)]">
							Responder
						</a>
					</div>
					<p class="text-sm leading-7 text-[var(--ink-soft)]">${escapeHtml(buildStoryPreview(story.body, 260))}</p>
				</article>
			`,
		)
		.join('');
}

export async function initProfilePage() {
	const root = getElement<HTMLElement>('[data-profile-page]');
	if (!root) {
		return;
	}

	const username =
		root.dataset.profileUsername || new URLSearchParams(window.location.search).get('u');
	const session = await getSession();
	const viewerId = session?.user.id;

	if (!username && !session?.user) {
		toggleGuestState(true);
		setText('[data-profile-display-name]', 'Perfil de Poetika');
		setText('[data-profile-handle]', '@guest');
		setText(
			'[data-profile-bio]',
			'Inicia sesion para abrir tu perfil, editar tu firma y reunir tus relatos en un solo portal.',
		);
		setText('[data-profile-status]', 'Necesitas sesion para ver tu perfil personal.');
		renderStoryList('[data-profile-story-list]', []);
		return;
	}

	const targetProfile = username
		? await getProfileByUsername(username)
		: session?.user
			? await ensureProfileForUser(session.user)
			: null;

	if (!targetProfile) {
		toggleGuestState(Boolean(!session?.user && !username));
		setText('[data-profile-status]', 'Perfil no encontrado.');
		return;
	}

	const [stories, stats, currentProfile] = await Promise.all([
		fetchStoriesByAuthorId(targetProfile.user_id, viewerId),
		getProfileStoryStats(targetProfile.user_id),
		viewerId ? getCurrentProfile(viewerId) : Promise.resolve(null),
	]);

	setText('[data-profile-status]', '');
	setText('[data-profile-display-name]', targetProfile.display_name);
	setText('[data-profile-handle]', `@${targetProfile.username}`);
	setText(
		'[data-profile-bio]',
		targetProfile.bio?.trim() || 'Todavia no ha escrito una bio en su cuaderno.',
	);
	setText('[data-profile-total-likes]', String(stats.totalLikes));
	setText('[data-profile-total-stories]', String(stats.totalStories));
	setText('[data-profile-active-days]', String(stats.activeDays));
	renderStoryList('[data-profile-story-list]', stories);

	const isOwnProfile = currentProfile?.user_id === targetProfile.user_id;
	toggleGuestState(false);
	getElement<HTMLElement>('[data-profile-editor]')?.classList.toggle('hidden', !isOwnProfile);

	if (!isOwnProfile) {
		return;
	}

	setInputValue('[data-profile-edit-display-name]', targetProfile.display_name);
	setInputValue('[data-profile-edit-username]', targetProfile.username);
	setInputValue('[data-profile-edit-bio]', targetProfile.bio ?? '');
	setInputValue('[data-profile-edit-avatar]', targetProfile.avatar_url ?? '');

	getElement<HTMLFormElement>('[data-profile-form]')?.addEventListener('submit', async (event) => {
		event.preventDefault();
		setText('[data-profile-form-status]', 'Guardando perfil...');

		try {
			const updated = await updateCurrentProfile(targetProfile.user_id, {
				display_name:
					getElement<HTMLInputElement>('[data-profile-edit-display-name]')?.value ?? '',
				username: getElement<HTMLInputElement>('[data-profile-edit-username]')?.value ?? '',
				bio: getElement<HTMLTextAreaElement>('[data-profile-edit-bio]')?.value ?? '',
				avatar_url: getElement<HTMLInputElement>('[data-profile-edit-avatar]')?.value ?? '',
			});

			if (updated) {
				setText('[data-profile-display-name]', updated.display_name);
				setText('[data-profile-handle]', `@${updated.username}`);
				setText(
					'[data-profile-bio]',
					updated.bio?.trim() || 'Todavia no ha escrito una bio en su cuaderno.',
				);
			}

			setText('[data-profile-form-status]', 'Perfil guardado.');
		} catch (error) {
			const message = error instanceof Error ? error.message : 'No se pudo guardar el perfil.';
			setText('[data-profile-form-status]', message);
		}
	});
}
