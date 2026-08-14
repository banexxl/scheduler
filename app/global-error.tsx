"use client";

/**
 * Root Layout Error Boundary — Milestones 10.3, 15.13.
 *
 * Catches errors that occur in the root layout itself.
 * Provides minimal HTML fallback without layout dependencies.
 * "Go Home" uses /api/home to resolve user's appropriate dashboard.
 */

import Link from "next/link";

export default function RootError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "#fafafa",
        }}
      >
        <div
          style={{
            padding: "2rem",
            maxWidth: "480px",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#666", marginBottom: "1.5rem" }}>
            An unexpected error occurred. Please try again.
          </p>
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
            <button
              onClick={() => reset()}
              style={{
                padding: "0.5rem 1.5rem",
                fontSize: "0.875rem",
                cursor: "pointer",
                border: "1px solid #ccc",
                borderRadius: "4px",
                backgroundColor: "#fff",
              }}
            >
              Try Again
            </button>
            <Link
              href="/api/home"
              style={{
                padding: "0.5rem 1.5rem",
                fontSize: "0.875rem",
                cursor: "pointer",
                border: "1px solid #ccc",
                borderRadius: "4px",
                backgroundColor: "#fff",
                textDecoration: "none",
                color: "#333",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Go Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
