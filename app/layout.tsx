import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter, Poppins } from 'next/font/google'
import InactivityHandler from '@/components/InactivityHandler'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'
import ThemeInitializer from '@/components/ThemeInitializer'
import { ScrollRestorationProvider } from '@/components/ScrollRestorationProvider'
import { Toaster } from 'react-hot-toast'
import { CommandPalette } from '@/components/CommandPalette'
import ServiceWorkerDevFix from '@/components/ServiceWorkerDevFix'

const inter = Inter({ subsets: ['latin'] })
const poppins = Poppins({ 
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  subsets: ['latin'],
  variable: '--font-poppins',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#003B5C',
}

export const metadata: Metadata = {
  title: "Biriwa Methodist 'C' Basic School - School Management System",
  description: 'Comprehensive School Management System for Biriwa Methodist C Basic School in Ghana',
  keywords: 'Biriwa Methodist, Ghana School, School Management System, Student Portal, Teacher Portal',
  manifest: '/manifest.json',
  icons: {
    icon: '/school-icon.svg',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${poppins.variable} min-h-screen bg-gray-50 dark:bg-gray-900`}>
        <ScrollRestorationProvider>
          <ThemeInitializer />
          <ServiceWorkerDevFix />
          <PWAInstallPrompt />
          <InactivityHandler />
          <CommandPalette />
          <Toaster position="top-right" />
          {children}
        </ScrollRestorationProvider>
      </body>
    </html>
  )
}
