export async function isValidWebhookRequest(request: Request): Promise<boolean> {
  const expected = process.env.WEBHOOK_SIGNING_SECRET;
  const provided = request.headers.get('x-webhook-secret');
  if (!expected || !provided) return false;

  const encoder = new TextEncoder();
  const expectedDigest = await crypto.subtle.digest('SHA-256', encoder.encode(expected));
  const providedDigest = await crypto.subtle.digest('SHA-256', encoder.encode(provided));
  const expectedBytes = new Uint8Array(expectedDigest);
  const providedBytes = new Uint8Array(providedDigest);
  let mismatch = expectedBytes.length ^ providedBytes.length;
  for (let index = 0; index < expectedBytes.length; index += 1) {
    mismatch |= expectedBytes[index] ^ (providedBytes[index] ?? 0);
  }
  return mismatch === 0;
}
