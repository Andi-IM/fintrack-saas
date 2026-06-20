import { expect } from '@wdio/globals'
import path from 'path'

describe('Receipts Feature E2E Test', () => {
    before(async () => {
        // With BYPASS_AUTH, login redirects directly to dashboard
        // Server runs with NEXT_PUBLIC_IS_TESTING=true to enable mock data
        await browser.url('/login')
        const githubButton = await $('button=Continue with GitHub')
        
        // Click will trigger redirect due to BYPASS_AUTH=true in server
        await githubButton.click()
        
        // Wait for redirect to complete (should go to /)
        await browser.waitUntil(
            async () => {
                const url = await browser.getUrl()
                const pathname = new URL(url).pathname
                return pathname === '/'
            },
            {
                timeout: 15000,
                timeoutMsg: 'Redirect to dashboard failed after bypass auth click'
            }
        )
    })

    describe('View List - Empty / Filled State', () => {
        it('should render the receipts page header and filters', async () => {
            await browser.setWindowSize(1200, 800)
            await browser.url('/receipts')

            const heading = await $('h1=Receipts')
            await expect(heading).toBeDisplayed()

            const searchInput = await $('[aria-label="Cari toko, bank, atau alamat"]')
            await expect(searchInput).toBeDisplayed()

            const allFilter = await $('button=Semua')
            const shoppingFilter = await $('button=Belanja (Shopping)')
            const atmFilter = await $('button=Struk ATM')
            await expect(allFilter).toBeDisplayed()
            await expect(shoppingFilter).toBeDisplayed()
            await expect(atmFilter).toBeDisplayed()
        })

        it('should display mock receipt data', async () => {
            const emptyStateText = await $('p=Tidak ada struk yang ditemukan.')
            const storeName = await $('h4=Raudhah Swalayan')
            
            const isEmpty = await emptyStateText.isExisting()
            const hasData = await storeName.isDisplayed()
            
            // Mock data should populate the page
            expect(hasData || !isEmpty).toBe(true)

            // Ambil screenshot daftar struk
            await browser.saveScreenshot(path.join(process.cwd(), '../../docs/tests/e2e/screenshots/receipts-list.png'))
        })
    })

    describe('Scan Receipt Flow', () => {
        it('should have a functional "Pindai Struk Baru" link', async () => {
            const scanButton = await $('[aria-label="Upload receipt image"]')
            if (!(await scanButton.isExisting())) {
                const linkButton = await $('a=Pindai Struk Baru')
                await expect(linkButton).toBeDisplayed()
            } else {
                await expect(scanButton).toBeDisplayed()
            }

            const addLink = await $('a=Pindai Struk Baru')
            const href = await addLink.getAttribute('href')
            expect(href).toContain('/add?scan=Receipt')
        })

        it('should open the scan page', async () => {
            const scanButton = await $('a=Pindai Struk Baru')
            await scanButton.click()

            await browser.waitUntil(
                async () => {
                    const url = await browser.getUrl()
                    return url.includes('/add?scan=Receipt')
                },
                {
                    timeout: 15000,
                    timeoutMsg: 'Failed to navigate to scan page'
                }
            )

            const heading = await $('h1=Pindai Dokumen')
            await expect(heading).toBeDisplayed()
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
            const extractBtn = await $('button*=Extract with AI')
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

                const closeButton = await $('button=Tutup')
                await closeButton.click()
            }
        })
    })

    describe('Mobile View (375x812)', () => {
        beforeEach(async () => {
            await browser.setWindowSize(375, 812)
            await browser.url('/receipts')
        })

        it('should adjust layout for mobile screens', async () => {
            const heading = await $('h1=Receipts')
            await expect(heading).toBeDisplayed()

            const scanButton = await $('a=Pindai Struk Baru')
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
            // Ini jauh lebih efisien (O(1)) daripada mem-polling ketiadaan elemen (tr.cursor-pointer)
            const emptyState = await $('p=Tidak ada struk yang ditemukan.')
            await emptyState.waitForDisplayed({
                timeout: 3000,
                timeoutMsg: 'Empty state message did not appear after deleting all receipts'
            })
        })
    })
})