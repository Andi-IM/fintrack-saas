import type {Metadata} from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import { cn } from "@/lib/utils";
import { QueryProvider } from '@/components/providers/QueryProvider';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { SpeedInsights } from '@vercel/speed-insights/next';

const inter = Inter({subsets:['latin'],variable:'--font-sans'});
const poppins = Poppins({ weight: ['400', '500', '600', '700'], subsets: ['latin'], variable: '--font-poppins' });

export const metadata: Metadata = {
  title: 'FinTrack SaaS',
  description: 'Finance Tracker',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={cn(poppins.variable, "font-sans", inter.variable)} suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <NuqsAdapter>
          <QueryProvider>{children}</QueryProvider>
        </NuqsAdapter>
        <SpeedInsights />
      </body>
    </html>
  );
}
