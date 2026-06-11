import { loadDailyChallenge } from '../lib/challenge';

function setText(node: Element | null, value: string) {
	if (!node) return;
	node.textContent = value;
}

function applySlot(card: HTMLElement, slot: { category: string; marker: string; word: string }) {
	setText(card.querySelector('[data-daily-marker]'), slot.marker);
	setText(card.querySelector('[data-daily-category]'), slot.category);
	setText(card.querySelector('[data-daily-word]'), slot.word);
}

export async function initDailyChallenge() {
	const roots = document.querySelectorAll<HTMLElement>('[data-daily-challenge]');

	if (!roots.length) {
		return;
	}

	const challenge = await loadDailyChallenge();

	for (const root of roots) {
		setText(root.querySelector('[data-daily-date]'), challenge.dateKey);
		setText(root.querySelector('[data-daily-summary]'), challenge.summary);
		setText(root.querySelector('[data-daily-source]'), 'seleccion local cada 5 min');

		const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-daily-slot]'));
		challenge.slots.forEach((slot, index) => {
			const card = cards[index];
			if (card) {
				applySlot(card, slot);
			}
		});
	}
}
