import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import Chatbot from '@/components/Chatbot'
import AuthGuard from '@/components/AuthGuard'
import { ThemeProvider } from '@/lib/ThemeContext'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata = {
  title: 'Momentia',
  description: 'AI-powered study planning',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50 dark:bg-gray-950">
        <ThemeProvider>
          <Sidebar />
          {/* Main stretches full width with theme background and header offset */}
          <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden pt-14 bg-gray-50 dark:bg-gray-950">
            {/* Centered container with fixed max-width and edge padding */}
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col">
              <AuthGuard>
                {children}
              </AuthGuard>
            </div>
          </main>
          <Chatbot />
        </ThemeProvider>
      </body>
    </html>
  )
}