import { expect } from '@wdio/globals'

describe('Login Flow', () => {
    it('should display the login page correctly', async () => {
        await browser.url('/login')

        // Verify the title is correct
        await expect(browser).toHaveTitle('FinTrack SaaS')

        // Verify the header "Private Vault" is displayed via data-slot attribute
        const header = await $('[data-slot="card-title"]')
        await expect(header).toHaveText('Private Vault')

        // Verify the GitHub login button is displayed
        const githubButton = await $('button=Continue with GitHub')
        await expect(githubButton).toBeDisplayed()
    })

    it('should redirect to the dashboard when bypass auth is active', async () => {
        await browser.url('/login')

        const githubButton = await $('button=Continue with GitHub')
        await githubButton.click()

        // Verify redirect to dashboard using WebdriverIO built-in matcher
        await expect(browser).toHaveUrl('http://localhost:3000/', { timeout: 45000 })

        // Verify the dashboard header is displayed
        const dashboardHeader = await $('h1=Dashboard Overview')
        await expect(dashboardHeader).toBeDisplayed()
    })
})
