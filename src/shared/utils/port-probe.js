import net from 'net';

function closeServerQuietly(server) {
    if (!server?.listening) {
        return;
    }

    server.close(() => { });
}

export async function isPortBound(port) {
    return await new Promise((resolve) => {
        const server = net.createServer();
        let settled = false;

        const finish = (result) => {
            if (settled) {
                return;
            }
            settled = true;
            closeServerQuietly(server);
            resolve(result);
        };

        server.once('error', (error) => {
            if (error?.code === 'EADDRINUSE') {
                finish(true);
                return;
            }
            finish(false);
        });

        server.once('listening', () => finish(false));

        try {
            server.listen(port);
        } catch {
            finish(false);
        }
    });
}

export async function isPortAcceptingConnections(port, host = '127.0.0.1', timeoutMs = 1500) {
    return await new Promise((resolve) => {
        let settled = false;
        let socket = null;

        const finish = (result) => {
            if (settled) {
                return;
            }
            settled = true;
            if (socket) {
                socket.destroy();
            }
            resolve(result);
        };

        try {
            socket = net.connect({ host, port: Number(port) });
            socket.setTimeout(timeoutMs);
            socket.once('connect', () => finish(true));
            socket.once('timeout', () => finish(false));
            socket.once('error', () => finish(false));
            socket.once('close', () => finish(false));
        } catch {
            finish(false);
        }
    });
}
