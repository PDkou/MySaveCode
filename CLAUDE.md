# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A single game project, **"Hungry Pack"** — a push-your-luck survival roguelite built in **Godot 4.7 / GDScript**, being developed for Steam. There is no separate library/package here; `game/` is the Godot project root.

The repo also carries an internal roleplay framework the project has been developed under:
- `ORG.md` — a company org-chart bit ("Howling") with departments (director/design/art/marketing/tech-support) and working principles. If a prompt addresses a department by name (e.g. `총괄기획, ~`), respond from that department's perspective per `ORG.md`.
- `game/GDD.md` — the living game design doc. It's appended to chronologically (each feedback round gets a new dated section), so **the latest section is the current design**, not the top of the file.
- `reports/` — dated status/playtest/market-research reports.
- `game/FORMAT_RESEARCH.md`, `game/MARKETING.md`, `game/MOODBOARD.md` — design-research and branding notes.

Read `game/GDD.md`'s most recent sections before making design/balance changes — the core loop and balance constants have changed several times and the doc explains *why*.

## Commands

There is no build step, package manager, or lint config — this is a Godot project plus a couple of standalone HTML files. "Testing" means running headless GDScript probes through the Godot binary.

### Running headless GDScript tests
This sandbox has no display, so all Godot verification is headless. A Godot 4.7 headless binary is required but is **not checked into the repo** (network policy blocks direct downloads from godotengine.org — it was previously fetched via a GitHub Release asset on this repo). Check `/tmp/godot_bin/` first; if absent, it needs to be obtained again before any of the commands below will work.

```bash
# Core logic smoke test (auto-plays RunManager via a scripted bot)
godot --headless --path game --script test_run.gd

# Every charm applied individually — regression check after touching CHARM_DEFS/_apply_effect()
godot --headless --path game --script test_all_charms.gd

# Drives the real Main.tscn scene (3D world assembly, HuntField triggers) — not just RunManager logic
godot --headless --path game --script test_main_scene.gd

# Large-scale balance simulation, N full runs in one engine process (default 100000)
godot --headless --path game --script test_mass_sim.gd -- <num_runs> [fresh]
# `fresh` mode resets GameManager.total_pelts before every run, isolating a
# brand-new player's odds from a meta-progressed veteran's.
```

After any change to `RunManager.gd`'s constants or `CHARM_DEFS`, re-run `test_all_charms.gd` (fast) and `test_mass_sim.gd -- 100000 fresh` (balance regression) before considering the change done.

### Syntax-checking a single script without a scene
```bash
godot --headless --path game --check-only --script scripts/Winter.gd
```
Note: `--check-only` doesn't set up autoloads either, so this fails with `Identifier not found: GameManager` on any script that references the autoload (e.g. `RunManager.gd`, `Main.gd`) — it's only useful for autoload-independent scripts. Use the full `test_run.gd`/`test_main_scene.gd` runs to actually exercise those.

### The HTML test builds (`web_test/`)
Two self-contained, dependency-free HTML files exist purely to get real visual/interactive feedback where Godot's editor/display isn't available:
- `web_test/index.html` — 2D card/tile-draw UI, an earlier design iteration (kept for logic-parity reference).
- `web_test/fps_prototype.html` — the current direction: a first-person 3D build with Three.js **vendored inline** (no CDN). Both files independently reimplement `RunManager.gd`'s economy logic 1:1 in JS — if you change balance constants or `CHARM_DEFS` in GDScript, mirror the change in whichever HTML file is still being actively iterated on, or explicitly note that they've diverged.

`fps_prototype.html` is built from a template + a vendored `three.min.js` spliced in at build time (kept out of the file so edits are readable):
```bash
# Template lives outside the repo in a scratch npm project (three installed via npm).
# Rebuild after editing the template:
node -e '
const fs = require("fs");
const tpl = fs.readFileSync("<template.html>", "utf8");
const lib = fs.readFileSync("<node_modules/three/build/three.min.js>", "utf8");
fs.writeFileSync("web_test/fps_prototype.html", tpl.replace("/*THREE_LIB_INSERT*/", () => lib));
'
```
**Must** use the function form of `.replace()` (`() => lib`), not the string form — `three.min.js` contains raw `$&`/`$$` sequences that the string form of `String.replace` silently reinterprets as replacement-pattern tokens, corrupting the bundle. Verify after splicing:
```bash
node --check <(node -e '...extract the first <script> block and print it...')  # must exit 0
```
Test interaction flows with Playwright (`executablePath: '/opt/pw-browsers/chromium'`, launch with `args: ['--use-gl=swiftshader']` for headless WebGL); load the `playwright` module with `NODE_PATH=/opt/node22/lib/node_modules node script.js` since it isn't resolvable from an arbitrary scratch directory.

