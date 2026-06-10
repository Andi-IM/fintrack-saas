// OCR and Statement Parsing Constants

export const RECEIPT_TOTAL_KEYWORDS = [
  /total/i,
  /jumlah/i,
  /grand\s*total/i,
  /bayar/i,
  /nett/i,
  /amount/i
]

export const RECEIPT_CATEGORY_PATTERNS = [
  { category: 'Food', regex: /makan|minum|food|beverage|resto|cafe|coffee|kopi|nasi|mie|teh/i },
  { category: 'Transport', regex: /trans|ojek|grab|gojek|taxi|taksi|bensin|fuel|pertamina/i },
  { category: 'Utilities', regex: /pln|listrik|pdam|air|telkom|wifi|internet|pulsa/i },
  { category: 'Entertainment', regex: /bioskop|cinema|tiket|fun|game|nonton/i },
  { category: 'Shopping', regex: /baju|celana|shop|mall|store|tokopedia|shopee/i }
]

export const STATEMENT_MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'agu', 'aug', 'sep', 'okt', 'oct', 'nov', 'des', 'dec'
]

export const STATEMENT_STOP_KEYWORDS = [
  'saldo awal',
  'mutasi debit',
  'mutasi kredit',
  'saldo akhir'
]

export const STATEMENT_DATE_REGEX = /^\b(\d{1,2})[\s\-.\/]([a-zA-Z]{3,9}|\d{1,2})([\s\-.\/]\d{2,4})?\b/
export const STATEMENT_TIME_REGEX = /^\b\d{1,2}:\d{2}(:\d{2})?\b/
export const STATEMENT_REF_REGEX = /^[A-Za-z0-9]{8,20}$/

export const STATEMENT_MONTH_MAP: Record<string, string> = {
  'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'mei': '05', 'jun': '06',
  'jul': '07', 'agu': '08', 'sep': '09', 'okt': '10', 'nov': '11', 'des': '12',
  'januari': '01', 'februari': '02', 'maret': '03', 'april': '04', 'juni': '06',
  'juli': '07', 'agustus': '08', 'september': '09', 'oktober': '10', 'november': '11', 'desember': '12',
  'may': '05', 'aug': '08', 'oct': '10', 'dec': '12',
  'january': '01', 'february': '02', 'march': '03', 'june': '06', 'july': '07', 'august': '08', 'october': '10', 'december': '12'
}

export const STATEMENT_CATEGORY_PATTERNS = [
  { category: 'Salary', regex: /gaji|salary|gajian/i },
  { category: 'Food', regex: /makan|food|gofood|grabfood|kopi|coffee|resto/i },
  { category: 'Utilities', regex: /pln|listrik|pdam|telkom/i },
  { category: 'Transport', regex: /bensin|pertamina|gojek|grab|uber|transport/i },
  { category: 'Transfer', regex: /flip|transfer|trf/i }
]
