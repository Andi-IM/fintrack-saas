import { expect } from '@wdio/globals'
import path from 'path'

describe('Bank Statements Feature E2E Test', () => {
    describe('View List - Empty / Filled State', () => {
        it('should navigate to bank statements page', async () => {
            await browser.setWindowSize(1200, 800)
            await browser.url('/statements')
            
            // Tunggu sampai loader muncul, ATAU data muncul, ATAU empty state muncul (karena page loading Next.js mungkin memakan waktu)
            await browser.waitUntil(async () => {
                const loader = await $('[role="status"][aria-label="Memuat daftar mutasi bank"]')
                const emptyCard = await $('[data-testid="empty-statement-state"]')
                const bankSection = await $('section[aria-label^="Grup Bank"]')
                return (await loader.isExisting()) || (await emptyCard.isExisting()) || (await bankSection.isExisting())
            }, { timeout: 20000, timeoutMsg: 'Page took too long to render any recognizable elements' })
            
            // Menunggu indikator loading hilang (jika loader sempat muncul)
            const loader = await $('[role="status"][aria-label="Memuat daftar mutasi bank"]')
            if (await loader.isExisting()) {
                await loader.waitForExist({ reverse: true, timeout: 15000 })
            }
        })

        it('should display data or empty state text', async () => {
            const emptyCard = await $('[data-testid="empty-statement-state"]')
            const bankSection = await $('section[aria-label^="Grup Bank"]')

            // Tunggu elemen muncul dengan toleransi waktu lebih tinggi
            await browser.waitUntil(async () => {
                return (await emptyCard.isExisting()) || (await bankSection.isExisting())
            }, { timeout: 15000, timeoutMsg: 'Data and empty state did not appear' })

            await browser.saveScreenshot(path.join(process.cwd(), '../../docs/tests/e2e/screenshots/bank-statements-list.png'))
            
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
            
            // Wait for it to exist since mock data should be injected
            await bankSection.waitForExist({ timeout: 5000, timeoutMsg: 'Mock bank statement missing' })
            
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
            
            // Kembalikan ke state awal agar tes berikutnya tidak terganggu
            await toggleBtn.click()
            await browser.pause(500)
        })

        it('should be able to expand and collapse period using semantic button', async () => {
            // Mencari elemen button periode yang baru saja kita ubah di refactor aksesibilitas
            // Kita dapat menggunakan pencarian berdasarkan kombinasi aria-expanded dan class-class unik
            const periodBtn = await $('button.focus-visible\\:outline-indigo-500[aria-expanded]')
            
            await expect(periodBtn).toBeDisplayed()
            
            const initialState = await periodBtn.getAttribute('aria-expanded')
            await periodBtn.click()
            await browser.pause(500)
            
            const newState = await periodBtn.getAttribute('aria-expanded')
            expect(initialState).not.toBe(newState)
            
            // Kembalikan ke state awal
            await periodBtn.click()
            await browser.pause(500)
        })
        
        it('should open edit item dialog when clicking edit action', async () => {
             // Tombol edit item pada tabel desktop
             const editBtn = await $('button[aria-label^="Edit item"]')
             await editBtn.waitForDisplayed({ timeout: 5000 })
             await editBtn.click()
                 
             // Modal Edit Transaction Item harus muncul
             const modalDialog = await $('[role="dialog"]')
             await expect(modalDialog).toBeDisplayed()
             await browser.saveScreenshot(path.join(process.cwd(), '../../docs/tests/e2e/screenshots/bank-statements-modal.png'))
                 
             // Menggunakan tombol ESC untuk menutup
             await browser.keys(['Escape'])
             await browser.pause(500)
        })
    })

    describe('Mobile View (375x812)', () => {
        beforeEach(async () => {
            await browser.setWindowSize(375, 812)
            // Lakukan navigasi ulang jika diperlukan untuk mereset layout/state
            await browser.url('/statements')
            const loader = await $('[role="status"][aria-label="Memuat daftar mutasi bank"]')
            if (await loader.isExisting()) {
                await loader.waitForExist({ reverse: true, timeout: 10000 })
            }
        })

        it('should use semantic buttons for mobile cards and open action drawer', async () => {
            const bankSection = await $('section[aria-label^="Grup Bank"]')
            await bankSection.waitForExist({ timeout: 5000, timeoutMsg: 'Mock bank statement missing' })
            
            // Di tampilan mobile, kita memastikan card menggunakan button
            // Pastikan grup bank terbuka
            const bankBtn = await bankSection.$('button[aria-expanded]')
            if ((await bankBtn.getAttribute('aria-expanded')) === 'false') {
                await bankBtn.click()
                await browser.pause(500)
            }

            // Mencari mobile card yang kita telah ubah menjadi button
            const mobileCardBtn = await $('button.active\\:scale-\\[0\\.99\\]')
            await expect(mobileCardBtn).toBeDisplayed()
            
            // Menekan kartu mobile seharusnya membuka Dialog Drawer ("Kelola Item Mutasi")
            await mobileCardBtn.click()
            await browser.pause(500)
            
            const drawerDialog = await $('[role="dialog"]')
            await expect(drawerDialog).toBeDisplayed()
            await browser.saveScreenshot(path.join(process.cwd(), '../../docs/tests/e2e/screenshots/bank-statements-mobile.png'))
            
            // Menutup laci (drawer) dengan menekan tombol Batal
            const batalBtn = await $('[data-testid="batal-btn"]')
            await expect(batalBtn).toBeDisplayed()
            await batalBtn.click()
            await browser.pause(500)
        })
    })
})
