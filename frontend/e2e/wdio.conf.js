import { spawn, exec } from 'child_process';
import net from 'net';
import fs from 'fs';
import path from 'path';

// Pastikan variabel lingkungan ini tersedia untuk *seluruh* proses (WebdriverIO main, workers, dan Next.js)
process.env.BYPASS_AUTH = 'true';
process.env.NEXT_PUBLIC_IS_TESTING = 'true';

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
    // Gets executed before test execution begins
    before: async function (capabilities, specs) {
        if (process.env.BYPASS_AUTH === 'true' || process.env.NEXT_PUBLIC_IS_TESTING === 'true') {
            await browser.url('/');
            await browser.setCookies({
                name: 'fintrack_fake_session',
                value: 'valid_test_session',
                path: '/'
            });
        }
    },
    // Gets executed once before all workers get launched.
    onPrepare: async function () {
        if (process.env.NO_START_SERVER === 'true') {
            console.log('Next.js server start skipped (NO_START_SERVER=true).');
            return;
        }
        console.log('Starting Next.js development server in the background...');
        
        // Load env vars from .env.test.local or a custom ENV_FILE, without touching .env.local
        const envFile = process.env.ENV_FILE
            ? path.resolve(process.env.ENV_FILE)
            : path.resolve('../.env.test.local');
        const ciEnv = loadEnvFile(envFile);
        if (Object.keys(ciEnv).length > 0) {
            console.log(`Loaded ${Object.keys(ciEnv).length} env vars from ${envFile}`);
        }
        Object.assign(process.env, ciEnv);

        devServerProcess = spawn('npx', ['next', 'dev'], {
            cwd: '../', // Run in the parent directory (frontend)
            shell: true,
            detached: process.platform !== 'win32',
            stdio: 'inherit',
            env: {
                ...process.env,
                ...ciEnv
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

    // Executed before a WebdriverIO test suite starts.
    beforeSuite: function (suite) {
        console.log(`\n--- Resetting E2E Database for suite: ${suite.title} ---`);
        const dbPath = path.resolve('..', '.e2e-db.json');
        const defaultData = {
          cashFlows: [
            {
              id: 'cf-e2e-1',
              created_at: '2026-06-01T08:00:00Z',
              date: '2026-06-01T08:00:00Z',
              income: 5000000,
              expense: 0,
              main_category: 'Pendapatan (Income)',
              sub_category: 'Gaji',
              description: 'Gaji Bulan Juni',
              payment_method: 'Bank JAGO',
              receipt_id: null,
              source_item_id: null,
            },
            {
              id: 'cf-e2e-2',
              created_at: '2026-06-10T12:00:00Z',
              date: '2026-06-10T12:00:00Z',
              income: 0,
              expense: 150000,
              main_category: 'Kebutuhan (Needs)',
              sub_category: 'Makanan',
              description: 'Makan Siang',
              payment_method: 'Tunai',
              receipt_id: null,
              source_item_id: null,
            },
            {
              id: 'cf-e2e-3',
              created_at: '2026-06-15T19:00:00Z',
              date: '2026-06-15T19:00:00Z',
              income: 0,
              expense: 500000,
              main_category: 'Keinginan (Wants)',
              sub_category: 'Hiburan',
              description: 'Nonton Bioskop',
              payment_method: 'Gopay',
              receipt_id: null,
              source_item_id: null,
            },
          ],
          statements: [
            {
              id: 'test-statement-1',
              bank_name: 'Bank JAGO',
              statement_period: 'Juni 2026',
              opening_balance: 1000000,
              closing_balance: 500000,
              file_path: 'test-path/statement.pdf',
              total_items: 1,
              created_at: '2026-06-01T00:00:00Z'
            }
          ],
          statementItems: [
            {
              id: 'test-item-1',
              statement_id: 'test-statement-1',
              date: '2026-06-05T10:00:00Z',
              description: 'Pembayaran Tagihan',
              amount: 500000,
              type: 'expense',
              category: 'Tagihan',
              balance: 500000,
              cash_flow_id: null
            }
          ],
          receipts: [
            {
              id: 'test-receipt-1',
              created_at: '2024-06-15T10:00:00Z',
              type: 'shopping',
              store_name: 'Raudhah Swalayan',
              store_address: 'Jl. Pemuda No. 123, Jakarta',
              date: '2024-06-15T10:30:00Z',
              total_price: 125500,
              payment_method: 'Qris',
              amount_paid: 150000,
              change: 24500,
              atm_id: null,
              transaction_type: null,
              fee: 0,
              bank_statement_item_id: null,
              file_path: null
            },
            {
              id: 'test-receipt-2',
              created_at: '2024-06-14T14:00:00Z',
              type: 'atm',
              store_name: 'Bank Syariah Indonesia',
              store_address: 'Jl. Sudirman No. 456, Jakarta',
              date: '2024-06-14T14:15:00Z',
              total_price: 500000,
              payment_method: null,
              amount_paid: null,
              change: null,
              atm_id: 'S1ARJAGO',
              transaction_type: 'withdrawal',
              fee: 5000,
              bank_statement_item_id: null,
              file_path: null
            }
          ]
        };
        fs.writeFileSync(dbPath, JSON.stringify(defaultData, null, 2), 'utf-8');
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
