import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
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

export function registerStatementTools(server: McpServer, config: ServerConfig) {
  server.tool(
    'list_bank_statements',
    'List all uploaded bank statements with period, balances, and item counts.',
    {
      bank_name: z.string().optional().describe('Filter by bank name (e.g. Bank Jago, BNI, BCA)'),
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
    'Import a bank statement header and its mutation line items directly into FinTrack, synchronizing them with cash flow.',
    {
      bank_name: z.string().min(1).describe('Bank name (e.g. BCA, Mandiri, Bank Jago, BNI, BRI)'),
      statement_period: z.string().describe('Statement period in YYYY-MM-DD or YYYY-MM format (e.g. "2026-10-01" or "2026-10")'),
      opening_balance: z.number().default(0).describe('Opening / initial balance in IDR'),
      closing_balance: z.number().default(0).describe('Closing / final balance in IDR'),
      file_path: z.string().optional().describe('Optional storage path or document reference'),
      items: z
        .array(
          z.object({
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').describe('Transaction date (YYYY-MM-DD)'),
            description: z.string().min(1).describe('Transaction description / counterparty'),
            amount: z.number().positive().describe('Transaction amount (must be positive number)'),
            type: z.enum(['income', 'expense', 'CR', 'DB']).describe('Direction: income / CR or expense / DB'),
            category: z.string().optional().describe('Optional category classification'),
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
        const defaultFilePath = `statements/${targetUserId}/${sanitizedBank}_${normalizedPeriod}.pdf`;
        const filePath = args.file_path || defaultFilePath;

        // 1. Insert parent bank statement
        const { data: statement, error: statementErr } = await client
          .from('bank_statements')
          .insert({
            user_id: targetUserId,
            bank_name: args.bank_name,
            statement_period: normalizedPeriod,
            opening_balance: args.opening_balance ?? 0,
            closing_balance: args.closing_balance ?? 0,
            file_path: filePath,
            total_items: (args.items || []).length,
          })
          .select()
          .single();

        if (statementErr) throw statementErr;

        // 2. Insert statement items in batches of 100
        let itemsInserted = 0;
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
              balance: item.balance ?? null,
            };
          });

          const CHUNK_SIZE = 100;
          for (let i = 0; i < mappedItems.length; i += CHUNK_SIZE) {
            const chunk = mappedItems.slice(i, i + CHUNK_SIZE);
            const { error: itemsErr } = await client
              .from('bank_statement_items')
              .insert(chunk);

            if (itemsErr) {
              throw new Error(`Failed inserting mutation items chunk [${i}..${i + chunk.length}]: ${itemsErr.message}`);
            }
            itemsInserted += chunk.length;
          }
        }

        return formatSuccessResponse({
          message: 'Bank statement and mutation items imported successfully',
          statement,
          itemsCount: itemsInserted,
        });
      } catch (err) {
        return formatErrorResponse(err);
      }
    }
  );
}
