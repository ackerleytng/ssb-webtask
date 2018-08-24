# SsbFriendBot

A friendly bot that helps you with the Singapore Savings Bond.

## Setup

Put this up on webtask.io

```
wt create --secret botApiKey=<your-api-key> ./webtask.js --name ssb-bot
```

And register this webhook with Telegram

```
curl -X POST -H "Content-Type: multipart/form-data" -F "url=<the-webtask-url>" 'https://api.telegram.org/bot<your-api-key>/setWebhook'
```

When the registration is done, you should see something like

```
{"ok":true,"result":true,"description":"Webhook was set"}
```

## Updating

```
wt update ssb-bot ./webtask.js
```

## Testing

Test parsing the webpage with

```
./main.js
```
