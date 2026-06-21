import { spawn, spawnSync, exec, execSync } from 'child_process';
import net from 'net';
import fs from 'fs';
import path from 'path';

let serverProcess = null;
let originalEnvLocal = false;
let usingBackupEnv = false;

function restoreEnv() {
    if (usingBackupEnv) {
        const envLocalPath = path.resolve('..', '.env.local');
        const envBackupPath = path.resolve('..', '.env.local.backup');

        if (fs.existsSync(envLocalPath)) {
            try { fs.unlinkSync(envLocalPath); } catch(e) {}
        }

        if (originalEnvLocal && fs.existsSync(envBackupPath)) {
            try { fs.renameSync(envBackupPath, envLocalPath); } catch(e) {}
            console.log(`Restored original .env.local from backup`);
        } else if (fs.existsSync(envBackupPath)) {
            try { fs.unlinkSync(envBackupPath); } catch(e) {}
        }
    }
}

function cleanupAndExit(code = 0) {
    if (serverProcess) {
        console.log('Stopping Next.js production server...');
        if (process.platform === 'win32') {
            try { execSync(`taskkill /pid ${serverProcess.pid} /T /F`); } catch (err) {}
        } else {
            try { process.kill(-serverProcess.pid); } catch (err) {}
        }
        serverProcess = null;
    }
    restoreEnv();
    process.exit(code);
}

process.on('SIGINT', () => cleanupAndExit(1));
process.on('SIGTERM', () => cleanupAndExit(1));
process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    cleanupAndExit(1);
});

function killPort3000() {
    try {
        if (process.platform === 'win32') {
            const output = execSync('netstat -ano | findstr :3000').toString();
            const lines = output.split('\n');
            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 5 && parts[1].includes(':3000') && parts[3] === 'LISTENING') {
                    const pid = parts[4];
                    if (pid && pid !== '0') {
                        console.log(`Killing zombie process ${pid} on port 3000...`);
                        execSync(`taskkill /pid ${pid} /T /F`);
                    }
                }
            }
        } else {
            try {
                execSync('lsof -i :3000 -t | xargs kill -9', { stdio: 'ignore' });
            } catch (err) {}
        }
    } catch (e) {
        // Ignore if no process found or kill fails
    }
}

function setupEnv() {
    const envFileName = process.env.ENV_FILE || '.env.ci';
    const envSourcePath = path.resolve('..', envFileName);
    const envLocalPath = path.resolve('..', '.env.local');
    const envBackupPath = path.resolve('..', '.env.local.backup');

    if (!fs.existsSync(envSourcePath)) {
        console.warn(`Warning: ${envSourcePath} not found. Skipping env swap.`);
        return;
    }

    if (fs.existsSync(envLocalPath)) {
        fs.renameSync(envLocalPath, envBackupPath);
        originalEnvLocal = true;
        console.log(`Backed up existing .env.local to .env.local.backup`);
    }

    fs.copyFileSync(envSourcePath, envLocalPath);
    console.log(`Copied ${envFileName} to .env.local for native Next.js testing.`);
    usingBackupEnv = true;
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
            BYPASS_AUTH: 'true',
            NEXT_PUBLIC_IS_TESTING: 'true',
            ...extraEnv
        }
    });

    if (result.status !== 0) {
        throw new Error(`Command failed with exit code ${result.status}: ${cmd} ${args.join(' ')}`);
    }
}

async function main() {
    killPort3000();
    
    try {
        setupEnv();

        console.log('\nBuilding Next.js application for testing...');
        runCommand('pnpm', ['--dir', '..', 'build']);

        console.log('\nStarting Next.js production server in the background...');
        serverProcess = spawn('pnpm', ['--dir', '..', 'start'], {
            shell: true,
            detached: process.platform !== 'win32',
            stdio: 'inherit',
            env: { 
                ...process.env, 
                PORT: '3000', 
                HOSTNAME: '127.0.0.1',
                BYPASS_AUTH: 'true',
                NEXT_PUBLIC_IS_TESTING: 'true'
            }
        });

        // Wait for port 3000 to become available
        await waitPort(3000, '127.0.0.1', 45000);
        console.log('Next.js production server is active! Starting test sequence...');

        // Define tests queue
        const tests = [
            // --- 1. AUTH FEATURE (Login + Logout) ---
            {
                name: 'E2E Auth Test',
                type: 'e2e',
                spec: './test/specs/auth.e2e.js',
                action: () => runCommand('npx', ['wdio', 'run', 'wdio.conf.js', '--spec', './test/specs/auth.e2e.js'], { NO_START_SERVER: 'true' })
            },
            {
                name: 'Performance Login Test',
                type: 'perf',
                action: () => runCommand('npx', ['lhci', 'autorun', '--config=../.lighthouserc.json', '--collect.url=http://127.0.0.1:3000/login'])
            },

            // --- 2. RECEIPTS FEATURE ---
            {
                name: 'E2E Receipts Test',
                type: 'e2e',
                spec: './test/specs/receipts.e2e.js',
                action: () => runCommand('npx', ['wdio', 'run', 'wdio.conf.js', '--spec', './test/specs/receipts.e2e.js'], { NO_START_SERVER: 'true' })
            },
            {
                name: 'Performance Receipts Test (Desktop)',
                type: 'perf',
                spec: './test/specs/receipts.e2e.js',
                action: () => runCommand('npx', ['lhci', 'autorun', '--config=../.lighthouserc.json', '--collect.url=http://127.0.0.1:3000/receipts'])
            },
            {
                name: 'Performance Receipts Test (Mobile)',
                type: 'perf',
                spec: './test/specs/receipts.e2e.js',
                action: () => runCommand('npx', ['lhci', 'autorun', '--config=../.lighthouserc.mobile.json', '--collect.url=http://127.0.0.1:3000/receipts'])
            },

            // --- 3. CASH FLOW (TRANSACTIONS) FEATURE ---
            {
                name: 'E2E Cash Flow Test',
                type: 'e2e',
                spec: './test/specs/cash-flow.e2e.js',
                action: () => runCommand('npx', ['wdio', 'run', 'wdio.conf.js', '--spec', './test/specs/cash-flow.e2e.js'], { NO_START_SERVER: 'true' })
            },
            {
                name: 'Performance Transactions Test (Desktop)',
                type: 'perf',
                action: () => runCommand('npx', ['lhci', 'autorun', '--config=../.lighthouserc.json', '--collect.url=http://127.0.0.1:3000/transactions'])
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
        cleanupAndExit(process.exitCode || 0);
    }
}

main();
