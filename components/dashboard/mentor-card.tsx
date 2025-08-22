"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Users, DollarSign, ArrowRight, Sparkles, Award, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Mentor {
  id: string;
  name: string;
  title?: string;
  company?: string;
  image?: string | null;
  expertise?: string;
  hourlyRate?: number | null;
  currency?: string;
  rating?: number;
  isVerified?: boolean;
  isAvailable?: boolean;
}

interface MentorCardProps {
  mentor: Mentor;
  onClick?: () => void;
}

export function MentorCard({ mentor, onClick }: MentorCardProps) {
  const expertiseAreas = mentor.expertise?.split(',').map(e => e.trim()).slice(0, 3) || [];
  
  return (
    <div 
      onClick={onClick}
      className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-card/80 to-card hover:from-card hover:to-card/90 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:border-primary/30 cursor-pointer"
    >
      {/* Top gradient decoration */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      {/* Verified badge */}
      {mentor.isVerified && (
        <div className="absolute top-3 right-3 z-10">
          <div className="relative">
            <Award className="w-5 h-5 text-primary" />
            <div className="absolute inset-0 bg-primary/30 blur-md" />
          </div>
        </div>
      )}
      
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar with gradient ring */}
          <div className="relative group-hover:scale-105 transition-transform">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/10 rounded-full blur-lg group-hover:blur-xl transition-all" />
            <Avatar className="relative w-14 h-14 ring-2 ring-background shadow-lg">
              <AvatarImage src={mentor.image || undefined} alt={mentor.name} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 font-semibold">
                {mentor.name?.split(' ').map(n => n[0]).join('') || 'M'}
              </AvatarFallback>
            </Avatar>
            {mentor.isAvailable && (
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full ring-2 ring-background animate-pulse" />
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-base group-hover:text-primary transition-colors truncate">
              {mentor.name}
            </h4>
            {mentor.title && (
              <p className="text-sm text-muted-foreground truncate">
                {mentor.title}
                {mentor.company && (
                  <span className="text-primary/60"> at {mentor.company}</span>
                )}
              </p>
            )}
            
            {/* Rating */}
            {mentor.rating && (
              <div className="flex items-center gap-1 mt-2">
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                <span className="text-xs font-medium">{mentor.rating.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">(42 reviews)</span>
              </div>
            )}
          </div>
          
          {/* Price badge */}
          {mentor.hourlyRate && (
            <div className="text-right">
              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary">
                <DollarSign className="w-3 h-3" />
                <span className="text-sm font-semibold">{mentor.hourlyRate}</span>
                <span className="text-xs">/hr</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Expertise badges */}
        {expertiseAreas.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {expertiseAreas.map((skill, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="text-xs bg-secondary/50 hover:bg-secondary/70 transition-colors"
              >
                {skill}
              </Badge>
            ))}
          </div>
        )}
        
        {/* Hover action */}
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
          <div className="flex items-center gap-1 text-xs text-primary">
            <span>View Profile</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>
      
      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
    </div>
  );
}

interface MentorsListProps {
  mentors: Mentor[];
  loading?: boolean;
  onMentorClick?: (mentor: Mentor) => void;
  onExploreClick?: () => void;
}

export function MentorsList({ 
  mentors, 
  loading = false,
  onMentorClick,
  onExploreClick
}: MentorsListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card/50 p-5 animate-pulse">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-3 w-48 bg-muted rounded" />
                <div className="flex gap-2 mt-3">
                  <div className="h-5 w-16 bg-muted rounded" />
                  <div className="h-5 w-20 bg-muted rounded" />
                </div>
              </div>
              <div className="h-6 w-16 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (mentors.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-dashed border-border/50 bg-gradient-to-br from-card/30 to-card/10 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        <div className="relative flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="relative mb-4">
            <Users className="w-12 h-12 text-muted-foreground/50" />
            <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-primary animate-pulse" />
          </div>
          <h3 className="font-semibold text-lg mb-1">No mentors available</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Discover expert mentors in your field
          </p>
          <Button 
            onClick={onExploreClick}
            size="sm"
            className="relative group"
          >
            <span>Browse Mentors</span>
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {mentors.map((mentor) => (
        <MentorCard 
          key={mentor.id} 
          mentor={mentor}
          onClick={() => onMentorClick?.(mentor)}
        />
      ))}
      
      {mentors.length > 0 && onExploreClick && (
        <Button
          variant="ghost"
          className="w-full group hover:bg-primary/5"
          onClick={onExploreClick}
        >
          <span>Explore All Mentors</span>
          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      )}
    </div>
  );
}