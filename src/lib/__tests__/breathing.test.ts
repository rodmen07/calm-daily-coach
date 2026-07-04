import { describe, expect, it } from "vitest";
import {
  BREATHING_PATTERNS,
  BreathingPattern,
  getCycleDuration,
  getPacerScale,
  getPhaseLabel,
  getPhaseSequence,
  getPhaseState,
  getSecondsRemainingInPhase,
} from "@/lib/breathing";

const box: BreathingPattern = {
  id: "box",
  name: "Box",
  description: "test",
  inhale: 4,
  hold: 4,
  exhale: 4,
  rest: 4,
};

const fourSevenEight: BreathingPattern = {
  id: "478",
  name: "4-7-8",
  description: "test",
  inhale: 4,
  hold: 7,
  exhale: 8,
  rest: 0,
};

describe("breathing patterns", () => {
  it("exposes a usable set of presets", () => {
    expect(BREATHING_PATTERNS.length).toBeGreaterThanOrEqual(3);
    for (const pattern of BREATHING_PATTERNS) {
      expect(pattern.id).toBeTruthy();
      expect(pattern.name).toBeTruthy();
      expect(getCycleDuration(pattern)).toBeGreaterThan(0);
    }
  });

  it("computes cycle duration from all phases", () => {
    expect(getCycleDuration(box)).toBe(16);
    expect(getCycleDuration(fourSevenEight)).toBe(19);
  });

  it("skips zero-length phases in the sequence", () => {
    const sequence = getPhaseSequence(fourSevenEight);
    expect(sequence.map((phase) => phase.name)).toEqual(["inhale", "hold", "exhale"]);
  });
});

describe("getPhaseState", () => {
  it("resolves phases across a full box cycle", () => {
    expect(getPhaseState(box, 0).phase).toBe("inhale");
    expect(getPhaseState(box, 3.9).phase).toBe("inhale");
    expect(getPhaseState(box, 4).phase).toBe("hold");
    expect(getPhaseState(box, 8).phase).toBe("exhale");
    expect(getPhaseState(box, 12).phase).toBe("rest");
    expect(getPhaseState(box, 15.5).phase).toBe("rest");
  });

  it("wraps into subsequent cycles and counts completions", () => {
    const state = getPhaseState(box, 18);
    expect(state.phase).toBe("inhale");
    expect(state.cyclesCompleted).toBe(1);
    expect(state.elapsedInPhase).toBeCloseTo(2);
  });

  it("clamps negative elapsed time to the start", () => {
    const state = getPhaseState(box, -5);
    expect(state.phase).toBe("inhale");
    expect(state.elapsedInPhase).toBe(0);
    expect(state.cyclesCompleted).toBe(0);
  });
});

describe("getSecondsRemainingInPhase", () => {
  it("counts down within the active phase", () => {
    expect(getSecondsRemainingInPhase(box, 0)).toBe(4);
    expect(getSecondsRemainingInPhase(box, 1.2)).toBe(3);
    expect(getSecondsRemainingInPhase(box, 4)).toBe(4); // start of hold
  });
});

describe("getPacerScale", () => {
  it("expands on inhale and contracts on exhale", () => {
    expect(getPacerScale(box, 0)).toBeCloseTo(0);
    expect(getPacerScale(box, 2)).toBeCloseTo(0.5);
    expect(getPacerScale(box, 4)).toBeCloseTo(1); // hold stays full
    expect(getPacerScale(box, 6)).toBeCloseTo(1);
    expect(getPacerScale(box, 10)).toBeCloseTo(0.5); // mid exhale
    expect(getPacerScale(box, 12)).toBeCloseTo(0); // rest empty
  });
});

describe("getPhaseLabel", () => {
  it("maps phases to readable guidance", () => {
    expect(getPhaseLabel("inhale")).toBe("Breathe In");
    expect(getPhaseLabel("hold")).toBe("Hold");
    expect(getPhaseLabel("exhale")).toBe("Breathe Out");
    expect(getPhaseLabel("rest")).toBe("Rest");
  });
});
