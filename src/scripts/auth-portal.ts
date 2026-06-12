import {
	getSession,
	isSupabaseConfigured,
	onAuthStateChange,
	signInWithEmail,
	signInWithGoogle,
	signOut,
	signUpWithEmail,
} from '../lib/auth';
import { ensureProfileForUser } from '../lib/profiles';

function getElement<T extends HTMLElement>(selector: string) {
	return document.querySelector<T>(selector);
}

function setText(selector: string, value: string) {
	const node = getElement<HTMLElement>(selector);
	if (node) {
		node.textContent = value;
	}
}

function setHidden(selector: string, hidden: boolean) {
	const node = getElement<HTMLElement>(selector);
	if (node) {
		node.classList.toggle('hidden', hidden);
	}
}

function setBannerTone(tone: 'neutral' | 'success' | 'error') {
	const node = getElement<HTMLElement>('[data-auth-status-card]');
	if (!node) {
		return;
	}

	node.dataset.tone = tone;
}

function showStatus(
	message: string,
	tone: 'neutral' | 'success' | 'error' = 'neutral',
	options?: { showHint?: boolean },
) {
	setText('[data-auth-status]', message);
	setBannerTone(tone);
	setHidden('[data-auth-hint]', !(options?.showHint ?? false));
}

function getValue(selector: string) {
	const field = getElement<HTMLInputElement | HTMLTextAreaElement>(selector);
	return field?.value.trim() ?? '';
}

function normalizeUsername(value: string) {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9_]/g, '')
		.slice(0, 24);
}

function getErrorMessage(error: unknown) {
	if (error && typeof error === 'object' && 'message' in error) {
		const message = error.message;
		if (typeof message === 'string' && message.trim()) {
			return message;
		}
	}

	return 'La operacion no se pudo completar.';
}

function isValidEmail(value: string) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateSignInInput() {
	const email = getValue('[data-sign-in-email]');
	const password = getValue('[data-sign-in-password]');

	if (!isValidEmail(email)) {
		return 'Escribe un email valido para iniciar sesion.';
	}

	if (!password) {
		return 'Escribe tu password para iniciar sesion.';
	}

	return '';
}

function validateSignUpInput() {
	const displayName = getValue('[data-sign-up-display-name]');
	const username = normalizeUsername(getValue('[data-sign-up-username]'));
	const email = getValue('[data-sign-up-email]');
	const password = getValue('[data-sign-up-password]');

	if (displayName.length < 2) {
		return 'Tu nombre visible debe tener al menos 2 caracteres.';
	}

	if (username.length < 3) {
		return 'El username debe tener al menos 3 caracteres validos.';
	}

	if (!/^[a-z0-9_]+$/.test(username)) {
		return 'El username solo puede usar letras minusculas, numeros y _.';
	}

	if (!isValidEmail(email)) {
		return 'Escribe un email valido para crear la cuenta.';
	}

	if (password.length < 6) {
		return 'La password debe tener al menos 6 caracteres.';
	}

	return '';
}

async function redirectToProfile() {
	const session = await getSession();
	if (!session?.user) {
		return;
	}

	const profile = await ensureProfileForUser(session.user);
	window.location.href = profile ? `/profile?u=${encodeURIComponent(profile.username)}` : '/profile';
}

function renderSignedOutAuthView() {
	setHidden('[data-auth-forms]', false);
	setHidden('[data-auth-active-session]', true);
	setHidden('[data-auth-go-profile]', true);
	setText('[data-auth-session-state]', 'Sesion cerrada');
	showStatus('Todavia no has iniciado sesion.', 'neutral');
}

async function renderSignedInAuthView(email: string) {
	setHidden('[data-auth-forms]', true);
	setHidden('[data-auth-active-session]', false);
	setHidden('[data-auth-go-profile]', false);
	setText('[data-auth-session-state]', `Sesion iniciada como ${email || 'usuario'}`);
	showStatus('Tu sesion esta activa en este navegador.', 'success');
}

async function renderSessionState() {
	if (!isSupabaseConfigured()) {
		setText('[data-auth-session-state]', 'Supabase no configurado');
		setHidden('[data-auth-forms]', true);
		setHidden('[data-auth-active-session]', true);
		setHidden('[data-auth-go-profile]', true);
		showStatus(
			'Este despliegue no tiene PUBLIC_SUPABASE_URL o PUBLIC_SUPABASE_ANON_KEY.',
			'error',
		);
		return;
	}

	const session = await getSession();
	if (!session?.user) {
		renderSignedOutAuthView();
		return;
	}

	await renderSignedInAuthView(session.user.email ?? '');
}

