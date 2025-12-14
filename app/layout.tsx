import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Biriwa Methodist 'C' Basic School - School Management System",
  description: 'Comprehensive School Management System for Biriwa Methodist C Basic School in Ghana',
  keywords: 'Biriwa Methodist, Ghana School, School Management System, Student Portal, Teacher Portal',
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
