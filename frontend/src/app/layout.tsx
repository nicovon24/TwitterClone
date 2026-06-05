import type { Metadata } from 'next'
import './globals.css'
import AppShell from '@/components/AppShell'
import ThemeProvider from '@/components/ThemeProvider'

export const metadata: Metadata = {
  title: 'ClonTwitter',
  description: 'Un clon de Twitter hecho con Next.js y Express',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="bg-white text-x-black dark:bg-black dark:text-[#e7e9ea]">
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  )
}
