const fs = require('fs')
const path = require('path')

async function run() {
  const file = fs.readFileSync(path.join(__dirname, 'run-alternated-tests.js'), 'utf8')
  // modify it to run only cash flow e2e
  const replaced = file.replace(/const tests = \[([\s\S]*?)\];/g, `const tests = [{
      name: 'E2E Cash Flow Test',
      type: 'e2e',
      spec: './test/specs/cash-flow.e2e.js',
      action: () => runCommand('npx', ['wdio', 'run', 'wdio.conf.js', '--spec', './test/specs/cash-flow.e2e.js'], { NO_START_SERVER: 'true' })
  }];`)
  
  fs.writeFileSync(path.join(__dirname, 'run-cashflow-only.js'), replaced)
}
run()
