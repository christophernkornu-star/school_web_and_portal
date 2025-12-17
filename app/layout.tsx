import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: "Biriwa Methodist 'C' Basic School - School Management System",
  description: 'Comprehensive School Management System for Biriwa Methodist C Basic School in Ghana',
  keywords: 'Biriwa Methodist, Ghana School, School Management System, Student Portal, Teacher Portal',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  themeColor: '#006837', // Ghana Green
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
