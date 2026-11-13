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

    // Refuse Node boot when DATABASE_URL can bypass RLS or own tables.
    try {
      const { assertRuntimeRole, RuntimeRoleError } = await import(
        "./lib/db/assertRuntimeRole"
      );
      const role = await assertRuntimeRole();
      if (!role.ok) {
        throw new RuntimeRoleError(role.reason);
      }
    } catch (error) {
      console.error("[instrumentation] Runtime DB role guard failed:", error);
      // Unsafe role always fails closed. Transient DB errors fail closed in
      // production/preview; in local development log and continue so `next
      // build` without a live DB still works.
      const isUnsafeRole =
        error instanceof Error && error.name === "RuntimeRoleError";
      if (
        isUnsafeRole ||
        process.env.NODE_ENV === "production" ||
        process.env.VERCEL_ENV === "production" ||
        process.env.VERCEL_ENV === "preview"
      ) {
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
