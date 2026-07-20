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
 *
 * Deliberately NOT a fourth mechanism: THEME_CONSISTENCY.md section 3 named
 * "an explicit `dark:` pair in the same class string" as a way a Source A
 * occurrence could be considered covered. This guard does not implement
 * that, on purpose, and post-merge review (2026-07-20) confirmed why it
 * would be unsound to add: this app's Tailwind `dark:` variant is the
 * library default, tracking the OS-level `prefers-color-scheme` media query
 * (no `@custom-variant dark` remap exists anywhere in globals.css or
 * postcss.config.mjs) - it does NOT track `html[data-theme]`, the attribute
 * `ThemeToggle` actually flips. A user can run this app in light mode on a
 * dark-OS device (or the reverse), so a `dark:foo-500` class pairing proves
 * nothing about whether `foo-500` is safe under the app's own toggle; the
 * two are independent signals. Concretely: every `dark:`-paired risky class
 * already in this tree (verified 2026-07-20 - `page.tsx`'s
 * `dark:border-slate-800` and `dark:bg-slate-900/40`, `pricing/page.tsx`'s
 * two `dark:border-slate-800`, `review/page.tsx`'s `dark:text-slate-800`)
 * is scanned and accounted for the same as any other occurrence, via
 * COVERED_CLASSES or BASELINE_DEBT - never via a `dark:`-pair bypass, because
 * there is none. The synthetic test at the bottom of this file proves a new
 * `dark:`-paired class would be flagged, not silently waved through, so this
 * stays true even if someone adds Source A occurrences.
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

/**
 * Documented, human-facing total of every BASELINE_DEBT ceiling. This is the
 * number a PR description or doc referencing "how much baseline debt this
 * guard permits" should cite.
 *
 * History: PR #93's own description claimed "~25 pre-existing occurrences"
 * for what shipped as this same BASELINE_DEBT table. That prose was wrong -
 * a post-merge review (2026-07-20) re-summed the table and re-ran the scan
 * below independently and both agree on 42, a 68% undercount in the
 * description only. The BASELINE_DEBT table itself was never wrong; nothing
 * here changes its per-file ceilings. What was missing was this constant (so
 * "the total" has one canonical, checkable home instead of living only in
 * prose that can silently go stale) and the two self-checks below it, which
 * fail loudly instead of letting the number drift unnoticed the next time
 * BASELINE_DEBT is edited without this constant being updated to match.
 */
const BASELINE_DEBT_TOTAL = 42;

/** Sum of every ceiling in BASELINE_DEBT, independent of BASELINE_DEBT_TOTAL. */
function sumBaselineDebtCeilings(): number {
  let total = 0;
  for (const perClass of Object.values(BASELINE_DEBT)) {
    for (const ceiling of Object.values(perClass)) total += ceiling;
  }
  return total;
}

/**
 * The real, live, app-wide count of Source-A occurrences that are found but
 * not covered by globals.css's override list and not an INTENTIONAL_EXCEPTION
 * - i.e. exactly what BASELINE_DEBT's ceilings exist to permit. Computed
 * straight from riskyClassesIn/COVERED_CLASSES/INTENTIONAL_EXCEPTIONS and
 * never reads a BASELINE_DEBT number, so it cannot trivially agree with a
 * stale ceiling table just by construction.
 */
function scanRealBaselineDebtTotal(): number {
  let total = 0;
  for (const absPath of APP_FILES) {
    const rel = relPath(absPath);
    const source = readFileSync(absPath, "utf-8");
    const exceptionsForFile = new Set(
      INTENTIONAL_EXCEPTIONS.filter((exc) => exc.file === rel).map((exc) => exc.className),
    );
    for (const className of riskyClassesIn(source)) {
      if (COVERED_CLASSES.has(className)) continue;
      if (exceptionsForFile.has(className)) continue;
      total += 1;
    }
  }
  return total;
}

/**
 * Every violation a file's real source would produce against BASELINE_DEBT's
 * ceilings, COVERED_CLASSES, and INTENTIONAL_EXCEPTIONS - the same check the
 * per-file `it.each` below runs, factored out so the synthetic `dark:`-pair
 * test can run the identical, real mechanism against fabricated source
 * instead of duplicating (and risking silently diverging from) the logic.
 */
function violationsForFile(rel: string, source: string): string[] {
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
  return violations;
}

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
      const violations = violationsForFile(rel, source);

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

  it("BASELINE_DEBT's ceilings sum to the documented, freshly-verified total", () => {
    // Catches BASELINE_DEBT being edited (an entry added, removed, raised, or
    // lowered) without updating BASELINE_DEBT_TOTAL to match - the exact
    // "prose total quietly stops describing the real table" failure that
    // produced PR #93's "~25" undercount in the first place.
    expect(sumBaselineDebtCeilings()).toBe(BASELINE_DEBT_TOTAL);
  });

  it("the documented baseline-debt total matches a live, independent app-wide scan", () => {
    // scanRealBaselineDebtTotal() never reads a BASELINE_DEBT number - it
    // re-derives the real count straight from the source files, the same way
    // the per-file checks above do, just summed across the whole app. The
    // per-file checks above only fail upward (`count > ceiling`), so a
    // ceiling left too HIGH after a fix lowered the real count would pass
    // them silently forever; this equality check is what catches drift in
    // either direction, the self-check this item exists to add.
    expect(scanRealBaselineDebtTotal()).toBe(BASELINE_DEBT_TOTAL);
  });

  describe("the `dark:` Tailwind variant is not treated as a safety exemption", () => {
    // This app's `dark:` variant is the Tailwind default: it tracks the
    // OS-level `prefers-color-scheme` media query, not `html[data-theme]`
    // (the attribute ThemeToggle actually flips). Confirmed by absence, not
    // assumed: no `@custom-variant dark` remap exists in globals.css, and
    // there is no tailwind.config.{js,ts} anywhere in the repo to set a
    // `darkMode` strategy either. A `dark:`-paired class is therefore NOT
    // proof a color is safe under this app's real light/dark toggle - a user
    // can have the app in light mode on a dark-OS device or the reverse. This
    // guard has no code path that treats a `dark:` prefix specially (see the
    // module doc above), so a `dark:`-paired class is scanned exactly like
    // any other literal and must clear COVERED_CLASSES / INTENTIONAL_EXCEPTIONS
    // / BASELINE_DEBT same as everything else. This test proves that stays
    // true with a fabricated file+class pair that is deliberately absent from
    // every one of those three lists.
    it("flags a hypothetical new dark:-paired risky class instead of silently exempting it", () => {
      const hypotheticalRel = "src/app/__fixtures__/hypothetical-dark-pair.tsx";
      const hypotheticalSource =
        '<div className="text-zinc-600 dark:text-zinc-700">not a real file, not in BASELINE_DEBT or INTENTIONAL_EXCEPTIONS</div>';

      // Sanity: prove the fixture actually contains risky classes that are
      // clear of every exemption, so a pass below is not vacuous.
      expect(COVERED_CLASSES.has("text-zinc-600")).toBe(false);
      expect(COVERED_CLASSES.has("text-zinc-700")).toBe(false);
      expect(BASELINE_DEBT[hypotheticalRel]).toBeUndefined();

      const violations = violationsForFile(hypotheticalRel, hypotheticalSource);

      expect(violations).toContain("text-zinc-600 (found 1, baseline allows 0)");
      expect(violations).toContain("text-zinc-700 (found 1, baseline allows 0)");
    });

    it("existing real dark:-paired classes in the app are already accounted for via COVERED_CLASSES or BASELINE_DEBT, never a dark: bypass", () => {
      // Every real `dark:`-paired risky-family class currently in src/app,
      // found the same way riskyClassesIn does (it does not special-case
      // `dark:` either - the prefix simply precedes a normal match). Each
      // must resolve through the ordinary mechanisms, exactly like a class
      // with no `dark:` pairing at all.
      const darkPairPattern =
        /dark:((?:hover:)?(?:bg|text|border)-(?:slate|gray|zinc|neutral|stone)-(?:500|600|700|800|900|950)(?:\/\d{1,3})?)\b/g;

      let sawAtLeastOne = false;
      for (const absPath of APP_FILES) {
        const rel = relPath(absPath);
        const source = readFileSync(absPath, "utf-8");
        for (const match of source.matchAll(darkPairPattern)) {
          sawAtLeastOne = true;
          const className = baseClass(match[1]);
          const exceptionsForFile = new Set(
            INTENTIONAL_EXCEPTIONS.filter((exc) => exc.file === rel).map((exc) => exc.className),
          );
          const covered = COVERED_CLASSES.has(className);
          const excepted = exceptionsForFile.has(className);
          const baselined = (BASELINE_DEBT[rel]?.[className] ?? 0) > 0;
          expect(
            covered || excepted || baselined,
            `${rel}: dark:${className} is not covered, excepted, or baselined - ` +
              `it would only pass if something is silently treating the dark: ` +
              `prefix itself as safe, which this guard must never do`,
          ).toBe(true);
        }
      }
      // Guards this test itself: if the app-wide dark: pairing ever
      // disappears entirely, the loop above passes vacuously.
      expect(sawAtLeastOne).toBe(true);
    });
  });

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
