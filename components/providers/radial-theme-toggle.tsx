"use client"

import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"

export function RadialThemeToggle() {
    const { setTheme, resolvedTheme } = useTheme()
    const isDark = resolvedTheme === "dark"

    /**
     * Triggers a radial circle-wipe transition between themes.
     *
     * How it works:
     * 1. Get the (x, y) center of the clicked button.
     * 2. Calculate the radius needed for the circle to cover the entire viewport
     *    (hypotenuse from click point to the farthest corner).
     * 3. Set CSS custom properties on <html> so the keyframe animations know
     *    where to originate and how large to grow.
     * 4. Call document.startViewTransition() — the browser captures a screenshot
     *    of the current DOM (old snapshot), we swap the theme, and the browser
     *    captures a new screenshot (new snapshot). Our CSS keyframes animate
     *    between the two snapshots using clip-path circles.
     * 5. Graceful fallbacks: instant swap if View Transitions API is unsupported
     *    or if the user prefers reduced motion.
     */
    const triggerThemeTransition = (
        nextTheme: "light" | "dark",
        event: React.MouseEvent<HTMLButtonElement>
    ) => {
        // SSR guard
        if (typeof document === "undefined") {
            setTheme(nextTheme)
            return
        }

        // Respect reduced motion preference
        const prefersReducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches

        // Check for View Transitions API support
        const startViewTransition = (
            document as Document & {
                startViewTransition?: (callback: () => void) => { ready: Promise<void> }
            }
        ).startViewTransition

        // Fallback: instant swap if no API or reduced motion
        if (!startViewTransition || prefersReducedMotion) {
            setTheme(nextTheme)
            return
        }

        // Get click coordinates (center of the button)
        const rect = event.currentTarget.getBoundingClientRect()
        const x = rect.left + rect.width / 2
        const y = rect.top + rect.height / 2

        // Calculate the radius that covers the entire viewport from (x, y)
        const endRadius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y)
        )

        // Set CSS custom properties for the animation
        const root = document.documentElement
        root.style.setProperty("--theme-transition-x", `${x}px`)
        root.style.setProperty("--theme-transition-y", `${y}px`)
        root.style.setProperty("--theme-transition-radius", `${endRadius}px`)
        root.style.setProperty("--theme-transition-duration", "560ms")

        // Start the view transition — browser snapshots old DOM, we swap,
        // browser snapshots new DOM, CSS animates between them
        startViewTransition.call(document, () => {
            setTheme(nextTheme)
        })
    }

    return (
        <div
            className={[
                "relative flex items-center gap-1 rounded-full",
                "border border-border/60 bg-background/80 p-1",
                "shadow-[0_8px_24px_rgba(0,0,0,0.08)]",
                "backdrop-blur supports-[backdrop-filter]:bg-background/60",
            ].join(" ")}
        >
            {/* Sliding pill indicator */}
            <span
                className={[
                    "pointer-events-none absolute left-1 top-1 h-8 w-8 rounded-full",
                    "transition-transform duration-300 ease-out",
                    isDark
                        ? [
                            "translate-x-9",
                            "bg-gradient-to-br from-slate-800 to-slate-950",
                            "shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_8px_18px_rgba(0,0,0,0.35)]",
                        ].join(" ")
                        : [
                            "translate-x-0",
                            "bg-gradient-to-br from-amber-200 to-orange-400",
                            "shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_8px_18px_rgba(234,88,12,0.35)]",
                        ].join(" "),
                ].join(" ")}
            />

            {/* Sun button (light mode) */}
            <button
                type="button"
                aria-pressed={!isDark}
                className={[
                    "relative z-10 h-8 w-8 rounded-full",
                    "flex items-center justify-center",
                    "transition-all duration-300 cursor-pointer",
                    isDark
                        ? "text-muted-foreground hover:text-foreground"
                        : "text-amber-700",
                ].join(" ")}
                onClick={(event) => triggerThemeTransition("light", event)}
            >
                <Sun className="h-[1.1rem] w-[1.1rem]" />
            </button>

            {/* Moon button (dark mode) */}
            <button
                type="button"
                aria-pressed={isDark}
                className={[
                    "relative z-10 h-8 w-8 rounded-full",
                    "flex items-center justify-center",
                    "transition-all duration-300 cursor-pointer",
                    isDark
                        ? "text-slate-100"
                        : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
                onClick={(event) => triggerThemeTransition("dark", event)}
            >
                <Moon className="h-[1.1rem] w-[1.1rem]" />
            </button>
        </div>
    )
}
