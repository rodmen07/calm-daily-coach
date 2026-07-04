import { describe, expect, it } from "vitest";
import { CalmAudioSynthesizer } from "@/lib/audio-synthesizer";

describe("CalmAudioSynthesizer", () => {
  it("initializes state and defaults properly", () => {
    const synth = new CalmAudioSynthesizer();
    expect(synth.getActiveType()).toBeNull();
  });

  it("handles stop cleanly when inactive", () => {
    const synth = new CalmAudioSynthesizer();
    expect(() => synth.stop()).not.toThrow();
    expect(synth.getActiveType()).toBeNull();
  });

  it("safely adjusts volume within bounds", () => {
    const synth = new CalmAudioSynthesizer();
    expect(() => synth.setVolume(0.8)).not.toThrow();
  });
});
