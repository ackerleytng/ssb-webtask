# SsbFriendBot

A friendly bot that helps you with the Singapore Savings Bond.

## Usage

Add SsbFriendBot from https://t.me/SsbFriendBot

Try:

+ `/fetch`
+ `/fetch june 2018`
+ `/fetch 17 May`
+ `/fetch Dec 15`

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
./main.js --current
./main.js --past 2016 8
./main.js --parse
```
