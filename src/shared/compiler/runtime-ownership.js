import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';

export function getCompilerRuntimeDir(projectRoot) {
  return path.join(projectRoot, '.omnysysdata');
}

export function getDaemonOwnerLockPath(projectRoot, port) {
  return path.join(getCompilerRuntimeDir(projectRoot), `daemon-owner-${port}.json`);
}

export function ensureCompilerRuntimeDirSync(projectRoot) {
  const runtimeDir = getCompilerRuntimeDir(projectRoot);
  if (!fs.existsSync(runtimeDir)) {
    fs.mkdirSync(runtimeDir, { recursive: true });
  }
  return runtimeDir;
}

export function writeDaemonOwnerLockSync(projectRoot, { pid, port, state, projectPath }) {
  const runtimeDir = ensureCompilerRuntimeDirSync(projectRoot);
  const lockPath = path.join(runtimeDir, `daemon-owner-${port}.json`);
  fs.writeFileSync(lockPath, JSON.stringify({
    pid,
    port,
    state,
    projectPath,
    updatedAt: new Date().toISOString()
  }, null, 2));
  return lockPath;
}

export function removeDaemonOwnerLockSync(projectRoot, port) {
  try {
    fs.unlinkSync(getDaemonOwnerLockPath(projectRoot, port));
  } catch {
    // ignore missing lock
  }
}

export function isCompilerProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function readDaemonOwnerLock(projectRoot, port) {
  try {
    const raw = await fsPromises.readFile(getDaemonOwnerLockPath(projectRoot, port), 'utf8');
    const lock = JSON.parse(raw);
    if (String(lock?.port) !== String(port)) {
      return null;
    }
    if (!isCompilerProcessAlive(Number(lock?.pid))) {
      try {
        await fsPromises.unlink(getDaemonOwnerLockPath(projectRoot, port));
      } catch {
        // ignore stale cleanup errors
      }
      return null;
    }
    return lock;
  } catch {
    return null;
  }
}

export async function waitForDaemonOwner(projectRoot, {
  port,
  checkDaemon,
  timeoutMs = 20000,
  pollMs = 500,
  log
}) {
  const ownerLock = await readDaemonOwnerLock(projectRoot, port);
  if (!ownerLock) {
    return false;
  }

  if (typeof log === 'function') {
    log(`Existing daemon owner detected (pid=${ownerLock.pid}, state=${ownerLock.state || 'unknown'}). Waiting for recovery instead of spawning another proxy...`);
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await checkDaemon()) {
      if (typeof log === 'function') {
        log('Daemon became healthy while waiting for existing owner.');
      }
      return true;
    }

    if (!await readDaemonOwnerLock(projectRoot, port)) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  return false;
}
