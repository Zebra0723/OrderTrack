// Updates OrderTrack from inside the app: finds the newest build on GitHub,
// downloads it while the app keeps running, then hands over to a small script
// that swaps the app in /Applications and opens it again once this one quits.
// Orders and settings live in Application Support, so they are untouched.
const { app } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const RELEASE_API = 'https://api.github.com/repos/Zebra0723/OrderTrack/releases/tags/latest';
const DOWNLOAD = 'https://github.com/Zebra0723/OrderTrack/releases/download/latest/';

/** "1.1.23" -> [1, 1, 23]; compares numerically. */
function newer(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  }
  return false;
}

/** The .app bundle this copy is running from, e.g. /Applications/OrderTrack.app. */
function bundlePath() {
  const m = process.execPath.match(/^(.*?\.app)\//);
  return m ? m[1] : null;
}

class Updater {
  constructor() {
    this.state = { checking: false, available: false, latest: null, current: app.getVersion(), error: '', busy: '' };
  }

  async check() {
    if (this.state.busy) return this.state;
    this.state.checking = true;
    try {
      const res = await fetch(RELEASE_API, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'OrderTrack-updater' }, signal: AbortSignal.timeout(15_000) });
      if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
      const rel = await res.json();
      const m = String(rel.name || '').match(/(\d+\.\d+\.\d+)/);
      if (!m) throw new Error('Could not read the latest version');
      this.state = { ...this.state, latest: m[1], available: newer(m[1], app.getVersion()), error: '' };
    } catch (err) {
      this.state.error = String((err && err.message) || err).slice(0, 200);
    } finally {
      this.state.checking = false;
    }
    return this.state;
  }

  /** Downloads the new build, then quits so the helper script can install and reopen it. */
  async install(onProgress) {
    if (process.platform !== 'darwin') return { ok: false, error: 'Updating from inside the app only works on a Mac.' };
    const target = bundlePath();
    if (!target) return { ok: false, error: 'Could not tell where OrderTrack is installed.' };
    const file = process.arch === 'arm64' ? 'OrderTrack-arm64.dmg' : 'OrderTrack-x64.dmg';
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ordertrack-update-'));
    const dmg = path.join(dir, 'OrderTrack.dmg');
    this.state.busy = 'downloading';
    try {
      const res = await fetch(DOWNLOAD + file, { signal: AbortSignal.timeout(10 * 60_000) });
      if (!res.ok || !res.body) throw new Error(`Download failed (${res.status})`);
      const total = Number(res.headers.get('content-length')) || 0;
      const out = fs.createWriteStream(dmg);
      let got = 0;
      for await (const chunk of res.body) {
        got += chunk.length;
        out.write(chunk);
        if (total && onProgress) onProgress(Math.round((got / total) * 100));
      }
      await new Promise((resolve, reject) => out.end((e) => (e ? reject(e) : resolve())));
      if (got < 1_000_000) throw new Error('The download looks incomplete');
    } catch (err) {
      this.state.busy = '';
      fs.rmSync(dir, { recursive: true, force: true });
      return { ok: false, error: String((err && err.message) || err) };
    }

    // Runs after OrderTrack quits: swap the app, clear the download quarantine, reopen.
    const script = path.join(dir, 'install.sh');
    fs.writeFileSync(script, `#!/bin/bash
PID=${process.pid}
for i in $(seq 1 60); do kill -0 "$PID" 2>/dev/null || break; sleep 0.5; done
MOUNT="$(hdiutil attach -nobrowse -noautoopen "${dmg}" | tail -1 | awk -F'\\t' '{print $NF}')"
if [ -d "$MOUNT/OrderTrack.app" ]; then
  rm -rf "${target}.old"
  if mv "${target}" "${target}.old"; then
    if cp -R "$MOUNT/OrderTrack.app" "${target}"; then
      rm -rf "${target}.old"
    else
      # Copy failed: put the old version back.
      rm -rf "${target}"
      mv "${target}.old" "${target}"
    fi
  fi
  xattr -cr "${target}" 2>/dev/null
fi
hdiutil detach "$MOUNT" -quiet 2>/dev/null
open "${target}"
rm -rf "${dir}"
`, { mode: 0o755 });
    const child = spawn('/bin/bash', [script], { detached: true, stdio: 'ignore' });
    child.unref();
    this.state.busy = 'installing';
    setTimeout(() => app.quit(), 300);
    return { ok: true };
  }
}

module.exports = { Updater, newer };
