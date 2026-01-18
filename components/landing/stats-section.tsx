"use client"

import { useEffect, useRef, useState } from "react"
import { Users, UserCheck, Award, Globe } from "lucide-react"

const stats = [
  {
    number: 10000,
    suffix: "+",
    label: "Professionals",
    description: "Trust our platform",
    icon: Users,
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    number: 1000,
    suffix: "+",
    label: "Expert Mentors",
    description: "Verified and active",
    icon: UserCheck,
    gradient: "from-purple-500 to-pink-500",
  },
  {
    number: 95,
    suffix: "%",
    label: "Success Rate",
    description: "Career advancement",
    icon: Award,
    gradient: "from-amber-500 to-orange-500",
  },
  {
    number: 50,
    suffix: "+",
    label: "Countries",
    description: "Global community",
    icon: Globe,
    gradient: "from-emerald-500 to-teal-500",
  },
]

function AnimatedNumber({ value, suffix }: { value: number; suffix: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const [hasAnimated, setHasAnimated] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true)
          let start = 0
          const end = value
          const duration = 2000
          const startTime = performance.now()

          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime
            const progress = Math.min(elapsed / duration, 1)

            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4)
            const current = Math.floor(easeOutQuart * end)

            setCount(current)

            if (progress < 1) {
              requestAnimationFrame(animate)
            }
          }

          requestAnimationFrame(animate)
        }
      },
      { threshold: 0.5 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [value, hasAnimated])

  return (
    <div ref={ref} className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tabular-nums">
      {count.toLocaleString()}{suffix}
    </div>
  )
}

export function StatsSection() {
  return (
    <section className="relative py-20 lg:py-28 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 to-slate-900" />

      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Trusted by Thousands
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Join our growing community of professionals achieving their career goals
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div
                key={index}
                className="group relative"
              >
                {/* Glassmorphism Card */}
                <div className="relative h-full p-6 lg:p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all duration-300 hover:bg-white/10">
                  {/* Gradient glow on hover */}
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />

                  {/* Icon */}
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${stat.gradient} mb-6`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  {/* Number */}
                  <AnimatedNumber value={stat.number} suffix={stat.suffix} />

                  {/* Label */}
                  <div className="mt-3">
                    <h3 className="text-lg font-semibold text-white">{stat.label}</h3>
                    <p className="text-sm text-slate-400 mt-1">{stat.description}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom social proof */}
        <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 border-2 border-slate-900 flex items-center justify-center text-xs text-white font-medium"
                />
              ))}
            </div>
            <div>
              <p className="text-white font-semibold">500+ New Members</p>
              <p className="text-sm text-slate-400">Joined this week</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <Award className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-white font-semibold">Verified Experts</p>
              <p className="text-sm text-slate-400">Background checked</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
