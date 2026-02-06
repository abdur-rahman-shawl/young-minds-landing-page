"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Twitter,
    Linkedin,
    Instagram,
    Youtube,
    Mail,
    ArrowRight,
    Sparkles
} from "lucide-react"
import Link from "next/link"

const footerLinks = {
    product: [
        { name: "Find Mentors", href: "/auth?mode=signin" },
        { name: "Become a Mentor", href: "/become-expert" },
        { name: "Pricing", href: "#" },
        { name: "Enterprise", href: "#" },
    ],
    company: [
        { name: "About Us", href: "#" },
        { name: "Careers", href: "#" },
        { name: "Blog", href: "#" },
        { name: "Press", href: "#" },
    ],
    resources: [
        { name: "Help Center", href: "#" },
        { name: "Community", href: "#" },
        { name: "Guides", href: "#" },
        { name: "Events", href: "#" },
    ],
    legal: [
        { name: "Privacy Policy", href: "#" },
        { name: "Terms of Service", href: "#" },
        { name: "Cookie Policy", href: "#" },
    ],
}

const socialLinks = [
    { name: "Twitter", icon: Twitter, href: "#" },
    { name: "LinkedIn", icon: Linkedin, href: "#" },
    { name: "Instagram", icon: Instagram, href: "#" },
    { name: "YouTube", icon: Youtube, href: "#" },
]

export function FooterSection() {
    return (
        <footer className="relative bg-slate-950 border-t border-white/10">
            {/* Main Footer */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
                <div className="grid grid-cols-1 lg:grid-cols-6 gap-12 lg:gap-8">

                    {/* Brand Column */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-white">SharingMinds</span>
                        </div>
                        <p className="text-slate-400 mb-6 max-w-sm">
                            Connecting ambitious professionals with world-class mentors to accelerate career growth.
                        </p>

                        {/* Newsletter */}
                        <div className="mb-6">
                            <p className="text-sm font-medium text-white mb-3">Subscribe to our newsletter</p>
                            <div className="flex gap-2">
                                <Input
                                    type="email"
                                    placeholder="Enter your email"
                                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500"
                                />
                                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-4">
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Social Links */}
                        <div className="flex items-center gap-4">
                            {socialLinks.map((social) => {
                                const Icon = social.icon
                                return (
                                    <a
                                        key={social.name}
                                        href={social.href}
                                        className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
                                        aria-label={social.name}
                                    >
                                        <Icon className="w-5 h-5" />
                                    </a>
                                )
                            })}
                        </div>
                    </div>

                    {/* Links Columns */}
                    <div className="lg:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-8">
                        <div>
                            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                                Product
                            </h3>
                            <ul className="space-y-3">
                                {footerLinks.product.map((link) => (
                                    <li key={link.name}>
                                        <Link
                                            href={link.href}
                                            className="text-slate-400 hover:text-white transition-colors text-sm"
                                        >
                                            {link.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                                Company
                            </h3>
                            <ul className="space-y-3">
                                {footerLinks.company.map((link) => (
                                    <li key={link.name}>
                                        <Link
                                            href={link.href}
                                            className="text-slate-400 hover:text-white transition-colors text-sm"
                                        >
                                            {link.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                                Resources
                            </h3>
                            <ul className="space-y-3">
                                {footerLinks.resources.map((link) => (
                                    <li key={link.name}>
                                        <Link
                                            href={link.href}
                                            className="text-slate-400 hover:text-white transition-colors text-sm"
                                        >
                                            {link.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                                Legal
                            </h3>
                            <ul className="space-y-3">
                                {footerLinks.legal.map((link) => (
                                    <li key={link.name}>
                                        <Link
                                            href={link.href}
                                            className="text-slate-400 hover:text-white transition-colors text-sm"
                                        >
                                            {link.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-sm text-slate-500">
                            © {new Date().getFullYear()} YoungMinds. All rights reserved.
                        </p>
                        <div className="flex items-center gap-6">
                            <Link href="#" className="text-sm text-slate-500 hover:text-white transition-colors">
                                Privacy
                            </Link>
                            <Link href="#" className="text-sm text-slate-500 hover:text-white transition-colors">
                                Terms
                            </Link>
                            <Link href="#" className="text-sm text-slate-500 hover:text-white transition-colors">
                                Cookies
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}
