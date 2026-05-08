import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Validate server environment configuration at Node boot. Do not run this
    // in the edge runtime: middleware is invoked for public routes too, and
    // failing server-only invariants there turns every request into
    // MIDDLEWARE_INVOCATION_FAILED.
    const { env } = await import("./lib/env");
    try {
      env();
    } catch (error) {
      console.error("[instrumentation] Environment validation failed:", error);
      if (process.env.NODE_ENV === "production") {
        throw error;
      }
    }

    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
