import type {Metadata} from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});
const poppins = Poppins({ weight: ['400', '500', '600', '700'], subsets: ['latin'], variable: '--font-poppins' });

export const metadata: Metadata = {
  title: 'FinTrack SaaS',
  description: 'Finance Tracker',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={cn(poppins.variable, "font-sans", inter.variable)}>
      <body className="font-sans antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
