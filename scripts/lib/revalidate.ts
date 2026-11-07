/**
 * Ask the running app to drop "use cache" entries after a script changed DB data.
 * Needs REVALIDATE_SECRET in .env; APP_URL defaults to http://localhost:3000. Never fails the script.
 */
export async function revalidateTags(tags: string[]): Promise<void> {
  const secret = process.env.REVALIDATE_SECRET;
  const base = process.env.APP_URL ?? "http://localhost:3000";
  if (!secret) {
    console.log(`(skip revalidate: REVALIDATE_SECRET not set — restart the app or wait for cache expiry)`);
    return;
  }
  try {
    const res = await fetch(`${base}/api/revalidate`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-revalidate-secret": secret },
      body: JSON.stringify({ tags }),
    });
    console.log(res.ok ? `Revalidated cache tags: ${tags.join(", ")}` : `Revalidate failed: HTTP ${res.status}`);
  } catch {
    console.log(`(app not reachable at ${base}; cache will refresh on restart/expiry)`);
  }
}
