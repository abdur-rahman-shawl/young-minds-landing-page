import Image from "next/image"

const stats = [
  {
    number: "10000+",
    label: "professionals",
    image: "https://img.freepik.com/free-photo/close-up-confident-corporate-woman-professional-entrepreneur-smiling-cross-arms-chest-smiling-enthusiastic-standing-white-background_1258-85600.jpg",
  },
  {
    number: "1053+",
    label: "eXperts & Mentors",
    image: "https://img.freepik.com/premium-photo/black-man-portrait-headset-office-call-center-contact-us-customer-service-with-sales-agent-happy-microphone-workplace-communication-lead-generation-technical-support_590464-476940.jpg",
  },
  {
    number: "2500+",
    label: "Success stories",
    image: "https://media.istockphoto.com/id/2042526830/photo/successful-businesswoman-using-laptop-working-in-office-business-technology-corporate-concept.jpg?s=170667a&w=0&k=20&c=jY1UqV0LY_6WO2dUefgek0CaE7l1QEOeGlMtPPb5O5o=",
  },
]

export function StatsSection() {
  return (
    <section className="py-20">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16 text-center">
        {stats.map((stat, index) => (
          <div key={index} className="flex flex-col items-center">
            <div className="w-48 lg:w-52 h-52 lg:h-56 rounded-b-full overflow-hidden mb-6 shadow-lg">
              <Image
                src={stat.image || "/placeholder.svg"}
                alt={stat.label}
                width={200}
                height={220}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-2xl lg:text-3xl font-semibold text-gray-900 dark:text-white mb-2">{stat.number}</p>
            <p className="text-gray-600 dark:text-gray-300 text-lg capitalize">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
