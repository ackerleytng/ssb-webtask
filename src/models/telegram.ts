interface TelegramChat {
    id: number,
}

interface TelegramMessage {
    chat: TelegramChat,
    text?: string,
}

interface TelegramRequest {
    message?: TelegramMessage,
    edited_message?: TelegramMessage,
}

export type {
    TelegramChat,
    TelegramMessage,
    TelegramRequest,
};
