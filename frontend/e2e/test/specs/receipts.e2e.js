import { expect } from '@wdio/globals'
import path from 'path'

describe('Receipts Feature E2E Test', () => {
    describe('View List - Empty / Filled State', () => {
        it('should render the receipts page header and filters', async () => {
            await browser.setWindowSize(1200, 800)
            await browser.url('/receipts')

            const heading = await $('h1')
            await expect(heading).toBeDisplayed()

            const searchInput = await $('[aria-label="Cari toko, bank, atau alamat"]')
            await expect(searchInput).toBeDisplayed()

            const filters = await $$('button')
            await expect(filters[0]).toBeDisplayed()
        })

        it('should display mock receipt data', async () => {
            const dataRow = await $('tbody tr')
            const emptyState = await $('[data-testid="empty-receipt-state"]')
            
            await browser.waitUntil(async () => {
                return (await dataRow.isDisplayed()) || (await emptyState.isDisplayed())
            }, { timeout: 10000, timeoutMsg: 'Neither receipt data nor empty state appeared' })
            
            // Mock data should populate the page
            await expect(dataRow).toBeDisplayed()

            // Ambil screenshot daftar struk
            await browser.saveScreenshot(path.join(process.cwd(), '../../docs/tests/e2e/screenshots/receipts-list.png'))
        })
    })

    describe('Scan Receipt Flow', () => {
        it('should have a functional "Pindai Struk Baru" link', async () => {
            const scanButtonDesktop = await $('[aria-label="Upload receipt image"]')
            const scanButtonMobile = await $('a[href="/add?scan=Receipt"]')
            
            if (!(await scanButtonDesktop.isExisting())) {
                await expect(scanButtonMobile).toBeDisplayed()
            } else {
                await expect(scanButtonDesktop).toBeDisplayed()
            }

            const href = await scanButtonMobile.getAttribute('href')
            expect(href).toContain('/add?scan=Receipt')
        })

        it('should open the scan page', async () => {
            const scanButtonMobile = await $('a[href="/add?scan=Receipt"]')
            await scanButtonMobile.click()

            await browser.waitUntil(
                async () => {
                    const url = new URL(await browser.getUrl())
                    return url.pathname === '/add' && url.searchParams.get('scan') === 'Receipt'
                },
                { timeout: 10000, timeoutMsg: 'Scan page did not open' }
            )

            const scanHeader = await $('h1')
            await expect(scanHeader).toBeDisplayed()
        })

        it('should upload the mock receipt image', async () => {
            const filePath = path.join(process.cwd(), 'test', 'mock', 'receipt.jpg')
            const remoteFilePath = await browser.uploadFile(filePath)
            
            // 1. Tunggu input file dari dropzone dipasang ke DOM
            const fileInput = await $('input[type="file"]')
            await fileInput.waitForExist({ timeout: 5000 })

            // 2. Hilangkan status "hidden" yang dibuat oleh react-dropzone
            await browser.execute((el) => {
                if (el) {
                    el.style.display = 'block'
                    el.style.visibility = 'visible'
                    el.style.opacity = '1'
                }
            }, fileInput)

            // 3. Masukkan file ke elemen input Dropzone
            await fileInput.setValue(remoteFilePath)
            
            // Tunggu sebentar agar state React berubah
            await browser.pause(2000)
            
            // 4. Validasi bahwa file berhasil masuk dengan mengecek munculnya tombol "Extract with AI"
            const extractBtn = await $('button[type="submit"]')
            await expect(extractBtn).toBeDisplayed()
            
            // Ambil screenshot scan
            await browser.saveScreenshot(path.join(process.cwd(), '../../docs/tests/e2e/screenshots/receipts-scan.png'))
        })
    })

    describe('View Receipt Details', () => {
        it('should open view modal when clicking a receipt row', async () => {
            await browser.setWindowSize(1200, 800)
            await browser.url('/receipts')

            const firstRow = await $('tr.cursor-pointer')
            const hasReceipts = await firstRow.isExisting()

            if (hasReceipts) {
                await firstRow.click()

                // Modal opens with dialog role
                const modalTitle = await $('[role="dialog"] h3')
                await expect(modalTitle).toBeDisplayed()
                
                // Ambil screenshot modal detail
                await browser.saveScreenshot(path.join(process.cwd(), '../../docs/tests/e2e/screenshots/receipts-modal.png'))

                const closeButton = await $('button[aria-label*="Tutup"]')
                if (!(await closeButton.isExisting())) {
                    const buttons = await $$('[role="dialog"] button')
                    if (buttons.length > 0) await buttons[0].click()
                } else {
                    await closeButton.click()
                }
            }
        })
    })

    describe('Mobile View (375x812)', () => {
        beforeEach(async () => {
            await browser.setWindowSize(375, 812)
            await browser.url('/receipts')
        })

        it('should adjust layout for mobile screens', async () => {
            const heading = await $('h1')
            await expect(heading).toBeDisplayed()

            const scanButton = await $('a[href="/add?scan=Receipt"]')
            await expect(scanButton).toBeDisplayed()

            const searchInput = await $('[aria-label="Cari toko, bank, atau alamat"]')
            await expect(searchInput).toBeDisplayed()
            
            // Ambil screenshot mobile view
            await browser.saveScreenshot(path.join(process.cwd(), '../../docs/tests/e2e/screenshots/receipts-mobile.png'))
        })
    })

    describe('Delete Receipt Flow', () => {
        it('should delete all receipts sequentially with confirmation', async () => {
            await browser.setWindowSize(1200, 800)
            await browser.url('/receipts')

            await browser.execute(() => { window.confirm = () => true })

            let deleteBtns = await $$('tbody button[aria-label*="Hapus"]')
            
            // Lakukan looping selama masih ada tombol hapus
            while (deleteBtns.length > 0) {
                const currentCount = deleteBtns.length
                await deleteBtns[0].click()
                
                // Tunggu sampai baris/tombol berkurang
                await browser.waitUntil(
                    async () => {
                        const newBtns = await $$('tbody button[aria-label*="Hapus"]')
                        return newBtns.length < currentCount
                    },
                    {
                        timeout: 5000,
                        timeoutMsg: 'Receipt row failed to disappear after deletion'
                    }
                )
                
                // Ambil ulang data tombol yang tersisa
                deleteBtns = await $$('tbody button[aria-label*="Hapus"]')
            }

            // Validasi final (Positive Assertion): Tunggu Empty State muncul
            const emptyState = await $('[data-testid="empty-receipt-state"]')
            await emptyState.waitForDisplayed({
                timeout: 5000,
                timeoutMsg: 'Empty state message did not appear after deleting all receipts'
            })
        })
    })
})