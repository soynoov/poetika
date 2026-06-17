import { loadDailyChallenge } from '../lib/challenge';
import { getChallengeIcon } from '../lib/challenge-icons';
import { getSession } from '../lib/auth';
import { hasAuthorStoryForChallengeDate } from '../lib/stories';

function setText(node: Element | null, value: string) {
	if (!node) return;
	node.textContent = value;
}

function applySlot(card: HTMLElement, slot: { category: string; marker: string; word: string }) {
	setText(card.querySelector('[data-daily-marker]'), slot.marker);
	setText(card.querySelector('[data-daily-category]'), slot.category);
	setText(card.querySelector('[data-daily-word]'), slot.word);

	const iconPath = card.querySelector<SVGPathElement>('[data-daily-icon-path]');
	if (iconPath) {
		iconPath.setAttribute('d', getChallengeIcon(slot.category).path);
	}
}

export async function initDailyChallenge() {
	const roots = document.querySelectorAll<HTMLElement>('[data-daily-challenge]');

	if (!roots.length) {
		return;
	}

	const challenge = await loadDailyChallenge();
	const session = await getSession();
	const hasPublishedToday = session?.user
		? await hasAuthorStoryForChallengeDate(session.user.id, challenge.dateKey)
		: false;

	for (const root of roots) {
		setText(root.querySelector('[data-daily-date]'), challenge.dateKey);
		setText(root.querySelector('[data-daily-summary]'), challenge.summary);
		setText(root.querySelector('[data-daily-source]'), 'seleccion local diaria');
		setText(
			root.querySelector('[data-daily-status-label]'),
			hasPublishedToday ? 'Publicado' : 'Activo',
		);

		const status = root.querySelector<HTMLElement>('[data-daily-status]');
		if (status) {
			status.dataset.state = hasPublishedToday ? 'published' : 'active';
		}

		const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-daily-slot]'));
		challenge.slots.forEach((slot, index) => {
			const card = cards[index];
			if (card) {
				applySlot(card, slot);
			}
		});
	}
}
