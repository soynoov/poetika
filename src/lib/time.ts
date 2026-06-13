const MADRID_TIME_ZONE = 'Europe/Madrid';

function toDate(value: string | Date) {
	return value instanceof Date ? value : new Date(value);
}

export function formatMadridTime(value: string | Date) {
	return new Intl.DateTimeFormat('es-ES', {
		timeZone: MADRID_TIME_ZONE,
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23',
	}).format(toDate(value));
}

export function formatMadridDateTime(value: string | Date) {
	return new Intl.DateTimeFormat('es-ES', {
		timeZone: MADRID_TIME_ZONE,
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23',
	}).format(toDate(value));
}
