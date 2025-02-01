import { handler } from './handler';
import { TelegramRequest } from './models/telegram';

export interface Env {
    TELEGRAM_API_KEY: string,
}

export default {
  async fetch(
    request: Request,
    env: Env,
  ): Promise<Response> {
    const data: TelegramRequest = await request.json();

    // TODO remove await
    await handler(env.TELEGRAM_API_KEY, data);

    return new Response('OK');
  },
};
