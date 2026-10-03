import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ServerConfig } from '../config.js';
import { getSupabaseClient, ensureUserFilter, resolveTargetUserId } from '../db/client.js';
import { formatSuccessResponse, formatErrorResponse } from '../utils/errors.js';

export function registerCashFlowTools(server: McpServer, config: ServerConfig) {
  server.tool(
    'list_cash_flow',
    'List cash flow entries with pagination, date filters, and search capabilities.',
    {
      page: z.number().int().min(1).default(1).describe('Page number, defaults to 1'),
      limit: z.number().int().min(1).max(100).default(20).describe('Items per page, max 100'),
      date_from: z.string().optional().describe('Filter start date in ISO format YYYY-MM-DD'),
      date_to: z.string().optional().describe('Filter end date in ISO format YYYY-MM-DD'),
      category: z.string().optional().describe('Filter by main category name'),
      payment_method: z.string().optional().describe('Filter by payment method'),
      search: z.string().optional().describe('Search in description'),
      user_id: z.string().optional().describe('Optional user_id override if in service role mode'),
    },
    async (args) => {
      try {
        const client = getSupabaseClient(config);
        const offset = (args.page - 1) * args.limit;

        let query = client
          .from('cash_flow')
          .select('*', { count: 'exact' });

        query = ensureUserFilter(query, config, args.user_id);

        if (args.date_from) {
          query = query.gte('date', args.date_from);
        }
        if (args.date_to) {
          query = query.lte('date', args.date_to);
        }
        if (args.category) {
          query = query.ilike('main_category', `%${args.category}%`);
        }
        if (args.payment_method) {
          query = query.eq('payment_method', args.payment_method);
        }
        if (args.search) {
          query = query.ilike('description', `%${args.search}%`);
        }

        const { data, count, error } = await query
          .order('date', { ascending: false })
          .range(offset, offset + args.limit - 1);

        if (error) throw error;

        return formatSuccessResponse({
          entries: data || [],
          pagination: {
            page: args.page,
            limit: args.limit,
            totalCount: count ?? 0,
            totalPages: Math.ceil((count ?? 0) / args.limit),
          },
        });
      } catch (err) {
        return formatErrorResponse(err);
      }
    }
  );

  server.tool(
    'create_cash_flow_entry',
    'Add a new income or expense cash flow transaction.',
    {
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').describe('Transaction date'),
      main_category: z.string().min(1).describe('Primary category (e.g., Food, Salary, Utilities)'),
      sub_category: z.string().optional().describe('Optional sub-category'),
      description: z.string().optional().describe('Notes or description for transaction'),
      income: z.number().nonnegative().optional().describe('Income amount in IDR/currency, set 0 if expense'),
      expense: z.number().nonnegative().optional().describe('Expense amount in IDR/currency, set 0 if income'),
      payment_method: z.string().optional().describe('Method: Cash, BCA, Mandiri, Jago, QRIS, etc.'),
      user_id: z.string().optional().describe('Target user_id (required if using service role mode)'),
    },
    async (args) => {
      try {
        const client = getSupabaseClient(config);
        const targetUserId = resolveTargetUserId(config, args.user_id);

        const payload = {
          user_id: targetUserId,
          date: args.date,
          main_category: args.main_category,
          sub_category: args.sub_category ?? null,
          description: args.description ?? null,
          income: args.income ?? 0,
          expense: args.expense ?? 0,
          payment_method: args.payment_method ?? null,
        };

        const { data, error } = await client
          .from('cash_flow')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;

        return formatSuccessResponse({
          message: 'Cash flow entry created successfully',
          entry: data,
        });
      } catch (err) {
        return formatErrorResponse(err);
      }
    }
  );

  server.tool(
    'get_cash_flow_summary',
    'Calculate aggregated total income, total expense, and net balance over a given date range without 1000-row limits.',
    {
      date_from: z.string().optional().describe('Start date YYYY-MM-DD'),
      date_to: z.string().optional().describe('End date YYYY-MM-DD'),
      user_id: z.string().optional().describe('Optional user_id override'),
    },
    async (args) => {
      try {
        const client = getSupabaseClient(config);
        const targetUserId = resolveTargetUserId(config, args.user_id);

        // 1. First Attempt: PostgreSQL RPC public.get_cash_flow_summary
        // Computes directly inside Postgres (SUM, COUNT), bypassing 1000-row REST limits
        try {
          const { data: rpcData, error: rpcError } = await client.rpc('get_cash_flow_summary', {
            p_user_id: targetUserId,
            p_date_from: args.date_from ?? null,
            p_date_to: args.date_to ?? null,
          });

          if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
            const summaryRow = rpcData[0];
            return formatSuccessResponse({
              totalIncome: Number(summaryRow.total_income || 0),
              totalExpense: Number(summaryRow.total_expense || 0),
              netBalance: Number(summaryRow.net_balance || 0),
              transactionCount: Number(summaryRow.transaction_count || 0),
              period: {
                from: args.date_from || 'Beginning of records',
                to: args.date_to || 'Latest',
              },
              source: 'database_rpc',
            });
          }
        } catch {
          // If RPC is not found or fails, proceed to resilient client pagination fallback
        }

        // 2. Fallback: Full Pagination Loop (chunks of 1000)
        // Ensures users with >1000 records (e.g. 1,213 rows) are NEVER truncated
        const CHUNK_SIZE = 1000;
        let offset = 0;
        let totalIncome = 0;
        let totalExpense = 0;
        let totalCount = 0;
        let hasMore = true;

        while (hasMore) {
          let query = client
            .from('cash_flow')
            .select('income, expense')
            .eq('user_id', targetUserId)
            .order('id', { ascending: true })
            .range(offset, offset + CHUNK_SIZE - 1);

          if (args.date_from) {
            query = query.gte('date', args.date_from);
          }
          if (args.date_to) {
            query = query.lte('date', args.date_to);
          }

          const { data, error } = await query;
          if (error) throw error;

          const batch = data || [];
          for (const row of batch) {
            totalIncome += Number(row.income || 0);
            totalExpense += Number(row.expense || 0);
          }

          totalCount += batch.length;
          if (batch.length < CHUNK_SIZE) {
            hasMore = false;
          } else {
            offset += CHUNK_SIZE;
          }
        }

        return formatSuccessResponse({
          totalIncome,
          totalExpense,
          netBalance: totalIncome - totalExpense,
          transactionCount: totalCount,
          period: {
            from: args.date_from || 'Beginning of records',
            to: args.date_to || 'Latest',
          },
          source: 'paginated_query',
        });
      } catch (err) {
        return formatErrorResponse(err);
      }
    }
  );
}
