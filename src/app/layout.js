import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import Chatbot from '@/components/Chatbot'
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
      <body className="min-h-full flex">
        <ThemeProvider>
          <Sidebar />
          {/* Added pt-16 for mobile top bar clearance; resets to md:pt-0 on desktop */}
          <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden pt-16 md:pt-0">
            {children}
          </main>
          <Chatbot />
        </ThemeProvider>
      </body>
    </html>
  )
}