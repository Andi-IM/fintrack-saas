import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ServerConfig } from '../config.js';
import { getSupabaseClient, ensureUserFilter, resolveTargetUserId } from '../db/client.js';
import { formatSuccessResponse, formatErrorResponse } from '../utils/errors.js';

function normalizeStatementPeriod(input: string): string {
  const trimmed = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    return `${trimmed}-01`;
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  }
  return `${new Date().toISOString().slice(0, 7)}-01`;
}

function buildStatementStoragePath(userId: string, bankName: string, originalName?: string): string {
  const ext = originalName ? originalName.toLowerCase().split('.').pop() || 'pdf' : 'pdf';
  const folder = bankName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'bank';
  const uniqueName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  return `${userId}/${folder}/${uniqueName}`;
}

export function registerStatementTools(server: McpServer, config: ServerConfig) {
  server.tool(
    'list_bank_statements',
    'List all uploaded bank statements with period, balances, and item counts.',
    {
      bank_name: z.string().optional().describe('Filter by bank name (e.g. Bank Jago, BNI, BCA, BSI)'),
      limit: z.number().int().min(1).max(100).default(20).describe('Max results to return'),
      user_id: z.string().optional().describe('Optional user_id override'),
    },
    async (args) => {
      try {
        const client = getSupabaseClient(config);
        let query = client.from('bank_statements').select('*');

        query = ensureUserFilter(query, config, args.user_id);

        if (args.bank_name) {
          query = query.ilike('bank_name', `%${args.bank_name}%`);
        }

        const { data, error } = await query
          .order('created_at', { ascending: false })
          .limit(args.limit);

        if (error) throw error;

        return formatSuccessResponse({
          statements: data || [],
        });
      } catch (err) {
        return formatErrorResponse(err);
      }
    }
  );

  server.tool(
    'get_statement_mutations',
    'Retrieve mutation line items parsed from a specific bank statement.',
    {
      statement_id: z.string().uuid().describe('The UUID of the bank statement'),
      type: z.enum(['CR', 'DB', 'income', 'expense']).optional().describe('Filter by CR/income or DB/expense'),
      search: z.string().optional().describe('Search keyword in mutation description'),
      limit: z.number().int().min(1).max(200).default(50).describe('Max items to fetch'),
    },
    async (args) => {
      try {
        const client = getSupabaseClient(config);
        let query = client
          .from('bank_statement_items')
          .select('*')
          .eq('statement_id', args.statement_id);

        if (args.type) {
          const mappedType = args.type === 'CR' ? 'income' : args.type === 'DB' ? 'expense' : args.type;
          query = query.eq('type', mappedType);
        }
        if (args.search) {
          query = query.ilike('description', `%${args.search}%`);
        }

        const { data, error } = await query
          .order('date', { ascending: true })
          .limit(args.limit);

        if (error) throw error;

        return formatSuccessResponse({
          statement_id: args.statement_id,
          count: (data || []).length,
          items: data || [],
        });
      } catch (err) {
        return formatErrorResponse(err);
      }
    }
  );

  server.tool(
    'create_bank_statement',
    'Import a bank statement header and its mutation line items with optional PDF upload to Supabase Storage, synchronizing items to cash flow.',
    {
      bank_name: z.string().min(1).describe('Bank name (e.g. BCA, Mandiri, Bank Jago, BNI, BSI)'),
      statement_period: z.string().describe('Statement period in YYYY-MM-DD or YYYY-MM format (e.g. "2026-07-01")'),
      opening_balance: z.number().default(0).describe('Opening / initial balance in IDR'),
      closing_balance: z.number().default(0).describe('Closing / final balance in IDR'),
      total_items: z.number().int().optional().describe('Total transaction items in the statement'),
      pdf_base64: z.string().optional().describe('Base64-encoded PDF document string to upload directly to Supabase Storage'),
      file_base64: z.string().optional().describe('Alias for pdf_base64'),
      local_file_path: z.string().optional().describe('Local file path on disk to upload to Supabase Storage'),
      file_path: z.string().optional().describe('Local file path to upload, OR existing Supabase Storage path'),
      file_name: z.string().optional().describe('Original filename hint (e.g. statement_bni_juli.pdf)'),
      storage_path: z.string().optional().describe('Existing Supabase Storage path if PDF already uploaded'),
      items: z
        .array(
          z.object({
            date: z.string().describe('Transaction date (ISO UTC e.g. "2026-07-13T16:06:42+00:00" or "2026-07-13")'),
            description: z.string().min(1).describe('Transaction description / counterparty'),
            amount: z.number().positive().describe('Transaction amount (must be positive number)'),
            type: z.enum(['income', 'expense', 'CR', 'DB']).describe('Direction: income / CR or expense / DB'),
            category: z.string().optional().describe('Optional category classification'),
            metadata: z.record(z.any()).optional().describe('Optional JSON metadata'),
            balance: z.number().optional().describe('Running balance after transaction'),
          })
        )
        .optional()
        .default([])
        .describe('List of mutation items parsed from the bank statement'),
      user_id: z.string().optional().describe('Target user_id (required if using service_role mode)'),
    },
    async (args) => {
      try {
        const client = getSupabaseClient(config);
        const targetUserId = resolveTargetUserId(config, args.user_id);
        const normalizedPeriod = normalizeStatementPeriod(args.statement_period);
        const sanitizedBank = args.bank_name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const totalItemsCount = args.total_items ?? (args.items || []).length;

        let supabaseStoragePath: string | null = null;
        let signedFileUrl: string | null = null;
        let uploadedToStorage = false;

        // 1. Existing storage path
        if (args.storage_path) {
          supabaseStoragePath = args.storage_path;
        }

        const candidateLocalPath = args.local_file_path || args.file_path;
        const base64Input = args.pdf_base64 || args.file_base64;

        // 2. Upload PDF file if Base64 is provided
        if (!supabaseStoragePath && base64Input && base64Input.trim().length > 0) {
          const rawBase64 = base64Input.replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '');
          const fileBuffer = Buffer.from(rawBase64, 'base64');
          if (fileBuffer.length === 0) {
            throw new Error('Provided pdf_base64 contains no valid file data or is empty.');
          }

          const filename =
            args.file_name ||
            (candidateLocalPath ? path.basename(candidateLocalPath) : `${sanitizedBank}_statement.pdf`);
          const storagePath = buildStatementStoragePath(targetUserId, args.bank_name, filename);

          const { error: uploadError } = await client.storage
            .from('statements')
            .upload(storagePath, fileBuffer, {
              contentType: 'application/pdf',
              upsert: false,
            });

          if (uploadError) {
            throw new Error(`Failed to upload bank statement PDF to Supabase Storage: ${uploadError.message}`);
          }

          supabaseStoragePath = storagePath;
          uploadedToStorage = true;
        } else if (!supabaseStoragePath && candidateLocalPath) {
          const resolvedPath = path.resolve(candidateLocalPath);
          if (fs.existsSync(resolvedPath)) {
            // Local file exists on disk -> upload to Supabase Storage
            const fileBuffer = await fs.promises.readFile(resolvedPath);
            const filename = path.basename(resolvedPath);
            const storagePath = buildStatementStoragePath(targetUserId, args.bank_name, filename);

            const { error: uploadError } = await client.storage
              .from('statements')
              .upload(storagePath, fileBuffer, {
                contentType: 'application/pdf',
                upsert: false,
              });

            if (uploadError) {
              throw new Error(`Failed to upload bank statement file to Supabase Storage: ${uploadError.message}`);
            }

            supabaseStoragePath = storagePath;
            uploadedToStorage = true;
          } else if (candidateLocalPath.startsWith(`${targetUserId}/`) || candidateLocalPath.startsWith('statements/')) {
            supabaseStoragePath = candidateLocalPath;
          } else {
            supabaseStoragePath = `statements/${targetUserId}/${sanitizedBank}_${normalizedPeriod}.pdf`;
          }
        }

        if (!supabaseStoragePath) {
          supabaseStoragePath = `statements/${targetUserId}/${sanitizedBank}_${normalizedPeriod}.pdf`;
        }

        // Generate signed URL if file was stored in Supabase Storage
        if (uploadedToStorage || (supabaseStoragePath && supabaseStoragePath.startsWith(`${targetUserId}/`))) {
          try {
            const { data: signedData } = await client.storage
              .from('statements')
              .createSignedUrl(supabaseStoragePath, 3600);
            if (signedData?.signedUrl) {
              signedFileUrl = signedData.signedUrl;
            }
          } catch {}
        }

        // 3. Try calling PostgreSQL RPC create_bank_statement_with_items first
        try {
          const { data: rpcData, error: rpcErr } = await client.rpc('create_bank_statement_with_items', {
            p_user_id: targetUserId,
            p_bank_name: args.bank_name,
            p_statement_period: normalizedPeriod,
            p_opening_balance: args.opening_balance ?? 0,
            p_closing_balance: args.closing_balance ?? 0,
            p_total_items: totalItemsCount,
            p_file_path: supabaseStoragePath,
            p_items: args.items || [],
          });

          if (!rpcErr && rpcData && rpcData.statement_id) {
            return formatSuccessResponse({
              message: 'Bank statement and mutation items imported successfully via RPC',
              statement_id: rpcData.statement_id,
              total_items: rpcData.total_items ?? totalItemsCount,
              file_path: supabaseStoragePath,
              signed_file_url: signedFileUrl,
              items: rpcData.items || [],
            });
          }
        } catch {
          // If RPC is unavailable, proceed to client-side transactional insert below
        }

        // 4. Client-side insert fallback
        const { data: statement, error: statementErr } = await client
          .from('bank_statements')
          .insert({
            user_id: targetUserId,
            bank_name: args.bank_name,
            statement_period: normalizedPeriod,
            opening_balance: args.opening_balance ?? 0,
            closing_balance: args.closing_balance ?? 0,
            file_path: supabaseStoragePath,
            total_items: totalItemsCount,
          })
          .select()
          .single();

        if (statementErr) {
          if (uploadedToStorage && supabaseStoragePath) {
            try {
              await client.storage.from('statements').remove([supabaseStoragePath]);
            } catch {}
          }
          throw statementErr;
        }

        const insertedItems: any[] = [];
        const rawItems = args.items || [];
        if (rawItems.length > 0) {
          const mappedItems = rawItems.map((item) => {
            const isIncome = item.type === 'income' || item.type === 'CR';
            return {
              statement_id: statement.id,
              date: item.date,
              description: item.description,
              amount: item.amount,
              type: isIncome ? 'income' : 'expense',
              category: item.category || (isIncome ? 'Pendapatan (Income)' : 'Kebutuhan (Needs)'),
              metadata: item.metadata || null,
              balance: item.balance ?? null,
            };
          });

          const CHUNK_SIZE = 100;
          for (let i = 0; i < mappedItems.length; i += CHUNK_SIZE) {
            const chunk = mappedItems.slice(i, i + CHUNK_SIZE);
            const { data: chunkData, error: itemsErr } = await client
              .from('bank_statement_items')
              .insert(chunk)
              .select();

            if (itemsErr) {
              try {
                await client.from('bank_statements').delete().eq('id', statement.id);
              } catch {}
              if (uploadedToStorage && supabaseStoragePath) {
                try {
                  await client.storage.from('statements').remove([supabaseStoragePath]);
                } catch {}
              }
              throw new Error(`Failed inserting mutation items chunk [${i}..${i + chunk.length}]: ${itemsErr.message}`);
            }
            if (chunkData) insertedItems.push(...chunkData);
          }
        }

        return formatSuccessResponse({
          message: 'Bank statement and mutation items imported successfully',
          statement_id: statement.id,
          statement,
          total_items: insertedItems.length,
          file_path: supabaseStoragePath,
          signed_file_url: signedFileUrl,
          items: insertedItems,
        });
      } catch (err) {
        return formatErrorResponse(err);
      }
    }
  );

  server.tool(
    'create_bank_statement_item',
    'Add mutation items to an existing bank statement, synchronizing them with cash flow.',
    {
      statement_id: z.string().uuid().describe('Target bank statement UUID'),
      items: z
        .array(
          z.object({
            date: z.string().describe('Transaction date (ISO UTC e.g. "2026-07-13T16:06:42+00:00" or "2026-07-13")'),
            description: z.string().min(1).describe('Transaction description / counterparty'),
            amount: z.number().positive().describe('Transaction amount (must be positive number)'),
            type: z.enum(['income', 'expense', 'CR', 'DB']).describe('Direction: income / CR or expense / DB'),
            category: z.string().optional().describe('Optional category classification'),
            metadata: z.record(z.any()).optional().describe('Optional JSON metadata'),
            balance: z.number().optional().describe('Running balance after transaction'),
          })
        )
        .min(1)
        .describe('List of mutation items to add'),
      user_id: z.string().optional().describe('Target user_id (required if using service_role mode)'),
    },
    async (args) => {
      try {
        const client = getSupabaseClient(config);
        const targetUserId = resolveTargetUserId(config, args.user_id);

        // Verify statement exists and belongs to user
        const { data: stmt, error: stmtErr } = await client
          .from('bank_statements')
          .select('id, user_id, total_items')
          .eq('id', args.statement_id)
          .eq('user_id', targetUserId)
          .single();

        if (stmtErr || !stmt) {
          throw new Error(`Bank statement not found or not owned by user: ${args.statement_id}`);
        }

        const mappedItems = args.items.map((item) => {
          const isIncome = item.type === 'income' || item.type === 'CR';
          return {
            statement_id: args.statement_id,
            date: item.date,
            description: item.description,
            amount: item.amount,
            type: isIncome ? 'income' : 'expense',
            category: item.category || (isIncome ? 'Pendapatan (Income)' : 'Kebutuhan (Needs)'),
            metadata: item.metadata || null,
            balance: item.balance ?? null,
          };
        });

        const { data: insertedData, error: insErr } = await client
          .from('bank_statement_items')
          .insert(mappedItems)
          .select();

        if (insErr) throw insErr;

        // Update total_items count on parent bank statement
        const newTotal = (stmt.total_items || 0) + (insertedData || []).length;
        await client
          .from('bank_statements')
          .update({ total_items: newTotal })
          .eq('id', args.statement_id);

        return formatSuccessResponse({
          message: 'Bank statement mutation items added successfully',
          statement_id: args.statement_id,
          total_items: (insertedData || []).length,
          items: insertedData || [],
        });
      } catch (err) {
        return formatErrorResponse(err);
      }
    }
  );

  server.tool(
    'get_statement_file_url',
    'Generate a temporary signed URL to view or download a bank statement PDF from Supabase Storage.',
    {
      statement_id: z.string().uuid().optional().describe('UUID of the bank statement'),
      file_path: z.string().optional().describe('Storage file_path of the statement (if known)'),
      expires_in: z.number().int().min(60).max(86400).default(3600).describe('URL expiry time in seconds (default 3600 / 1 hour)'),
      user_id: z.string().optional().describe('Optional user_id override'),
    },
    async (args) => {
      try {
        if (!args.statement_id && !args.file_path) {
          throw new Error('Either statement_id or file_path must be provided');
        }

        const client = getSupabaseClient(config);
        let targetFilePath = args.file_path;

        if (!targetFilePath && args.statement_id) {
          let query = client.from('bank_statements').select('file_path').eq('id', args.statement_id);
          query = ensureUserFilter(query, config, args.user_id);
          const { data, error } = await query.single();
          if (error) throw error;
          if (!data?.file_path) {
            throw new Error(`Bank statement ${args.statement_id} does not have an attached file.`);
          }
          targetFilePath = data.file_path;
        }

        const { data: signedData, error: signError } = await client.storage
          .from('statements')
          .createSignedUrl(targetFilePath!, args.expires_in);

        if (signError) throw signError;

        return formatSuccessResponse({
          statement_id: args.statement_id,
          file_path: targetFilePath,
          signed_url: signedData.signedUrl,
          expires_in: args.expires_in,
        });
      } catch (err) {
        return formatErrorResponse(err);
      }
    }
  );
}
