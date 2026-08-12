import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getDb(): Promise<CloudflareEnv["DB"]> {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}
