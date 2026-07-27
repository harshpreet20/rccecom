/**
 * Base URL of this deployment, used when registering Apify webhooks and for
 * other server-to-server callbacks. Must come from NEXT_PUBLIC_APP_URL --
 * previously several call sites fell back to the old pre-migration
 * standalone deployment (content-agent-gamma.vercel.app), which silently
 * registered webhooks that could never reach this app.
 *
 * Returns null (and logs a warning) if the env var isn't set, so callers on
 * non-critical paths (background scrape triggers) can log-and-skip instead
 * of crashing.
 */
export function getAppBaseUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) {
    console.warn(
      "[base-url] NEXT_PUBLIC_APP_URL is not set — skipping webhook/callback registration that depends on it."
    );
    return null;
  }
  return url.replace(/\/$/, "");
}
