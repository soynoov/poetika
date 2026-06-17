import { getSession } from '../lib/auth';
import { fetchLeaderboard, type LeaderboardEntry } from '../lib/stories';

function getElement<T extends HTMLElement>(selector: string, root: ParentNode = document) {
	return root.querySelector<T>(selector);
}

function setText(selector: string, value: string, root: ParentNode = document) {
	const node = getElement<HTMLElement>(selector, root);
	if (node) {
		node.textContent = value;
	}
}

function setImage(selector: string, value: string | null, root: ParentNode = document) {
	const image = getElement<HTMLImageElement>(selector, root);
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

function setFallback(selector: string, displayName: string, root: ParentNode = document) {
	const fallback = getElement<HTMLElement>(selector, root);
	if (!fallback) {
		return;
	}

	fallback.textContent =
		displayName
			.trim()
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part.slice(0, 1).toUpperCase())
			.join('') || 'P';
}

function formatCompactPoints(value: number) {
	return new Intl.NumberFormat('es-ES', {
		notation: value >= 1000 ? 'compact' : 'standard',
		maximumFractionDigits: 1,
	}).format(value);
}

function renderPodium(entries: LeaderboardEntry[]) {
	const slots = [entries[1], entries[0], entries[2]];

	slots.forEach((entry, index) => {
		const card = getElement<HTMLElement>(`[data-podium-card="${index}"]`);
		if (!card) {
			return;
		}

		if (!entry) {
			card.classList.add('hidden');
			return;
		}

		card.classList.remove('hidden');
		setText('[data-podium-rank]', String(entry.rank), card);
		setText('[data-podium-highlight]', entry.highlight, card);
		setText('[data-podium-name]', entry.author.displayName, card);
		setText('[data-podium-points]', `${formatCompactPoints(entry.points)} pts`, card);
		setImage('[data-podium-avatar]', entry.author.avatarUrl, card);
		setFallback('[data-podium-fallback]', entry.author.displayName, card);
		getElement<HTMLElement>('[data-podium-fallback]', card)?.classList.toggle(
			'hidden',
			Boolean(entry.author.avatarUrl?.trim()),
		);
	}
	);
}

function buildRow(entry: LeaderboardEntry) {
	return `
		<article class="leaderboard-row ${entry.isViewer ? 'is-viewer' : ''}">
			<div class="leaderboard-row-rank">${String(entry.rank).padStart(2, '0')}</div>
			<a href="/profile?u=${encodeURIComponent(entry.author.username)}" class="leaderboard-row-avatar">
				${
					entry.author.avatarUrl
						? `<img src="${entry.author.avatarUrl}" alt="${entry.author.displayName}" class="leaderboard-row-avatar-image" />`
						: `<span class="leaderboard-row-avatar-fallback">${entry.author.displayName
								.trim()
								.split(/\s+/)
								.slice(0, 2)
								.map((part) => part.slice(0, 1).toUpperCase())
								.join('')}</span>`
				}
			</a>
			<div class="min-w-0 flex-1">
				<div class="flex items-center gap-2">
					<a href="/profile?u=${encodeURIComponent(entry.author.username)}" class="leaderboard-row-name">${entry.author.displayName}</a>
					<span class="leaderboard-row-badge">${entry.highlight}</span>
				</div>
				<p class="leaderboard-row-preview">${entry.preview}</p>
			</div>
			<div class="leaderboard-row-points">
				<span>${formatCompactPoints(entry.points)}</span>
				<small>PTS</small>
			</div>
		</article>
	`;
}

function renderRows(entries: LeaderboardEntry[]) {
	const root = getElement<HTMLElement>('[data-leaderboard-list]');
	if (!root) {
		return;
	}

	if (!entries.length) {
		root.innerHTML = `<div class="profile-story-empty">Todavia no hay autoras suficientes para construir el ranking.</div>`;
		return;
	}

	root.innerHTML = entries.slice(3).map(buildRow).join('');
}

export async function initLeaderboardPage() {
	const root = getElement<HTMLElement>('[data-leaderboard-page]');
	if (!root) {
		return;
	}

	const session = await getSession();
	const entries = await fetchLeaderboard(session?.user.id);

	renderPodium(entries);
	renderRows(entries);
	setText('[data-leaderboard-total]', String(entries.length));
}
