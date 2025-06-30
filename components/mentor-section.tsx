"use client"

import { Input } from "@/components/ui/input"
import { ChevronDown } from "lucide-react"
import Image from "next/image"

const mentors = [
  {
    name: "Mark Zuckerberg",
    title: "Meta",
    image: "/placeholder.svg?height=150&width=150",
  },
  {
    name: "Bill Gates",
    title: "Microsoft",
    image: "/placeholder.svg?height=150&width=150",
  },
  {
    name: "Jeff Bezos",
    title: "Amazon",
    image: "/placeholder.svg?height=150&width=150",
  },
  {
    name: "Elon Musk",
    title: "Tesla, SpaceX",
    image: "/placeholder.svg?height=150&width=150",
  },
]

export function MentorSection() {
  return (
    <section className="py-16">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-0">Mentor Search</h2>
        <div className="relative">
          <Input
            placeholder="Search mentors..."
            className="w-72 border-2 border-red-400 focus-visible:ring-red-400 pr-10"
          />
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-400" />
        </div>
      </div>

      <p className="text-gray-600 dark:text-gray-300 mb-10">
        Search human intelligence by Name, Profession or Experience
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {mentors.map((mentor, index) => (
          <div key={index} className="text-center">
            <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden shadow-lg">
              <Image
                src={mentor.image || "/placeholder.svg"}
                alt={mentor.name}
                width={128}
                height={128}
                className="w-full h-full object-cover"
              />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{mentor.name}</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">{mentor.title}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
