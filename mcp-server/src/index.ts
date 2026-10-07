#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config.js';
import { registerCashFlowTools } from './tools/cashflow.js';
import { registerCashWalletTools } from './tools/cash-wallets.js';
import { registerStatementTools } from './tools/statements.js';
import { registerReceiptTools } from './tools/receipts.js';
import { registerAnalyticsTools } from './tools/analytics.js';
import { registerSystemTools } from './tools/system.js';

async function main() {
  const config = loadConfig();

  const server = new McpServer({
    name: 'fintrack-mcp-server',
    version: '1.0.0',
  });

  registerSystemTools(server, config);
  registerCashFlowTools(server, config);
  registerCashWalletTools(server, config);
  registerStatementTools(server, config);
  registerReceiptTools(server, config);
  registerAnalyticsTools(server, config);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(() => {
  console.error('Fatal MCP Server error during startup. Check configuration and retry.');
  process.exit(1);
});
