/**
 * Theme-token drift guard (v0.10 theme consistency pass).
 *
 * docs/design/THEME_CONSISTENCY.md audited the app's real component markup
 * against its own CSS-variable theming system and found three shipped
 * light/dark rendering defects, each a literal (non-token) Tailwind color
 * class that slipped past the theme system unnoticed:
 *   1. `hover:bg-slate-800` on four back/reset nav buttons (ambient, breathe
 *      x2, challenges) paired with the theme-aware `text-[--foreground]`
 *      token - fine in dark mode, near-invisible dark-on-dark hover text the
 *      moment a user switches to light mode.
 *   2. subscription-guard.tsx's paywall screens, fully hardcoded dark
 *      regardless of the user's chosen theme.
 *   3. focus/page.tsx's `bg-white/70` "Coach brief" callout, a bright white
 *      box floating inside an otherwise dark-themed panel.
 *
 * All three shipped and went unnoticed because nothing scanned for the
 * pattern. This test is that scan, run over every .tsx file under src/app -
 * not just the three files this milestone happened to name - so a FOURTH
 * such defect fails CI before it ships instead of waiting for the next
 * audit to notice it by hand.
 *
 * Mechanism (Source A / Source B, THEME_CONSISTENCY.md section 3):
 *   Source A: every literal `(bg|text|border)-(slate|gray|zinc|neutral|
 *     stone)-(500-950)` class, with an optional `hover:` prefix and an
 *     optional `/NN` opacity suffix, plus bare bg-white/text-white/bg-black/
 *     text-black - across every src/app/**\/*.tsx file, __tests__ excluded.
 *   Source B, i.e. what makes an occurrence NOT a violation:
 *     (1) the class is covered by globals.css's hand-maintained
 *         `html[data-theme="dark"] .foo { ... }` override block. Parsed live
 *         from the real file rather than hand-copied, so a class added to
 *         the override later is automatically covered here too and this
 *         test can never silently drift from the real coverage list.
 *     (2) the file+class pair is in INTENTIONAL_EXCEPTIONS: a deliberate,
 *         recorded design decision (not debt), each with its reasoning
 *         written down so a reviewer can tell "on purpose" from "forgot".
 *     (3) the file+class pair's count is at or below its ceiling in
 *         BASELINE_DEBT: literal-color usages that predate this milestone
 *         and are explicitly out of scope for it (section 3, "Explicitly
 *         out of scope for v0.10" - migrating the already-covered
 *         text-slate-700-style literals wholesale). This is a FROZEN
 *         CEILING, not a blanket exemption for the file: a new occurrence
 *         of an already-listed class (raising the count above its ceiling),
 *         or any class in that file not listed at all, still fails.
 *
 * Fixing a baselined occurrence should delete or lower its entry in the
 * same change, the same discipline the design doc asks of Fix 1-3 above -
 * otherwise the ceiling quietly stops meaning anything.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const GLOBALS_CSS_PATH = path.join(ROOT, "src/app/globals.css");
const GLOBALS_CSS = readFileSync(GLOBALS_CSS_PATH, "utf-8");
const APP_DIR = path.join(ROOT, "src/app");

/** Every .tsx file under src/app, excluding __tests__ directories anywhere
 * in the tree (component-level and app-level both live under __tests__). */
function allAppFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "__tests__") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...allAppFiles(full));
    } else if (entry.name.endsWith(".tsx")) {
      found.push(full);
    }
  }
  return found;
}

const APP_FILES = allAppFiles(APP_DIR).sort();

/** Repo-relative, forward-slash path, for stable baseline keys and readable
 * failure messages regardless of OS path separator. */
function relPath(absPath: string): string {
  return path.relative(ROOT, absPath).split(path.sep).join("/");
}

const RISKY_FAMILY_PATTERN =
  /\b(?:hover:)?(?:bg|text|border)-(?:slate|gray|zinc|neutral|stone)-(?:500|600|700|800|900|950)(?:\/\d{1,3})?\b/g;
const BARE_WHITE_BLACK_PATTERN = /\b(?:bg|text)-(?:white|black)(?:\/\d{1,3})?\b/g;

/** Strip a trailing `/NN` opacity modifier so `bg-slate-900/40` and a bare
 * `bg-slate-900` elsewhere count as the same underlying literal color. */
function baseClass(match: string): string {
  return match.replace(/\/\d{1,3}$/, "");
}

/** Every risky literal-color class token found in a file's raw source. */
function riskyClassesIn(source: string): string[] {
  const found: string[] = [];
  for (const pattern of [RISKY_FAMILY_PATTERN, BARE_WHITE_BLACK_PATTERN]) {
    for (const match of source.matchAll(pattern)) {
      found.push(baseClass(match[0]));
    }
  }
  return found;
}

/**
 * Classes covered by globals.css's dark-mode override block, parsed live.
 * Every rule in that block is written `html[data-theme="dark"] .some-class`
 * (including comma-separated selector lists, one per line), so pulling every
 * `.class` immediately following that exact prefix anywhere in the file
 * gives the real, current coverage set without hand-copying it.
 */
function coveredClasses(): Set<string> {
  const covered = new Set<string>();
  const pattern = /html\[data-theme="dark"\]\s*\.([a-zA-Z0-9-]+)/g;
  for (const match of GLOBALS_CSS.matchAll(pattern)) {
    covered.add(match[1]);
  }
  return covered;
}

const COVERED_CLASSES = coveredClasses();

