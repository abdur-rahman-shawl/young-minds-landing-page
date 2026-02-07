"use client"

import { Search, Calendar, Video, ArrowRight, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Find Your Mentor",
    description: "Browse our network of verified industry experts. Filter by skills, industry, experience, and availability to find your perfect match.",
    features: ["AI-powered matching", "Verified profiles", "Expertise filtering"],
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    number: "02",
    icon: Calendar,
    title: "Book a Session",
    description: "Schedule a 1-on-1 session at your convenience. Choose from available time slots that work for your timezone.",
    features: ["Flexible scheduling", "Instant confirmation", "Calendar sync"],
    gradient: "from-purple-500 to-pink-500",
  },
  {
    number: "03",
    icon: Video,
    title: "Grow Together",
    description: "Connect via HD video calls with screen sharing. Get personalized guidance, actionable feedback, and career roadmaps.",
    features: ["HD video calls", "Screen sharing", "Session recordings"],
    gradient: "from-amber-500 to-orange-500",
  },
]

export function VideoCallSection() {
  const router = useRouter()

  return (
    <section className="relative py-20 lg:py-28 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />

      {/* Decorative elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16 lg:mb-20">
          <p className="text-blue-400 font-semibold text-sm uppercase tracking-wider mb-4">
            Simple Process
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            How It{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              Works
            </span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Get started in minutes and accelerate your career growth with personalized mentorship.
          </p>
        </div>

        {/* Steps */}
        <div className="grid lg:grid-cols-3 gap-8 lg:gap-6 relative">
          {/* Connecting line (desktop) */}
          <div className="hidden lg:block absolute top-24 left-[16.67%] right-[16.67%] h-0.5">
            <div className="w-full h-full bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 opacity-20" />
            <div className="absolute top-1/2 left-0 w-3 h-3 -translate-y-1/2 rounded-full bg-blue-500" />
            <div className="absolute top-1/2 left-1/2 w-3 h-3 -translate-y-1/2 -translate-x-1/2 rounded-full bg-purple-500" />
            <div className="absolute top-1/2 right-0 w-3 h-3 -translate-y-1/2 rounded-full bg-orange-500" />
          </div>

          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <div key={index} className="relative group">
                {/* Card */}
                <div className="relative h-full p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300 hover:bg-white/10">
                  {/* Step number */}
                  <div className="absolute -top-4 left-8 px-4 py-1 rounded-full bg-slate-900 border border-white/10">
                    <span className={`text-sm font-bold bg-gradient-to-r ${step.gradient} bg-clip-text text-transparent`}>
                      Step {step.number}
                    </span>
                  </div>

                  {/* Icon */}
                  <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${step.gradient} mb-6 shadow-lg`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                  <p className="text-slate-400 mb-6 leading-relaxed">{step.description}</p>

                  {/* Features */}
                  <ul className="space-y-2">
                    {step.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                        <CheckCircle2 className={`w-4 h-4 bg-gradient-to-r ${step.gradient} bg-clip-text text-transparent`} style={{ color: index === 0 ? '#22d3ee' : index === 1 ? '#e879f9' : '#fb923c' }} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Arrow for mobile */}
                {index < steps.length - 1 && (
                  <div className="lg:hidden flex justify-center py-4">
                    <ArrowRight className="w-6 h-6 text-slate-600 rotate-90" />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <Button
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-8 py-6 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all duration-300"
            onClick={() => router.push('/auth?mode=signup')}
          >
            Start Your Journey
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <p className="mt-4 text-sm text-slate-500">
            No credit card required • Free to get started
          </p>
        </div>
      </div>
    </section>
  )
}