function installAuthDiagnostics() {
	window.addEventListener('error', (event) => {
		showStatus(`Error de interfaz: ${event.message}`, 'error');
	});

	window.addEventListener('unhandledrejection', (event) => {
		showStatus(`Error no controlado: ${getErrorMessage(event.reason)}`, 'error');
	});
}

export async function initAuthPortal() {
	installAuthDiagnostics();

	try {
		const root = getElement<HTMLElement>('[data-auth-page]');
		if (!root) {
			return;
		}

		showStatus('Portal listo.', 'neutral');
		await renderSessionState();

		getElement<HTMLButtonElement>('[data-auth-go-profile]')?.addEventListener(
			'click',
			async () => {
				await redirectToProfile();
			},
		);

		getElement<HTMLButtonElement>('[data-auth-go-profile-secondary]')?.addEventListener(
			'click',
			async () => {
				await redirectToProfile();
			},
		);

		getElement<HTMLButtonElement>('[data-auth-sign-out]')?.addEventListener(
			'click',
			async () => {
				await signOut();
				renderSignedOutAuthView();
			},
		);

		if (!isSupabaseConfigured()) {
			return;
		}

		getElement<HTMLFormElement>('[data-sign-in-form]')?.addEventListener(
			'submit',
			async (event) => {
				event.preventDefault();
				const validationError = validateSignInInput();
				if (validationError) {
					showStatus(validationError, 'error');
					return;
				}

				showStatus('Abriendo sesion...', 'neutral');

				try {
					const data = await signInWithEmail(
						getValue('[data-sign-in-email]'),
						getValue('[data-sign-in-password]'),
					);
					await renderSignedInAuthView(data.user?.email ?? '');
					showStatus('Sesion iniciada. Redirigiendo al perfil...', 'success');
					await redirectToProfile();
				} catch (error) {
					showStatus(getErrorMessage(error), 'error');
				}
			},
		);

		getElement<HTMLButtonElement>('[data-google-sign-in]')?.addEventListener(
			'click',
			async () => {
				showStatus('Abriendo Google...', 'neutral');

				try {
					await signInWithGoogle();
				} catch (error) {
					showStatus(getErrorMessage(error), 'error');
				}
			},
		);

		getElement<HTMLInputElement>('[data-sign-up-username]')?.addEventListener(
			'input',
			(event) => {
				const target = event.target;
				if (!(target instanceof HTMLInputElement)) {
					return;
				}

				target.value = normalizeUsername(target.value);
			},
		);

		getElement<HTMLButtonElement>('[data-sign-up-submit]')?.addEventListener(
			'click',
			() => {
				showStatus('Validando datos del registro...', 'neutral');
			},
		);

		getElement<HTMLFormElement>('[data-sign-up-form]')?.addEventListener(
			'submit',
			async (event) => {
				event.preventDefault();
				const validationError = validateSignUpInput();
				if (validationError) {
					showStatus(validationError, 'error');
					return;
				}

				showStatus('Creando cuenta...', 'neutral');

				try {
					const data = await signUpWithEmail({
						email: getValue('[data-sign-up-email]'),
						password: getValue('[data-sign-up-password]'),
						username: normalizeUsername(getValue('[data-sign-up-username]')),
						displayName: getValue('[data-sign-up-display-name]'),
					});

					if (!data.user) {
						showStatus('Supabase no devolvio un usuario al registrarte.', 'error');
						return;
					}

					if (!data.session) {
						setText('[data-auth-session-state]', 'Registro pendiente de confirmacion');
						showStatus(
							'Cuenta creada. Revisa tu correo para confirmar y despues inicia sesion.',
							'success',
							{ showHint: true },
						);
						return;
					}

					await renderSignedInAuthView(data.user.email ?? '');
					showStatus('Cuenta creada y sesion iniciada. Redirigiendo...', 'success');
					await redirectToProfile();
				} catch (error) {
					showStatus(getErrorMessage(error), 'error');
				}
			},
		);

		onAuthStateChange(async (session) => {
			if (!session?.user) {
				renderSignedOutAuthView();
				return;
			}

			await renderSignedInAuthView(session.user.email ?? '');
		});
	} catch (error) {
		showStatus(`No se pudo iniciar el portal: ${getErrorMessage(error)}`, 'error');
	}
}
