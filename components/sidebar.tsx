import Image from "next/image"

export function Sidebar() {
  return (
    <aside className="p-6 lg:p-8 space-y-8">
      <div className="bg-gray-100 dark:bg-gray-700 p-6 rounded-2xl shadow-sm">
        <h3 className="text-xl font-medium text-gray-900 dark:text-white">
          <span className="text-purple-600 dark:text-purple-400 block">Community</span>
          Connect
        </h3>
        <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">a forum for networking</p>
      </div>

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
          <div className="w-56 h-64 rounded-b-full overflow-hidden shadow-lg">
            <Image
              src="/placeholder.svg?height=250&width=220"
              alt="Study abroad counseling"
              width={220}
              height={250}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div>
          <h4 className="text-lg text-gray-900 dark:text-white mb-2">
            Start up <span className="font-bold">Eco-System</span>
          </h4>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
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
