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
  // Default to dark ("lights out"); the inline script honors a saved preference
  // before first paint to avoid a flash of the wrong theme.
  const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})()`

  return (
    <html lang="es" className="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  )
}
