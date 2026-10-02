# FinTrack MCP Server

Model Context Protocol (MCP) server yang memungkinkan LLM agents (Claude Desktop, Cursor IDE, Antigravity CLI, dan integrasi eksternal lainnya) untuk berinteraksi secara terstandarisasi dengan data FinTrack SaaS.

## Fitur & Tools yang Tersedia

1. **Cash Flow Tools**:
   - `list_cash_flow`: Mengambil daftar cash flow dengan pagination, rentang tanggal, filter kategori/metode bayar, dan pencarian deskripsi.
   - `create_cash_flow_entry`: Membuat catatan transaksi kas pemasukan atau pengeluaran baru.
   - `get_cash_flow_summary`: Menghitung total income, total expense, dan net balance dalam rentang tanggal tertentu.

2. **Bank Statement Tools**:
   - `list_bank_statements`: Melihat daftar rekening koran/mutasi bank yang sudah diunggah.
   - `get_statement_mutations`: Mengambil item mutasi transaksi (CR/DB) dari statement tertentu.

3. **Receipts & OCR Tools**:
   - `list_receipts`: Menampilkan daftar riwayat struk belanja.
   - `get_receipt_details`: Mengambil informasi struk lengkap beserta rincian item barang belanja (`receipts_items`).

4. **Analytics Tools**:
   - `get_financial_analytics`: Analitik perbandingan pemasukan vs pengeluaran sesuai filter dashboard (`TODAY`, `MTD`, `YTD`, `1W`, `1M`, `3M`, `1Y`, `ALL`).

---

## Konfigurasi Kredensial

Salin `.env.example` ke `.env` di dalam direktori `mcp-server/`:

```bash
cp .env.example .env
```

Isi variabel lingkungan:
```env
SUPABASE_URL=https://your-project.supabase.co

# Opsi 1: Service Role (untuk server-to-server / service eksternal terpercaya)
SUPABASE_SERVICE_ROLE_KEY=eyJh...
FINTRACK_USER_ID=00000000-0000-0000-0000-000000000000

# Opsi 2: Menggunakan Anon Key & User Token (Mematuhi RLS)
# SUPABASE_ANON_KEY=eyJh...
# SUPABASE_ACCESS_TOKEN=eyJh...
```

---

## Cara Menjalankan

### Build TypeScript
```bash
pnpm run build
```

### Jalankan Server
```bash
pnpm start
# atau development mode:
pnpm run dev
```

---

## Menjalankan via Docker / Container

### 1. Build & Run Lokal dengan Docker
```bash
# Build image lokal
docker build -t fintrack-mcp-server ./mcp-server

# Jalankan via stdio
docker run -i --rm \
  -e SUPABASE_URL="https://your-project.supabase.co" \
  -e SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" \
  -e FINTRACK_USER_ID="your-user-uuid" \
  fintrack-mcp-server
```

### 2. Menggunakan Image dari GitHub Container Registry (GHCR)
Setelah workflow GitHub Actions `.github/workflows/mcp-docker.yml` dijalankan, image container otomatis dipublikasikan ke GitHub Packages:
```bash
docker pull ghcr.io/<github-username>/fintrack-saas-mcp:latest
```

---

## Integrasi dengan Client Eksternal

### 1. Claude Desktop / Cursor / Antigravity via Docker (Zero Dependency)
Anda dapat menjalankan container langsung dari client tanpa perlu Node.js di komputer host:

```json
{
  "mcpServers": {
    "fintrack": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e", "SUPABASE_URL=https://your-project.supabase.co",
        "-e", "SUPABASE_SERVICE_ROLE_KEY=your-service-role-key",
        "-e", "FINTRACK_USER_ID=your-user-uuid",
        "ghcr.io/<github-username>/fintrack-saas-mcp:latest"
      ]
    }
  }
}
```

### 2. Claude Desktop (Local Node.js)
Tambahkan ke konfigurasi `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "fintrack": {
      "command": "node",
      "args": ["D:/01_Projects/fintrack-saas/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key",
        "FINTRACK_USER_ID": "your-user-uuid"
      }
    }
  }
}
```

### 3. Cursor IDE (Local Node.js)
Pada Cursor settings (`Cursor Settings -> Features -> MCP`):
- **Name**: `fintrack`
- **Type**: `command`
- **Command**: `node D:/01_Projects/fintrack-saas/mcp-server/dist/index.js`
- Masukkan env variables yang sesuai di file `.env` direktori `mcp-server/`.

