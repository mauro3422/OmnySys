export function resolveInitialProxyAction({
  existingDaemonAlive = false,
  ownerPid = null,
  currentPid = null
} = {}) {
  if (!existingDaemonAlive) {
    return {
      action: 'spawn',
      reason: 'no_live_daemon'
    };
  }

  if (ownerPid && currentPid && ownerPid !== currentPid) {
    return {
      action: 'exit',
      reason: 'managed_by_other_proxy'
    };
  }

  return {
    action: 'monitor',
    reason: 'healthy_daemon_without_proxy_owner'
  };
}
