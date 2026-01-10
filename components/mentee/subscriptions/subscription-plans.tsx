"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Sparkles, CheckCircle2, ShieldCheck, Zap } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { PlanCard, PlanProps } from "./plan-card"

export function SubscriptionPlans() {
    const [isAnnual, setIsAnnual] = useState(false)

    const plans: PlanProps[] = [
        {
            name: "Free",
            price: "$0",
            period: "/mo",
            description: "Perfect for getting started and exploring mentorship.",
            buttonText: "Current Plan",
            buttonVariant: "outline",
            isDisabled: true,
            features: [
                { text: "Pay-as-you-go Sessions", included: true },
                { text: "Standard Messaging", included: true },
                { text: "Public Resources", included: true },
                { text: "Basic Profile", included: true },
                { text: "Priority Support", included: false },
                { text: "Workshop Access", included: false },
                { text: "1-on-1 Coaching", included: false },
            ]
        },
        {
            name: "Starter",
            price: isAnnual ? "$24" : "$29",
            period: "/mo",
            description: "For consistent learners ready to grow.",
            buttonText: "Upgrade to Starter",
            features: [
                { text: "2 Free Sessions/mo", included: true },
                { text: "Priority Messaging", included: true },
                { text: "Access to Library", included: true },
                { text: "Enhanced Profile", included: true },
                { text: "5% Platform Fee", included: true },
                { text: "Workshop Access", included: false },
                { text: "1-on-1 Coaching", included: false },
            ]
        },
        {
            name: "Pro",
            price: isAnnual ? "$69" : "$79",
            period: "/mo",
            description: "Accelerate your career with dedicated support.",
            buttonText: "Upgrade to Pro",
            isPopular: true,
            features: [
                { text: "5 Free Sessions/mo", included: true },
                { text: "Priority Messaging", included: true },
                { text: "Access to Library", included: true },
                { text: "Group Workshops", included: true },
                { text: "0% Platform Fee", included: true },
                { text: "Resume Review", included: true },
                { text: "1-on-1 Coaching", included: false },
            ]
        },
        {
            name: "Elite",
            price: isAnnual ? "$169" : "$199",
            period: "/mo",
            description: "Maximum impact with unlimited access.",
            buttonText: "Upgrade to Elite",
            features: [
                { text: "Unlimited Sessions", included: true },
                { text: "24/7 Priority Access", included: true },
                { text: "Full Library Access", included: true },
                { text: "VIP Workshops", included: true },
                { text: "0% Platform Fee", included: true },
                { text: "Quarterly Coaching", included: true },
                { text: "Career Roadmap", included: true },
            ]
        }
    ]

    return (
        <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-12">
            {/* Header Section */}
            <div className="text-center space-y-4 max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" />
                    Unlock Your Potential
                </div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Choose the Perfect Plan for Your Journey
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400">
                    From casual learning to career acceleration, we have a plan that fits your goals.
                    Upgrade anytime as you scale.
                </p>
            </div>

            {/* Billing Toggle */}
            <div className="flex justify-center items-center gap-4">
                <Label htmlFor="billing-mode" className={`text-sm font-medium ${!isAnnual ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>Monthly</Label>
                <Switch
                    id="billing-mode"
                    checked={isAnnual}
                    onCheckedChange={setIsAnnual}
                />
                <Label htmlFor="billing-mode" className={`text-sm font-medium ${isAnnual ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                    Yearly <span className="text-green-600 font-bold ml-1">(Save 20%)</span>
                </Label>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 items-start">
                {plans.map((plan, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.4 }}
                        className="h-full"
                    >
                        <PlanCard {...plan} />
                    </motion.div>
                ))}
            </div>

            {/* Trust Badges / Footer Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 border-t border-slate-200 dark:border-slate-800">
                <div className="flex flex-col items-center text-center space-y-2">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-full text-blue-600 dark:text-blue-400 mb-2">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h3 className="font-semibold">Secure Payments</h3>
                    <p className="text-sm text-slate-500">Encrypted transactions via Stripe.</p>
                </div>
                <div className="flex flex-col items-center text-center space-y-2">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-full text-blue-600 dark:text-blue-400 mb-2">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h3 className="font-semibold">Cancel Anytime</h3>
                    <p className="text-sm text-slate-500">No long-term contracts or hidden fees.</p>
                </div>
                <div className="flex flex-col items-center text-center space-y-2">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-full text-blue-600 dark:text-blue-400 mb-2">
                        <Zap className="w-6 h-6" />
                    </div>
                    <h3 className="font-semibold">Instant Access</h3>
                    <p className="text-sm text-slate-500">Upgrade features unlock immediately.</p>
                </div>
            </div>
        </div>
    )
}
