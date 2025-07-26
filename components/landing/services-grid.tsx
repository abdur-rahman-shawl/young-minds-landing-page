import { Card } from "@/components/ui/card"
import { ArrowRight } from "lucide-react"

const services = [
  {
    id: "01",
    title: "Online Shop",
    subtitle: "3 Case Studies",
    color: "bg-blue-50 dark:bg-blue-900/20",
  },
  {
    id: "02",
    title: "Portfolio Website",
    subtitle: "5 Case Studies",
    color: "bg-green-50 dark:bg-green-900/20",
  },
  {
    id: "03",
    title: "Company Profile",
    subtitle: "4 Case Studies",
    color: "bg-purple-50 dark:bg-purple-900/20",
  },
  {
    id: "04",
    title: "Online Learning",
    subtitle: "6 Case Studies",
    color: "bg-orange-50 dark:bg-orange-900/20",
  },
  {
    id: "02",
    title: "News Portal",
    subtitle: "3 Case Studies",
    color: "bg-pink-50 dark:bg-pink-900/20",
  },
]

export function ServicesGrid() {
  return (
    <section className="py-20">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
        {services.map((service, index) => (
          <Card key={index} className={`p-8 hover:shadow-lg transition-shadow cursor-pointer ${service.color}`}>
            <div className="flex items-start justify-between mb-6">
              <span className="text-3xl font-bold text-gray-400">{service.id}</span>
              <ArrowRight className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </div>
            <h3 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mb-3">{service.title}</h3>
            <p className="text-gray-600 dark:text-gray-300">{service.subtitle}</p>
          </Card>
        ))}
      </div>
    </section>
  )
}
