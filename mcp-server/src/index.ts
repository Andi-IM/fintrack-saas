#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config.js';
import { registerCashFlowTools } from './tools/cashflow.js';
import { registerStatementTools } from './tools/statements.js';
import { registerReceiptTools } from './tools/receipts.js';
import { registerAnalyticsTools } from './tools/analytics.js';

async function main() {
  const config = loadConfig();

  const server = new McpServer({
    name: 'fintrack-mcp-server',
    version: '1.0.0',
  });

  registerCashFlowTools(server, config);
  registerStatementTools(server, config);
  registerReceiptTools(server, config);
  registerAnalyticsTools(server, config);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Fatal MCP Server error:', err);
  process.exit(1);
});
