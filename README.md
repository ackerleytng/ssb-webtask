# SsbFriendBot

A friendly bot that helps you with the Singapore Savings Bond.

## Usage

Add SsbFriendBot from https://t.me/SsbFriendBot

Try sending the bot these messages:

+ `/start`
+ `/fetch`
+ `/fetch june 2018`
+ `/fetch 17 May`
+ `/fetch Dec 15`
+ `/switchfrom Dec 15`
+ `/disclaimer`

## Setup

Register this webhook with Telegram

```
curl -X POST -H "Content-Type: multipart/form-data" -F "url=${WEBHOOK_URL}" 'https://api.telegram.org/bot${TELEGRAM_API_KEY}/setWebhook'
```

When the registration is done, you should see something like

```
{"ok":true,"result":true,"description":"Webhook was set"}
```

## Setting `TELEGRAM_API_KEY`

```
npm exec wrangler secret put TELEGRAM_API_KEY
```

## Developing

```
npm run dev
```

Send a request to the local server with

```
curl -X POST http://localhost:43389/ -H 'Content-Type: application/json' -d '{"message":{"chat": {"id": 1}, "text": "/fetch dec 2021"}}'
```

## Updating

```
npm run deploy
```

## Testing

```
npm run test
```
