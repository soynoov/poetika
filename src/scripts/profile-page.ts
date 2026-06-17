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
	fetchLikedStoriesByUserId,
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

function setInputValues(selectors: string[], value: string) {
	for (const selector of selectors) {
		const field = getElement<HTMLInputElement>(selector);
		if (field) {
			field.value = value;
		}
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

function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightChallengeWords(body: string, words: string[]) {
	let html = escapeHtml(body);

	for (const word of words) {
		if (!word.trim()) continue;

		const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])(${escapeRegExp(word)})(?=[^\\p{L}\\p{N}]|$)`, 'giu');
		html = html.replace(pattern, (_, prefix: string, match: string) => {
			return `${prefix}<strong class="profile-story-highlight">${match}</strong>`;
		});
	}

	return html;
}

function formatStoryBody(body: string, words: string[]) {
	return body
		.split(/\n\s*\n/g)
		.map((paragraph) => paragraph.trim())
		.filter(Boolean)
		.map((paragraph) => `<p>${highlightChallengeWords(paragraph, words).replace(/\n/g, '<br>')}</p>`)
		.join('');
}

function toggleGuestState(showGuest: boolean) {
	getElement<HTMLElement>('[data-profile-guest-card]')?.classList.toggle('hidden', !showGuest);
	getElement<HTMLElement>('[data-profile-content]')?.classList.toggle('hidden', showGuest);
}

function setAvatar(displayName: string, avatarUrl: string | null) {
	setImage('[data-profile-avatar]', avatarUrl);
	setImage('[data-profile-edit-avatar-preview]', avatarUrl);
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
	setText(
		'[data-profile-edit-avatar-preview-fallback]',
		displayName
			.trim()
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part.slice(0, 1).toUpperCase())
			.join('') || 'P',
	);
	getElement<HTMLElement>('[data-profile-edit-avatar-preview-fallback]')?.classList.toggle(
		'hidden',
		Boolean(avatarUrl?.trim()),
	);
}

function toggleSettingsSheet(open: boolean) {
	const sheet = getElement<HTMLElement>('[data-profile-settings-sheet]');
	if (!sheet) {
		return;
	}

	sheet.classList.toggle('hidden', !open);
	sheet.setAttribute('aria-hidden', open ? 'false' : 'true');
	document.body.classList.toggle('profile-settings-open', open);
}

function setProfileTab(mode: 'stories' | 'likes') {
	document.querySelectorAll<HTMLElement>('[data-profile-tab-button]').forEach((button) => {
		const active = button.dataset.profileTabButton === mode;
		button.classList.toggle('is-active', active);
		button.setAttribute('aria-selected', active ? 'true' : 'false');
	});

	document.querySelectorAll<HTMLElement>('[data-profile-tab-panel]').forEach((panel) => {
		panel.classList.toggle('hidden', panel.dataset.profileTabPanel !== mode);
	});
}

function setThemeChoice(theme: 'day' | 'night') {
	const root = document.documentElement;
	root.dataset.theme = theme;

	try {
		localStorage.setItem('poetika:theme', theme);
	} catch {
		// Ignore localStorage failures.
	}

	document.querySelectorAll<HTMLElement>('[data-theme-choice]').forEach((button) => {
		button.classList.toggle('is-active', button.dataset.themeChoice === theme);
	});
}

function setupStoryExpansions(root: ParentNode = document) {
	root.querySelectorAll<HTMLElement>('[data-story-expandable]').forEach((card) => {
		const body = card.querySelector<HTMLElement>('[data-story-body]');
		const button = card.querySelector<HTMLButtonElement>('[data-story-toggle]');

		if (!body || !button) {
			return;
		}

		const collapsed = () => !card.classList.contains('is-expanded');
		const syncButton = () => {
			button.textContent = collapsed() ? 'Leer mas' : 'Leer menos';
			button.setAttribute('aria-expanded', collapsed() ? 'false' : 'true');
		};

		requestAnimationFrame(() => {
			const hasOverflow = body.scrollHeight > body.clientHeight + 4;
			button.classList.toggle('hidden', !hasOverflow);
			if (!hasOverflow) {
				card.classList.remove('is-expanded');
			}
			syncButton();
		});

		button.addEventListener('click', () => {
			card.classList.toggle('is-expanded');
			syncButton();
		});
	});
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
				<article class="profile-story-card" data-story-expandable>
					<div class="profile-story-tags">
						${dailyWords.map((word) => `<span class="profile-story-tag">${escapeHtml(word)}</span>`).join('')}
					</div>
					<div class="profile-story-body" data-story-body>${formatStoryBody(story.body, dailyWords)}</div>
					<button type="button" class="profile-story-toggle hidden" data-story-toggle aria-expanded="false">
						Leer mas
					</button>
					<div class="profile-story-footer">
						<div class="profile-story-metrics">
							<span>${story.wordCount} palabras</span>
							<span>${story.likes} likes</span>
						</div>
						<p class="profile-story-date">${formatMadridDateTime(story.createdAt)}</p>
					</div>
				</article>
			`;
			},
		)
		.join('');

	setupStoryExpansions(root);
}

