"use client"

import { useState, useEffect } from "react"
import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const testimonials = [
    {
        id: 1,
        content: "The mentorship I received completely transformed my career trajectory. My mentor helped me land my dream job at a FAANG company within 3 months. The personalized guidance was exactly what I needed.",
        author: "Sarah Chen",
        role: "Software Engineer",
        company: "Google",
        image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
        rating: 5,
    },
    {
        id: 2,
        content: "As someone transitioning from finance to tech, I was lost. My mentor provided a clear roadmap, helped with resume reviews, and conducted mock interviews. I'm now a product manager and couldn't be happier.",
        author: "Michael Rodriguez",
        role: "Product Manager",
        company: "Microsoft",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
        rating: 5,
    },
    {
        id: 3,
        content: "The platform connected me with an incredible mentor who had 15+ years in my target industry. The insights and connections I gained were invaluable. Best investment in my career I've ever made.",
        author: "Emily Thompson",
        role: "Data Scientist",
        company: "Amazon",
        image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop",
        rating: 5,
    },
    {
        id: 4,
        content: "I was skeptical at first, but the quality of mentors here is exceptional. My mentor helped me negotiate a 40% salary increase and guided me through a complex career pivot. Absolutely worth it.",
        author: "David Park",
        role: "Engineering Manager",
        company: "Meta",
        image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop",
        rating: 5,
    },
]

export function TestimonialsSection() {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isAutoPlaying, setIsAutoPlaying] = useState(true)

    useEffect(() => {
        if (!isAutoPlaying) return
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % testimonials.length)
        }, 5000)
        return () => clearInterval(timer)
    }, [isAutoPlaying])

    const nextSlide = () => {
        setIsAutoPlaying(false)
        setCurrentIndex((prev) => (prev + 1) % testimonials.length)
    }

    const prevSlide = () => {
        setIsAutoPlaying(false)
        setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
    }

    const currentTestimonial = testimonials[currentIndex]

    return (
        <section className="relative py-20 lg:py-28 overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-slate-950" />

            {/* Decorative elements */}
            <div className="absolute top-20 right-10 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
            <div className="absolute bottom-20 left-10 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <div className="text-center mb-16">
                    <p className="text-purple-400 font-semibold text-sm uppercase tracking-wider mb-4">
                        Success Stories
                    </p>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                        What Our{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                            Mentees
                        </span>{' '}
                        Say
                    </h2>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                        Real stories from professionals who transformed their careers with our mentorship platform.
                    </p>
                </div>

                {/* Testimonial Card */}
                <div className="max-w-4xl mx-auto">
                    <div className="relative">
                        {/* Quote Icon */}
                        <div className="absolute -top-6 -left-6 lg:-top-8 lg:-left-8">
                            <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                                <Quote className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
                            </div>
                        </div>

                        {/* Card */}
                        <div className="relative p-8 lg:p-12 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10">
                            {/* Content */}
                            <div className="mb-8">
                                <p className="text-lg lg:text-2xl text-white leading-relaxed font-light">
                                    "{currentTestimonial.content}"
                                </p>
                            </div>

                            {/* Author */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <img
                                        src={currentTestimonial.image}
                                        alt={currentTestimonial.author}
                                        className="w-14 h-14 rounded-xl object-cover border-2 border-white/10"
                                    />
                                    <div>
                                        <h4 className="text-lg font-semibold text-white">{currentTestimonial.author}</h4>
                                        <p className="text-slate-400">
                                            {currentTestimonial.role} at{' '}
                                            <span className="text-purple-400">{currentTestimonial.company}</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Rating */}
                                <div className="flex items-center gap-1">
                                    {[...Array(currentTestimonial.rating)].map((_, i) => (
                                        <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Navigation */}
                        <div className="flex items-center justify-center gap-4 mt-8">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={prevSlide}
                                className="rounded-full border-white/20 text-white hover:bg-white/10"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </Button>

                            {/* Dots */}
                            <div className="flex items-center gap-2">
                                {testimonials.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            setIsAutoPlaying(false)
                                            setCurrentIndex(i)
                                        }}
                                        className={`w-2 h-2 rounded-full transition-all duration-300 ${i === currentIndex
                                                ? 'w-8 bg-gradient-to-r from-purple-500 to-pink-500'
                                                : 'bg-white/20 hover:bg-white/40'
                                            }`}
                                    />
                                ))}
                            </div>

                            <Button
                                variant="outline"
                                size="icon"
                                onClick={nextSlide}
                                className="rounded-full border-white/20 text-white hover:bg-white/10"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Company logos */}
                <div className="mt-20">
                    <p className="text-center text-sm text-slate-500 mb-8">
                        Our mentees work at leading companies
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-16 opacity-50">
                        {['Google', 'Microsoft', 'Amazon', 'Meta', 'Apple', 'Netflix'].map((company) => (
                            <div key={company} className="text-2xl font-bold text-white/30">
                                {company}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
