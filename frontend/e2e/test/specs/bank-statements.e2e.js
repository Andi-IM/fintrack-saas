import { expect } from '@wdio/globals'
import path from 'path'

describe('Bank Statements Feature E2E Test', () => {
    before(async () => {
        // With BYPASS_AUTH, login redirects directly to dashboard
        await browser.url('/login')
        const githubButton = await $('button=Continue with GitHub')
        
        await githubButton.click()
        
        await browser.waitUntil(
            async () => {
                const url = await browser.getUrl()
                const pathname = new URL(url).pathname
                return pathname !== '/login'
            },
            {
                timeout: 30000,
                timeoutMsg: 'Redirect from login failed'
            }
        )
    })

    describe('View List - Empty / Filled State', () => {
        it('should navigate to bank statements page', async () => {
            await browser.setWindowSize(1200, 800)
            await browser.url('/bank-statements')
            
            // Menunggu indikator loading hilang
            const loader = await $('[role="status"][aria-label="Memuat daftar mutasi bank"]')
            if (await loader.isExisting()) {
                await loader.waitForExist({ reverse: true, timeout: 10000 })
            }
        })

        it('should display data or empty state text', async () => {
            const emptyCard = await $('*=No bank statements found')
            const bankSection = await $('section[aria-label^="Grup Bank"]')
            
            const isEmpty = await emptyCard.isExisting()
            const hasData = await bankSection.isExisting()
            
            // Halaman harus menampilkan minimal data mutasi atau status kosong
            expect(hasData || isEmpty).toBe(true)
        })
    })

    describe('Desktop Interactions', () => {
        before(async () => {
            await browser.setWindowSize(1200, 800)
        })

        it('should be able to expand and collapse bank group using button', async () => {
            const bankSection = await $('section[aria-label^="Grup Bank"]')
            if (await bankSection.isExisting()) {
                const toggleBtn = await bankSection.$('button[aria-expanded]')
                await expect(toggleBtn).toBeDisplayed()
                
                // Mendapatkan status awal
                const initialState = await toggleBtn.getAttribute('aria-expanded')
                
                // Mengklik untuk mengubah status
                await toggleBtn.click()
                await browser.pause(500)
                
                // Memastikan status berubah
                const newState = await toggleBtn.getAttribute('aria-expanded')
                expect(initialState).not.toBe(newState)
            }
        })

        it('should be able to expand and collapse period using semantic button', async () => {
            // Mencari elemen button periode yang baru saja kita ubah di refactor aksesibilitas
            // Kita dapat menggunakan pencarian berdasarkan kombinasi aria-expanded dan class-class unik
            const periodBtn = await $('button.focus-visible\\:outline-indigo-500[aria-expanded]')
            
            if (await periodBtn.isExisting()) {
                await expect(periodBtn).toBeDisplayed()
                
                const initialState = await periodBtn.getAttribute('aria-expanded')
                await periodBtn.click()
                await browser.pause(500)
                
                const newState = await periodBtn.getAttribute('aria-expanded')
                expect(initialState).not.toBe(newState)
            }
        })
        
        it('should open edit item dialog when clicking edit action', async () => {
             // Tombol edit item pada tabel desktop
             const editBtn = await $('button[aria-label^="Edit item"]')
             if (await editBtn.isDisplayed()) {
                 await editBtn.click()
                 
                 // Modal Edit Transaction Item harus muncul
                 const modalDialog = await $('[role="dialog"]')
                 await expect(modalDialog).toBeDisplayed()
                 
                 // Menggunakan tombol ESC untuk menutup
                 await browser.keys(['Escape'])
                 await browser.pause(500)
             }
        })
    })

    describe('Mobile View (375x812)', () => {
        beforeEach(async () => {
            await browser.setWindowSize(375, 812)
            // Lakukan navigasi ulang jika diperlukan untuk mereset layout/state
            await browser.url('/bank-statements')
            const loader = await $('[role="status"][aria-label="Memuat daftar mutasi bank"]')
            if (await loader.isExisting()) {
                await loader.waitForExist({ reverse: true, timeout: 10000 })
            }
        })

        it('should use semantic buttons for mobile cards and open action drawer', async () => {
            const bankSection = await $('section[aria-label^="Grup Bank"]')
            if (await bankSection.isExisting()) {
                // Di tampilan mobile, kita memastikan card menggunakan button
                // Pastikan grup bank terbuka
                const bankBtn = await bankSection.$('button[aria-expanded]')
                if ((await bankBtn.getAttribute('aria-expanded')) === 'false') {
                    await bankBtn.click()
                    await browser.pause(500)
                }

                // Mencari mobile card yang kita telah ubah menjadi button
                const mobileCardBtn = await $('button.active\\:scale-\\[0\\.99\\]')
                if (await mobileCardBtn.isDisplayed()) {
                    await expect(mobileCardBtn).toBeDisplayed()
                    
                    // Menekan kartu mobile seharusnya membuka Dialog Drawer ("Kelola Item Mutasi")
                    await mobileCardBtn.click()
                    await browser.pause(500)
                    
                    const drawerDialog = await $('[role="dialog"]')
                    await expect(drawerDialog).toBeDisplayed()
                    
                    // Menutup laci (drawer) dengan menekan tombol Batal
                    const batalBtn = await $('button=Batal')
                    if (await batalBtn.isDisplayed()) {
                        await batalBtn.click()
                        await browser.pause(500)
                    }
                }
            }
        })
    })
})
