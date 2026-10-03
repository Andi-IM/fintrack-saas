# FinTrack MCP Server

Model Context Protocol (MCP) server yang memungkinkan LLM agents (Claude Desktop, Cursor IDE, Antigravity CLI, dan integrasi eksternal lainnya) untuk berinteraksi secara terstandarisasi dengan data FinTrack SaaS.

## Fitur & Tools yang Tersedia

1. **System & Diagnostic Tools**:
   - `check_connection`: Memeriksa status koneksi ke Supabase, memvalidasi role API key (`service_role` vs `anon`), menguji scope `FINTRACK_USER_ID`, latensi query database, ketersediaan RPC agregasi, dan akses storage bucket.

2. **Cash Flow Tools**:
   - `list_cash_flow`: Mengambil daftar cash flow dengan presisi waktu transaksi asli (`transaction_time`), `created_at`, pagination, rentang tanggal, filter kategori/metode bayar, dan pencarian deskripsi.
   - `create_cash_flow_entry`: Membuat catatan transaksi kas pemasukan atau pengeluaran baru dengan waktu transaksi presisi (`transaction_time`, opsional default `now()`) tanpa konversi ke tengah malam UTC (07:00 WIB).
   - `get_cash_flow_summary`: Menghitung total income, total expense, dan net balance dalam rentang tanggal tertentu langsung via PostgreSQL RPC tanpa terpotong batas 1.000 baris (dengan fallback paginasi penuh).

3. **Bank Statement Tools**:
   - `list_bank_statements`: Melihat daftar rekening koran/mutasi bank yang sudah diunggah.
   - `get_statement_mutations`: Mengambil item mutasi transaksi (CR/DB) dari statement tertentu.
   - `create_bank_statement`: Mengimpor rekening koran beserta mutasi transaksinya secara transaksional dari integrasi eksternal (Hermes agent, CLI) tanpa antarmuka frontend, mendukung upload dokumen PDF (Base64 atau path file), dan otomatis tersinkronisasi ke `cash_flow`.
   - `create_bank_statement_item`: Menambahkan baris mutasi baru ke rekening koran yang sudah ada beserta sinkronisasi otomatis ke `cash_flow`.
   - `get_statement_file_url`: Menghasilkan signed URL sementara (1 jam) untuk melihat/mengunduh dokumen rekening koran dari Supabase Storage.

4. **Receipts & Image Tools**:
   - `list_receipts`: Menampilkan daftar riwayat struk belanja / penerimaan.
   - `get_receipt_details`: Mengambil informasi struk lengkap beserta rincian item barang belanja (`receipts_items`).
   - `create_receipt`: Mencatat struk/slip gaji baru lengkap dengan bukti gambar (upload file lokal atau Base64 ke Supabase Storage) dan otomatis sinkronisasi ke tabel `cash_flow`.
   - `get_receipt_image_url`: Menghasilkan signed URL sementara (1 jam) untuk melihat/mengunduh gambar struk dari Supabase Storage.

5. **Analytics Tools**:
   - `get_financial_analytics`: Analitik perbandingan pemasukan vs pengeluaran sesuai filter dashboard (`TODAY`, `MTD`, `YTD`, `1W`, `1M`, `3M`, `1Y`, `ALL`) via RPC dan paginasi penuh tanpa terpotong limit 1.000 baris.

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

### 4. Hermes Agent CLI (Podman / Stdio)
Contoh pemanggilan tool via Hermes Agent CLI:
```bash
hermes mcp call fintrack create_bank_statement '{
  "bank_name": "BNI",
  "statement_period": "2026-07-01",
  "opening_balance": 34095,
  "closing_balance": 19025,
  "total_items": 2,
  "items": [
    {
      "date": "2026-07-13T16:06:42+00:00",
      "description": "QRIS PT MITRACOMM",
      "amount": 10070,
      "type": "expense",
      "category": "Transfer",
      "balance": 24025
    },
    {
      "date": "2026-07-31T16:59:59+00:00",
      "description": "Biaya Admin",
      "amount": 5000,
      "type": "expense",
      "category": "Admin Fee",
      "balance": 19025
    }
  ]
}'
```

---

## Deploy ke VPS dengan SSH Key

Tersedia skrip otomatis untuk deploy container MCP Server ke VPS Linux menggunakan autentikasi SSH key:

### 1. Konfigurasi Kredensial VPS
Salin template konfigurasi:
```bash
cp scripts/deploy-vps.env.example .env.deploy
```
Edit `.env.deploy`:
```env
VPS_HOST="ip.atau.domain.vps"
VPS_USER="root"
VPS_PORT="22"
SSH_KEY_PATH="~/.ssh/id_ed25519"
REMOTE_APP_DIR="/opt/fintrack-mcp"
LOCAL_ENV_FILE="./mcp-server/.env.local"
```

### 2. Jalankan Deploy
- **Linux / macOS / WSL / Git Bash**:
  ```bash
  chmod +x ./scripts/deploy-vps.sh
  ./scripts/deploy-vps.sh
  ```
- **Windows (PowerShell)**:
  ```powershell
  .\scripts\deploy-vps.ps1
  ```

Skrip ini akan otomatis:
1. Menguji koneksi SSH dengan SSH private key Anda.
2. Mentransfer `docker-compose.vps.yml` dan file environment (`.env`) ke remote VPS.
3. Menjalankan `docker compose pull` dan `docker compose up -d`.
4. Memvalidasi status kontainer yang berjalan.

