import { spawn, spawnSync, exec } from 'child_process';
import net from 'net';
import fs from 'fs';
import path from 'path';

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

function runCommand(cmd, args, extraEnv = {}) {
    console.log(`\n======================================================`);
    console.log(`Executing: ${cmd} ${args.join(' ')}`);
    console.log(`======================================================\n`);
    
    const result = spawnSync(cmd, args, {
        shell: true,
        stdio: 'inherit',
        env: {
            ...process.env,
            ...extraEnv
        }
    });

    if (result.status !== 0) {
        throw new Error(`Command failed with exit code ${result.status}: ${cmd} ${args.join(' ')}`);
    }
}

async function main() {
    let serverProcess;
    
    try {
        console.log('Starting Next.js production server in the background...');
        
        const envFile = path.resolve('../.env.ci');
        const ciEnv = loadEnvFile(envFile);
        if (Object.keys(ciEnv).length > 0) {
            console.log(`Loaded ${Object.keys(ciEnv).length} env vars from ${envFile}`);
        }

        serverProcess = spawn('pnpm', ['--dir', '..', 'start'], {
            shell: true,
            detached: process.platform !== 'win32',
            stdio: 'inherit',
            env: {
                ...process.env,
                ...ciEnv
            }
        });

        // Wait for port 3000 to become available
        await waitPort(3000, '127.0.0.1', 45000);
        console.log('Next.js production server is active! Starting test sequence...');

        // Define tests queue
        const tests = [
            // --- 1. LOGIN FEATURE ---
            {
                name: 'E2E Login Test',
                type: 'e2e',
                spec: './test/specs/login.e2e.js',
                action: () => runCommand('npx', ['wdio', 'run', 'wdio.conf.js', '--spec', './test/specs/login.e2e.js'], { NO_START_SERVER: 'true' })
            },
            {
                name: 'Performance Login Test',
                type: 'perf',
                action: () => runCommand('npx', ['lhci', 'autorun', '--collect.url=http://localhost:3000/login'])
            },

            // --- 2. RECEIPTS FEATURE ---
            {
                name: 'E2E Receipts Test',
                type: 'e2e',
                spec: './test/specs/receipts.e2e.js',
                action: () => runCommand('npx', ['wdio', 'run', 'wdio.conf.js', '--spec', './test/specs/receipts.e2e.js'], { NO_START_SERVER: 'true' })
            },
            {
                name: 'Performance Receipts Test',
                type: 'perf',
                spec: './test/specs/receipts.e2e.js', // Triggered only if e2e receipts spec exists
                action: () => runCommand('npx', ['lhci', 'autorun', '--collect.url=http://localhost:3000/receipts'])
            }
        ];

        // Execute tests sequentially
        for (const test of tests) {
            // If the test target is bound to a specific spec file that doesn't exist yet, skip it.
            if (test.spec && !fs.existsSync(test.spec)) {
                console.log(`\n[SKIP] ${test.name} - Spec file not found: ${test.spec}`);
                continue;
            }

            console.log(`\n[RUN] Starting: ${test.name}`);
            test.action();
            console.log(`[PASS] Completed: ${test.name}`);
        }

        console.log('\n======================================================');
        console.log('All tests passed successfully!');
        console.log('======================================================\n');

    } catch (error) {
        console.error('\n======================================================');
        console.error('Test execution failed!');
        console.error(error.message);
        console.error('======================================================\n');
        process.exitCode = 1;
    } finally {
        if (serverProcess) {
            console.log('Stopping Next.js production server...');
            if (process.platform === 'win32') {
                exec(`taskkill /pid ${serverProcess.pid} /T /F`, (err) => {
                    if (err) console.error('Failed to clean up Next.js server:', err);
                });
            } else {
                try {
                    process.kill(-serverProcess.pid);
                } catch (err) {
                    console.error('Failed to clean up Next.js server:', err);
                }
            }
        }
    }
}

main();
