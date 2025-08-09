"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function CourseStructureSkeleton() {
  return (
    <div className="space-y-4">
      {/* Module Skeletons */}
      {[1, 2, 3].map((i) => (
        <Card key={i} className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-20" /> {/* Module badge */}
                <Skeleton className="h-5 w-48" /> {/* Module title */}
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-20" /> {/* Sections count */}
                <Skeleton className="h-8 w-16" /> {/* Edit button */}
                <Skeleton className="h-8 w-24" /> {/* Add section button */}
                <Skeleton className="h-8 w-16" /> {/* Delete button */}
              </div>
            </div>
            <Skeleton className="h-4 w-96 mt-2" /> {/* Description */}
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="space-y-2">
              {/* Section Skeletons */}
              {[1, 2].map((j) => (
                <div key={j} className="space-y-2">
                  <div className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                    <Skeleton className="h-6 w-6 rounded-full" /> {/* Section number */}
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" /> {/* Section title */}
                      <Skeleton className="h-3 w-56" /> {/* Section description */}
                    </div>
                    <Skeleton className="h-5 w-12" /> {/* Items count */}
                    <Skeleton className="h-6 w-6" /> {/* Edit button */}
                    <Skeleton className="h-8 w-20" /> {/* Add content button */}
                    <Skeleton className="h-6 w-6" /> {/* Delete button */}
                  </div>
                  
                  {/* Content Item Skeletons */}
                  <div className="ml-8 space-y-1">
                    {[1, 2, 3].map((k) => (
                      <div key={k} className="flex items-center gap-2 p-2 bg-white border rounded">
                        <Skeleton className="h-5 w-5 rounded-full" /> {/* Item number */}
                        <Skeleton className="h-4 w-4" /> {/* Content icon */}
                        <div className="flex-1">
                          <Skeleton className="h-4 w-40 mb-1" /> {/* Item title */}
                          <Skeleton className="h-3 w-32" /> {/* Item description */}
                        </div>
                        <Skeleton className="h-5 w-12" /> {/* Type badge */}
                        <Skeleton className="h-5 w-10" /> {/* Duration badge */}
                        <Skeleton className="h-6 w-6" /> {/* Edit button */}
                        <Skeleton className="h-6 w-6" /> {/* Delete button */}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function CourseDetailsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Skeleton className="h-5 w-32 mb-2" /> {/* Basic Information title */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" /> {/* Difficulty */}
            <Skeleton className="h-4 w-40" /> {/* Category */}
            <Skeleton className="h-4 w-36" /> {/* Duration */}
          </div>
        </div>
        
        <div>
          <Skeleton className="h-5 w-20 mb-2" /> {/* Pricing title */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" /> {/* Price */}
            <Skeleton className="h-4 w-28" /> {/* Enrollments */}
          </div>
        </div>
      </div>
      
      <div>
        <Skeleton className="h-5 w-16 mb-2" /> {/* Tags title */}
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-6 w-16" /> /* Tag badges */
          ))}
        </div>
      </div>
      
      <div>
        <Skeleton className="h-5 w-32 mb-2" /> {/* Learning Outcomes title */}
        <div className="space-y-1">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-4 w-80" /> /* Learning outcome items */
          ))}
        </div>
      </div>
      
      <Skeleton className="h-10 w-40" /> {/* Edit Course Details button */}
    </div>
  );
}