/**
 * Specific file+class pairs that are a deliberate, recorded design decision
 * rather than unmigrated debt.
 */
const INTENTIONAL_EXCEPTIONS: ReadonlyArray<{
  file: string;
  className: string;
  reason: string;
}> = [
  {
    file: "src/app/slicer/page.tsx",
    className: "bg-black",
    reason:
      "modal backdrop dimming overlay - conventionally theme-agnostic by design (THEME_CONSISTENCY.md section 2, checked and set aside); not a defect.",
  },
  {
    file: "src/app/components/subscription-guard.tsx",
    className: "text-slate-950",
    reason:
      "the 'Subscribe for $5/month' link's text sits on an already-token-driven bg-[--accent] background, mirroring globals.css's app-wide .primary-button convention (fixed dark text on the accent token). Swapping it to text-[--foreground] would flip contrast the WRONG way in light mode (dark text on the dark-teal light-theme --accent), since --accent itself goes dark in light mode. Left as-is deliberately; the underlying accent-contrast-in-light-mode question is a separate, wider finding (affects .primary-button globally) filed in the backlog rather than patched here.",
  },
];

/**
 * Pre-existing literal-color usages that predate the v0.10 theme-consistency
 * pass and are explicitly out of scope for it. See the module doc for what
 * this ceiling does and does not exempt.
 */
const BASELINE_DEBT: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  "src/app/execute/page.tsx": {
    "text-slate-500": 5,
    "border-slate-500": 1,
  },
  "src/app/focus/page.tsx": {
    "hover:border-slate-500": 1,
  },
  "src/app/page.tsx": {
    "bg-slate-900": 1,
    "border-slate-800": 1,
    "text-slate-500": 8,
  },
  "src/app/pricing/page.tsx": {
    "text-slate-950": 1,
    "border-slate-800": 2,
  },
  "src/app/review/page.tsx": {
    "text-slate-500": 6,
  },
  "src/app/slicer/page.tsx": {
    "hover:bg-slate-800": 2,
    "text-slate-500": 5,
    "bg-slate-700": 2,
    "bg-slate-900": 1,
    "bg-slate-950": 1,
    "text-slate-950": 2,
    "hover:bg-slate-600": 1,
    "bg-slate-800": 1,
    "border-slate-500": 1,
  },
};

describe("theme-token drift guard", () => {
  it("finds app files to scan", () => {
    // Guards the scanner itself: if this ever drops near zero, the walk
    // silently stopped matching files and every check below passes vacuously.
    expect(APP_FILES.length).toBeGreaterThan(20);
  });

  it("the CSS override parser still finds the classes this test relies on", () => {
    // Guards the parser itself: if globals.css's override selectors are ever
    // rewritten to a shape this regex misses, COVERED_CLASSES silently goes
    // empty and every "already covered" class below would wrongly fail.
    expect(COVERED_CLASSES.has("text-slate-700")).toBe(true);
    expect(COVERED_CLASSES.has("border-slate-200")).toBe(true);
    expect(COVERED_CLASSES.size).toBeGreaterThanOrEqual(9);
  });

  it.each(INTENTIONAL_EXCEPTIONS)(
    "recorded exception $file / $className still applies to real source (not stale)",
    ({ file, className }) => {
      const source = readFileSync(path.join(ROOT, file), "utf-8");
      expect(riskyClassesIn(source)).toContain(className);
    },
  );

  it.each(APP_FILES.map((absPath) => [relPath(absPath), absPath] as const))(
    "%s introduces no hardcoded color class beyond the recorded baseline",
    (rel, absPath) => {
      const source = readFileSync(absPath, "utf-8");
      const found = riskyClassesIn(source);

      const counts = new Map<string, number>();
      for (const className of found) {
        counts.set(className, (counts.get(className) ?? 0) + 1);
      }

      const exceptionsForFile = new Set(
        INTENTIONAL_EXCEPTIONS.filter((exc) => exc.file === rel).map((exc) => exc.className),
      );
      const baselineForFile = BASELINE_DEBT[rel] ?? {};

      const violations: string[] = [];
      for (const [className, count] of counts) {
        if (COVERED_CLASSES.has(className)) continue;
        if (exceptionsForFile.has(className)) continue;
        const ceiling = baselineForFile[className] ?? 0;
        if (count > ceiling) {
          violations.push(`${className} (found ${count}, baseline allows ${ceiling})`);
        }
      }

      expect(
        violations,
        violations.length === 0
          ? ""
          : `${rel} uses a hardcoded, non-theme-aware color class not covered by ` +
            `globals.css's dark-mode override, an intentional exception, or the ` +
            `recorded baseline: ${violations.join("; ")}. Use one of the existing ` +
            `--background/--panel/--field/--foreground/--muted tokens instead, or ` +
            `record a deliberate exception with a reason in INTENTIONAL_EXCEPTIONS.`,
      ).toEqual([]);
    },
  );

  it("the scanner actually finds risky classes somewhere (not vacuously blind)", () => {
    // Sanity check on the whole mechanism, independent of any single file's
    // baseline: if the regex ever silently stopped matching (e.g. after a
    // Tailwind syntax change), every per-file check above would start
    // passing for the wrong reason. Summing across the whole app catches
    // that even if every individual baseline still happened to balance.
    const total = APP_FILES.reduce(
      (sum, absPath) => sum + riskyClassesIn(readFileSync(absPath, "utf-8")).length,
      0,
    );
    expect(total).toBeGreaterThan(0);
  });
});
