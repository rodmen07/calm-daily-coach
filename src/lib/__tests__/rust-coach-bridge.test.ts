import { describe, expect, it, vi, afterEach } from "vitest";
import { getRustCheckinAdvice, getRustPlanBrief } from "@/lib/rust-coach-bridge";

describe("rust-coach-bridge", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_RUST_COACH_BRIDGE_URL;
  });

  it("returns null when bridge url is not configured", async () => {
    const advice = await getRustCheckinAdvice({ mood: 3, energy: 4 });
    expect(advice).toBeNull();
  });

  it("returns parsed checkin advice from bridge", async () => {
    process.env.NEXT_PUBLIC_RUST_COACH_BRIDGE_URL = "http://localhost:8787/coach";
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        request_type: "checkin",
        advice: {
          message: "Start with a 10-minute unblock step on: task switching.",
          strategy: "friction_unblock",
        },
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const advice = await getRustCheckinAdvice({
      mood: 3,
      energy: 4,
      friction: "task switching",
    });

    expect(advice).toContain("10-minute unblock step");
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it("returns parsed plan brief from bridge", async () => {
    process.env.NEXT_PUBLIC_RUST_COACH_BRIDGE_URL = "http://localhost:8787/coach";
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        request_type: "plan",
        text_brief: "Plan ready:\n1. Ship one focused feature",
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const brief = await getRustPlanBrief({
      priorities: ["Ship one focused feature"],
      effort: "medium",
    });

    expect(brief).toContain("Plan ready");
    expect(mockFetch).toHaveBeenCalledOnce();
  });
});
