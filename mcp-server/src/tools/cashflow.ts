import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ServerConfig } from '../config.js';
import { getSupabaseClient, ensureUserFilter, resolveTargetUserId } from '../db/client.js';
import { formatSuccessResponse, formatErrorResponse } from '../utils/errors.js';

export function registerCashFlowTools(server: McpServer, config: ServerConfig) {
  server.tool(
    'list_cash_flow',
    'List cash flow entries with precise transaction time, pagination, date filters, and search capabilities.',
    {
      page: z.number().int().min(1).default(1).describe('Page number, defaults to 1'),
      limit: z.number().int().min(1).max(100).default(20).describe('Items per page, max 100'),
      date_from: z.string().optional().describe('Filter start date in ISO format YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ'),
      date_to: z.string().optional().describe('Filter end date in ISO format YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ'),
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
          // If YYYY-MM-DD format, extend to end of day to avoid excluding midday transactions
          const endBoundary = args.date_to.includes('T') ? args.date_to : `${args.date_to}T23:59:59.999Z`;
          query = query.lte('date', endBoundary);
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

        // Ensure transaction_time and created_at are explicitly surfaced with exact hour & minute
        const formattedEntries = (data || []).map((row: any) => ({
          ...row,
          transaction_time: row.transaction_time || row.date,
          created_at: row.created_at || null,
        }));

        return formatSuccessResponse({
          entries: formattedEntries,
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
    'Add a new income or expense cash flow transaction with full time precision.',
    {
      transaction_time: z
        .string()
        .optional()
        .describe('Exact transaction time in ISO format (e.g. "2026-10-03T14:30:00+07:00" or "2026-10-03T07:30:00Z"). Defaults to now() if omitted.'),
      date: z
        .string()
        .optional()
        .describe('Transaction date (YYYY-MM-DD or ISO timestamp). If provided without time, current time is preserved.'),
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
        const now = new Date();
        const oneDayAhead = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        let resolvedTime: Date;
        if (args.transaction_time) {
          resolvedTime = new Date(args.transaction_time);
          if (isNaN(resolvedTime.getTime())) {
            throw new Error(`Invalid transaction_time format: "${args.transaction_time}". Must be a valid ISO date/time.`);
          }
        } else if (args.date) {
          const dateTrimmed = args.date.trim();
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateTrimmed)) {
            // Keep current hours/mins/secs of the day instead of midnight UTC
            const hours = String(now.getHours()).padStart(2, '0');
            const mins = String(now.getMinutes()).padStart(2, '0');
            const secs = String(now.getSeconds()).padStart(2, '0');
            resolvedTime = new Date(`${dateTrimmed}T${hours}:${mins}:${secs}`);
          } else {
            resolvedTime = new Date(dateTrimmed);
          }
          if (isNaN(resolvedTime.getTime())) {
            throw new Error(`Invalid date format: "${args.date}".`);
          }
        } else {
          resolvedTime = now;
        }

        // Validate future date constraint (<= now() + 1 day)
        if (resolvedTime.getTime() > oneDayAhead.getTime()) {
          throw new Error(`transaction_time cannot be more than 1 day in the future (received: ${resolvedTime.toISOString()})`);
        }

        const isoTimestamp = resolvedTime.toISOString();

        const basePayload: any = {
          user_id: targetUserId,
          date: isoTimestamp,
          main_category: args.main_category,
          sub_category: args.sub_category ?? null,
          description: args.description ?? null,
          income: args.income ?? 0,
          expense: args.expense ?? 0,
          payment_method: args.payment_method ?? null,
        };

        // Try inserting with transaction_time first
        let data: any = null;
        const payloadWithTime = {
          ...basePayload,
          transaction_time: isoTimestamp,
        };

        const { data: resData, error: insertError } = await client
          .from('cash_flow')
          .insert(payloadWithTime)
          .select()
          .single();

        if (insertError) {
          // If transaction_time column is not yet present in DB migration, fallback to basePayload
          if (insertError.message.includes('transaction_time')) {
            const { data: fallbackData, error: fallbackError } = await client
              .from('cash_flow')
              .insert(basePayload)
              .select()
              .single();

            if (fallbackError) throw fallbackError;
            data = fallbackData;
          } else {
            throw insertError;
          }
        } else {
          data = resData;
        }

        return formatSuccessResponse({
          message: 'Cash flow entry created successfully with exact transaction time',
          entry: {
            ...data,
            transaction_time: data.transaction_time || data.date,
          },
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
