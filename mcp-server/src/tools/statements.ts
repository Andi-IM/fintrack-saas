import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ServerConfig } from '../config.js';
import { getSupabaseClient, ensureUserFilter } from '../db/client.js';
import { formatSuccessResponse, formatErrorResponse } from '../utils/errors.js';

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
      type: z.enum(['CR', 'DB']).optional().describe('Filter by CR (Credit/Income) or DB (Debit/Expense)'),
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
          query = query.eq('type', args.type);
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
}
