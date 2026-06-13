const koFiUrlFromEnv = import.meta.env.PUBLIC_KOFI_URL;
const koFiUsername = import.meta.env.PUBLIC_KOFI_USERNAME;
const koFiButtonText = import.meta.env.PUBLIC_KOFI_BUTTON_TEXT;
const koFiWidgetColor = import.meta.env.PUBLIC_KOFI_WIDGET_COLOR;
const koFiWidgetId = import.meta.env.PUBLIC_KOFI_WIDGET_ID;

export const koFiUrl =
	koFiUrlFromEnv ||
	(koFiUsername ? `https://ko-fi.com/${koFiUsername.replace(/^@/, '')}` : '') ||
	(koFiWidgetId ? `https://ko-fi.com/${koFiWidgetId}` : '');

export const koFiWidget = koFiWidgetId
	? {
			id: koFiWidgetId,
			color: koFiWidgetColor || '#72a4f2',
			buttonText: koFiButtonText || 'Support me on Ko-fi',
		}
	: null;
