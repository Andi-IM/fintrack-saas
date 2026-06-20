import { expect } from '@wdio/globals'

describe('Login Flow', () => {
    it('should display the login page correctly', async () => {
        await browser.url('/login')

        // Verify the title is correct
        await expect(browser).toHaveTitle('FinTrack SaaS')

        // Verify the header "Private Vault" is displayed (Next.js components use appropriate classes/tags)
        const header = await $('div=Private Vault')
        await expect(header).toBeDisplayed()

        // Verify the GitHub login button is displayed
        const githubButton = await $('button=Continue with GitHub')
        await expect(githubButton).toBeDisplayed()
    })

    it('should redirect to the dashboard when bypass auth is active', async () => {
        await browser.url('/login')

        const githubButton = await $('button=Continue with GitHub')
        await githubButton.click()

        // Wait for the URL to redirect to dashboard /
        await browser.waitUntil(
            async () => {
                const url = await browser.getUrl()
                const pathname = new URL(url).pathname
                return pathname === '/'
            },
            {
                timeout: 15000,
                timeoutMsg: 'Expected browser to redirect to the dashboard'
            }
        )

        // Verify the dashboard header is displayed
        const dashboardHeader = await $('h1=Dashboard Overview')
        await expect(dashboardHeader).toBeDisplayed()
    })
})
