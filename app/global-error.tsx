"use client";

import { useEffect } from "react";

/**
 * Root-layout failure fallback (replaces the whole tree). Generic message
 * only — errors are logged, never rendered.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error?.message, error?.digest ?? "");
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          textAlign: "center",
          background: "#fafafa",
        }}
      >
        <div>
          <p
            style={{
              fontSize: "13px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#a1a1aa",
            }}
          >
            500
          </p>
          <h1 style={{ fontSize: "24px", color: "#18181b", marginTop: 8 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: "14px", color: "#71717a", marginTop: 8 }}>
            An unexpected error occurred. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "24px",
              minHeight: "48px",
              padding: "12px 24px",
              borderRadius: "12px",
              border: "none",
              background: "#18181b",
              color: "#fff",
              fontSize: "15px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
