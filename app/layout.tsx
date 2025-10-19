import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "@livekit/components-styles" // Import LiveKit's default styles FIRST
import "./globals.css" // Our custom overrides load AFTER (higher priority)
import { ThemeProvider } from "next-themes"
import { AuthProvider } from "@/contexts/auth-context"
import { ErrorBoundary } from "@/components/common/error-boundary"
import { QueryProvider } from "@/providers/query-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SharingMinds",
  description: "A personalized mentor and mentee connect platform.",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ErrorBoundary>
          <QueryProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
              <AuthProvider>
                {children}
              </AuthProvider>
            </ThemeProvider>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
