import * as Sentry from "@sentry/nextjs";

export async function register() {
  // Validate environment configuration at boot. In production this throws
  // immediately on missing/malformed env (rather than failing later, per
  // request) so a misconfigured deploy never serves traffic. In dev we still
  // call it so missing optional vars surface early in the dev console.
  const { env } = await import("./lib/env");
  try {
    env();
  } catch (error) {
    console.error("[instrumentation] Environment validation failed:", error);
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
  }

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
