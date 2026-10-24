# Send SMS (Alive5)

Send an SMS from an Alive5 business number in a Directus Flow. The operation returns the submitted message and conversation IDs for use in later steps. This is a community-maintained integration by Raghav Ojha, not an official Alive5 package.

## Installation

The npm package name is `@imraghavojha/directus-extension-alive5-sms`. Once published and indexed, search for **Alive5 SMS** in **Settings → Marketplace**, verify the package scope, and install it. This local source checkout has not been published.

For local development, run `npm install` and `npm run build`. On a self-hosted Directus instance, copy this package's `package.json` and `dist` directory into `extensions/directus-extension-alive5-sms`, then restart Directus. The package supports Directus 10.10 and later 10.x releases, and Directus 11.x.

The API entry point runs in the Directus sandbox. It requests only POST access to `https://api.alive5.com/public/1.0/conversations/sms/send`, with no logging, database, or filesystem permissions. Sandboxed API extensions are eligible for Marketplace installation on Directus Cloud. The built `dist` directory is included in the npm package and in this repository.

## Alive5 setup

1. Sign in to the [Alive5 dashboard](https://app.alive5.com/) with an account that can manage integrations.
2. Open **Integrations → API Key**. Copy the existing key, or select **Generate** if a key has not been created. Contact your Alive5 administrator if these settings are unavailable.
3. Find your SMS channel and assigned agent using `GET https://api.alive5.com/public/1.0/objects/channels-and-users/list` with your key in the `X-A5-APIKEY` header. In `data.Items`, select the SMS channel whose `channel_label` matches your business number. Use its `channel_id` and an assigned agent's `agents[].user_id`.

The channel and sender number must belong to your Alive5 account and be enabled for SMS.

## Options

All six options are required. Directus resolves Flow data-chain expressions before calling the handler.

| Option | Description |
| --- | --- |
| API key (`apiKey`) | Alive5 API key; the editor masks the input. |
| Channel ID (`channelId`) | SMS channel associated with the sender number. |
| User ID (`userId`) | Alive5 agent assigned to that channel. |
| From number (`from`) | Alive5 business number in E.164 format, such as `+14155550100`. |
| To number (`to`) | Recipient in E.164 format, or an expression such as `{{$trigger.payload.phone}}`. |
| Message (`message`) | Nonblank SMS text, optionally including Flow expressions. Whitespace is preserved. |

Phone numbers must start with `+` followed by 8–15 digits; the first digit cannot be zero. Other options are trimmed except the message.

Masking is a display setting, not encryption or secret storage. Directus stores the API key in the operation's options; restrict access to Flow configuration, execution logs, and exports. The operation does not log keys or messages and excludes them from its tile overview and thrown errors.

## Example Flow

1. Create a Flow with a **Webhook** trigger using POST. Protect access to the webhook before enabling it.
2. Add **Send SMS (Alive5)** and give it the operation key `send_sms`.
3. Set the API key, channel ID, user ID, and sender number from your Alive5 account. Set **To number** to `{{$trigger.payload.phone}}` and **Message** to `Hello {{$trigger.payload.name}}, your request was received.`
4. Connect the resolve path to your next operation, and the reject path to your error-handling step.
5. Trigger the Flow with a payload containing `phone` and `name`. Running an enabled Flow sends an SMS; use an authorized recipient.

A successful operation returns:

```json
{
  "messageId": "submitted-message-id",
  "conversationId": "conversation-thread-id"
}
```

Read these values as `{{send_sms.messageId}}` and `{{send_sms.conversationId}}` in later operations. `conversationId` is an empty string if Alive5 omits the thread ID. Success confirms submission, not delivery.

## Error behavior

The handler checks both the HTTP response and Alive5's nested error fields, including failures returned with HTTP 200. A missing message ID is treated as a failure. Upstream response details and transport errors are never included in thrown errors because they may contain credentials or message text.

The operation does not retry. After a transport failure or ambiguous response, check Alive5 conversation history before retrying to avoid duplicate messages. Network timeouts and redirect handling are managed by Directus's sandbox request implementation; its SDK does not expose per-request timeout or redirect options.

## Development

Scaffolded with `create-directus-extension` 12.1.6 as a JavaScript operation.

```sh
npm install
npm run build
npm run validate -- --verbose
npm pack --dry-run
```

References: [operations](https://directus.com/docs/guides/extensions/api-extensions/operations), [sandbox](https://directus.com/docs/guides/extensions/api-extensions/sandbox), [Marketplace publishing](https://directus.com/docs/guides/extensions/marketplace/publishing).

## License

[MIT](LICENSE), copyright 2026 Raghav Ojha.
