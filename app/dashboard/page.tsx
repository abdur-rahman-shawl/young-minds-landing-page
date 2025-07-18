"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Simple components for now
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isPending) return;
    
    if (!session?.user) {
      router.push("/auth");
      return;
    }

    // Just redirect to main page which has the dashboard
    // No localStorage needed - main page can check session directly
    router.push("/?section=dashboard");
    
  }, [session, isPending, router]);

  // Loading state
  if (isPending || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="space-y-4 text-center">
          <Skeleton className="h-8 w-64 mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
          <div className="grid grid-cols-3 gap-4 mt-8">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return null; // Will redirect before this renders
} 