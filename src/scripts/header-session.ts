import { getSession, getUserEmail, onAuthStateChange, signOut } from '../lib/auth';
import { ensureProfileForUser } from '../lib/profiles';

function getElement<T extends HTMLElement>(selector: string, root: ParentNode = document) {
	return root.querySelector<T>(selector);
}

function renderSignedOut() {
	document.querySelectorAll<HTMLElement>('[data-auth-only]').forEach((node) => {
		node.classList.add('hidden');
		node.classList.remove('flex');
	});
	document.querySelectorAll<HTMLElement>('[data-guest-only]').forEach((node) => {
		node.classList.remove('hidden');
	});

	const profileLinks = document.querySelectorAll<HTMLAnchorElement>('[data-profile-link]');
	profileLinks.forEach((link) => {
		link.href = '/profile';
	});

	const labels = document.querySelectorAll<HTMLElement>('[data-session-label]');
	labels.forEach((label) => {
		label.textContent = 'Entrar';
	});

	document.querySelectorAll<HTMLElement>('[data-session-state]').forEach((label) => {
		label.textContent = 'Sesion cerrada';
	});
}

async function renderSignedIn() {
	const session = await getSession();
	if (!session?.user) {
		renderSignedOut();
		return;
	}

	const profile = await ensureProfileForUser(session.user);

	document.querySelectorAll<HTMLElement>('[data-auth-only]').forEach((node) => {
		node.classList.remove('hidden');
		node.classList.add('flex');
	});
	document.querySelectorAll<HTMLElement>('[data-guest-only]').forEach((node) => {
		node.classList.add('hidden');
	});

	const profileLinks = document.querySelectorAll<HTMLAnchorElement>('[data-profile-link]');
	profileLinks.forEach((link) => {
		link.href = profile ? `/profile?u=${encodeURIComponent(profile.username)}` : '/profile';
	});

	const labels = document.querySelectorAll<HTMLElement>('[data-session-label]');
	labels.forEach((label) => {
		label.textContent = profile?.display_name || getUserEmail(session.user) || 'Mi perfil';
	});

	document.querySelectorAll<HTMLElement>('[data-session-state]').forEach((label) => {
		label.textContent = `Sesion iniciada`;
	});
}

export async function initHeaderSession() {
	await renderSignedIn();

	onAuthStateChange(async (session) => {
		if (!session?.user) {
			renderSignedOut();
			return;
		}

		await renderSignedIn();
	});

	getElement<HTMLButtonElement>('[data-sign-out-button]')?.addEventListener('click', async () => {
		await signOut();
		renderSignedOut();
		window.location.href = '/';
	});
}
