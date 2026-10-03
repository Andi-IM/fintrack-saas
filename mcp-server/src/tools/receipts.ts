import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ServerConfig } from '../config.js';
import { getSupabaseClient, ensureUserFilter, isValidUuid, resolveTargetUserId } from '../db/client.js';
import { formatSuccessResponse, formatErrorResponse } from '../utils/errors.js';

function getMimeType(filePathOrExt: string): string {
  const ext = filePathOrExt.toLowerCase().split('.').pop() || '';
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'pdf':
      return 'application/pdf';
    default:
      return 'image/jpeg';
  }
}

function buildStoragePath(userId: string, storeName: string, originalName: string): string {
  const ext = originalName.toLowerCase().split('.').pop() || 'jpg';
  const folder = storeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'receipt';
  const uniqueName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  return `${userId}/${folder}/${uniqueName}`;
}

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

  server.tool(
    'create_receipt',
    'Create a new receipt record (salary, shopping, ATM, etc.) with image upload to Supabase Storage (via local file path or Base64) or direct storage path, and automatic cash flow synchronization.',
    {
      store_name: z.string().min(1).describe('Store, company, or source name (e.g. PT ABC, Indomaret, PLN, Gaji Perusahaan)'),
      total_price: z.number().nonnegative().describe('Total amount in IDR/currency'),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').describe('Receipt or transaction date (YYYY-MM-DD)'),
      type: z.enum(['shopping', 'atm', 'salary', 'other']).default('shopping').describe('Type of receipt record'),
      payment_method: z.string().optional().describe('Payment method (e.g. Cash, BCA, Mandiri, Transfer, QRIS)'),
      store_address: z.string().optional().describe('Store or issuer address'),
      amount_paid: z.number().nonnegative().optional().describe('Amount handed over by customer'),
      change: z.number().nonnegative().optional().describe('Change returned to customer'),
      fee: z.number().nonnegative().optional().describe('Transaction fee if applicable'),
      file_path: z.string().optional().describe('Local file path on disk to upload, OR existing Supabase Storage path'),
      local_file_path: z.string().optional().describe('Explicit local filesystem path to upload to Supabase Storage'),
      storage_path: z.string().optional().describe('Existing Supabase Storage path (e.g. 5c64ceab-.../store/image.jpg) if already in storage'),
      image_base64: z.string().optional().describe('Base64-encoded image data string to upload to Supabase Storage'),
      image_filename: z.string().optional().describe('Filename hint when using image_base64 (e.g. slip_gaji.jpg)'),
      items: z
        .array(
          z.object({
            product_name: z.string().min(1).describe('Name of product or line item'),
            quantity: z.number().positive().default(1).describe('Quantity'),
            price: z.number().nonnegative().describe('Unit price'),
          })
        )
        .optional()
        .describe('Optional line items breakdown for the receipt'),
      sync_to_cash_flow: z
        .boolean()
        .default(true)
        .describe('If true, automatically creates an associated cash flow record with receipt_id linked'),
      cash_flow_category: z
        .string()
        .optional()
        .describe('Main category for the cash flow record (defaults to Salary if type is salary, or Shopping)'),
      is_income: z
        .boolean()
        .optional()
        .describe('Explicitly specify if this transaction is income (true) or expense (false). Defaults to true if type is salary, false otherwise.'),
      user_id: z.string().optional().describe('Target user ID override if using service role credentials'),
    },
    async (args) => {
      try {
        const client = getSupabaseClient(config);
        const targetUserId = resolveTargetUserId(config, args.user_id);

        let supabaseStoragePath: string | null = null;
        let signedImageUrl: string | null = null;

        // Check if an existing Supabase Storage path was passed directly
        if (args.storage_path) {
          supabaseStoragePath = args.storage_path;
        }

        const candidateLocalPath = args.local_file_path || args.file_path;

        // 1. Process image upload: prioritize image_base64 for remote agents / containers
        if (args.image_base64 && args.image_base64.trim().length > 0) {
          const rawBase64 = args.image_base64.replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '');
          const fileBuffer = Buffer.from(rawBase64, 'base64');
          if (fileBuffer.length === 0) {
            throw new Error('Provided image_base64 contains no valid image data or is empty.');
          }

          const filename =
            args.image_filename ||
            (candidateLocalPath ? path.basename(candidateLocalPath) : 'receipt.jpg');
          const mimeType = getMimeType(filename);
          const storagePath = buildStoragePath(targetUserId, args.store_name, filename);

          const { error: uploadError } = await client.storage
            .from('receipts')
            .upload(storagePath, fileBuffer, {
              contentType: mimeType,
              upsert: false,
            });

          if (uploadError) {
            if (uploadError.message.includes('row-level security') || (uploadError as any).statusCode === '403') {
              throw new Error(
                `Upload failed: Supabase Storage Row-Level Security policy violation. The MCP server requires a true 'service_role' key in SUPABASE_SERVICE_ROLE_KEY to upload files without user JWT session.`
              );
            }
            throw new Error(`Failed to upload receipt image to Supabase Storage: ${uploadError.message}`);
          }

          supabaseStoragePath = storagePath;
        } else if (!supabaseStoragePath && candidateLocalPath) {
          const resolvedPath = path.resolve(candidateLocalPath);
          if (fs.existsSync(resolvedPath)) {
            // Local file exists on disk -> upload to Supabase Storage
            const fileBuffer = await fs.promises.readFile(resolvedPath);
            const filename = path.basename(resolvedPath);
            const mimeType = getMimeType(filename);
            const storagePath = buildStoragePath(targetUserId, args.store_name, filename);

            const { error: uploadError } = await client.storage
              .from('receipts')
              .upload(storagePath, fileBuffer, {
                contentType: mimeType,
                upsert: false,
              });

            if (uploadError) {
              if (uploadError.message.includes('row-level security') || (uploadError as any).statusCode === '403') {
                throw new Error(
                  `Upload failed: Supabase Storage Row-Level Security policy violation. The MCP server requires a true 'service_role' key in SUPABASE_SERVICE_ROLE_KEY to upload files without user JWT session.`
                );
              }
              throw new Error(`Failed to upload receipt image to Supabase Storage: ${uploadError.message}`);
            }

            supabaseStoragePath = storagePath;
          } else if (candidateLocalPath.startsWith(`${targetUserId}/`) || candidateLocalPath.startsWith('receipts/')) {
            // Already an existing storage path in the user's bucket folder
            supabaseStoragePath = candidateLocalPath;
          } else {
            throw new Error(
              `Receipt image file "${candidateLocalPath}" was not found on local disk. When running via container or remote agent, provide image data via "image_base64" instead of a host filesystem path.`
            );
          }
        }

        // Generate signed URL if we have a Supabase Storage path
        if (supabaseStoragePath) {
          const { data: signedData } = await client.storage
            .from('receipts')
            .createSignedUrl(supabaseStoragePath, 3600);
          if (signedData?.signedUrl) {
            signedImageUrl = signedData.signedUrl;
          }
        }

        // 2. Insert receipt into database with file_path pointing to Supabase Storage
        const receiptPayload = {
          user_id: targetUserId,
          type: args.type,
          store_name: args.store_name,
          store_address: args.store_address ?? null,
          date: args.date,
          total_price: args.total_price,
          payment_method: args.payment_method ?? null,
          amount_paid: args.amount_paid ?? null,
          change: args.change ?? null,
          fee: args.fee ?? 0,
          file_path: supabaseStoragePath,
        };

        const { data: receipt, error: receiptError } = await client
          .from('receipts')
          .insert(receiptPayload)
          .select()
          .single();

        if (receiptError) {
          // Cleanup storage object if database insert fails
          if (supabaseStoragePath && !args.storage_path) {
            await client.storage.from('receipts').remove([supabaseStoragePath]).catch(() => {});
          }
          throw receiptError;
        }

        // 3. Insert receipt items if provided
        let insertedItems: any[] = [];
        if (args.items && args.items.length > 0) {
          const itemsToInsert = args.items.map((item) => ({
            receipt_id: receipt.id,
            product_name: item.product_name,
            quantity: item.quantity,
            price: item.price,
          }));

          const { data: itemData, error: itemsError } = await client
            .from('receipts_items')
            .insert(itemsToInsert)
            .select();

          if (itemsError) {
            process.stderr.write(`[FinTrack MCP Warning] Failed to insert receipt items: ${itemsError.message}\n`);
          } else {
            insertedItems = itemData || [];
          }
        }

        // 4. Optionally synchronize to cash_flow
        let cashFlowEntry: any = null;
        if (args.sync_to_cash_flow !== false) {
          const isIncome = args.is_income ?? (args.type === 'salary');
          const defaultCategory = isIncome
            ? 'Salary'
            : args.type === 'atm'
            ? 'Withdrawal'
            : 'Shopping';
          const mainCategory = args.cash_flow_category || defaultCategory;

          const cashFlowPayload = {
            user_id: targetUserId,
            date: args.date,
            main_category: mainCategory,
            description: `${args.store_name} (${args.type})`,
            income: isIncome ? args.total_price : 0,
            expense: isIncome ? 0 : args.total_price,
            payment_method: args.payment_method ?? null,
            receipt_id: receipt.id,
          };

          const { data: cfData, error: cfError } = await client
            .from('cash_flow')
            .insert(cashFlowPayload)
            .select()
            .single();

          if (cfError) {
            process.stderr.write(`[FinTrack MCP Warning] Failed to sync receipt to cash flow: ${cfError.message}\n`);
          } else {
            cashFlowEntry = cfData;
          }
        }

        return formatSuccessResponse({
          message: 'Receipt created successfully',
          receipt,
          items: insertedItems,
          cash_flow: cashFlowEntry,
          signed_image_url: signedImageUrl,
        });
      } catch (err) {
        return formatErrorResponse(err);
      }
    }
  );

  server.tool(
    'get_receipt_image_url',
    'Generate a temporary signed URL to view or download a receipt image from Supabase Storage.',
    {
      receipt_id: z.string().uuid().optional().describe('UUID of the receipt in the database'),
      file_path: z.string().optional().describe('Storage file_path of the receipt (if known)'),
      expires_in: z.number().int().min(60).max(86400).default(3600).describe('URL expiry time in seconds (default 3600 / 1 hour)'),
      user_id: z.string().optional().describe('Optional user_id override'),
    },
    async (args) => {
      try {
        if (!args.receipt_id && !args.file_path) {
          throw new Error('Either receipt_id or file_path must be provided');
        }

        const client = getSupabaseClient(config);
        let targetFilePath = args.file_path;

        if (!targetFilePath && args.receipt_id) {
          let query = client.from('receipts').select('file_path').eq('id', args.receipt_id);
          query = ensureUserFilter(query, config, args.user_id);
          const { data, error } = await query.single();
          if (error) throw error;
          if (!data?.file_path) {
            throw new Error(`Receipt ${args.receipt_id} does not have an attached image file.`);
          }
          targetFilePath = data.file_path;
        }

        const { data: signedData, error: signError } = await client.storage
          .from('receipts')
          .createSignedUrl(targetFilePath!, args.expires_in);

        if (signError) throw signError;

        return formatSuccessResponse({
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
