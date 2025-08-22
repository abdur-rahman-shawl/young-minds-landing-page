import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  loading?: boolean;
}

export function StatsCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend = "neutral",
  loading = false 
}: StatsCardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-3 h-3" />;
      case "down":
        return <TrendingDown className="w-3 h-3" />;
      default:
        return <Minus className="w-3 h-3" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case "up":
        return "text-emerald-500 dark:text-emerald-400";
      case "down":
        return "text-rose-500 dark:text-rose-400";
      default:
        return "text-muted-foreground/60";
    }
  };

  const getIconBgColor = () => {
    switch (trend) {
      case "up":
        return "bg-emerald-500/10 dark:bg-emerald-400/10 border-emerald-500/20 dark:border-emerald-400/20 text-emerald-600 dark:text-emerald-400";
      case "down":
        return "bg-rose-500/10 dark:bg-rose-400/10 border-rose-500/20 dark:border-rose-400/20 text-rose-600 dark:text-rose-400";
      default:
        return "bg-primary/10 dark:bg-primary/10 border-primary/20 dark:border-primary/20 text-primary";
    }
  };

  if (loading) {
    return (
      <div className="relative p-5 group">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-xl bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-20 bg-muted rounded animate-pulse" />
            <div className="h-7 w-16 bg-muted rounded animate-pulse" />
            <div className="h-3 w-32 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative p-5 group before:absolute before:inset-y-8 before:right-0 before:w-px before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent last:before:hidden">
      <div className="relative flex items-center gap-4">
        {/* Hover indicator */}
        <div className="absolute -right-2 top-0 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
          <div className={cn("size-2 rounded-full", trend === "up" ? "bg-emerald-500" : trend === "down" ? "bg-rose-500" : "bg-primary")} />
        </div>
        
        {/* Icon */}
        <div className={cn(
          "size-12 shrink-0 rounded-xl border flex items-center justify-center transition-all duration-300 group-hover:scale-110",
          getIconBgColor()
        )}>
          <Icon className="w-5 h-5" />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-medium tracking-widest text-xs uppercase text-muted-foreground/70 mb-1">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight">{value}</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <span className={cn("flex items-center gap-0.5", getTrendColor())}>
              {getTrendIcon()}
              <span className="text-xs font-medium">{description}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatsGridProps {
  stats: StatsCardProps[];
  loading?: boolean;
}

export function StatsGrid({ stats, loading = false }: StatsGridProps) {
  return (
    <div className="relative">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 rounded-2xl" />
      
      {/* Grid container */}
      <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border border-border/50 rounded-2xl bg-gradient-to-br from-card/80 to-card backdrop-blur-sm overflow-hidden">
        {loading ? (
          // Loading skeletons
          [1, 2, 3].map((i) => (
            <StatsCard
              key={i}
              title=""
              value=""
              description=""
              icon={TrendingUp}
              loading={true}
            />
          ))
        ) : (
          stats.map((stat) => (
            <StatsCard key={stat.title} {...stat} />
          ))
        )}
      </div>
    </div>
  );
}