import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

const expertCategories = [
  {
    title: "Study Abroad",
    experts: [{ name: "Dr. Rajesh Kumar", image: "/placeholder.svg?height=120&width=120" }],
  },
  {
    title: "Tech Support",
    experts: [{ name: "Amit Sharma", image: "/placeholder.svg?height=120&width=120" }],
  },
  {
    title: "Start-up Funding",
    experts: [{ name: "Priya Patel", image: "/placeholder.svg?height=120&width=120" }],
  },
  {
    title: "Up Skill",
    experts: [{ name: "Neha Singh", image: "/placeholder.svg?height=120&width=120" }],
  },
]

export function CollabExpertsSection() {
  return (
    <section className="py-16">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Collab eXperts</h2>
        <p className="text-xl text-gray-600 dark:text-gray-300">Our Top Mentors for you</p>
      </div>

      <div className="flex items-center justify-between mb-8">
        <Button variant="outline" size="icon">
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="flex gap-6 overflow-x-auto">
          {expertCategories.map((category, index) => (
            <div key={index} className="text-center min-w-[200px]">
              <Badge variant="outline" className="mb-4 px-4 py-2">
                {category.title}
              </Badge>
              <div className="w-32 h-40 mx-auto rounded-t-full overflow-hidden shadow-lg">
                <Image
                  src={category.experts[0].image || "/placeholder.svg"}
                  alt={category.experts[0].name}
                  width={128}
                  height={160}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="mt-3 font-medium text-gray-900 dark:text-white">{category.experts[0].name}</p>
            </div>
          ))}
        </div>

        <Button variant="outline" size="icon">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <p className="text-center text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore
        magna aliqua.
      </p>
    </section>
  )
}
