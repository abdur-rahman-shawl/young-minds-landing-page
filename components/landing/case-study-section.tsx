import { Button } from "@/components/ui/button"
import { Play } from "lucide-react"
import Image from "next/image"

const caseStudies = [
  { id: 1, image: "/placeholder.svg?height=80&width=80", title: "AI Innovation" },
  { id: 2, image: "/placeholder.svg?height=80&width=80", title: "Tech Startup" },
  { id: 3, image: "/placeholder.svg?height=80&width=80", title: "Digital Transform" },
]

export function CaseStudySection() {
  return (
    <section className="py-16 px-4 sm:px-6">
      <div className="flex flex-col lg:flex-row items-center gap-12 text-center lg:text-left">
        <div className="w-full lg:w-1/2">
          <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
            {caseStudies.map((study, index) => (
              <div key={study.id} className="flex items-center">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full overflow-hidden shadow-lg">
                    <Image
                      src={study.image || "/placeholder.svg"}
                      alt={study.title}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Button
                    size="sm"
                    className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0 bg-white text-gray-900 hover:bg-gray-100"
                  >
                    <Play className="w-3 h-3" />
                  </Button>
                </div>
                {index < caseStudies.length - 1 && <div className="w-8 h-0.5 bg-gray-300 dark:bg-gray-600 mx-2"></div>}
              </div>
            ))}
          </div>
        </div>

        <div className="w-full lg:w-1/2">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 text-center lg:text-left">
            Browse our
            <br />
            Case Study
          </h2>
        </div>
      </div>
    </section>
  )
}
