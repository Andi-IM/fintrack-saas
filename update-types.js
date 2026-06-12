const fs = require('fs');
let content = fs.readFileSync('frontend/lib/database.types.ts', 'utf8');

const regex = /transactions:\s*\{/;
const match = content.match(regex);

if (match) {
  const txStart = match.index;
  let depth = 0;
  let txEnd = -1;
  // Start looking after the opening brace
  const braceIndex = content.indexOf('{', txStart);
  
  for (let i = braceIndex; i < content.length; i++) {
    if (content[i] === '{') depth++;
    if (content[i] === '}') {
      depth--;
      if (depth === 0) {
        txEnd = i;
        break;
      }
    }
  }

  if (txEnd !== -1) {
    const newBlock = `cash_flow: {
        Row: {
          id: string
          created_at: string | null
          date: string
          main_category: string
          sub_category: string | null
          description: string | null
          income: number | null
          expense: number | null
          payment_method: string | null
          receipt_id: string | null
          source_item_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string | null
          date: string
          main_category: string
          sub_category?: string | null
          description?: string | null
          income?: number | null
          expense?: number | null
          payment_method?: string | null
          receipt_id?: string | null
          source_item_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string | null
          date?: string
          main_category?: string
          sub_category?: string | null
          description?: string | null
          income?: number | null
          expense?: number | null
          payment_method?: string | null
          receipt_id?: string | null
          source_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_source_item_id_fkey"
            columns: ["source_item_id"]
            isOneToOne: false
            referencedRelation: "bank_statement_items"
            referencedColumns: ["id"]
          }
        ]
      }`;
    
    content = content.substring(0, txStart) + newBlock + content.substring(txEnd + 1);
    fs.writeFileSync('frontend/lib/database.types.ts', content);
    console.log("Replaced transactions with cash_flow successfully");
  } else {
    console.log("Could not find closing brace");
  }
} else {
  console.log("Could not find 'transactions: {'");
}
