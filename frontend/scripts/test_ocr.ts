import fs from 'fs'
import path from 'path'
import { documentProcessor } from '../lib/ocr/processor'

// Load env variables if not using --env-file
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

async function run() {
  const filePath = path.resolve('..', 'ESTATEMENT-7270476079-062026-14-46-35.pdf')
  if (!fs.existsSync(filePath)) {
    throw new Error('File not found: ' + filePath)
  }
  
  const buffer = fs.readFileSync(filePath)
  // Reconstruct File object for Node.js
  const file = new File([buffer], path.basename(filePath), { type: 'application/pdf' })
  
  console.log('Processing document...')
  const result = await documentProcessor.process(file, 'BankStatement', '+07:00')
  
  console.log('\n--- FINAL OCR RESULT ---')
  console.log(JSON.stringify(result, null, 2))
}

run().catch(console.error)
