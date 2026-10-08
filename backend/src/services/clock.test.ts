import { describe, expect, it } from "vitest";
import { fixedClock, mutableClock, systemClock } from "./clock.js";

describe("clock", () => {
  it("systemClock renvoie la date courante", () => {
    const before = Date.now();
    const now = systemClock.now().getTime();
    expect(now).toBeGreaterThanOrEqual(before);
  });

  it("fixedClock reste figée", () => {
    const clock = fixedClock("2026-10-07T12:00:00.000Z");
    expect(clock.now().toISOString()).toBe("2026-10-07T12:00:00.000Z");
    expect(clock.now().toISOString()).toBe("2026-10-07T12:00:00.000Z");
  });

  it("mutableClock avance sans dépendre du temps réel", () => {
    const clock = mutableClock("2026-10-07T12:00:00.000Z");
    clock.advance(24 * 60 * 60 * 1000);
    expect(clock.now().toISOString()).toBe("2026-10-08T12:00:00.000Z");
  });

  it("rejecte une date invalide", () => {
    expect(() => fixedClock("pas-une-date")).toThrow("Date invalide");
    expect(() => mutableClock("pas-une-date")).toThrow("Date invalide");
  });
});
