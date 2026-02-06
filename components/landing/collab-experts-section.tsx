"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Code,
  TrendingUp,
  Palette,
  Megaphone,
  GraduationCap,
  Briefcase,
  HeartPulse,
  Building2,
  ArrowRight
} from "lucide-react"
import { useRouter } from "next/navigation"

const categories = [
  {
    id: "tech",
    name: "Technology",
    description: "Software, AI, Data Science",
    icon: Code,
    count: 250,
    gradient: "from-blue-500 to-cyan-500",
    bgGradient: "from-blue-500/10 to-cyan-500/10",
  },
  {
    id: "finance",
    name: "Finance",
    description: "Banking, Investments, Fintech",
    icon: TrendingUp,
    count: 180,
    gradient: "from-emerald-500 to-teal-500",
    bgGradient: "from-emerald-500/10 to-teal-500/10",
  },
  {
    id: "design",
    name: "Design",
    description: "UX/UI, Product, Branding",
    icon: Palette,
    count: 120,
    gradient: "from-purple-500 to-pink-500",
    bgGradient: "from-purple-500/10 to-pink-500/10",
  },
  {
    id: "marketing",
    name: "Marketing",
    description: "Digital, Growth, Content",
    icon: Megaphone,
    count: 150,
    gradient: "from-orange-500 to-red-500",
    bgGradient: "from-orange-500/10 to-red-500/10",
  },
  {
    id: "education",
    name: "Education",
    description: "EdTech, Study Abroad, Academia",
    icon: GraduationCap,
    count: 90,
    gradient: "from-amber-500 to-yellow-500",
    bgGradient: "from-amber-500/10 to-yellow-500/10",
  },
  {
    id: "consulting",
    name: "Consulting",
    description: "Strategy, Management, Operations",
    icon: Briefcase,
    count: 100,
    gradient: "from-slate-500 to-zinc-500",
    bgGradient: "from-slate-500/10 to-zinc-500/10",
  },
  {
    id: "healthcare",
    name: "Healthcare",
    description: "Medical, Biotech, Pharma",
    icon: HeartPulse,
    count: 75,
    gradient: "from-rose-500 to-pink-500",
    bgGradient: "from-rose-500/10 to-pink-500/10",
  },
  {
    id: "startup",
    name: "Startups",
    description: "Entrepreneurship, Funding, Growth",
    icon: Building2,
    count: 130,
    gradient: "from-indigo-500 to-violet-500",
    bgGradient: "from-indigo-500/10 to-violet-500/10",
  },
]

export function CollabExpertsSection() {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
  const router = useRouter()

  return (
    <section className="relative py-20 lg:py-28 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 to-slate-900" />

      {/* Decorative elements */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl -translate-y-1/2" />
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl -translate-y-1/2" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
            Industries
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Explore by{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              Industry
            </span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Find mentors specialized in your field. Our experts span across various industries and domains.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {categories.map((category) => {
            const Icon = category.icon
            const isHovered = hoveredCategory === category.id

            return (
              <button
                key={category.id}
                onClick={() => router.push('/auth?mode=signin')}
                onMouseEnter={() => setHoveredCategory(category.id)}
                onMouseLeave={() => setHoveredCategory(null)}
                className={`group relative p-6 rounded-2xl border transition-all duration-300 text-left ${isHovered
                    ? 'bg-white/10 border-white/20 scale-[1.02]'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
              >
                {/* Gradient overlay on hover */}
                <div
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${category.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                />

                <div className="relative z-10">
                  {/* Icon */}
                  <div
                    className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${category.gradient} mb-4 shadow-lg`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-white transition-colors">
                    {category.name}
                  </h3>
                  <p className="text-sm text-slate-400 mb-3">{category.description}</p>

                  {/* Count */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      <span className={`font-semibold bg-gradient-to-r ${category.gradient} bg-clip-text text-transparent`}>
                        {category.count}+
                      </span>{' '}
                      mentors
                    </span>
                    <ArrowRight className={`w-4 h-4 text-slate-500 transition-all duration-300 ${isHovered ? 'translate-x-1 text-white' : ''
                      }`} />
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <p className="text-slate-400 mb-4">
            Can't find your industry?{' '}
            <span className="text-white font-medium">We have mentors in 50+ fields.</span>
          </p>
          <Button
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
            onClick={() => router.push('/auth?mode=signin')}
          >
            Browse All Categories
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  )
}
