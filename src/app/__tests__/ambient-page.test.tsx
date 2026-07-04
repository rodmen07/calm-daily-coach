import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CalmPage from "@/app/ambient/page";

// Mock the Web Audio Synthesizer since web audio is not fully supported in the jsdom test environment
vi.mock("@/lib/audio-synthesizer", () => {
  return {
    CalmAudioSynthesizer: class {
      stop = vi.fn();
      setVolume = vi.fn();
      play = vi.fn();
      getActiveType = vi.fn().mockReturnValue(null);
    },
  };
});

afterEach(() => {
  cleanup();
});

describe("Ambient page", () => {
  it("renders correctly with full sound selection controls", () => {
    render(<CalmPage />);

    expect(screen.getByText("Ambient Noise")).toBeTruthy();
    expect(screen.getByText("Player Controls")).toBeTruthy();
    expect(screen.getByText("Volume")).toBeTruthy();

    expect(screen.getByText("Brown Noise")).toBeTruthy();
    expect(screen.getByText("Voss Pink Noise")).toBeTruthy();
    expect(screen.getByText("Alpha Beats (10Hz)")).toBeTruthy();
    expect(screen.getByText("Celestial Pad")).toBeTruthy();
  });
});
