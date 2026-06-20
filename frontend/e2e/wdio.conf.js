import { spawn, exec } from 'child_process';
import net from 'net';
import fs from 'fs';
import path from 'path';

/**
 * Parse a .env file into a key-value object.
 * Lines starting with # are comments. Supports KEY=value and KEY="value".
 */
function loadEnvFile(filePath) {
    if (!fs.existsSync(filePath)) return {};
    return fs.readFileSync(filePath, 'utf-8')
        .split('\n')
        .filter(line => line.trim() && !line.trim().startsWith('#'))
        .reduce((acc, line) => {
            const [key, ...rest] = line.split('=');
            if (!key) return acc;
            const value = rest.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
            acc[key.trim()] = value;
            return acc;
        }, {});
}

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
    baseUrl: 'http://127.0.0.1:3000',
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
        if (process.env.NO_START_SERVER === 'true') {
            console.log('Next.js server start skipped (NO_START_SERVER=true).');
            return;
        }
        console.log('Starting Next.js development server in the background...');
        
        // Load env vars from .env.ci or a custom ENV_FILE, without touching .env.local
        const envFile = process.env.ENV_FILE
            ? path.resolve(process.env.ENV_FILE)
            : path.resolve('../.env.ci');
        const ciEnv = loadEnvFile(envFile);
        if (Object.keys(ciEnv).length > 0) {
            console.log(`Loaded ${Object.keys(ciEnv).length} env vars from ${envFile}`);
        }

        devServerProcess = spawn('npx', ['next', 'dev'], {
            cwd: '../', // Run in the parent directory (frontend)
            shell: true,
            detached: process.platform !== 'win32',
            stdio: 'inherit',
            env: {
                ...process.env,
                ...ciEnv,
                BYPASS_AUTH: 'true',
                NEXT_PUBLIC_IS_TESTING: 'true'
            }
        });

        // Wait for port 3000 to become available
        try {
            await waitPort(3000, '127.0.0.1', 60000);
            console.log('Next.js server is active! Commencing E2E tests...');
        } catch (err) {
            console.error('Failed to start Next.js server:', err.message);
            if (devServerProcess?.pid) {
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
        if (process.env.NO_START_SERVER === 'true') {
            return;
        }
        if (devServerProcess?.pid) {
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
