import { Tables } from '@/lib/database.types'
import { createClient } from '@/lib/supabase/server'
import { FakeStatementRepository } from './fake-statements'
import { StatementRepository } from './types'
export class SupabaseStatementsRepository implements StatementRepository {
  async checkExistingForBank(bankName: string): Promise<Pick<Tables<'bank_statements'>, 'id' | 'statement_period' | 'file_path'>[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('bank_statements')
      .select('id, statement_period, file_path')
      .eq('bank_name', bankName)

    if (error) {
      console.error('Error checking for duplicate statements:', error)
      throw new Error(`Failed to check for duplicate statements: ${error.message}`)
    }
    return data || []
  }

  async findAllWithItems(): Promise<Tables<'bank_statements'>[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('bank_statements')
      .select(`
        *,
        bank_statement_items (*)
      `)

    if (error) {
      console.error('Error fetching bank statements:', error)
      throw new Error(`Failed to fetch bank statements: ${error.message}`)
    }
    return data || []
  }

  async findById(id: string): Promise<Tables<'bank_statements'> | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('bank_statements')
      .select('*')
      .eq('id', id)
      .single()

    if (error) return null
    return data
  }

  async delete(id: string, _filePath: string): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
      .from('bank_statements')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting statement from DB:', error)
      throw new Error(`Failed to delete statement from database: ${error.message}`)
    }
  }

  async save(data: {
    bankName: string
    statementPeriod: string
    openingBalance: number | null
    closingBalance: number | null
    items: any[]
    file: File
  }): Promise<{ id: string }> {
    const supabase = await createClient()
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData?.user) throw new Error('Unauthorized')
    const user = authData.user

    const { bankName: actualBankName, statementPeriod: actualPeriod, openingBalance, closingBalance, items, file } = data

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const fileExt = file.name.split('.').pop() || 'pdf'
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
    const folder = actualBankName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const uploadedPath = `${user.id}/${folder}/${uniqueName}`

    const { error: uploadError } = await supabase.storage
      .from('statements')
      .upload(uploadedPath, buffer, {
        contentType: file.type || 'application/pdf',
        duplex: 'half',
      })

    if (uploadError) {
      console.error('Error uploading statement file:', uploadError)
      throw new Error('Failed to upload bank statement file')
    }

    const { data: statement, error: statementError } = await supabase
      .from('bank_statements')
      .insert({
        bank_name: actualBankName,
        statement_period: actualPeriod,
        file_path: uploadedPath,
        total_items: items.length,
        opening_balance: openingBalance || 0,
        closing_balance: closingBalance || 0,
        metadata: {},
      })
      .select()
      .single()

    if (statementError) {
      console.error('Error creating bank statement record:', statementError)
      await supabase.storage.from('statements').remove([uploadedPath])
      throw new Error('Failed to save statement records')
    }

    if (items.length > 0) {
      const { error: itemsError } = await supabase
        .from('bank_statement_items')
        .insert(items.map((item) => ({
          statement_id: statement.id,
          date: item.date,
          description: item.name,
          amount: item.amount,
          type: item.type,
          category: item.category || 'Other',
          balance: 0,
          metadata: {},
        })))

      if (itemsError) {
        console.error('Error saving statement items:', itemsError)
        await supabase.from('bank_statements').delete().eq('id', statement.id)
        await supabase.storage.from('statements').remove([uploadedPath])
        throw new Error('Failed to save statement items records')
      }
    }

    return { id: statement.id }
  }

  async insertItems(items: any[]): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
      .from('bank_statement_items')
      .insert(items)

    if (error) {
      console.error('Error inserting statement items:', error)
      throw new Error(`Failed to insert statement items: ${error.message}`)
    }
  }

  async deleteItem(itemId: string): Promise<Tables<'bank_statement_items'> | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('bank_statement_items')
      .select('*')
      .eq('id', itemId)
      .single()

    if (error || !data) return null

    const { error: deleteErr } = await supabase
      .from('bank_statement_items')
      .delete()
      .eq('id', itemId)

    if (deleteErr) {
      console.error('Error deleting statement item:', deleteErr)
      throw new Error(`Failed to delete statement item: ${deleteErr.message}`)
    }

    return data
  }

  async updateItem(
    itemId: string,
    data: {
      date: string
      description: string
      amount: number
      type: string
      category?: string | null
      balance?: number | null
      metadata?: Record<string, unknown>
    }
  ): Promise<{ statementId: string }> {
    const supabase = await createClient()
    const { data: item, error: fetchErr } = await supabase
      .from('bank_statement_items')
      .select('statement_id, balance, metadata')
      .eq('id', itemId)
      .single()

    if (fetchErr || !item) {
      throw new Error('Item not found')
    }

    const existingMetadata = (item.metadata as Record<string, unknown>) || {}
    const newMetadata = { ...existingMetadata }

    if (data.balance !== undefined && data.balance !== null && Number(data.balance) !== Number(item.balance ?? 0)) {
      newMetadata.manual_balance = true as any
    }

    const { error: updateErr } = await supabase
      .from('bank_statement_items')
      .update({
        date: data.date,
        description: data.description,
        amount: data.amount,
        type: data.type,
        category: data.category ?? null,
        balance: data.balance ?? item.balance,
        metadata: newMetadata,
      })
      .eq('id', itemId)

    if (updateErr) {
      console.error('Error updating statement item:', updateErr)
      throw new Error('Failed to update statement item')
    }

    return { statementId: item.statement_id }
  }

  async addItem(data: {
    statement_id: string
    date: string
    description: string
    amount: number
    type: string
    category?: string | null
    balance?: number
  }): Promise<void> {
    const supabase = await createClient()
    const isManual = data.balance !== undefined
    const metadata = isManual ? { manual_balance: true as any } : {}

    const { error: insertErr } = await supabase
      .from('bank_statement_items')
      .insert({
        statement_id: data.statement_id,
        date: data.date,
        description: data.description,
        amount: data.amount,
        type: data.type,
        category: data.category ?? null,
        balance: data.balance ?? 0,
        metadata,
      })

    if (insertErr) {
      console.error('Error adding statement item:', insertErr)
      throw new Error('Failed to add statement item')
    }
  }

  async findItemsByStatementId(statementId: string): Promise<Tables<'bank_statement_items'>[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('bank_statement_items')
      .select('*')
      .eq('statement_id', statementId)
      .order('date', { ascending: true })
      .order('id', { ascending: true })

    if (error || !data) return []
    return data
  }

  async updateItemBalance(itemId: string, balance: number): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
      .from('bank_statement_items')
      .update({ balance })
      .eq('id', itemId)

    if (error) {
      console.error('Error updating item balance:', error)
      throw new Error('Failed to update item balance')
    }
  }

  async updateClosingBalance(statementId: string, closingBalance: number, totalItems: number): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
      .from('bank_statements')
      .update({ closing_balance: closingBalance, total_items: totalItems })
      .eq('id', statementId)

    if (error) {
      console.error('Error updating statement closing balance:', error)
    }
  }

  async getSignedUrl(path: string): Promise<string> {
    const supabase = await createClient()
    const { data, error } = await supabase.storage
      .from('statements')
      .createSignedUrl(path, 3600)

    if (error) {
      console.error('Error creating signed URL:', error)
      throw new Error('Failed to get file access')
    }
    return data.signedUrl
  }

  async uploadFile(path: string, buffer: Buffer, contentType: string): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase.storage
      .from('statements')
      .upload(path, buffer, { contentType, duplex: 'half' })

    if (error) {
      console.error('Error uploading file:', error)
      throw new Error(`Failed to upload file: ${error.message}`)
    }
  }

  async removeFile(path: string): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase.storage
      .from('statements')
      .remove([path])

    if (error) {
      console.error('Error deleting file from storage:', error)
      throw new Error(`Failed to delete file from storage: ${error.message}`)
    }
  }

  async upload(path: string, buffer: Buffer, contentType: string): Promise<{ path: string }> {
    await this.uploadFile(path, buffer, contentType)
    return { path }
  }

  async remove(paths: string[]): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase.storage
      .from('statements')
      .remove(paths)

    if (error) {
      console.error('Error removing files:', error)
      throw new Error(`Failed to remove files: ${error.message}`)
    }
  }
}

const globalForStatements = globalThis as unknown as {
  statementRepoInstance: StatementRepository | undefined
}

export function getStatementRepository(): StatementRepository {
  if (globalForStatements.statementRepoInstance) {
    return globalForStatements.statementRepoInstance
  }

  if (process.env.NEXT_PUBLIC_IS_TESTING === 'true') {
    globalForStatements.statementRepoInstance = new FakeStatementRepository()
  } else {
    globalForStatements.statementRepoInstance = new SupabaseStatementsRepository()
  }
  
  return globalForStatements.statementRepoInstance
}

export function setStatementRepository(mockRepo: StatementRepository): void {
  globalForStatements.statementRepoInstance = mockRepo
}
