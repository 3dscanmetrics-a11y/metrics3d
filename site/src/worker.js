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

    // Serve canonical homepage directly (200 OK with <link rel="canonical" href="https://www.3dscanmetrics.co.za/">)
    // for legacy /home and /home/ paths so Googlebot does not flag them as multi-hop or meta-refresh redirects.
    if (url.pathname === '/home' || url.pathname === '/home/') {
      const homeUrl = new URL('/', url.origin);
      return env.ASSETS.fetch(new Request(homeUrl, request));
    }

    // Serve directory routes directly (200 OK with their canonical trailing-slash <link rel="canonical"> tag)
    // when requested without a trailing slash so Googlebot never encounters a 308 redirect error.
    if (
      url.pathname === '/services' ||
      url.pathname === '/locations' ||
      /^\/(services|locations)\/[^/.]+$/.test(url.pathname)
    ) {
      const canonicalUrl = new URL(`${url.pathname}/`, url.origin);
      return env.ASSETS.fetch(new Request(canonicalUrl, request));
    }

    return env.ASSETS.fetch(request);
  },
};
