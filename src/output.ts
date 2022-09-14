const sendMessage = async (apiKey: string, chatId: number, message: string) => {
    console.log({ apiKey, chatId, message });

    const data = {
        chat_id: chatId,
        text: message,
    };
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    };

    const url = `https://api.telegram.org/bot${apiKey}/sendMessage`;
    await fetch(url, options);
};


export {
    sendMessage,
};
