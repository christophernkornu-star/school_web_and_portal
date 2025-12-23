import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import InactivityHandler from '@/components/InactivityHandler'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'

const inter = Inter({ subsets: ['latin'] })

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
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <InactivityHandler />
        <PWAInstallPrompt />
        {children}
      </body>
    </html>
  )
}
