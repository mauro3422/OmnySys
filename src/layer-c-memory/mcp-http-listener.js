const bindRetryDelayMs = process.platform === 'win32' ? 1000 : 300;

function closeBindAttempt(server) {
  if (!server) {
    return;
  }

  server.close(() => { });
}

function handlePortInUse(server, attempt, bindRetryLimit, port, isProxyMode, logger) {
  closeBindAttempt(server);

  if (isProxyMode && attempt < bindRetryLimit) {
    const nextAttempt = attempt + 1;
    logger.warn(`Port ${port} still busy after restart. Retrying bind in ${bindRetryDelayMs}ms (${nextAttempt}/${bindRetryLimit})...`);
    return { action: 'retry' };
  }

  logger.warn(`Port ${port} already in use, assuming MCP daemon is already running.`);
  if (isProxyMode) {
    logger.error('Proxy Mode active. Port remained locked after bind retries. Exiting with code 1 to let proxy retry cleanly.');
    process.exit(1);
  }

  process.exit(0);
}

function waitForBindRetry() {
  return new Promise((resolve) => {
    setTimeout(resolve, bindRetryDelayMs);
  });
}

function tryListen(app, host, port, logger, attempt, bindRetryLimit, isProxyMode) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, host, () => {
      logger.info(`🌐 OmnySys MCP HTTP daemon listening on http://${host}:${port}/mcp`);
      resolve({ status: 'listening', server });
    });

    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        resolve(handlePortInUse(server, attempt, bindRetryLimit, port, isProxyMode, logger));
        return;
      }

      reject(error);
    });
  });
}

export async function startHttpServer({ app, host, port, logger }) {
  const isProxyMode = process.env.OMNYSYS_PROXY_MODE === '1';
  const bindRetryLimit = isProxyMode ? (process.platform === 'win32' ? 8 : 3) : 0;

  for (let attempt = 0; ; attempt += 1) {
    try {
      const outcome = await tryListen(app, host, port, logger, attempt, bindRetryLimit, isProxyMode);
      if (outcome?.status === 'listening') {
        return outcome.server;
      }

      if (outcome?.action === 'retry') {
        await waitForBindRetry();
        continue;
      }

      return null;
    } catch (error) {
      logger.error(`HTTP daemon startup failed: ${error.message}`);
      process.exit(1);
      return null;
    }
  }
}