function collectProfileFormValues() {
	return {
		display_name: getElement<HTMLInputElement>('[data-profile-edit-display-name]')?.value ?? '',
		username: getElement<HTMLInputElement>('[data-profile-edit-username]')?.value ?? '',
		bio: getElement<HTMLTextAreaElement>('[data-profile-edit-bio]')?.value ?? '',
		avatar_url: getElement<HTMLInputElement>('[data-profile-edit-avatar]')?.value ?? '',
	};
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
	setText('[data-profile-total-stories]', String(stats.totalStories));
	setText('[data-profile-streak]', String(stats.currentStreak));
	const streakCard = getElement<HTMLElement>('[data-profile-streak-card]');
	if (streakCard) {
		streakCard.dataset.state = stats.streakActive ? 'active' : 'idle';
	}
	getElement<HTMLElement>('[data-profile-streak-fire]')?.classList.toggle(
		'hidden',
		!stats.streakActive,
	);
	renderStoryList('[data-profile-story-list]', stories);
	setProfileTab('stories');
	document.querySelectorAll<HTMLElement>('[data-profile-tab-button]').forEach((button) => {
		button.addEventListener('click', () => {
			const mode = button.dataset.profileTabButton === 'likes' ? 'likes' : 'stories';
			setProfileTab(mode);
		});
	});

	const isOwnProfile = currentProfile?.user_id === targetProfile.user_id;
	toggleGuestState(false);
	getElement<HTMLElement>('[data-profile-avatar-trigger]')?.classList.toggle('hidden', !isOwnProfile);
	toggleSettingsSheet(false);
	setThemeChoice(document.documentElement.dataset.theme === 'night' ? 'night' : 'day');

	if (!isOwnProfile) {
		getElement<HTMLElement>('[data-profile-tab-button="likes"]')?.classList.add('hidden');
		getElement<HTMLElement>('[data-profile-tab-panel="likes"]')?.classList.add('hidden');
		getElement<HTMLElement>('[data-profile-settings-sheet]')?.remove();
		return;
	}

	const likedStories = await fetchLikedStoriesByUserId(targetProfile.user_id);
	renderStoryList('[data-profile-liked-story-list]', likedStories);

	setInputValue('[data-profile-edit-display-name]', targetProfile.display_name);
	setInputValue('[data-profile-edit-username]', targetProfile.username);
	setInputValue('[data-profile-edit-bio]', targetProfile.bio ?? '');
	setInputValue('[data-profile-edit-avatar]', targetProfile.avatar_url ?? '');

	const openSettings = () => {
		toggleSettingsSheet(true);
	};

	const closeSettings = () => {
		toggleSettingsSheet(false);
	};

	const syncProfileUI = (profile: {
		display_name: string;
		username: string;
		bio: string | null;
		avatar_url: string | null;
	}) => {
		setText('[data-profile-display-name]', profile.display_name);
		setText('[data-profile-handle]', `@${profile.username}`);
		setText(
			'[data-profile-bio]',
			profile.bio?.trim() || 'Todavia no ha escrito una bio en su cuaderno.',
		);
		setAvatar(profile.display_name, profile.avatar_url);
		setInputValue('[data-profile-edit-display-name]', profile.display_name);
		setInputValue('[data-profile-edit-username]', profile.username);
		setInputValue('[data-profile-edit-bio]', profile.bio ?? '');
		setInputValue('[data-profile-edit-avatar]', profile.avatar_url ?? '');
	};

	const persistProfile = async (statusMessage = 'Perfil guardado.') => {
		setText('[data-profile-form-status]', 'Guardando perfil...');
		const updated = await updateCurrentProfile(targetProfile.user_id, collectProfileFormValues());
		if (updated) {
			syncProfileUI(updated);
		}
		setText('[data-profile-form-status]', statusMessage);
		return updated;
	};

	getElement<HTMLButtonElement>('[data-profile-avatar-upload]')?.addEventListener('click', () => {
		getElement<HTMLInputElement>('[data-profile-edit-avatar-file]')?.click();
	});

	getElement<HTMLButtonElement>('[data-profile-avatar-trigger]')?.addEventListener('click', () => {
		getElement<HTMLInputElement>('[data-profile-edit-avatar-file]')?.click();
	});

	document.querySelectorAll<HTMLAnchorElement>('[data-profile-settings-link]').forEach((link) => {
		link.addEventListener('click', (event) => {
			const href = link.getAttribute('href') || '';
			if (!href.includes('/profile')) {
				return;
			}

			const currentProfileUrl = `${window.location.pathname}${window.location.search}`;
			if (!href.startsWith(currentProfileUrl) && !href.startsWith('/profile')) {
				return;
			}

			event.preventDefault();
			openSettings();
		});
	});

	getElement<HTMLButtonElement>('[data-profile-settings-close]')?.addEventListener('click', closeSettings);
	getElement<HTMLElement>('[data-profile-settings-backdrop]')?.addEventListener('click', closeSettings);
	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape') {
			closeSettings();
		}
	});

	getElement<HTMLInputElement>('[data-profile-edit-display-name]')?.addEventListener('input', (event) => {
		const target = event.target;
		if (!(target instanceof HTMLInputElement)) {
			return;
		}

		const avatarValue = getElement<HTMLInputElement>('[data-profile-edit-avatar]')?.value ?? '';
		setAvatar(target.value || targetProfile.display_name, avatarValue || null);
	});

	getElement<HTMLInputElement>('[data-profile-edit-avatar-file]')?.addEventListener('change', (event) => {
		const target = event.target;
		const file = target instanceof HTMLInputElement ? target.files?.[0] : undefined;
		if (!file) {
			return;
		}

		const reader = new FileReader();
		reader.onload = async () => {
			const result = typeof reader.result === 'string' ? reader.result : '';
			setInputValues(['[data-profile-edit-avatar]'], result);
			setAvatar(
				getElement<HTMLInputElement>('[data-profile-edit-display-name]')?.value || targetProfile.display_name,
				result || null,
			);
			try {
				await persistProfile('Foto de perfil actualizada.');
			} catch (error) {
				const message =
					error instanceof Error ? error.message : 'No se pudo actualizar la foto de perfil.';
				setText('[data-profile-form-status]', message);
			}
		};
		reader.readAsDataURL(file);
	});

	getElement<HTMLButtonElement>('[data-profile-avatar-clear]')?.addEventListener('click', async () => {
		setInputValues(['[data-profile-edit-avatar]'], '');
		const fileField = getElement<HTMLInputElement>('[data-profile-edit-avatar-file]');
		if (fileField) {
			fileField.value = '';
		}
		setAvatar(
			getElement<HTMLInputElement>('[data-profile-edit-display-name]')?.value || targetProfile.display_name,
			null,
		);
		try {
			await persistProfile('Foto de perfil eliminada.');
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'No se pudo quitar la foto de perfil.';
			setText('[data-profile-form-status]', message);
		}
	});

	getElement<HTMLFormElement>('[data-profile-form]')?.addEventListener('submit', async (event) => {
		event.preventDefault();
		try {
			await persistProfile('Perfil guardado.');
			closeSettings();
		} catch (error) {
			const message = error instanceof Error ? error.message : 'No se pudo guardar el perfil.';
			setText('[data-profile-form-status]', message);
		}
	});

	document.querySelectorAll<HTMLElement>('[data-theme-choice]').forEach((button) => {
		button.addEventListener('click', () => {
			const theme = button.dataset.themeChoice === 'day' ? 'day' : 'night';
			setThemeChoice(theme);
		});
	});

	let shouldOpenSettings = false;
	try {
		shouldOpenSettings = sessionStorage.getItem('poetika:open-settings') === '1';
		if (shouldOpenSettings) {
			sessionStorage.removeItem('poetika:open-settings');
		}
	} catch {
		shouldOpenSettings = false;
	}

	if (shouldOpenSettings) {
		openSettings();
	}
}