## Architecture

### RunManager.gd is the entire game economy — everything else is a shell around it
`game/scripts/RunManager.gd` owns all state and rules: the state machine (`State.IDLE/DRAWING/ROUND_CLEAR/SHOP/GAME_OVER/RETREATED`), the prey/trap bag, charms, chains, Winter's deals, quota growth, retreat/extraction. It has **no dependency on any UI or 3D node** — it's driven entirely by method calls (`start_attempt()`, `draw()`, `cash_out()`, `pick_charm()`, ...) and reports back via three signals (`state_changed`, `pot_changed`, `message`). Both `Main.gd` (real game) and the two `web_test/*.html` files (test harnesses) are just different front-ends calling the same logic shape — when changing game rules, change them in `RunManager.gd` first and treat the UI layers as consumers.

**Charms are data, not code.** `CHARM_DEFS` is a plain array of `{id, name, desc, tier, effects: [{stat, amount[, type]}]}`. Adding a charm is a data entry; it only needs a new `case` in `_apply_effect()`'s `match` if it introduces a genuinely new `stat` key.

**Bag tokens carry a stable `uid`** (assigned in `_build_bag()`). `draw(target_uid := -1)` defaults to popping the last token (used by bots/tests that don't care about order) but can also draw a specific token out of order — this is what lets `HuntField` resolve a token when the player digs a specific spatial marker rather than always drawing "the next" one.

### The 3D hunt is bag logic wearing a spatial skin
`HuntField.gd` takes the bag `RunManager` already built and gives each token a random world position (a "snow mound," visually identical regardless of contents — see `spawn_field()`). Walking near one and digging calls `run.draw(uid)` for *that* token specifically. `RunManager` doesn't know or care that tokens now have positions; `HuntField` is a thin spatial index over the same array. `PlayerController.gd` is a bare CharacterBody3D FPS controller (WASD + mouse-look), with no game-rule knowledge at all.

### Main.gd is the only place that talks to both worlds
`Main.gd` instantiates `RunManager`, `PlayerController`, and `HuntField`, wires their signals/results together, and owns *all* UI (built procedurally in code — HUD labels, buttons, the charm shop overlay — not authored in `.tscn` files). `game/scenes/*.tscn` are deliberately kept as minimal one-line stubs (a bare root node + attached script); UI and 3D scene content is built in `_ready()` in GDScript. This is intentional: this sandbox has no Godot editor/display, so hand-authoring `.tscn` node trees is error-prone to verify — building the scene from code is both more reliable here and more diffable in code review.

### GameManager.gd is the only autoload
Registered in `project.godot`, it's the sole cross-run persistent state (`best_round`, `total_pelts`, saved to `user://savegame.dat` via raw sequential `store_32`/`get_32` — the load path has a length check for backward compatibility with an older single-field save format). Meta-progression unlocks (bonus attempts, bust-count reduction, reroll count) are threshold checks against `total_pelts`, read by `RunManager.start_run()`.

Scene flow: `Intro.tscn` (branding splash, `Palette.gd`) → `Title.tscn` (game's own title screen, `GamePalette.gd`) → `Main.tscn`. The two palettes are intentionally separate: the studio brand palette (`Palette.gd`) is only for the intro splash; in-game visuals use `GamePalette.gd`, a distinct winter-themed palette from `game/MOODBOARD.md`. Don't conflate the two when touching color/theming.

### Test scripts drive a `SceneTree`, not a scene
`test_run.gd`/`test_mass_sim.gd`/`test_all_charms.gd` extend `SceneTree` and instantiate `RunManager` directly as a bare `Node` with a script attached — they never load `Main.tscn`. Only `test_main_scene.gd` loads the real `Main.tscn` and exercises `Main.gd`'s scene-assembly and `HuntField` trigger paths. Inside a custom `--script` SceneTree entry point, autoload singletons (`GameManager`) aren't resolvable as bare identifiers — use `root.get_node("GameManager")` instead; this restriction does *not* apply inside normal node scripts like `RunManager.gd`/`Main.gd`, which reference `GameManager` directly.
