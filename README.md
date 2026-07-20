# FinTrack SaaS

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
<br />
<br />

[![version](https://img.shields.io/github/v/release/Andi-IM/fintrack-saas?label=version&color=blue)](https://github.com/Andi-IM/fintrack-saas/releases)
[![codecov](https://codecov.io/gh/Andi-IM/fintrack-saas/graph/badge.svg?token=KyUSihKYsJ)](https://codecov.io/gh/Andi-IM/fintrack-saas)
![Next.js](https://img.shields.io/badge/Next.js-16.2.9-black?logo=next.js)
![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase)

</div>
FinTrack SaaS is a comprehensive financial tracking application designed to help users manage their cash flow, parse bank statements, and digitize physical receipts. Built with a modern tech stack (Next.js, Supabase, and Tailwind CSS), it provides a seamless and responsive user experience for personal and business finance management.

## Features

- **Dashboard & Analytics**: Real-time overview of your financial health with interactive charts, calculating income and expenses across different time ranges (1M, 3M, 1Y, YTD).
- **Cash Flow Management**: Manually add, edit, or delete income and expense transactions.
- **Bank Statement Parsing**: Upload bank statements (e.g., Bank Jago, BNI) and automatically parse mutations into structured data for review and syncing with cash flow.
- **Receipt OCR & Parsing**: Upload images of physical receipts. The application uses Modal-hosted docTR OCR and LLM-based parsing (Groq/OpenAI compatible) to extract line items, merchant details, and total amounts.
- **Server-Side Architecture**: Built heavily around Next.js Server Components, Server Actions, and Supabase database optimization for lightning-fast data fetching, filtering, and pagination.
- **Secure Authentication**: Email and Password authentication using Supabase Auth, combined with robust Row Level Security (RLS) ensuring strict data privacy between users.

## Architecture

The platform follows a feature-based architecture pattern:
- **Frontend**: Next.js App Router, React Server Components, Nuqs (for URL state management), Recharts, and Tailwind CSS (shadcn/ui).
- **Backend & Database**: Supabase (PostgreSQL) with advanced Row Level Security, composite indexes, and database triggers.
- **Testing**: Highly rigorous testing standard (99%+ test coverage) using Vitest and React Testing Library, leveraging file-system mock repositories and Fake Database layers to ensure reliability.

## Getting Started

### Prerequisites

- Node.js (v18+)
- pnpm
- Supabase CLI
- A Supabase Project (or local instance)

### Installation

1. Clone the repository and install dependencies:
   ```bash
   pnpm install
   ```
2. Set up your environment variables by creating a `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   GROQ_API_KEY=your-groq-api-key
   ```
3. Start the development server:
   ```bash
   pnpm run dev
   ```
4. Access the application at `http://localhost:3000`.

## Documentation & Decisions

We maintain a strict record of architectural decisions using Architecture Decision Records (ADRs). You can explore the project's history, design choices, and technical evolution in the [docs/decisions](docs/decisions) directory.

For details on our testing strategies and code coverage metrics, refer to [docs/testing.md](docs/testing.md).

## License

All rights reserved.
