import { describe, expect, it } from "vitest";
import { procedurallySliceTask } from "../slicer";

describe("ADHD Task Slicer Logics", () => {
  it("includes an initial grounding anchor step for high-intimidation settings", () => {
    const steps = procedurallySliceTask("Pay tax bill", "admin", "high");
    expect(steps.length).toBeGreaterThan(2);
    expect(steps[0].text).toContain("Touch your nose");
    expect(steps[0].minutes).toBe(1);
    expect(steps[0].alternativeText).toContain("Drink one sip of water");
  });

  it("includes an initial focusing anchor step for medium-intimidation settings", () => {
    const steps = procedurallySliceTask("Write essay outline", "writing", "medium");
    expect(steps.length).toBeGreaterThan(2);
    expect(steps[0].text).toContain("Close every unrelated browser tab");
    expect(steps[0].minutes).toBe(1);
  });

  it("yields domain and keyword-specific instructions for writing email tasks", () => {
    const steps = procedurallySliceTask("Write important email to advisor", "writing", "low");
    expect(steps.length).toBeGreaterThan(1);
    // Verified keyword-specific emails steps
    const hasEmailStep = steps.some((s) => s.text.includes("email draft") || s.text.includes("recipient"));
    expect(hasEmailStep).toBe(true);
  });

  it("yields coding domain specific steps", () => {
    const steps = procedurallySliceTask("Refactor focus tracker function", "coding", "low");
    expect(steps.length).toBeGreaterThan(1);
    const hasCodeStep = steps.some((s) => s.text.toLowerCase().includes("ide") || s.text.toLowerCase().includes("subtask") || s.text.toLowerCase().includes("code"));
    expect(hasCodeStep).toBe(true);
  });

  it("supports steps having alternative text for cognitive swaps", () => {
    const steps = procedurallySliceTask("Clean writing desk", "cleaning", "high");
    const deskSteps = steps.filter((s) => s.text.includes("cups") || s.text.includes("dishes") || s.text.includes("trash") || s.text.includes("nose"));
    expect(deskSteps.length).toBeGreaterThan(0);
    // Grounding or cleaning step should have alternative options
    const someWithAlt = steps.some((s) => s.alternativeText !== undefined);
    expect(someWithAlt).toBe(true);
  });
});
