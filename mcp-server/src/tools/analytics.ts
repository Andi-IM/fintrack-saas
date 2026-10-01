import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ServerConfig } from '../config.js';
import { getSupabaseClient, ensureUserFilter } from '../db/client.js';
import { formatSuccessResponse, formatErrorResponse } from '../utils/errors.js';

export function registerAnalyticsTools(server: McpServer, config: ServerConfig) {
  server.tool(
    'get_financial_analytics',
    'Calculate income vs expense analytics matching FinTrack dashboard ranges (TODAY, MTD, YTD, 1W, 1M, 3M, 1Y, ALL).',
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

        let query = client.from('cash_flow').select('id, date, main_category, income, expense, payment_method');
        query = ensureUserFilter(query, config, args.user_id);

        if (fromDate) {
          query = query.gte('date', fromDate);
        }

        const { data, error } = await query.order('date', { ascending: true });
        if (error) throw error;

        let totalIncome = 0;
        let totalExpense = 0;
        const categoryBreakdown: Record<string, { income: number; expense: number }> = {};
        const paymentMethodBreakdown: Record<string, number> = {};

        for (const row of data || []) {
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

        return formatSuccessResponse({
          range: args.range,
          startDate: fromDate || 'Earliest record',
          endDate: now.toISOString().split('T')[0],
          totalIncome,
          totalExpense,
          netSavings: totalIncome - totalExpense,
          transactionCount: (data || []).length,
          categoryBreakdown,
          paymentMethodBreakdown,
        });
      } catch (err) {
        return formatErrorResponse(err);
      }
    }
  );
}
