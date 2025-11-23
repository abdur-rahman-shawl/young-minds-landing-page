import { Button } from "@/components/ui/button"
import { Play } from "lucide-react"
import Image from "next/image"

export function VideoCallSection() {
  return (
    <section className="py-12 px-4 sm:px-6">
      <div className="flex flex-col lg:flex-row items-center gap-8 text-center lg:text-left">
        <div className="w-full lg:w-1/2">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 text-center lg:text-left">
            Let's get on a <span className="text-blue-600">video call</span>
            <br />
            with your mentor...
          </h2>

          <div className="relative flex justify-center lg:justify-start">
            <div className="w-full max-w-xs sm:max-w-sm h-[260px] sm:h-[320px] rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
              <Image
                src="/placeholder.svg?height=320&width=320"
                alt="Video call preview"
                width={320}
                height={320}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Mentor Profile Overlay */}
            <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg">
              <div className="w-12 h-12 rounded-full overflow-hidden">
                <Image
                  src="/placeholder.svg?height=48&width=48"
                  alt="Mentor"
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Play Button */}
            <Button
              size="lg"
              className="absolute bottom-4 left-4 bg-green-500 hover:bg-green-600 rounded-full w-16 h-16 p-0"
            >
              <Play className="w-6 h-6 text-white" />
            </Button>
          </div>
        </div>

        <div className="w-full lg:w-1/2">
          <p className="text-gray-600 dark:text-gray-300 mb-6 text-center lg:text-left">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et
            dolore magna aliqua.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full overflow-hidden">
                <Image
                  src="/placeholder.svg?height=48&width=48"
                  alt="Counselor"
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Counselor</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">Study Abroad</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
