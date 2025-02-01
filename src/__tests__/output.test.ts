import { sendMessage } from '../output';

global.fetch = jest.fn();

describe('output module', () => {
  test('will post message as expected', () => {
    const apiKey = 'test-api-key';
    const chatId = 1234567;
    const message = 'test-message';

    sendMessage(apiKey, chatId, message);


    expect(fetch).toHaveBeenCalledTimes(1);
    const expectedData = {
      chat_id: chatId,
      text: message,
    };
    expect(fetch).toHaveBeenCalledWith(
      'https://api.telegram.org/bottest-api-key/sendMessage',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expectedData),
      }
    );
  });
});
