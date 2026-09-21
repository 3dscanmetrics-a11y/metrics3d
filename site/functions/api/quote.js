import { handleQuote } from '../../src/quote.js';

export function onRequest(context) {
  return handleQuote(context.request, context.env, context);
}
