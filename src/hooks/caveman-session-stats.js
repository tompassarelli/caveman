#!/usr/bin/env node
// caveman — Stop hook: refresh the statusline savings suffix at the end of
// every turn.
//
// Why this exists: the suffix (⛏ N saved) used to be written only when the user
// manually ran /caveman-stats, so the badge froze on a stale number for days.
// This hook fires when Claude finishes a turn, reads the transcript path Claude
// Code passes on stdin, recomputes this session's savings, and rewrites the
// pre-rendered suffix the statusline cat's. Net effect: the badge tracks the
// live session.
//
// Emits no decision — never blocks or re-triggers the turn (no decision:block,
// so the stop_hook_active loop guard never engages). Silent-fails so a stats
// hiccup can never cost a response.

const path = require('path');
const os = require('os');
const { recordSnapshot, findRecentSession } = require('./caveman-stats');

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input || '{}');
    const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
    const historyPath = path.join(claudeDir, '.caveman-history.jsonl');
    // Stop hooks receive transcript_path; fall back to the newest session file
    // if an older Claude Code build omits it.
    const sessionFile = data.transcript_path || findRecentSession(claudeDir);
    if (sessionFile) recordSnapshot({ claudeDir, historyPath, sessionFile });
  } catch (e) {
    // Silent fail — statusline refresh is best-effort, never break a turn.
  }
});
