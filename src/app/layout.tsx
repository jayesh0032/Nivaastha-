import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { SupabaseProvider } from '@/components/supabase-provider';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Nivaastha',
  description: 'Find your next rental or dream property with ease.',
  openGraph: {
    title: 'Nivaastha',
    description: 'Find your next rental or dream property with ease.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey =
    process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <SupabaseProvider supabaseUrl={supabaseUrl} supabaseAnonKey={supabaseAnonKey}>
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8">{children}</main>
            <Footer />
          </div>
          <Toaster />
        </SupabaseProvider>
      </body>
    </html>
  );
}
