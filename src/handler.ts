import { TelegramRequest } from './models/telegram';
import { Command } from './models/command';
import { sendMessage } from './output';
import { disclaimer } from './constants';
import { computeFetchResponse } from './commands/fetch';
import { computeSwitchFromResponse } from './commands/switchFrom';

const getMessage = (request: TelegramRequest): string | undefined =>
    request.message?.text || request.edited_message?.text;

const getChatId = (request: TelegramRequest): number | undefined =>
    request.message?.chat.id || request.edited_message?.chat.id;

const parseCommand = (messageText: string): Command | undefined => {
    if (messageText.startsWith('/fetch')) {
        return {
            command: 'fetch',
            rest: messageText.replace(/\/fetch@?[a-zA-Z]*/, '').trim(),
        };
    } if (messageText.startsWith('/start')) {
        return { command: 'start' };
    } if (messageText.startsWith('/disclaimer')) {
        return { command: 'disclaimer' };
    } if (messageText.startsWith('/switchfrom')) {
        return {
            command: 'switchfrom',
            rest: messageText.replace(/\/switchfrom@?[a-zA-Z]*/, '').trim(),
        };
    }
};

const computeResponse = async (command: Command): Promise<string> => {
    switch (command.command) {
    case 'start':
        return ['Hello!'].concat(disclaimer).join('\n');
    case 'disclaimer':
        return disclaimer;
    case 'fetch':
        return computeFetchResponse(command.rest || '');
    case 'switchfrom':
        return computeSwitchFromResponse(command.rest || '');
    default:
        return 'I did not understand that!';
    }
};

const handler = async (apiKey: string, request: TelegramRequest): Promise<void> => {
    const message = getMessage(request);
    if (!message) {
        console.log('Cannot extract message');
        return;
    }

    const chatId = getChatId(request);
    if (!chatId) {
        console.log('Cannot extract chat id');
        return;
    }

    const command = parseCommand(message);
    if (!command) {
        console.log('Cannot parse command');
        return;
    }

    let response;
    try {
        response = await computeResponse(command);
    } catch (error: any) {  // eslint-disable-line @typescript-eslint/no-explicit-any
        response = error.toString();
    }

    await sendMessage(apiKey, chatId, response);
};

export {
    handler,
    parseCommand as __test__parseCommand
};
