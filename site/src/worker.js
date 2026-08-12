import { handleQuote } from './quote.js';

export default {
  /**
   * @param {Request} request
   * @param {{ DB: D1Database, ASSETS: Fetcher }} env
   * @param {ExecutionContext} ctx
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/quote' || url.pathname === '/api/quote/') {
      return handleQuote(request, env, ctx);
    }

    return env.ASSETS.fetch(request);
  },
};
