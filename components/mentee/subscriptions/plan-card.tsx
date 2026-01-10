"use client"

import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface PlanFeature {
    text: string
    included: boolean
}

export interface PlanProps {
    name: string
    price: string
    period: string
    description: string
    features: PlanFeature[]
    isPopular?: boolean
    buttonText: string
    buttonVariant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
    isDisabled?: boolean
    onSubscribe?: () => void
}

export function PlanCard({
    name,
    price,
    period,
    description,
    features,
    isPopular,
    buttonText,
    buttonVariant = "default",
    isDisabled = false,
    onSubscribe,
}: PlanProps) {
    return (
        <Card className={cn(
            "flex flex-col h-full relative transition-all duration-200 hover:shadow-lg",
            isPopular ? "border-primary shadow-md scale-105 z-10" : "border-slate-200 dark:border-slate-800"
        )}>
            {isPopular && (
                <div className="absolute -top-3 left-0 right-0 flex justify-center">
                    <Badge className="bg-primary text-primary-foreground hover:bg-primary px-3 py-1 text-sm font-medium shadow-sm">
                        Most Popular
                    </Badge>
                </div>
            )}

            <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl font-bold">{name}</CardTitle>
                <CardDescription className="text-sm mt-2 min-h-[40px]">{description}</CardDescription>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col items-center">
                <div className="mb-6 mt-2">
                    <span className="text-4xl font-extrabold tracking-tight">{price}</span>
                    {price !== "Free" && <span className="text-muted-foreground ml-1 font-medium">{period}</span>}
                </div>

                <div className="w-full space-y-3 flex-1">
                    {features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-2">
                            <div className={cn(
                                "rounded-full p-0.5 mt-0.5 shrink-0",
                                feature.included ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                            )}>
                                <Check className="w-3 h-3" />
                            </div>
                            <span className={cn(
                                "text-sm leading-tight",
                                feature.included ? "text-slate-700 dark:text-slate-300" : "text-slate-400 dark:text-slate-500 line-through decoration-slate-300 dark:decoration-slate-700"
                            )}>
                                {feature.text}
                            </span>
                        </div>
                    ))}
                </div>
            </CardContent>

            <CardFooter className="pt-4 pb-6">
                <Button
                    variant={isPopular ? "default" : buttonVariant}
                    className={cn("w-full h-11 text-base font-semibold", isPopular && "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/20")}
                    disabled={isDisabled}
                    onClick={onSubscribe}
                >
                    {buttonText}
                </Button>
            </CardFooter>
        </Card>
    )
}
