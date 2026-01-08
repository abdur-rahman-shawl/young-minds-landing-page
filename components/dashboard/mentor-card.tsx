"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Briefcase, 
  MapPin, 
  ArrowRight, 
  CheckCircle2, 
  Star,
  Zap
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// --- Helpers ---

// Robust parser for your DB's expertise field which might be a JSON string or CSV
const getExpertiseArray = (expertise: string | null | undefined): string[] => {
  if (!expertise) return [];
  try {
    // Try parsing as JSON array
    if (expertise.trim().startsWith('[') && expertise.trim().endsWith(']')) {
       const parsed = JSON.parse(expertise);
       return Array.isArray(parsed) ? parsed : [expertise];
    }
    // Fallback to comma separation
    return expertise.split(',').map(s => s.trim()).filter(Boolean);
  } catch (e) {
    return [expertise];
  }
};

interface MentorProps {
  mentor: {
    id: string;
    fullName?: string | null;
    title?: string | null;
    company?: string | null;
    profileImageUrl?: string | null;
    hourlyRate?: string | number | null;
    currency?: string | null;
    expertise?: string | null;
    experience?: number | null;
    headline?: string | null;
    about?: string | null;
    verificationStatus?: string;
    city?: string | null;
    country?: string | null;
  };
  onClick?: () => void;
}

export function MentorCard({ mentor, onClick }: MentorProps) {
  const skills = getExpertiseArray(mentor.expertise).slice(0, 3);
  const initials = mentor.fullName 
    ? mentor.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
    : 'M';
  
  // Prioritize headline, then about, then fallback
  const bio = mentor.headline || mentor.about || "Experienced mentor ready to guide you.";
  const location = [mentor.city, mentor.country].filter(Boolean).join(', ');

  // Random rating generator for UI visuals (Remove if you have real ratings)
  const rating = 5.0; 

  return (
    <motion.div 
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="w-full"
    >
      <Card 
        className="group relative flex flex-col sm:flex-row overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-900 transition-all duration-300 cursor-pointer rounded-xl"
        onClick={onClick}
      >
        {/* Left: Avatar Section */}
        <div className="p-5 flex flex-col items-center sm:items-start border-b sm:border-b-0 sm:border-r border-slate-100 dark:border-slate-800 min-w-[140px] bg-slate-50/50 dark:bg-slate-900/50">
          <div className="relative mb-3">
            <div className="absolute inset-0 bg-blue-500 blur-xl opacity-0 group-hover:opacity-20 transition-opacity rounded-full"></div>
            <Avatar className="h-20 w-20 border-4 border-white dark:border-slate-800 shadow-md">
              <AvatarImage src={mentor.profileImageUrl || undefined} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-slate-800 to-slate-900 text-white font-bold text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            {mentor.verificationStatus === 'VERIFIED' && (
              <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 rounded-full p-1 shadow-sm" title="Verified Mentor">
                <CheckCircle2 className="w-5 h-5 text-blue-500 fill-blue-500/10" />
              </div>
            )}
          </div>
          
          <div className="text-center sm:text-left w-full">
             <div className="flex items-center justify-center sm:justify-start gap-1 mb-1">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">{rating}</span>
             </div>
             {location && (
               <div className="flex items-center justify-center sm:justify-start gap-1 text-xs text-slate-500 truncate">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{location}</span>
               </div>
             )}
          </div>
        </div>

        {/* Middle: Content */}
        <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex justify-between items-start mb-1">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors truncate pr-4">
                  {mentor.fullName || "Mentor"}
                </h3>
                <div className="text-sm text-slate-600 dark:text-slate-400 font-medium flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    {mentor.title || "Expert"}
                  </span>
                  {mentor.company && (
                    <>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span>{mentor.company}</span>
                    </>
                  )}
                </div>
              </div>
              
              {/* Mobile Price (Hidden on Desktop, shown via flex-col-reverse logic if needed, but here kept simple) */}
            </div>

            {/* Bio with strict clamping */}
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 line-clamp-2 leading-relaxed">
              {bio}
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
            {/* Skills */}
            <div className="flex flex-wrap gap-2 overflow-hidden h-6">
              {skills.map((skill, idx) => (
                <Badge 
                  key={idx} 
                  variant="secondary" 
                  className="rounded-md px-2 py-0 h-6 text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-0"
                >
                  {skill}
                </Badge>
              ))}
            </div>

            {/* Hover Arrow */}
            <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all hidden sm:block" />
          </div>
        </div>

        {/* Right: Action / Price (Desktop) */}
        <div className="p-5 border-l border-slate-100 dark:border-slate-800 flex flex-row sm:flex-col items-center justify-between sm:justify-center gap-4 bg-slate-50/30 dark:bg-slate-900/30 min-w-[120px]">
          <div className="text-left sm:text-center">
             <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Rate</p>
             {mentor.hourlyRate ? (
               <div className="flex items-baseline sm:justify-center gap-0.5">
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    ${Number(mentor.hourlyRate).toFixed(0)}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">/hr</span>
               </div>
             ) : (
                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Free</Badge>
             )}
          </div>

          <Button 
            size="sm" 
            className="w-auto sm:w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm"
          >
            View
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

// Simple Container
export function MentorsList({ mentors, loading, onMentorClick, onExploreClick }: any) {
  if (loading) return <div className="space-y-4">{[1,2].map(i => <div key={i} className="h-40 w-full bg-slate-100 animate-pulse rounded-xl" />)}</div>;

  if (!mentors?.length) return (
     <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
        <p className="text-slate-500">No mentors found.</p>
     </div>
  );

  return (
    <div className="space-y-4">
      {mentors.map((mentor: any) => (
        <MentorCard 
          key={mentor.id} 
          mentor={mentor} 
          onClick={() => onMentorClick(mentor)} 
        />
      ))}
    </div>
  );
}