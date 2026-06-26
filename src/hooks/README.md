# Caveman Hooks

These hooks are **bundled with the caveman plugin** and activate automatically when the plugin is installed. No manual setup required.

If you installed caveman standalone (without the plugin), the unified Node installer at `bin/install.js` wires them into your `settings.json` for you — run `node bin/install.js --only claude` from a clone, or `npx -y github:JuliusBrussee/caveman -- --only claude` for the curl-pipe path.

## What's Included

### `caveman-activate.js` — SessionStart hook

- Runs once when Claude Code starts
- Writes `full` to `$CLAUDE_CONFIG_DIR/.caveman-active` (default `~/.claude/.caveman-active`) via the symlink-safe `safeWriteFlag` helper
- Emits caveman rules as hidden SessionStart context
- Detects missing statusline config and emits setup nudge (Claude will offer to help)

### `caveman-mode-tracker.js` — UserPromptSubmit hook

- Fires on every user prompt, checks for `/caveman` commands and natural-language activation/deactivation phrases ("talk like caveman", "stop caveman", "normal mode")
- Writes the active mode to the flag file when a caveman command is detected; deletes it on deactivation
- Emits a small per-turn reinforcement reminder when the flag is set to a non-independent mode (`lite`/`full`/`ultra`/`wenyan*`)
- Supports: `lite`, `full`, `ultra`, `wenyan`, `wenyan-lite`, `wenyan-full`, `wenyan-ultra`, `commit`, `review`, `compress`

### `caveman-session-stats.js` — Stop hook

- Fires when Claude finishes a turn; reads the `transcript_path` Claude Code passes on stdin
- Recomputes this session's savings and rewrites `$CLAUDE_CONFIG_DIR/.caveman-statusline-suffix` so the badge tracks the live session instead of freezing until the next manual `/caveman-stats`
- Shares one routine (`recordSnapshot`) with `caveman-stats.js`, so the history log + suffix stay in sync no matter which path wrote them
- Emits no decision — never blocks or re-triggers a turn; silent-fails so a stats hiccup can't cost a response

### `caveman-statusline.sh` / `caveman-statusline.ps1` — Statusline badge script

- Reads `$CLAUDE_CONFIG_DIR/.caveman-active` (default `~/.claude/.caveman-active`) and outputs a colored badge
- Shows `[CAVEMAN]`, `[CAVEMAN:ULTRA]`, `[CAVEMAN:WENYAN]`, etc.
- Appends the savings suffix `⛏ 12.4k saved` from `$CLAUDE_CONFIG_DIR/.caveman-statusline-suffix`, rewritten every turn by the Stop hook (and by `/caveman-stats`); absent until the first turn ends, so fresh installs render no fake number. The label disambiguates the figure from context-window usage.
  - `CAVEMAN_STATUSLINE_SCOPE` (`session` | `lifetime` | `both`, default `session`) chooses what it shows: this session's savings (grows live as you work), the cumulative lifetime total, or `⛏ session ⋅ lifetime`.
  - Opt out of the suffix entirely with `CAVEMAN_STATUSLINE_SAVINGS=0`.

## Statusline Badge

The statusline badge shows which caveman mode is active directly in your Claude Code status bar.

**Plugin users:** If you do not already have a `statusLine` configured, Claude will detect that on your first session after install and offer to set it up for you. Accept and you're done.

If you already have a custom statusline, caveman does not overwrite it and Claude stays quiet. Add the badge snippet to your existing script instead.

**Standalone users:** the unified installer (`bin/install.js`, invoked by the `install.sh` / `install.ps1` shims at the repo root) wires the statusline automatically if you do not already have a custom statusline. If you do, the installer leaves it alone and prints the merge note.

**Manual setup:** If you need to configure it yourself, add one of these to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "bash /path/to/caveman-statusline.sh"
  }
}
```

```json
{
  "statusLine": {
    "type": "command",
    "command": "powershell -ExecutionPolicy Bypass -File C:\\path\\to\\caveman-statusline.ps1"
  }
}
```

Replace the path with the actual script location (e.g. `~/.claude/hooks/` for standalone installs, or the plugin install directory for plugin installs).

**Custom statusline:** If you already have a statusline script, add this snippet to it:

```bash
caveman_text=""
caveman_flag="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/.caveman-active"
if [ -f "$caveman_flag" ]; then
  caveman_mode=$(cat "$caveman_flag" 2>/dev/null)
  if [ "$caveman_mode" = "full" ] || [ -z "$caveman_mode" ]; then
    caveman_text=$'\033[38;5;172m[CAVEMAN]\033[0m'
  else
    caveman_suffix=$(echo "$caveman_mode" | tr '[:lower:]' '[:upper:]')
    caveman_text=$'\033[38;5;172m[CAVEMAN:'"${caveman_suffix}"$']\033[0m'
  fi
fi
```

Badge examples:
- `/caveman` → `[CAVEMAN]`
- `/caveman ultra` → `[CAVEMAN:ULTRA]`
- `/caveman wenyan` → `[CAVEMAN:WENYAN]`
- `/caveman-commit` → `[CAVEMAN:COMMIT]`
- `/caveman-review` → `[CAVEMAN:REVIEW]`

## How It Works

```
SessionStart hook ──writes "full"──▶ $CLAUDE_CONFIG_DIR/.caveman-active ◀──writes mode── UserPromptSubmit hook
                                              │
                                           reads
                                              ▼
                                     Statusline script ◀──reads── .caveman-statusline-suffix ◀──writes── Stop hook (every turn)
                                    [CAVEMAN:ULTRA] ⛏ 12.4k saved
```

SessionStart stdout is injected as hidden system context — Claude sees it, users don't. The statusline runs as a separate process. The flag file (mode) and the suffix file (savings) are the bridges: the Stop hook refreshes the suffix at each turn end so the statusline stays a cheap `cat` with no per-render node spawn.

## Uninstall

If installed via plugin: disable the plugin — hooks deactivate automatically.

If installed via the standalone Node installer:
```bash
npx -y github:JuliusBrussee/caveman -- --uninstall
# or, from a clone:
node bin/install.js --uninstall
```

Or manually:
1. Remove the caveman hook files from `$CLAUDE_CONFIG_DIR/hooks/` (default `~/.claude/hooks/`): `caveman-activate.js`, `caveman-mode-tracker.js`, `caveman-session-stats.js`, `caveman-stats.js`, `caveman-config.js`, and `caveman-statusline.{sh,ps1}`.
2. Remove the SessionStart, UserPromptSubmit, Stop, and statusLine entries from `$CLAUDE_CONFIG_DIR/settings.json`.
3. Delete `$CLAUDE_CONFIG_DIR/.caveman-active` (and `$CLAUDE_CONFIG_DIR/.caveman-statusline-suffix`).
