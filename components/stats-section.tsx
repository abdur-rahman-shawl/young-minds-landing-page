import Image from "next/image"

const stats = [
  {
    number: "10000+",
    label: "professionals",
    image: "/placeholder.svg?height=200&width=175",
  },
  {
    number: "1053+",
    label: "eXperts & Mentors",
    image: "/placeholder.svg?height=200&width=175",
  },
  {
    number: "2500+",
    label: "Success stories",
    image: "/placeholder.svg?height=200&width=175",
  },
]

export function StatsSection() {
  return (
    <section className="py-16">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
        {stats.map((stat, index) => (
          <div key={index} className="flex flex-col items-center">
            <div className="w-44 h-48 rounded-b-full overflow-hidden mb-4 shadow-lg">
              <Image
                src={stat.image || "/placeholder.svg"}
                alt={stat.label}
                width={175}
                height={200}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-xl font-semibold text-gray-900 dark:text-white mb-1">{stat.number}</p>
            <p className="text-gray-600 dark:text-gray-300 capitalize">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
