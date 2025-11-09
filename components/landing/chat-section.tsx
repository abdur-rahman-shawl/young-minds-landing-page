import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"
import Image from "next/image"
import { useState, useRef } from "react"

export function ChatSection() {
  return (
    <section className="py-12 px-4 sm:px-6">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-1/2">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center lg:text-left">Chat live now with tech eXpert.</h2>

          <Card className="p-6 w-full max-w-md mx-auto lg:mx-0">
            <div className="space-y-4">
              {/* Chat Messages */}
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                    <Image
                      src="/placeholder.svg?height=32&width=32"
                      alt="Expert"
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="bg-blue-500 text-white p-3 rounded-lg rounded-tl-none max-w-xs">
                    <p className="text-sm">Chat with experts</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                    <Image
                      src="/placeholder.svg?height=32&width=32"
                      alt="Expert"
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg rounded-tl-none max-w-xs">
                    <p className="text-sm text-gray-900 dark:text-white">
                      Hi Sajeed, I'm wondering if I possible to order custom...
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="bg-blue-500 text-white p-3 rounded-lg rounded-tr-none max-w-xs">
                    <p className="text-sm">Yes, You can order custom</p>
                  </div>
                </div>
              </div>

              {/* Chat Input */}
              <div className="flex gap-2">
                <Input placeholder="Type a message..." className="flex-1" />
                <Button size="icon" className="bg-blue-500 hover:bg-blue-600">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="w-full lg:w-1/2 flex justify-center">
          <div className="w-full max-w-xs sm:max-w-sm h-[260px] sm:h-[320px] rounded-full overflow-hidden">
            <Image
              src="/placeholder.svg?height=320&width=320"
              alt="Tech expert"
              width={320}
              height={320}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
