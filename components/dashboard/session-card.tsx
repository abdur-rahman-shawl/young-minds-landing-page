"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, Video, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Session {
  id: string;
  mentorName: string;
  mentorTitle?: string;
  mentorCompany?: string;
  mentorImage?: string;
  scheduledAt: string;
  duration?: number;
  status?: string;
  meetingType?: string;
}

interface SessionCardProps {
  session: Session;
  onClick?: () => void;
}

export function SessionCard({ session, onClick }: SessionCardProps) {
  const sessionDate = new Date(session.scheduledAt);
  const isUpcoming = sessionDate > new Date();
  
  return (
    <div 
      onClick={onClick}
      className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-card/80 to-card hover:from-card hover:to-card/90 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:border-primary/20 cursor-pointer"
    >
      {/* Status indicator */}
      {isUpcoming && (
        <div className="absolute top-3 right-3">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500 blur-md opacity-50" />
            <div className="relative w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          </div>
        </div>
      )}
      
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar with ring effect */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-md group-hover:blur-lg transition-all" />
            <Avatar className="relative w-12 h-12 ring-2 ring-background">
              <AvatarImage src={session.mentorImage} alt={session.mentorName} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10">
                {session.mentorName?.split(' ').map(n => n[0]).join('') || 'M'}
              </AvatarFallback>
            </Avatar>
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
              {session.mentorName}
            </h4>
            {session.mentorTitle && (
              <p className="text-xs text-muted-foreground truncate">
                {session.mentorTitle}
                {session.mentorCompany && ` at ${session.mentorCompany}`}
              </p>
            )}
            
            {/* Time info */}
            <div className="flex items-center gap-3 mt-2 text-xs">
              <div className="flex items-center gap-1 text-muted-foreground">
                <CalendarDays className="w-3 h-3" />
                <span>{format(sessionDate, 'MMM d')}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{format(sessionDate, 'h:mm a')}</span>
              </div>
            </div>
          </div>
          
          {/* Action indicator */}
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0" />
        </div>
      </div>
      
      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

interface SessionsListProps {
  sessions: Session[];
  loading?: boolean;
  onSessionClick?: (session: Session) => void;
  onViewAllClick?: () => void;
  onBookSessionClick?: () => void;
}

export function SessionsList({ 
  sessions, 
  loading = false, 
  onSessionClick,
  onViewAllClick,
  onBookSessionClick
}: SessionsListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card/50 p-4 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-3 w-24 bg-muted rounded" />
                <div className="h-3 w-40 bg-muted rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-dashed border-border/50 bg-gradient-to-br from-card/30 to-card/10 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        <div className="relative flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="relative mb-4">
            <CalendarDays className="w-12 h-12 text-muted-foreground/50" />
            <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-primary animate-pulse" />
          </div>
          <h3 className="font-semibold text-lg mb-1">No upcoming sessions</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Start your learning journey today
          </p>
          <Button 
            onClick={onBookSessionClick}
            size="sm"
            className="relative group"
          >
            <span>Book a Session</span>
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <SessionCard 
          key={session.id} 
          session={session}
          onClick={() => onSessionClick?.(session)}
        />
      ))}
      
      {sessions.length > 0 && onViewAllClick && (
        <Button
          variant="ghost"
          className="w-full group hover:bg-primary/5"
          onClick={onViewAllClick}
        >
          <span>View All Sessions</span>
          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      )}
    </div>
  );
}