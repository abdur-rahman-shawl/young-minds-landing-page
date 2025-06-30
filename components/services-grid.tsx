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
    <section className="py-16">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service, index) => (
          <Card key={index} className={`p-6 hover:shadow-lg transition-shadow cursor-pointer ${service.color}`}>
            <div className="flex items-start justify-between mb-4">
              <span className="text-2xl font-bold text-gray-400">{service.id}</span>
              <ArrowRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{service.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">{service.subtitle}</p>
          </Card>
        ))}
      </div>
    </section>
  )
}
