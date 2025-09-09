"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/providers/theme-toggle"

interface AuthHeaderProps {
  showHelpLink?: boolean
}

export default function AuthHeader({ showHelpLink = true }: AuthHeaderProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'

  return (
    <header className="w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="text-base font-bold cursor-pointer hover:text-blue-600 transition-colors"
            aria-label="Go to Home"
          >
            Sharing<span className="text-blue-600">Minds</span>
          </button>
          <Button variant="ghost" size="sm" onClick={() => router.push('/')}>Back to Home</Button>
        </div>
        <div className="flex items-center gap-3">
          {showHelpLink && (
            <button
              onClick={() => router.push('/#faq')}
              className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Help
            </button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

