const fs = require('fs')

async function run() {
  const file = fs.readFileSync('D:/01_Projects/fintrack-saas/frontend/e2e/scripts/run-alternated-tests.js', 'utf8')
  // modify it to run only cash flow e2e
  const replaced = file.replace(/const tests = \[([\s\S]*?)\];/g, `const tests = [{
      name: 'E2E Cash Flow Test',
      type: 'e2e',
      spec: './test/specs/cash-flow.e2e.js',
      action: () => runCommand('npx', ['wdio', 'run', 'wdio.conf.js', '--spec', './test/specs/cash-flow.e2e.js'], { NO_START_SERVER: 'true' })
  }];`)
  
  fs.writeFileSync('D:/01_Projects/fintrack-saas/frontend/e2e/scripts/run-cashflow-only.js', replaced)
}
run()
