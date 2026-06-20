import { spawn, exec } from 'child_process';
import net from 'net';

let devServerProcess;

function checkPort(port, host) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const onError = () => {
            socket.destroy();
            resolve(false);
        };
        socket.setTimeout(1000);
        socket.on('error', onError);
        socket.on('timeout', onError);
        socket.connect(port, host, () => {
            socket.end();
            resolve(true);
        });
    });
}

async function waitPort(port, host, timeoutMs) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const isOpen = await checkPort(port, host);
        if (isOpen) return true;
        await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error(`Timeout waiting for port ${port}`);
}

export const config = {
    runner: 'local',
    specs: [
        './test/specs/**/*.js'
    ],
    exclude: [],
    maxInstances: 1,
    capabilities: [{
        browserName: 'chrome',
        'goog:chromeOptions': {
            args: ['--headless', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage']
        }
    }],
    logLevel: 'info',
    baseUrl: 'http://localhost:3000',
    waitforTimeout: 10000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
    framework: 'mocha',
    reporters: ['spec'],
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000
    },
    // Gets executed once before all workers get launched.
    onPrepare: async function () {
        console.log('Starting Next.js development server in the background...');
        
        devServerProcess = spawn('npx', ['next', 'dev'], {
            cwd: '../', // Run in the parent directory (frontend)
            shell: true,
            detached: process.platform !== 'win32',
            stdio: 'inherit',
            env: {
                ...process.env,
                BYPASS_AUTH: 'true'
            }
        });

        // Wait for port 3000 to become available
        try {
            await waitPort(3000, '127.0.0.1', 60000);
            console.log('Next.js server is active! Commencing E2E tests...');
        } catch (err) {
            console.error('Failed to start Next.js server:', err.message);
            if (devServerProcess) {
                if (process.platform === 'win32') {
                    exec(`taskkill /pid ${devServerProcess.pid} /T /F`);
                } else {
                    process.kill(-devServerProcess.pid);
                }
            }
            process.exit(1);
        }
    },
    // Gets executed after all workers have shut down and the session has ended.
    onComplete: function () {
        if (devServerProcess) {
            console.log('Stopping Next.js development server...');
            if (process.platform === 'win32') {
                exec(`taskkill /pid ${devServerProcess.pid} /T /F`, (err) => {
                    if (err) console.error('Failed to clean up Next.js server process tree:', err);
                });
            } else {
                try {
                    process.kill(-devServerProcess.pid);
                } catch (err) {
                    console.error('Failed to clean up Next.js process group:', err);
                }
            }
        }
    }
}
