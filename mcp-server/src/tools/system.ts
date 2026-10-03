import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ServerConfig } from '../config.js';
import { getSupabaseClient, resolveTargetUserId } from '../db/client.js';
import { formatSuccessResponse, formatErrorResponse } from '../utils/errors.js';

export function registerSystemTools(server: McpServer, config: ServerConfig) {
  server.tool(
    'check_connection',
    'Verify Supabase connection, API key permissions (service_role vs anon), user scope validity, database query latency, and storage access.',
    {
      user_id: z.string().optional().describe('Optional user_id override to test user scope'),
    },
    async (args) => {
      const startTime = Date.now();
      const diagnostics: string[] = [];

      try {
        const client = getSupabaseClient(config);

        // 1. Auth & Key Scope Check
        const keyRole = config.keyRole || 'unknown';
        const isServiceRole = config.isServiceRole;

        if (!isServiceRole) {
          diagnostics.push(
            `WARNING: Supabase API key role is "${keyRole}". Without "service_role", Row-Level Security (RLS) blocks queries unless a user JWT session is provided.`
          );
        } else {
          diagnostics.push('API key has "service_role" privileges. Administrative access enabled.');
        }

        // 2. Target User ID Check
        let targetUserId: string | null = null;
        let userIdValid = false;
        try {
          targetUserId = resolveTargetUserId(config, args.user_id);
          userIdValid = true;
          diagnostics.push(`Target user_id configured: ${targetUserId}`);
        } catch (uErr: any) {
          diagnostics.push(`User scoping issue: ${uErr.message}`);
        }

        // 3. Database Connectivity & Count Test
        let dbConnected = false;
        let userRowCount = 0;
        let dbLatencyMs = 0;

        if (targetUserId) {
          const dbStart = Date.now();
          const { count, error: countErr } = await client
            .from('cash_flow')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', targetUserId);

          dbLatencyMs = Date.now() - dbStart;

          if (countErr) {
            diagnostics.push(`Database test failed: ${countErr.message}`);
          } else {
            dbConnected = true;
            userRowCount = count ?? 0;
            diagnostics.push(`Database connected. Found ${userRowCount} cash flow records for user.`);
          }
        } else {
          const dbStart = Date.now();
          const { error: pingErr } = await client.from('cash_flow').select('id').limit(1);
          dbLatencyMs = Date.now() - dbStart;
          if (pingErr) {
            diagnostics.push(`Database connection failed: ${pingErr.message}`);
          } else {
            dbConnected = true;
            diagnostics.push('Database connected (unscoped ping).');
          }
        }

        // 4. RPC Availability Check
        let rpcAvailable = false;
        if (targetUserId) {
          try {
            const { error: rpcErr } = await client.rpc('get_cash_flow_summary', {
              p_user_id: targetUserId,
            });
            if (!rpcErr) {
              rpcAvailable = true;
              diagnostics.push('RPC get_cash_flow_summary is active and responding.');
            } else {
              diagnostics.push(`RPC get_cash_flow_summary returned note: ${rpcErr.message}`);
            }
          } catch (rErr: any) {
            diagnostics.push(`RPC check exception: ${rErr?.message || rErr}`);
          }
        }

        // 5. Storage Bucket Check
        let storageAccessible = false;
        try {
          const { error: storageErr } = await client.storage
            .from('receipts')
            .list(targetUserId || undefined, { limit: 1 });

          if (storageErr) {
            diagnostics.push(`Storage check for 'receipts' bucket failed: ${storageErr.message}`);
          } else {
            storageAccessible = true;
            diagnostics.push(`Storage 'receipts' bucket is accessible.`);
          }
        } catch (sErr: any) {
          diagnostics.push(`Storage check failed: ${sErr?.message || sErr}`);
        }

        const totalLatencyMs = Date.now() - startTime;
        const status =
          dbConnected && isServiceRole && userIdValid
            ? 'healthy'
            : dbConnected
            ? 'degraded'
            : 'unhealthy';

        return formatSuccessResponse({
          status,
          totalLatencyMs,
          dbLatencyMs,
          auth: {
            role: keyRole,
            isServiceRole,
            userId: targetUserId,
            userIdValid,
          },
          database: {
            connected: dbConnected,
            userCashFlowRowCount: userRowCount,
            rpcSummaryAvailable: rpcAvailable,
          },
          storage: {
            receiptsBucketAccessible: storageAccessible,
          },
          diagnostics,
        });
      } catch (err) {
        return formatErrorResponse(err);
      }
    }
  );
}
