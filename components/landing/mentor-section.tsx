"use client"

import { Input } from "@/components/ui/input"
import { ChevronDown } from "lucide-react"
import Image from "next/image"

const mentors = [
  {
    name: "Mark Zuckerberg",
    title: "Meta",
    image: "https://cdn.britannica.com/99/236599-050-1199AD2C/Mark-Zuckerberg-2019.jpg",
  },
  {
    name: "Bill Gates",
    title: "Microsoft",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQAZVtiDW6ZhvvWgq5SYoD8X2c2LtS5nycvLA&s",
  },
  {
    name: "Jeff Bezos",
    title: "Amazon",
    image: "https://hips.hearstapps.com/hmg-prod/images/jeff-bezos-attends-the-lord-of-the-rings-the-rings-of-power-news-photo-1684851576.jpg?crop=1.00xw:0.862xh;0,0.0207xh&resize=1200:*",
  },
  {
    name: "Elon Musk",
    title: "Tesla, SpaceX",
    image: "https://upload.wikimedia.org/wikipedia/commons/f/f4/USAFA_Hosts_Elon_Musk_%28Image_1_of_17%29_%28cropped%29.jpg",
  },
]

export function MentorSection() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:py-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 w-full">
        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-0">Mentor Search</h2>
        <div className="relative w-full sm:w-auto">
          <Input
            placeholder="Search mentors..."
            className="w-full sm:w-80 lg:w-96 border-2 border-red-400 focus-visible:ring-red-400 pr-10 h-12"
          />
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-red-400" />
        </div>
      </div>

      <p className="text-gray-600 dark:text-gray-300 mb-8 text-base sm:text-lg text-center sm:text-left">
        Search human intelligence by Name, Profession or Experience
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
        {mentors.map((mentor, index) => (
          <div key={index} className="text-center">
            <div className="w-36 h-36 lg:w-40 lg:h-40 mx-auto mb-6 rounded-full overflow-hidden shadow-lg">
              <Image
                src={mentor.image || "/placeholder.svg"}
                alt={mentor.name}
                width={160}
                height={160}
                className="w-full h-full object-cover"
              />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-lg">{mentor.name}</h3>
            <p className="text-gray-600 dark:text-gray-300">{mentor.title}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
