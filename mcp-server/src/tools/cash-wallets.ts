import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ServerConfig } from '../config.js';
import { getSupabaseClient, ensureUserFilter, resolveTargetUserId } from '../db/client.js';
import { formatSuccessResponse, formatErrorResponse } from '../utils/errors.js';

async function deriveWalletBalance(
  client: any,
  wallet: { id: string; user_id: string; name: string; opening_balance: number; created_at: string }
): Promise<number> {
  const { data, error } = await client
    .from('cash_flow')
    .select('income, expense')
    .eq('user_id', wallet.user_id)
    .eq('payment_method', wallet.name)
    .gte('date', wallet.created_at);

  if (error) throw error;

  const rows = data || [];
  const net = rows.reduce(
    (acc: number, row: any) => acc + Number(row.income || 0) - Number(row.expense || 0),
    0
  );

  return Number(wallet.opening_balance || 0) + net;
}

export function registerCashWalletTools(server: McpServer, config: ServerConfig) {
  server.tool(
    'list_cash_wallets',
    'List all cash wallets (dompet tunai) with derived current balance. Balance = opening_balance + sum(income) - sum(expense) from cash_flow entries matching the wallet name.',
    {
      user_id: z.string().optional().describe('Optional user_id override if in service role mode'),
    },
    async (args) => {
      try {
        const client = getSupabaseClient(config);

        let query = client.from('cash_wallets').select('*', { count: 'exact' });
        query = ensureUserFilter(query, config, args.user_id);

        const { data, count, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        const wallets = await Promise.all(
          (data || []).map(async (wallet: any) => ({
            ...wallet,
            current_balance: await deriveWalletBalance(client, wallet),
          }))
        );

        return formatSuccessResponse({
          wallets,
          pagination: {
            totalCount: count ?? 0,
          totalPages: 1,
          page: 1,
            limit: count ?? 0,
          },
        });
      } catch (err) {
        return formatErrorResponse(err);
      }
    }
  );

  server.tool(
    'create_cash_wallet',
    'Create a new cash wallet (dompet tunai) for tracking physical cash holdings.',
    {
      name: z.string().min(1).describe('Wallet name (e.g., "Dompet Utama", "Cash Tunai", "Dompet Belanja")'),
      opening_balance: z.number().nonnegative().optional().describe('Initial cash amount held when creating the wallet. Defaults to 0.'),
      currency: z.string().optional().describe('Currency code (e.g., IDR, USD). Defaults to IDR.'),
      user_id: z.string().optional().describe('Target user_id (required if using service role mode)'),
    },
    async (args) => {
      try {
        const client = getSupabaseClient(config);
        const targetUserId = resolveTargetUserId(config, args.user_id);

        const payload: Record<string, any> = {
          user_id: targetUserId,
          name: args.name,
          opening_balance: args.opening_balance ?? 0,
          currency: args.currency ?? 'IDR',
        };

        const { data, error } = await client
          .from('cash_wallets')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;

        return formatSuccessResponse({
          message: 'Cash wallet created successfully',
          wallet: {
            ...data,
            current_balance: Number(data.opening_balance || 0),
          },
        });
      } catch (err) {
        return formatErrorResponse(err);
      }
    }
  );

  server.tool(
    'update_cash_wallet',
    'Update an existing cash wallet (rename, adjust opening balance, or change currency).',
    {
      id: z.string().uuid().describe('UUID of the cash wallet to update'),
      name: z.string().min(1).optional().describe('New wallet name'),
      opening_balance: z.number().nonnegative().optional().describe('New opening balance'),
      currency: z.string().optional().describe('New currency code'),
      user_id: z.string().optional().describe('Target user_id override if in service role mode'),
    },
    async (args) => {
      try {
        const client = getSupabaseClient(config);
        const targetUserId = resolveTargetUserId(config, args.user_id);

        const { data: existing, error: existErr } = await client
          .from('cash_wallets')
          .select('id, user_id')
          .eq('id', args.id)
          .eq('user_id', targetUserId)
          .single();

        if (existErr || !existing) {
          throw new Error(`Cash wallet not found or not owned by user: ${args.id}`);
        }

        const updatePayload: Record<string, any> = {};
        if (args.name !== undefined) updatePayload.name = args.name;
        if (args.opening_balance !== undefined) updatePayload.opening_balance = args.opening_balance;
        if (args.currency !== undefined) updatePayload.currency = args.currency;

        if (Object.keys(updatePayload).length === 0) {
          throw new Error('No update fields provided. Specify at least one field to update.');
        }

        const { data: updated, error: updateErr } = await client
          .from('cash_wallets')
          .update(updatePayload)
          .eq('id', args.id)
          .eq('user_id', targetUserId)
          .select()
          .single();

        if (updateErr) throw updateErr;

        return formatSuccessResponse({
          message: 'Cash wallet updated successfully',
          wallet: {
            ...updated,
            current_balance: await deriveWalletBalance(client, updated),
          },
        });
      } catch (err) {
        return formatErrorResponse(err);
      }
    }
  );

  server.tool(
    'delete_cash_wallet',
    'Delete a cash wallet by UUID. Note: this does not delete associated cash_flow entries.',
    {
      id: z.string().uuid().describe('UUID of the cash wallet to delete'),
      user_id: z.string().optional().describe('Target user_id override if in service role mode'),
    },
    async (args) => {
      try {
        const client = getSupabaseClient(config);
        const targetUserId = resolveTargetUserId(config, args.user_id);

        const { data: existing, error: existErr } = await client
          .from('cash_wallets')
          .select('id, user_id, name, opening_balance')
          .eq('id', args.id)
          .eq('user_id', targetUserId)
          .single();

        if (existErr || !existing) {
          throw new Error(`Cash wallet not found or not owned by user: ${args.id}`);
        }

        const { error: delErr } = await client
          .from('cash_wallets')
          .delete()
          .eq('id', args.id)
          .eq('user_id', targetUserId);

        if (delErr) throw delErr;

        return formatSuccessResponse({
          message: 'Cash wallet deleted successfully',
          deleted_id: args.id,
          wallet: existing,
        });
      } catch (err) {
        return formatErrorResponse(err);
      }
    }
  );
}
