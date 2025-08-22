"use client"

import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface WelcomeSectionProps {
  userName?: string;
  onExploreClick?: () => void;
}

export function WelcomeSection({ userName, onExploreClick }: WelcomeSectionProps) {
  const firstName = userName?.split(' ')[0];
  
  return (
    <div className="relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 rounded-3xl" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      
      {/* Content */}
      <div className="relative backdrop-blur-sm bg-card/50 border border-border/50 rounded-3xl p-8 md:p-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex-1">
            {/* Animated welcome text */}
            <div className="flex items-center gap-3 mb-3">
              <div className="relative">
                <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                <div className="absolute inset-0 bg-primary/20 blur-xl" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Welcome back{firstName ? `, ${firstName}` : ''}!
              </h1>
            </div>
            
            {/* Subtitle with better typography */}
            <p className="text-muted-foreground text-lg mb-6 max-w-2xl">
              Continue your learning journey with expert mentors. 
              <span className="hidden md:inline"> Unlock your potential and achieve your goals with personalized guidance.</span>
            </p>
            
            {/* Stats preview */}
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-muted-foreground">Active Sessions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-muted-foreground">Learning in Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                <span className="text-muted-foreground">Goals on Track</span>
              </div>
            </div>
          </div>
          
          {/* CTA Button with gradient */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 rounded-xl blur-lg group-hover:blur-xl transition-all duration-300 opacity-70 group-hover:opacity-100" />
            <Button 
              onClick={onExploreClick}
              size="lg"
              className="relative bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 group"
            >
              <span className="mr-2">Find New Mentors</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-2xl" />
        <div className="absolute bottom-4 left-4 w-32 h-32 bg-gradient-to-tr from-primary/10 to-transparent rounded-full blur-3xl" />
      </div>
    </div>
  );
}