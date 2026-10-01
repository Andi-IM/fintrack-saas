import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ServerConfig } from '../config.js';
import { getSupabaseClient, ensureUserFilter } from '../db/client.js';
import { formatSuccessResponse, formatErrorResponse } from '../utils/errors.js';

export function registerReceiptTools(server: McpServer, config: ServerConfig) {
  server.tool(
    'list_receipts',
    'List uploaded receipts with store name, total price, date, and payment method.',
    {
      store_name: z.string().optional().describe('Filter by merchant/store name'),
      date_from: z.string().optional().describe('Start date YYYY-MM-DD'),
      date_to: z.string().optional().describe('End date YYYY-MM-DD'),
      limit: z.number().int().min(1).max(100).default(20).describe('Max receipts to return'),
      user_id: z.string().optional().describe('Optional user_id override'),
    },
    async (args) => {
      try {
        const client = getSupabaseClient(config);
        let query = client.from('receipts').select('*');

        query = ensureUserFilter(query, config, args.user_id);

        if (args.store_name) {
          query = query.ilike('store_name', `%${args.store_name}%`);
        }
        if (args.date_from) {
          query = query.gte('date', args.date_from);
        }
        if (args.date_to) {
          query = query.lte('date', args.date_to);
        }

        const { data, error } = await query
          .order('date', { ascending: false })
          .limit(args.limit);

        if (error) throw error;

        return formatSuccessResponse({
          receipts: data || [],
        });
      } catch (err) {
        return formatErrorResponse(err);
      }
    }
  );

  server.tool(
    'get_receipt_details',
    'Get full receipt details including line items (product name, quantity, unit price).',
    {
      receipt_id: z.string().uuid().describe('The UUID of the receipt'),
      user_id: z.string().optional().describe('Optional user_id override'),
    },
    async (args) => {
      try {
        const client = getSupabaseClient(config);

        let receiptQuery = client.from('receipts').select('*').eq('id', args.receipt_id);
        receiptQuery = ensureUserFilter(receiptQuery, config, args.user_id);

        const { data: receipt, error: receiptErr } = await receiptQuery.single();
        if (receiptErr) throw receiptErr;

        const { data: items, error: itemsErr } = await client
          .from('receipts_items')
          .select('*')
          .eq('receipt_id', args.receipt_id);

        if (itemsErr) throw itemsErr;

        return formatSuccessResponse({
          receipt,
          items: items || [],
        });
      } catch (err) {
        return formatErrorResponse(err);
      }
    }
  );
}
