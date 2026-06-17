import { getSession } from '../lib/auth';
import { getFallbackDailyChallenge } from '../lib/challenge';
import {
	ensureProfileForUser,
	getCurrentProfile,
	getProfileByUsername,
	updateCurrentProfile,
} from '../lib/profiles';
import {
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

function setImage(selector: string, value: string | null) {
	const image = getElement<HTMLImageElement>(selector);
	if (!image) {
		return;
	}

	if (value?.trim()) {
		image.src = value;
		image.classList.remove('hidden');
		return;
	}

	image.removeAttribute('src');
	image.classList.add('hidden');
}

function escapeHtml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightChallengeWords(body: string, words: string[]) {
	let html = escapeHtml(body);

	for (const word of words) {
		if (!word.trim()) continue;

		const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])(${escapeRegExp(word)})(?=[^\\p{L}\\p{N}]|$)`, 'giu');
		html = html.replace(pattern, (_, prefix: string, match: string) => {
			return `${prefix}<strong>${match}</strong>`;
		});
	}

	return html;
}

function toggleGuestState(showGuest: boolean) {
	getElement<HTMLElement>('[data-profile-guest-card]')?.classList.toggle('hidden', !showGuest);
	getElement<HTMLElement>('[data-profile-content]')?.classList.toggle('hidden', showGuest);
}

function setAvatar(displayName: string, avatarUrl: string | null) {
	setImage('[data-profile-avatar]', avatarUrl);
	setText(
		'[data-profile-avatar-fallback]',
		displayName
			.trim()
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part.slice(0, 1).toUpperCase())
			.join('') || 'P',
	);
	getElement<HTMLElement>('[data-profile-avatar-fallback]')?.classList.toggle('hidden', Boolean(avatarUrl?.trim()));
}

function toggleEditor(open: boolean) {
	getElement<HTMLElement>('[data-profile-editor]')?.classList.toggle('hidden', !open);
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
			"<div class='profile-story-empty'>Todavia no hay relatos publicados en este perfil.</div>";
		return;
	}

	root.innerHTML = stories
		.map(
			(story) => {
				const challenge = getFallbackDailyChallenge(story.challengeDate);
				const dailyWords = challenge.slots.map((slot) => slot.word);

				return `
				<article class="profile-story-card">
					<div class="profile-story-tags">
						${dailyWords.map((word) => `<span class="profile-story-tag">${escapeHtml(word)}</span>`).join('')}
					</div>
					<p class="profile-story-body">${highlightChallengeWords(story.body, dailyWords)}</p>
					<div class="profile-story-footer">
						<div class="profile-story-metrics">
							<span>${story.wordCount} palabras</span>
							<span>${story.likes} likes</span>
							<span>Firma @${escapeHtml(story.author.username)}</span>
						</div>
						<p class="profile-story-date">${formatMadridDateTime(story.createdAt)}</p>
					</div>
				</article>
			`;
			},
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
	setAvatar(targetProfile.display_name, targetProfile.avatar_url);
	setText('[data-profile-total-likes]', String(stats.totalLikes));
	setText('[data-profile-total-stories]', String(stats.totalStories));
	setText('[data-profile-active-days]', String(stats.activeDays));
	renderStoryList('[data-profile-story-list]', stories);

	const isOwnProfile = currentProfile?.user_id === targetProfile.user_id;
	toggleGuestState(false);
	getElement<HTMLElement>('[data-profile-edit-toggle]')?.classList.toggle('hidden', !isOwnProfile);
	toggleEditor(false);

	if (!isOwnProfile) {
		return;
	}

	setInputValue('[data-profile-edit-display-name]', targetProfile.display_name);
	setInputValue('[data-profile-edit-username]', targetProfile.username);
	setInputValue('[data-profile-edit-bio]', targetProfile.bio ?? '');
	setInputValue('[data-profile-edit-avatar]', targetProfile.avatar_url ?? '');

	getElement<HTMLButtonElement>('[data-profile-edit-toggle]')?.addEventListener('click', () => {
		toggleEditor(true);
	});

	getElement<HTMLButtonElement>('[data-profile-edit-close]')?.addEventListener('click', () => {
		toggleEditor(false);
	});

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
				setAvatar(updated.display_name, updated.avatar_url);
			}

			setText('[data-profile-form-status]', 'Perfil guardado.');
		} catch (error) {
			const message = error instanceof Error ? error.message : 'No se pudo guardar el perfil.';
			setText('[data-profile-form-status]', message);
		}
	});
}
