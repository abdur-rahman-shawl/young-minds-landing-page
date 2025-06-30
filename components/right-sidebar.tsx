import { Card } from "@/components/ui/card"
import Image from "next/image"

export function RightSidebar() {
  return (
    <aside className="p-4 space-y-6 h-screen overflow-y-auto">
      <Card className="p-6 bg-gray-100 dark:bg-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          <span className="text-purple-600 dark:text-purple-400 block">Community</span>
          Connect
        </h3>
        <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">a forum for networking</p>
      </Card>

      <div className="space-y-6">
        <div>
          <h4 className="text-lg text-gray-900 dark:text-white mb-2">
            Counseling
            <br />
            <span className="font-bold">Study Abroad?</span>
          </h4>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
            Get complete support system from application to admission into 250+ university in Europe & Asia
          </p>
          <div className="w-full h-48 rounded-b-full overflow-hidden shadow-lg">
            <Image
              src="/placeholder.svg?height=200&width=200"
              alt="Study abroad counseling"
              width={200}
              height={200}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div>
          <h4 className="text-lg text-gray-900 dark:text-white mb-2">
            Start up <span className="font-bold">Eco-System</span>
          </h4>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
            a cohort startup guide and mentors. Collab with the experts we have already achieved.
          </p>
        </div>

        <div>
          <h4 className="text-lg text-gray-900 dark:text-white mb-2">
            Working Professionals
            <br />
            <span className="font-bold">looking for mentorship?</span>
          </h4>
          <p className="text-gray-600 dark:text-gray-300 text-sm">Get a guide for lifetime.</p>
        </div>
      </div>
    </aside>
  )
}
