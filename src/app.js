export default {
	id: 'alive5-send-sms',
	name: 'Send SMS (Alive5)',
	icon: 'sms',
	description: 'Send an SMS through your Alive5 business number.',
	// Keep credentials, message text, and recipient details off the Flow tile.
	overview: () => [{ label: 'Service', text: 'Alive5 SMS' }],
	options: [
		{
			field: 'apiKey', name: 'API key', type: 'string',
			meta: {
				width: 'full', interface: 'input', required: true,
				options: { masked: true },
				note: 'Alive5 API key. Masking hides the input; Directus stores Flow options.',
			},
		},
		{
			field: 'channelId', name: 'Channel ID', type: 'string',
			meta: { width: 'half', interface: 'input', required: true },
		},
		{
			field: 'userId', name: 'User ID', type: 'string',
			meta: { width: 'half', interface: 'input', required: true },
		},
		{
			field: 'from', name: 'From number', type: 'string',
			meta: {
				width: 'full', interface: 'input', required: true,
				options: { placeholder: '+14155550100' },
				note: 'Alive5 business SMS number in E.164 format.',
			},
		},
		{
			field: 'to', name: 'To number', type: 'string',
			meta: {
				width: 'full', interface: 'input', required: true,
				options: { placeholder: '{{$trigger.payload.phone}}' },
				note: 'E.164 recipient number or a Flow data-chain expression.',
			},
		},
		{
			field: 'message', name: 'Message', type: 'text',
			meta: {
				width: 'full', interface: 'input-multiline', required: true,
				options: { placeholder: 'Hello {{$trigger.payload.name}}.' },
				note: 'SMS text. Flow expressions are resolved by Directus before execution.',
			},
		},
	],
};
