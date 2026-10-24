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

function rejected(status) {
	// Upstream errors can echo credentials or SMS text, even encoded. Never expose them.
	return new Error(`Alive5 rejected the request (HTTP ${status}).`);
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
		} catch {
			// Sandbox transport errors may contain request headers/body. Do not rethrow them.
			throw new Error('Alive5 request failed. Check conversation history before retrying.');
		}

		const status = response?.status;
		if (!Number.isInteger(status)) {
			throw new Error('Alive5 returned an invalid response. Check conversation history before retrying.');
		}
		if (status < 200 || status >= 300) throw rejected(status);

		let result = response.data;
		if (typeof result === 'string') {
			try { result = JSON.parse(result); } catch { result = null; }
		}
		// Alive5 also returns application-level failures with HTTP 200.
		const code = Number(result?.code);
		if (!Number.isFinite(code) || code < 200 || code >= 400
			|| hasError(result?.error) || Number(result?.data?.code) >= 400
			|| hasError(result?.data?.error) || hasError(result?.data?.errors)) {
			throw rejected(status);
		}
		const sent = result?.data?.data;
		if (!sent?.message_id) throw rejected(status);
		return { messageId: sent.message_id, conversationId: sent.thread_id ?? '' };
	},
};
