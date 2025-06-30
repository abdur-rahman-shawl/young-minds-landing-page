"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import Image from "next/image"

export function HeroSection() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [inputValue, setInputValue] = useState("")

  const handleInputFocus = () => {
    setIsExpanded(true)
  }

  const handleInputBlur = () => {
    if (!inputValue.trim()) {
      setIsExpanded(false)
    }
  }

  const handleSubmit = () => {
    if (inputValue.trim()) {
      console.log("Starting conversation:", inputValue)
      // Handle conversation start logic here
    }
  }

  return (
    <section className="relative px-4 sm:px-8 lg:px-16 py-12 lg:py-20">
      {/* Background Shape */}
      <div className="absolute top-0 left-0 right-0 bottom-0 bg-gray-50 dark:bg-gray-700/20 rounded-br-[160px] -z-10"></div>

      {/* Decorative Dots */}
      <div className="absolute top-16 left-4 w-12 h-24 opacity-30 -z-5">
        <div className="w-full h-full bg-gradient-to-b from-gray-400 to-transparent bg-[radial-gradient(circle,_#d1d5db_1.5px,_transparent_1.5px)] bg-[length:18px_18px]"></div>
      </div>

      <div className="relative flex flex-col lg:flex-row items-center">
        <div className="lg:w-3/5 mb-8 lg:mb-0">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
            What's on your mind?
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8 text-lg">
            Our human intelligence will connect with your mind & download your thoughts
          </p>

          <div
            className={`bg-gray-100 dark:bg-gray-700 rounded-xl p-3 shadow-lg max-w-2xl transition-all duration-300 ease-in-out ${
              isExpanded ? "pb-6" : ""
            }`}
          >
            <div className="px-3 py-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start a conversation
              </label>

              {!isExpanded ? (
                <div
                  onClick={handleInputFocus}
                  className="cursor-text p-3 bg-transparent text-gray-500 dark:text-gray-400 border-0 rounded-md min-h-[48px] flex items-center"
                >
                  what college i would opt for Hotel Management in Australia?
                </div>
              ) : (
                <div className="space-y-4">
                  <Textarea
                    placeholder="what college i would opt for Hotel Management in Australia?"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    className="border-0 bg-white dark:bg-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-purple-500 min-h-[120px] resize-none"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsExpanded(false)
                        setInputValue("")
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-8"
                      disabled={!inputValue.trim()}
                    >
                      Let's begin
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:w-2/5 flex justify-center lg:justify-end">
          <div className="relative w-80 h-80 lg:w-96 lg:h-96">
            <Image
              src="/placeholder.svg?height=400&width=400"
              alt="Person working on a laptop"
              fill
              className="object-cover rounded-t-full"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
