import { describe, expect, it } from 'vitest'
import { FakeStatementRepository } from '@/lib/repositories/fake-statements'
import type { StatementPeriodDate } from '@/lib/repositories/types'

function makeStatementFile(): File {
  return new File(['statement'], 'statement.pdf', { type: 'application/pdf' })
}

describe('FakeStatementRepository', () => {
  it('rejects non-month-start statement periods before persistence', async () => {
    const repository = new FakeStatementRepository()

    await expect(
      repository.save({
        bankName: 'Bank JAGO',
        statementPeriod: '2021-08-02' as StatementPeriodDate,
        openingBalance: null,
        closingBalance: null,
        items: [],
        file: makeStatementFile(),
      })
    ).rejects.toThrow('Statement period must be normalized to YYYY-MM-01')
  })
})
