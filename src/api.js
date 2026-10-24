import { request } from 'directus:api';

const endpoint = 'https://api.alive5.com/public/1.0/conversations/sms/send';
const phonePattern = /^\+[1-9]\d{7,14}$/;

function required(options, field, preserveWhitespace = false) {
	const value = options?.[field];
	if (typeof value !== 'string' || !value.trim()) {
		throw new Error(`Input "${field}" is required and must be a string.`);
	}
	return preserveWhitespace ? value : value.trim();
}

function hasError(value) {
	return Boolean(value) && (typeof value !== 'object' || Object.keys(value).length > 0);
}

function parseObject(value) {
	if (typeof value !== 'string') return value;
	try { return JSON.parse(value); } catch { return null; }
}

function rejected(status, data) {
	// Only translate known errors. Arbitrary upstream text can echo keys or SMS text.
	const result = parseObject(data);
	const detail = result?.error?.message === 'Invalid token' ? ' Invalid API key.' : '';
	return new Error(`Alive5 rejected the request (HTTP ${status}).${detail}`);
}

function httpError(error) {
	// Directus serializes response objects; isolated-vm may then copy only Error.message.
	const response = parseObject(error?.response);
	const status = response?.status ?? error?.status;
	if (Number.isInteger(status) && status >= 400 && status <= 599) {
		return rejected(status, response?.data);
	}
	// Exact Axios-generated message only: never forward arbitrary transport error text.
	const match = /^Request failed with status code ([45]\d{2})$/.exec(error?.message ?? '');
	return match ? rejected(Number(match[1])) : null;
}

export default {
	id: 'alive5-send-sms',
	async handler(options) {
		const apiKey = required(options, 'apiKey');
		const channelId = required(options, 'channelId');
		const userId = required(options, 'userId');
		const from = required(options, 'from');
		const to = required(options, 'to');
		const message = required(options, 'message', true);
		for (const [field, value] of [['from', from], ['to', to]]) {
			if (!phonePattern.test(value)) {
				throw new Error(`Input "${field}" must be an E.164 number: + followed by 8–15 digits.`);
			}
		}

		let response;
		try {
			response = await request(endpoint, {
				method: 'POST',
				headers: { 'X-A5-APIKEY': apiKey, 'Content-Type': 'application/json' },
				body: {
					channel_id: channelId,
					user_id: userId,
					phone_number_from: from,
					phone_number_to: to,
					message,
				},
			});
		} catch (error) {
			const rejection = httpError(error);
			if (rejection) throw rejection;
			// Sandbox transport errors may contain request headers/body. Do not rethrow them.
			throw new Error('Alive5 request failed. Check conversation history before retrying.');
		}

		const status = response?.status;
		if (!Number.isInteger(status)) {
			throw new Error('Alive5 returned an invalid response. Check conversation history before retrying.');
		}
		if (status < 200 || status >= 300) throw rejected(status, response.data);

		let result = response.data;
		if (typeof result === 'string') {
			try { result = JSON.parse(result); } catch { result = null; }
		}
		// Alive5 also returns application-level failures with HTTP 200.
		const code = Number(result?.code);
		if (!Number.isFinite(code) || code < 200 || code >= 400
			|| hasError(result?.error) || Number(result?.data?.code) >= 400
			|| hasError(result?.data?.error) || hasError(result?.data?.errors)) {
			throw rejected(status, result);
		}
		const sent = result?.data?.data;
		if (!sent?.message_id) throw rejected(status, result);
		return { messageId: sent.message_id, conversationId: sent.thread_id ?? '' };
	},
};
