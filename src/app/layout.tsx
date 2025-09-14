import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Navigation from '@/components/Navigation'
import { DataProvider } from '@/contexts/DataContext'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LevelUp Management Training',
  description: 'Management training platform admin panel',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning={true}>
        <DataProvider>
          <Navigation />
          <main className="min-h-screen" style={{backgroundColor: 'var(--bg-primary)'}}>
            {children}
          </main>
        </DataProvider>
      </body>
    </html>
  )
}