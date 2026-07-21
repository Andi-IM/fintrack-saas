import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getGroupedBankStatements,
  getFileUrl,
  deleteBankStatement,
  saveBankStatement,
  updateStatementItem,
  deleteStatementItem,
  addStatementItem,
  getStatementAnalytics,
} from '@/features/bank-statements/actions/statements'
import { setStatementRepository } from '@/lib/repositories/statements'
import { StatementRepository } from '@/lib/repositories/types'
import { Tables } from '@/lib/database.types'

describe('statements server actions', () => {
  let mockRepo: StatementRepository

  beforeEach(() => {
    vi.clearAllMocks()
    mockRepo = {
      findAllWithItems: vi.fn(),
      findById: vi.fn(),
      delete: vi.fn(),
      save: vi.fn(),
      insertItems: vi.fn(),
      deleteItem: vi.fn(),
      updateItem: vi.fn(),
      addItem: vi.fn(),
      findItemsByStatementId: vi.fn(),
      updateItemBalance: vi.fn().mockResolvedValue(undefined),
      updateClosingBalance: vi.fn(),
      getSignedUrl: vi.fn(),
      uploadFile: vi.fn(),
      removeFile: vi.fn(),
      upload: vi.fn(),
      remove: vi.fn(),
      checkExistingForBank: vi.fn(),
    } as any
    setStatementRepository(mockRepo)
  })

  describe('getGroupedBankStatements', () => {
    it('groups statements by bank name', async () => {
      const statements: Tables<'bank_statements'>[] = [
        { id: '1', bank_name: 'BCA' } as any,
        { id: '2', bank_name: 'BCA' } as any,
        { id: '3', bank_name: 'Mandiri' } as any,
      ]
      mockRepo.findAllWithItems = vi.fn().mockResolvedValue(statements as any)

      const result = await getGroupedBankStatements()
      expect(result.success).toBe(true)
      expect(Object.keys((result as any).data)).toEqual(['BCA', 'Mandiri'])
      expect((result as any).data['BCA']).toHaveLength(2)
    })

    it('sorts statements by statement_period descending and uses caching', async () => {
      const statements: Tables<'bank_statements'>[] = [
        { id: '1', bank_name: 'BCA', statement_period: 'Jan 2026' } as any,
        { id: '2', bank_name: 'BCA', statement_period: 'Mar 2026' } as any,
        { id: '3', bank_name: 'BCA', statement_period: 'Feb 2026' } as any,
        { id: '4', bank_name: 'BCA', statement_period: 'Mar 2026' } as any, // duplicate to test cache
        { id: '5', bank_name: 'BCA', statement_period: null } as any, // test missing period
        { id: '6', bank_name: 'BCA', statement_period: 'InvalidPeriod' } as any, // test parse failure
      ]
      mockRepo.findAllWithItems = vi.fn().mockResolvedValue(statements as any)

      const result = await getGroupedBankStatements()
      expect(result.success).toBe(true)
      
      const bcaStatements = (result as any).data['BCA']
      expect(bcaStatements.map((s: any) => s.id)).toEqual([
        '4', // Mar 2026 (id fallback: 4 > 2)
        '2', // Mar 2026
        '3', // Feb 2026
        '1', // Jan 2026
        '6', // Invalid (0) (id fallback: 6 > 5)
        '5', // null (0)
      ])
    })

    it('returns error on failure', async () => {
      mockRepo.findAllWithItems = vi.fn().mockRejectedValue(new Error('DB error'))

      const result = await getGroupedBankStatements()
      expect(result.success).toBe(false)
      expect((result as any).error).toBe('Failed to fetch bank statements')
    })
  })

  describe('getFileUrl', () => {
    it('returns signed URL', async () => {
      mockRepo.getSignedUrl = vi.fn().mockResolvedValue('https://signed')

      const result = await getFileUrl('statements/1.pdf')
      expect(result.success).toBe(true)
      expect((result as any).data).toBe('https://signed')
    })

    it('returns error on failure', async () => {
      mockRepo.getSignedUrl = vi.fn().mockRejectedValue(new Error('No access'))

      const result = await getFileUrl('statements/1.pdf')
      expect(result.success).toBe(false)
      expect((result as any).error).toBe('Failed to get file access')
    })
  })

  describe('deleteBankStatement', () => {
    it('deletes statement and file', async () => {
      mockRepo.delete = vi.fn().mockResolvedValue(undefined)
      mockRepo.removeFile = vi.fn().mockResolvedValue(undefined)

      const result = await deleteBankStatement('stmt-1', 'file.pdf')
      expect(result.success).toBe(true)
      expect(mockRepo.delete).toHaveBeenCalledWith('stmt-1', 'file.pdf')
      expect(mockRepo.removeFile).toHaveBeenCalledWith('file.pdf')
    })
  })

  describe('saveBankStatement', () => {
    const validSave = {
      bankName: 'BCA',
      statementPeriod: 'Jun 2026',
      openingBalance: 1000000,
      closingBalance: 2000000,
      items: [
        { date: '2026-06-01', name: 'Salary', amount: 5000000, type: 'income' as const },
      ],
      file: new File([''], 'statement.pdf', { type: 'application/pdf' }),
    }

    it('returns validation failure when schema parsed fails', async () => {
      const result = await saveBankStatement({
        bankName: '',
        statementPeriod: '',
        openingBalance: 0,
        closingBalance: 0,
        items: [],
        file: null as any,
      })
      expect(result.success).toBe(false)
      expect((result as any).error).toBe('Validation failed')
      expect((result as any).fieldErrors).toBeDefined()
    })

    it('saves statement successfully when no existing statements exist', async () => {
      mockRepo.checkExistingForBank = vi.fn().mockResolvedValue([])
      mockRepo.save = vi.fn().mockResolvedValue({ id: 'stmt-new' })

      const result = await saveBankStatement(validSave)
      expect(result.success).toBe(true)
      expect((result as any).data?.statementId).toBe('stmt-new')
      expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        statementPeriod: '2026-06-01',
      }))
    })

    it('detects duplicate statement period (subset_or_duplicate)', async () => {
      mockRepo.checkExistingForBank = vi.fn().mockResolvedValue([
        { id: 'existing', statement_period: 'Jun 2026', file_path: 'file.pdf' } as any,
      ])

      const result = await saveBankStatement(validSave)
      expect(result.success).toBe(false)
      expect((result as any).error).toContain('sudah tercakup oleh laporan periode')
    })

    it('replaces existing statement when new one is superset', async () => {
      mockRepo.checkExistingForBank = vi.fn().mockResolvedValue([
        { id: 'existing', statement_period: 'Jun 2026', file_path: 'old_file.pdf' } as any,
      ])
      mockRepo.delete = vi.fn().mockResolvedValue(undefined)
      mockRepo.removeFile = vi.fn().mockResolvedValue(undefined)
      mockRepo.save = vi.fn().mockResolvedValue({ id: 'stmt-new' })

      const supersetSave = {
        ...validSave,
        statementPeriod: 'May 2026 - Jul 2026',
      }

      const result = await saveBankStatement(supersetSave)
      expect(result.success).toBe(true)
      expect(mockRepo.delete).toHaveBeenCalledWith('existing', 'old_file.pdf')
      expect(mockRepo.removeFile).toHaveBeenCalledWith('old_file.pdf')
    })

    it('blocks overlap periods', async () => {
      mockRepo.checkExistingForBank = vi.fn().mockResolvedValue([
        { id: 'existing', statement_period: 'May 2026 - Jun 2026', file_path: 'file.pdf' } as any,
      ])

      const overlapSave = {
        ...validSave,
        statementPeriod: 'Jun 2026 - Jul 2026',
      }

      const result = await saveBankStatement(overlapSave)
      expect(result.success).toBe(false)
      expect((result as any).error).toContain('tumpang tindih dengan laporan periode')
    })

    it('rejects unparseable statement periods before saving', async () => {
      const invalidPeriodSave = {
        ...validSave,
        statementPeriod: 'InvalidPeriodFormat',
      }

      const result = await saveBankStatement(invalidPeriodSave)
      expect(result.success).toBe(false)
      expect((result as any).error).toBe('Validation failed')
      expect(mockRepo.checkExistingForBank).not.toHaveBeenCalled()
      expect(mockRepo.save).not.toHaveBeenCalled()
    })

    it('returns error on save failure', async () => {
      mockRepo.checkExistingForBank = vi.fn().mockResolvedValue([])
      mockRepo.save = vi.fn().mockRejectedValue(new Error('Upload failed'))

      const result = await saveBankStatement(validSave)
      expect(result.success).toBe(false)
      expect((result as any).error).toBe('Upload failed')
    })

    it('returns fallback error message when error.message is falsy', async () => {
      mockRepo.checkExistingForBank = vi.fn().mockResolvedValue([])
      mockRepo.save = vi.fn().mockRejectedValue({})

      const result = await saveBankStatement(validSave)
      expect(result.success).toBe(false)
      expect((result as any).error).toBe('Failed to save bank statement')
    })
  })

  describe('updateStatementItem', () => {
    it('returns validation error on invalid input', async () => {
      const result = await updateStatementItem('item-1', {
        date: '',
        description: '',
        amount: -50,
        type: 'invalid-type' as any,
      })
      expect(result.success).toBe(false)
      expect((result as any).error).toBe('Validation failed')
    })

    it('updates item and recalculates', async () => {
      mockRepo.updateItem = vi.fn().mockResolvedValue({ statementId: 'stmt-1' })
      mockRepo.findById = vi.fn().mockResolvedValue({ id: 'stmt-1', opening_balance: 1000 } as any)
      mockRepo.findItemsByStatementId = vi.fn().mockResolvedValue([
        { id: 'item-1', amount: 500, type: 'income', balance: null, metadata: null },
        { id: 'item-2', amount: 300, type: 'expense', balance: 1200, metadata: { manual_balance: true } },
      ])
      mockRepo.updateClosingBalance = vi.fn().mockResolvedValue(undefined)

      const result = await updateStatementItem('item-1', {
        date: '2026-06-19',
        description: 'Updated',
        amount: 100000,
        type: 'expense',
        category: 'Food',
      })

      expect(result.success).toBe(true)
      // item-1 is non-manual: balance persisted (1000 + 500 = 1500)
      expect(mockRepo.updateItemBalance).toHaveBeenCalledWith('item-1', 1500)
      // item-2 is manual_balance: balance NOT overwritten
      expect(mockRepo.updateItemBalance).not.toHaveBeenCalledWith('item-2', expect.anything())
      // closing balance = item-2's manual balance (1200), total items = 2
      expect(mockRepo.updateClosingBalance).toHaveBeenCalledWith('stmt-1', 1200, 2)
    })

    it('persists recalculated balance for each non-manual item', async () => {
      mockRepo.updateItem = vi.fn().mockResolvedValue({ statementId: 'stmt-1' })
      mockRepo.findById = vi.fn().mockResolvedValue({ id: 'stmt-1', opening_balance: 100 } as any)
      mockRepo.findItemsByStatementId = vi.fn().mockResolvedValue([
        { id: 'item-a', amount: 200, type: 'income', balance: null, metadata: null },
        { id: 'item-b', amount: 50, type: 'expense', balance: null, metadata: null },
        { id: 'item-c', amount: 999, type: 'income', balance: 500, metadata: { manual_balance: true } },
      ])
      mockRepo.updateClosingBalance = vi.fn().mockResolvedValue(undefined)

      await updateStatementItem('item-a', {
        date: '2026-06-01',
        description: 'Test',
        amount: 200,
        type: 'income',
      })

      // item-a: 100 + 200 = 300
      expect(mockRepo.updateItemBalance).toHaveBeenCalledWith('item-a', 300)
      // item-b: 300 - 50 = 250
      expect(mockRepo.updateItemBalance).toHaveBeenCalledWith('item-b', 250)
      // item-c: manual — skipped
      expect(mockRepo.updateItemBalance).not.toHaveBeenCalledWith('item-c', expect.anything())
      // closing = item-c's manual balance (500), total = 3
      expect(mockRepo.updateClosingBalance).toHaveBeenCalledWith('stmt-1', 500, 3)
    })

    it('handles statement not found during recalculation gracefully', async () => {
      mockRepo.updateItem = vi.fn().mockResolvedValue({ statementId: 'stmt-1' })
      mockRepo.findById = vi.fn().mockResolvedValue(null)

      const result = await updateStatementItem('item-1', {
        date: '2026-06-19',
        description: 'Updated',
        amount: 100000,
        type: 'expense',
      })

      expect(result.success).toBe(true)
      expect(mockRepo.findItemsByStatementId).not.toHaveBeenCalled()
    })

    it('returns error on database exception', async () => {
      mockRepo.updateItem = vi.fn().mockRejectedValue(new Error('Update failed'))

      const result = await updateStatementItem('item-1', {
        date: '2026-06-19',
        description: 'Updated',
        amount: 100000,
        type: 'expense',
      })

      expect(result.success).toBe(false)
      expect((result as any).error).toBe('Failed to update statement item')
    })
  })

  describe('deleteStatementItem', () => {
    it('deletes item and recalculates', async () => {
      mockRepo.deleteItem = vi.fn().mockResolvedValue({ statement_id: 'stmt-1' } as any)
      mockRepo.findById = vi.fn().mockResolvedValue({ id: 'stmt-1', opening_balance: 0 } as any)
      mockRepo.findItemsByStatementId = vi.fn().mockResolvedValue([])
      mockRepo.updateClosingBalance = vi.fn().mockResolvedValue(undefined)

      const result = await deleteStatementItem('item-1')
      expect(result.success).toBe(true)
      expect(mockRepo.deleteItem).toHaveBeenCalledWith('item-1')
    })

    it('returns error when item not found', async () => {
      mockRepo.deleteItem = vi.fn().mockResolvedValue(null)

      const result = await deleteStatementItem('item-999')
      expect(result.success).toBe(false)
      expect((result as any).error).toBe('Item not found')
    })

    it('returns error when statement_id is missing from delete result', async () => {
      mockRepo.deleteItem = vi.fn().mockResolvedValue({ } as any)

      const result = await deleteStatementItem('item-1')
      expect(result.success).toBe(false)
      expect((result as any).error).toBe('Statement ID is missing from the item')
    })

    it('returns error on delete database failure', async () => {
      mockRepo.deleteItem = vi.fn().mockRejectedValue(new Error('Delete failed'))

      const result = await deleteStatementItem('item-1')
      expect(result.success).toBe(false)
      expect((result as any).error).toBe('Failed to delete statement item')
    })
  })

  describe('addStatementItem', () => {
    it('returns validation error on invalid input', async () => {
      const result = await addStatementItem('stmt-1', {
        date: '',
        description: '',
        amount: 0,
        type: 'expense',
      })
      expect(result.success).toBe(false)
      expect((result as any).error).toBe('Validation failed')
    })

    it('adds item and recalculates (expense)', async () => {
      mockRepo.addItem = vi.fn().mockResolvedValue(undefined)
      mockRepo.findById = vi.fn().mockResolvedValue({ id: 'stmt-1', opening_balance: 1000 } as any)
      mockRepo.findItemsByStatementId = vi.fn().mockResolvedValue([
        { id: 'item-new', amount: 300, type: 'expense', balance: null, metadata: null },
      ])
      mockRepo.updateClosingBalance = vi.fn().mockResolvedValue(undefined)

      const result = await addStatementItem('stmt-1', {
        date: '2026-06-19',
        description: 'New expense item',
        amount: 300,
        type: 'expense',
      })

      expect(result.success).toBe(true)
      // balance persisted: 1000 - 300 = 700
      expect(mockRepo.updateItemBalance).toHaveBeenCalledWith('item-new', 700)
      expect(mockRepo.updateClosingBalance).toHaveBeenCalledWith('stmt-1', 700, 1)
    })

    it('adds item and recalculates (income)', async () => {
      mockRepo.addItem = vi.fn().mockResolvedValue(undefined)
      mockRepo.findById = vi.fn().mockResolvedValue({ id: 'stmt-1', opening_balance: 500 } as any)
      mockRepo.findItemsByStatementId = vi.fn().mockResolvedValue([
        { id: 'item-inc', amount: 400, type: 'income', balance: null, metadata: null },
      ])
      mockRepo.updateClosingBalance = vi.fn().mockResolvedValue(undefined)

      const result = await addStatementItem('stmt-1', {
        date: '2026-06-19',
        description: 'New income item',
        amount: 400,
        type: 'income',
      })

      expect(result.success).toBe(true)
      // balance persisted: 500 + 400 = 900
      expect(mockRepo.updateItemBalance).toHaveBeenCalledWith('item-inc', 900)
      expect(mockRepo.updateClosingBalance).toHaveBeenCalledWith('stmt-1', 900, 1)
    })

    it('returns error on add statement item database failure', async () => {
      mockRepo.addItem = vi.fn().mockRejectedValue(new Error('Insert failed'))

      const result = await addStatementItem('stmt-1', {
        date: '2026-06-19',
        description: 'New item',
        amount: 50000,
        type: 'income',
      })

      expect(result.success).toBe(false)
      expect((result as any).error).toBe('Failed to add statement item')
    })
  })

  describe('getStatementAnalytics', () => {
    it('returns empty analytics structure when no statements exist', async () => {
      mockRepo.findAllWithItems = vi.fn().mockResolvedValue([])

      const result = await getStatementAnalytics()
      expect(result.success).toBe(true)
      const data = (result as any).data
      expect(data.netWorth).toBe(0)
      expect(data.bankSummaries).toHaveLength(0)
      expect(data.balanceHistory).toHaveLength(0)
    })

    it('calculates analytics correctly for multiple statements', async () => {
      const mockStatements = [
        {
          id: 'stmt-bca-1',
          bank_name: 'BCA',
          statement_period: 'Jun 2026',
          opening_balance: 1000000,
          closing_balance: 1500000,
          bank_statement_items: [
            { id: 'item-1', date: '2026-06-01T00:00:00Z', amount: 500000, type: 'income', description: 'Salary', category: 'Job', balance: 1500000 },
          ],
        },
        {
          id: 'stmt-mandiri-1',
          bank_name: 'Mandiri',
          statement_period: 'Jun 2026',
          opening_balance: 2000000,
          closing_balance: 1800000,
          bank_statement_items: [
            { id: 'item-2', date: '2026-06-02T00:00:00Z', amount: 200000, type: 'expense', description: 'Food', category: 'Eating Out', balance: 1800000 },
          ],
        },
      ]

      mockRepo.findAllWithItems = vi.fn().mockResolvedValue(mockStatements as any)

      const result = await getStatementAnalytics()
      expect(result.success).toBe(true)
      const data = (result as any).data
      expect(data.netWorth).toBe(3300000) // 1500000 + 1800000
      expect(data.totalIncome).toBe(500000)
      expect(data.totalExpense).toBe(200000)
      expect(data.bankSummaries).toHaveLength(2)
      expect(data.balanceHistory).toHaveLength(2)
      
      const bcaSummary = data.bankSummaries.find((b: any) => b.bankName === 'BCA')
      expect(bcaSummary?.latestBalance).toBe(1500000)
      expect(bcaSummary?.totalIncome).toBe(500000)
      expect(bcaSummary?.openingBalance).toBe(1000000)

      const mandiriSummary = data.bankSummaries.find((b: any) => b.bankName === 'Mandiri')
      expect(mandiriSummary?.latestBalance).toBe(1800000)
      expect(mandiriSummary?.totalExpense).toBe(200000)
    })

    it('calculates balance from type when item.balance is missing', async () => {
      const mockStatements = [
        {
          id: 'stmt-test',
          bank_name: 'TestBank',
          statement_period: 'Jun 2026',
          opening_balance: 1000,
          closing_balance: 1300,
          bank_statement_items: [
            { id: 'i1', date: '2026-06-01', amount: 500, type: 'income', description: 'Test Income', category: null, balance: null },
            { id: 'i2', date: '2026-06-02', amount: 200, type: 'expense', description: 'Test Expense', category: null, balance: undefined },
          ],
        },
      ]

      mockRepo.findAllWithItems = vi.fn().mockResolvedValue(mockStatements as any)

      const result = await getStatementAnalytics()
      expect(result.success).toBe(true)
      const data = (result as any).data
      expect(data.balanceHistory).toHaveLength(2)
      expect(data.balanceHistory[0].balance).toBe(1500)
      expect(data.balanceHistory[1].balance).toBe(1300)
    })

    it('sorts items with same date by id', async () => {
      const mockStatements = [
        {
          id: 'stmt-test',
          bank_name: 'TestBank',
          statement_period: 'Jun 2026',
          opening_balance: 100,
          closing_balance: 200,
          bank_statement_items: [
            { id: 'item-2', date: '2026-06-01', amount: 50, type: 'income', description: 'Second', category: null, balance: null },
            { id: 'item-1', date: '2026-06-01', amount: 50, type: 'income', description: 'First', category: null, balance: null },
          ],
        },
      ]

      mockRepo.findAllWithItems = vi.fn().mockResolvedValue(mockStatements as any)

      const result = await getStatementAnalytics()
      expect(result.success).toBe(true)
      const data = (result as any).data
      expect(data.balanceHistory[0].transactions.length).toBe(2)
      expect(data.balanceHistory[0].transactions[0].description).toBe('First')
      expect(data.balanceHistory[0].transactions[1].description).toBe('Second')
    })

    it('handles statements with unparsable statement_period (range is null)', async () => {
      const mockStatements = [
        {
          id: 'stmt-test-1',
          bank_name: 'TestBank',
          statement_period: 'Invalid Period', // getPeriodRange will return null
          opening_balance: 1000,
          closing_balance: 1500,
          bank_statement_items: [],
        },
        {
          id: 'stmt-test-2',
          bank_name: 'TestBank',
          statement_period: 'Jul 2026', // getPeriodRange works
          opening_balance: 1500,
          closing_balance: 1700,
          bank_statement_items: [],
        },
      ]

      mockRepo.findAllWithItems = vi.fn().mockResolvedValue(mockStatements as any)

      const result = await getStatementAnalytics()
      expect(result.success).toBe(true)
    })
  })
})
