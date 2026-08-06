/**
 * Email Provider Tests — Milestone 6.12.
 *
 * Tests for the console provider and provider factory.
 * Resend provider is tested implicitly via integration; its
 * constructor requires env vars that are not set in test.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ConsoleEmailProvider } from "../services/providers/console-provider";
import type { SendEmailInput } from "../types/notification";

// Mock server-only
vi.mock("server-only", () => ({}));

describe("ConsoleEmailProvider", () => {
  const provider = new ConsoleEmailProvider();
  const sampleInput: SendEmailInput = {
    to: "jane@example.com",
    subject: "Test Subject",
    html: "<p>Hello</p>",
    text: "Hello",
    fromName: "Test Sender",
    replyTo: "reply@example.com",
    idempotencyKey: "test-key-123",
  };

  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("returns success with a synthetic message ID", async () => {
    const result = await provider.send(sampleInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.providerMessageId).toBeDefined();
      expect(result.providerMessageId).toContain("console_");
    }
  });

  it("logs email metadata", async () => {
    await provider.send(sampleInput);

    expect(consoleSpy).toHaveBeenCalledWith(
      "[ConsoleEmailProvider] Email sent (dev mode):",
      expect.objectContaining({
        to: "jane@example.com",
        subject: "Test Subject",
        fromName: "Test Sender",
        idempotencyKey: "test-key-123",
      })
    );
  });

  it("does not log the full email body", async () => {
    await provider.send(sampleInput);

    const loggedArgs = consoleSpy.mock.calls[0];
    const metadata = loggedArgs[1] as Record<string, unknown>;
    expect(metadata).not.toHaveProperty("html");
    expect(metadata).not.toHaveProperty("text");
    // Only logs length
    expect(metadata).toHaveProperty("htmlLength", 12);
    expect(metadata).toHaveProperty("textLength", 5);
  });

  it("handles missing replyTo", async () => {
    const inputWithoutReply = { ...sampleInput, replyTo: undefined };
    const result = await provider.send(inputWithoutReply);
    expect(result.success).toBe(true);
  });
});
