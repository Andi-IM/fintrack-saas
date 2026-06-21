import { expect } from '@wdio/globals'
import path from 'path'

describe('Auth Feature E2E Test', () => {

    // ─────────────────────────────────────────────────
    // GRUP 1 — Login Flow
    // ─────────────────────────────────────────────────
    describe('Login Flow', () => {
        it('should display the login page correctly', async () => {
            await browser.url('/login')

            // Verify title
            await expect(browser).toHaveTitle('FinTrack SaaS')

            // Verify card title
            const header = await $('[data-slot="card-title"]')
            await expect(header).toHaveText('Private Vault')

            // Verify GitHub login button is displayed
            const githubButton = await $('button[type="submit"]')
            await expect(githubButton).toBeDisplayed()

            await browser.saveScreenshot(
                path.join(process.cwd(), '../../docs/tests/e2e/screenshots/auth-login.png')
            )
        })

        it('should redirect to dashboard when bypass auth is active', async () => {
            await browser.url('/login')

            const githubButton = await $('button[type="submit"]')
            await githubButton.click()

            await browser.waitUntil(
                async () => new URL(await browser.getUrl()).pathname === '/',
                {
                    timeout: 45000,
                    timeoutMsg: 'Expected browser to redirect to the dashboard'
                }
            )

            const dashboardHeader = await $('h1')
            await expect(dashboardHeader).toBeDisplayed()

            await browser.saveScreenshot(
                path.join(process.cwd(), '../../docs/tests/e2e/screenshots/auth-dashboard.png')
            )
        })

        it('should redirect unauthenticated user from protected route to /login', async () => {
            // Hapus semua cookie untuk simulasi sesi tidak valid
            await browser.deleteCookies()

            await browser.url('/transactions')

            await browser.waitUntil(
                async () => new URL(await browser.getUrl()).pathname === '/login',
                {
                    timeout: 10000,
                    timeoutMsg: 'Expected redirect to /login for unauthenticated access'
                }
            )

            const githubButton = await $('button[type="submit"]')
            await expect(githubButton).toBeDisplayed()
        })
    })

    // ─────────────────────────────────────────────────
    // GRUP 2 — Logout Flow
    // ─────────────────────────────────────────────────
    describe('Logout Flow', () => {
        // Pastikan sudah login sebelum setiap test logout
        before(async () => {
            await browser.url('/login')
            const githubButton = await $('button[type="submit"]')
            await githubButton.click()

            await browser.waitUntil(
                async () => new URL(await browser.getUrl()).pathname === '/',
                {
                    timeout: 45000,
                    timeoutMsg: 'Login before logout test failed'
                }
            )
        })

        it('should display the logout button in the topbar', async () => {
            await browser.setWindowSize(1200, 800)
            await browser.url('/')

            // Tombol logout ada di Topbar dengan aria-label="Keluar"
            const logoutBtn = await $('button[aria-label="Keluar"]')
            await expect(logoutBtn).toBeDisplayed()
        })

        it('should logout and redirect to /login when clicking the logout button', async () => {
            await browser.setWindowSize(1200, 800)
            await browser.url('/')

            const logoutBtn = await $('button[aria-label="Keluar"]')
            await expect(logoutBtn).toBeDisplayed()

            // Klik tombol submit di form logout
            await logoutBtn.click()

            await browser.waitUntil(
                async () => new URL(await browser.getUrl()).pathname === '/login',
                {
                    timeout: 15000,
                    timeoutMsg: 'Logout did not redirect to /login'
                }
            )

            // Verifikasi halaman login tampil kembali
            const githubButton = await $('button[type="submit"]')
            await expect(githubButton).toBeDisplayed()

            await browser.saveScreenshot(
                path.join(process.cwd(), '../../docs/tests/e2e/screenshots/auth-logout.png')
            )
        })

        it('should prevent access to protected routes after logout', async () => {
            // Setelah logout dari test sebelumnya, coba akses halaman dashboard
            await browser.url('/')

            await browser.waitUntil(
                async () => new URL(await browser.getUrl()).pathname === '/login',
                {
                    timeout: 10000,
                    timeoutMsg: 'Dashboard should not be accessible after logout'
                }
            )

            const githubButton = await $('button[type="submit"]')
            await expect(githubButton).toBeDisplayed()
        })

        it('should show the logout button on mobile view', async () => {
            // Login ulang untuk test ini
            await browser.url('/login')
            const githubButton = await $('button[type="submit"]')
            await githubButton.click()

            await browser.waitUntil(
                async () => new URL(await browser.getUrl()).pathname === '/',
                { timeout: 45000, timeoutMsg: 'Login for mobile logout test failed' }
            )

            await browser.setWindowSize(375, 812)
            await browser.url('/')

            // Topbar selalu ditampilkan, tombol logout harus ada
            const logoutBtn = await $('button[aria-label="Keluar"]')
            await expect(logoutBtn).toBeDisplayed()

            await browser.saveScreenshot(
                path.join(process.cwd(), '../../docs/tests/e2e/screenshots/auth-logout-mobile.png')
            )
        })
    })
})
