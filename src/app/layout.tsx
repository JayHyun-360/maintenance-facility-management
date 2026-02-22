import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Maintenance Facility Management',
  description: 'System Reset Complete',
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
