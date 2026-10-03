import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ServerConfig } from '../config.js';
import { getSupabaseClient, resolveTargetUserId } from '../db/client.js';
import { formatSuccessResponse, formatErrorResponse } from '../utils/errors.js';

export function registerAnalyticsTools(server: McpServer, config: ServerConfig) {
  server.tool(
    'get_financial_analytics',
    'Calculate income vs expense analytics matching FinTrack dashboard ranges (TODAY, MTD, YTD, 1W, 1M, 3M, 1Y, ALL) without 1000-row limits.',
    {
      range: z
        .enum(['TODAY', 'MTD', 'YTD', '1W', '1M', '3M', '1Y', 'ALL'])
        .default('1M')
        .describe('Time window for aggregation'),
      user_id: z.string().optional().describe('Optional user_id override'),
    },
    async (args) => {
      try {
        const client = getSupabaseClient(config);
        const targetUserId = resolveTargetUserId(config, args.user_id);
        const now = new Date();
        let fromDate: string | null = null;

        switch (args.range) {
          case 'TODAY':
            fromDate = now.toISOString().split('T')[0];
            break;
          case '1W': {
            const d = new Date(now);
            d.setDate(d.getDate() - 7);
            fromDate = d.toISOString().split('T')[0];
            break;
          }
          case '1M': {
            const d = new Date(now);
            d.setMonth(d.getMonth() - 1);
            fromDate = d.toISOString().split('T')[0];
            break;
          }
          case '3M': {
            const d = new Date(now);
            d.setMonth(d.getMonth() - 3);
            fromDate = d.toISOString().split('T')[0];
            break;
          }
          case '1Y': {
            const d = new Date(now);
            d.setFullYear(d.getFullYear() - 1);
            fromDate = d.toISOString().split('T')[0];
            break;
          }
          case 'MTD': {
            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, '0');
            fromDate = `${y}-${m}-01`;
            break;
          }
          case 'YTD': {
            fromDate = `${now.getFullYear()}-01-01`;
            break;
          }
          case 'ALL':
          default:
            fromDate = null;
            break;
        }

        const endDate = now.toISOString().split('T')[0];

        // 1. First Attempt: PostgreSQL RPC public.get_financial_analytics
        try {
          const { data: rpcData, error: rpcError } = await client.rpc('get_financial_analytics', {
            p_user_id: targetUserId,
            p_date_from: fromDate,
            p_date_to: endDate,
          });

          if (!rpcError && rpcData && typeof rpcData === 'object') {
            return formatSuccessResponse({
              range: args.range,
              startDate: fromDate || 'Earliest record',
              endDate,
              totalIncome: Number(rpcData.total_income || 0),
              totalExpense: Number(rpcData.total_expense || 0),
              netSavings: Number(rpcData.net_savings || 0),
              transactionCount: Number(rpcData.transaction_count || 0),
              categoryBreakdown: rpcData.category_breakdown || {},
              paymentMethodBreakdown: rpcData.payment_method_breakdown || {},
              source: 'database_rpc',
            });
          }
        } catch {
          // If RPC is unavailable, fallback to full paginated query below
        }

        // 2. Fallback: Full Pagination Loop (chunks of 1000)
        // Ensures complete analytics even if data exceeds PostgREST's default max_rows limit
        const CHUNK_SIZE = 1000;
        let offset = 0;
        let totalIncome = 0;
        let totalExpense = 0;
        let totalCount = 0;
        const categoryBreakdown: Record<string, { income: number; expense: number }> = {};
        const paymentMethodBreakdown: Record<string, number> = {};
        let hasMore = true;

        while (hasMore) {
          let query = client
            .from('cash_flow')
            .select('main_category, income, expense, payment_method')
            .eq('user_id', targetUserId)
            .order('id', { ascending: true })
            .range(offset, offset + CHUNK_SIZE - 1);

          if (fromDate) {
            query = query.gte('date', fromDate);
          }

          const { data, error } = await query;
          if (error) throw error;

          const batch = data || [];
          for (const row of batch) {
            const inc = Number(row.income || 0);
            const exp = Number(row.expense || 0);
            totalIncome += inc;
            totalExpense += exp;

            const cat = row.main_category || 'Uncategorized';
            if (!categoryBreakdown[cat]) {
              categoryBreakdown[cat] = { income: 0, expense: 0 };
            }
            categoryBreakdown[cat].income += inc;
            categoryBreakdown[cat].expense += exp;

            const pm = row.payment_method || 'Unknown';
            paymentMethodBreakdown[pm] = (paymentMethodBreakdown[pm] || 0) + (inc + exp);
          }

          totalCount += batch.length;
          if (batch.length < CHUNK_SIZE) {
            hasMore = false;
          } else {
            offset += CHUNK_SIZE;
          }
        }

        return formatSuccessResponse({
          range: args.range,
          startDate: fromDate || 'Earliest record',
          endDate,
          totalIncome,
          totalExpense,
          netSavings: totalIncome - totalExpense,
          transactionCount: totalCount,
          categoryBreakdown,
          paymentMethodBreakdown,
          source: 'paginated_query',
        });
      } catch (err) {
        return formatErrorResponse(err);
      }
    }
  );
}
