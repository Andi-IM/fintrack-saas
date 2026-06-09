'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getGroupedBankStatements() {
  const supabase = await createClient()

  // Fetch statements ordered by bank_name and statement_period
  // Note: Ordering statement_period might be tricky if it's just a string like "DES 2025"
  // For now, we'll sort alphabetically/normally and then group in JS
  const { data: statements, error } = await supabase
    .from('bank_statements')
    .select(`
      *,
      bank_statement_items (*)
    `)
    .order('bank_name', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching bank statements:', error)
    throw new Error('Failed to fetch bank statements')
  }

  // Group by bank_name
  const grouped = statements.reduce((acc: any, statement: any) => {
    const bank = statement.bank_name
    if (!acc[bank]) {
      acc[bank] = []
    }
    acc[bank].push(statement)
    return acc
  }, {})

  return grouped
}

export async function getFileUrl(path: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase.storage
    .from('statements')
    .createSignedUrl(path, 3600) // 1 hour expiry

  if (error) {
    console.error('Error creating signed URL:', error)
    throw new Error('Failed to get file access')
  }

  return data.signedUrl
}

export async function deleteBankStatement(id: string, filePath: string) {
  const supabase = await createClient()

  // 1. Delete from database first (cascade will handle bank_statement_items)
  // This is the source of truth; if this fails, we don't want to delete the file.
  const { error: dbError } = await supabase
    .from('bank_statements')
    .delete()
    .eq('id', id)

  if (dbError) {
    console.error('Error deleting statement from DB:', dbError)
    throw new Error(`Failed to delete statement from database: ${dbError.message}`)
  }

  // 2. Delete file from storage only after DB record is successfully removed
  const { error: storageError } = await supabase.storage
    .from('statements')
    .remove([filePath])

  if (storageError) {
    console.error('Error deleting file from storage:', storageError)
    // We don't throw here because the DB record is already gone.
    // The file is now an orphan, which is better than a broken DB link.
  }

  revalidatePath('/')
  return { success: true }
}

interface SaveStatementInput {
  bankName: string
  statementPeriod: string
  openingBalance?: number
  closingBalance?: number
  items: Array<{
    date: string
    name: string
    amount: number
    type: 'income' | 'expense'
    category?: string
  }>
  file: File
}

export async function saveBankStatement({ 
  bankName, 
  statementPeriod, 
  openingBalance,
  closingBalance,
  items, 
  file 
}: SaveStatementInput) {
  const supabase = await createClient()

  // 1. Upload file to Supabase Storage
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  
  const fileExt = file.name.split('.').pop() || 'pdf'
  const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
  const folder = bankName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const filePath = `${folder}/${uniqueName}`

  const { error: uploadError } = await supabase.storage
    .from('statements')
    .upload(filePath, buffer, {
      contentType: file.type || 'application/pdf',
      duplex: 'half'
    })

  if (uploadError) {
    console.error('Error uploading statement file:', uploadError)
    throw new Error('Failed to upload bank statement file')
  }

  // 2. Insert statement metadata
  const { data: statement, error: statementError } = await supabase
    .from('bank_statements')
    .insert({
      bank_name: bankName,
      statement_period: statementPeriod,
      file_path: filePath,
      total_items: items.length,
      opening_balance: openingBalance || 0,
      closing_balance: closingBalance || 0,
      metadata: {}
    })
    .select()
    .single()

  if (statementError) {
    console.error('Error creating bank statement record:', statementError)
    // Attempt to clean up uploaded file
    await supabase.storage.from('statements').remove([filePath])
    throw new Error('Failed to save statement records')
  }

  // 3. Insert statement items
  if (items.length > 0) {
    const itemsToInsert = items.map(item => ({
      statement_id: statement.id,
      date: item.date,
      description: item.name,
      amount: item.amount,
      type: item.type,
      category: item.category || 'Other',
      metadata: {}
    }))

    const { error: itemsError } = await supabase
      .from('bank_statement_items')
      .insert(itemsToInsert)

    if (itemsError) {
      console.error('Error saving statement items:', itemsError)
      // Rollback statement metadata
      await supabase.from('bank_statements').delete().eq('id', statement.id)
      await supabase.storage.from('statements').remove([filePath])
      throw new Error('Failed to save statement items records')
    }
  }

  return { success: true, statementId: statement.id }
}

