"use client"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { useRouter } from "next/navigation"

interface HeaderProps {
  isLoggedIn: boolean
  setIsLoggedIn: (value: boolean) => void
}

export function Header({ isLoggedIn, setIsLoggedIn }: HeaderProps) {
  const router = useRouter()

  const handleAuthClick = () => {
    if (isLoggedIn) {
      localStorage.removeItem("isLoggedIn")
      localStorage.removeItem("userEmail")
      setIsLoggedIn(false)
    } else {
      router.push("/auth")
    }
  }

  return (
    <header className="h-24 w-full flex items-center justify-between px-6 sm:px-8 lg:px-12 xl:px-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center space-x-8">
        <div className="text-xl lg:text-2xl font-bold cursor-pointer" onClick={() => router.push("/")}>
          Young<span className="text-blue-500">Minds</span>
        </div>
        <nav className="hidden md:flex space-x-8">
          <a
            href="#"
            className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            How it works
          </a>
          <a
            href="#"
            className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Library
          </a>
          <a
            href="#"
            className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Pricing
          </a>
        </nav>
      </div>
      <div className="flex items-center space-x-4">
        <ThemeToggle />
        {!isLoggedIn ? (
          <>
            <Button variant="ghost" className="hidden sm:inline-flex h-10 px-6" onClick={handleAuthClick}>
              Sign Up
            </Button>
            <Button
              className="bg-amber-100 text-gray-900 hover:bg-amber-200 dark:bg-amber-200 dark:text-gray-900 dark:hover:bg-amber-300 h-10 px-6"
              onClick={handleAuthClick}
            >
              Login
            </Button>
          </>
        ) : (
          <Button variant="outline" className="h-10 px-6" onClick={handleAuthClick}>
            Logout
          </Button>
        )}
      </div>
    </header>
  )
}
