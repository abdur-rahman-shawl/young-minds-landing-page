'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { 
  Search, 
  Star, 
  Users, 
  Clock, 
  Grid3X3,
  List,
  SlidersHorizontal,
  ChevronDown,
  BookOpen,
  Sparkles
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDebounce } from '@/hooks/use-performance';
import { cn } from '@/lib/utils';

// ... [Keep Interfaces Exactly the Same] ...
interface Course {
  id: string;
  title: string;
  description: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  duration: number;
  price: string;
  currency: string;
  thumbnailUrl: string;
  category: string;
  tags: string[];
  enrollmentCount: number;
  avgRating: number;
  reviewCount: number;
  mentor: {
    id: string;
    name: string;
    image: string;
    title: string;
    company: string;
  };
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
  courseCount: number;
}

export function Courses() {
  const router = useRouter();

  // State
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const [hasCourseAccess, setHasCourseAccess] = useState(true);

  // Query parameters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const debouncedSearch = useDebounce(searchQuery, 500);

  const fetchCourses = async () => {
    try {
      if (accessChecked && !hasCourseAccess) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(selectedCategory && { category: selectedCategory }),
        ...(selectedDifficulty && { difficulty: selectedDifficulty }),
        ...(minPrice && { minPrice }),
        ...(maxPrice && { maxPrice }),
        sortBy,
        sortOrder,
      });

      const response = await fetch(`/api/courses?${queryParams}`);
      const data = await response.json();

      if (data.success) {
        setCourses(data.data.courses);
        setCategories(data.data.filters.categories);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const response = await fetch('/api/subscriptions/me', { credentials: 'include' });
        if (!response.ok) {
          setHasCourseAccess(true);
          return;
        }

        const data = await response.json();
        const subscription = data?.data?.subscription;
        const features = data?.data?.features || [];

        if (subscription?.audience === 'mentee') {
          const hasFeature = features.some((feature: { feature_key?: string }) =>
            feature.feature_key === 'courses_access'
          );
          setHasCourseAccess(hasFeature);
        } else {
          setHasCourseAccess(true);
        }
      } catch (error) {
        setHasCourseAccess(true);
      } finally {
        setAccessChecked(true);
      }
    };

    checkAccess();
  }, []);

  useEffect(() => {
    if (!accessChecked || !hasCourseAccess) return;
    fetchCourses();
  }, [accessChecked, hasCourseAccess, debouncedSearch, selectedCategory, selectedDifficulty, minPrice, maxPrice, sortBy, sortOrder, currentPage]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedDifficulty('');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('created_at');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'BEGINNER': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
      case 'INTERMEDIATE': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
      case 'ADVANCED': return 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const formatPrice = (price: string, currency: string) => {
    const numPrice = parseFloat(price);
    if (numPrice === 0) return 'Free';
    return `${currency === 'USD' ? '$' : currency}${numPrice}`;
  };

  // --- Components ---
  if (accessChecked && !hasCourseAccess) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle>Courses not included</CardTitle>
            <CardDescription>
              Your current plan does not include access to courses. Please upgrade to view the catalog.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const CourseCard = ({ course }: { course: Course }) => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="group h-full flex flex-col overflow-hidden border-slate-200 dark:border-slate-800 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 transition-all duration-300 cursor-pointer"
            onClick={() => router.push(`/courses/${course.id}`)}>
        
        {/* Thumbnail */}
        <div className="aspect-video relative overflow-hidden bg-slate-100 dark:bg-slate-900">
          {course.thumbnailUrl ? (
            <img 
              src={course.thumbnailUrl} 
              alt={course.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
              <BookOpen className="w-12 h-12 text-white/50" />
            </div>
          )}
          
          {/* Difficulty Badge */}
          <div className="absolute top-3 right-3">
            <Badge className={cn("backdrop-blur-md shadow-sm", getDifficultyColor(course.difficulty))}>
              {course.difficulty}
            </Badge>
          </div>
          
          {/* Duration Badge */}
          <div className="absolute bottom-3 left-3">
            <Badge variant="secondary" className="bg-black/60 backdrop-blur-sm text-white border-0 hover:bg-black/70">
              <Clock className="w-3 h-3 mr-1.5" />
              {Math.round(course.duration / 60)}h
            </Badge>
          </div>
        </div>
        
        <CardHeader className="pb-2 pt-4 px-5">
          <div className="flex items-start justify-between gap-3 mb-1">
            <Badge variant="outline" className="text-[10px] text-muted-foreground border-slate-200">
              {course.category}
            </Badge>
            <div className="font-bold text-lg text-primary">
              {formatPrice(course.price, course.currency)}
            </div>
          </div>
          <CardTitle className="text-lg font-bold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {course.title}
          </CardTitle>
        </CardHeader>

        <CardContent className="px-5 pb-5 flex-1 flex flex-col">
          <CardDescription className="line-clamp-2 mb-4 text-sm">
            {course.description}
          </CardDescription>

          <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
             <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6 border border-slate-200">
                  <AvatarImage src={course.mentor.image} />
                  <AvatarFallback className="text-[10px]">{course.mentor.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                   <span className="text-xs font-medium text-slate-700 dark:text-slate-200 line-clamp-1">{course.mentor.name}</span>
                </div>
             </div>
             
             <div className="flex items-center gap-1 text-xs font-medium text-amber-500">
                <Star className="w-3.5 h-3.5 fill-amber-500" />
                <span>{Number(course.avgRating || 0).toFixed(1)}</span>
                <span className="text-slate-400 font-normal">({course.reviewCount})</span>
             </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">Explore Courses</h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl">
            Upgrade your skills with curated courses from industry leaders.
          </p>
        </div>
        
        {/* View Toggles */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg self-start md:self-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('grid')}
              className={cn("h-8 w-8 rounded-md", viewMode === 'grid' && "bg-white dark:bg-slate-700 shadow-sm")}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('list')}
              className={cn("h-8 w-8 rounded-md", viewMode === 'list' && "bg-white dark:bg-slate-700 shadow-sm")}
            >
              <List className="w-4 h-4" />
            </Button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="sticky top-20 z-20 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search for Python, Design, Marketing..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-slate-200 dark:border-slate-800 focus:ring-primary/20 transition-all shadow-sm"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "h-11 px-4 border-slate-200 dark:border-slate-800 bg-white/80 backdrop-blur-md transition-all hover:bg-slate-50",
              showFilters && "border-primary text-primary bg-primary/5"
            )}
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Filters
            <ChevronDown className={cn("w-3 h-3 ml-2 transition-transform", showFilters && "rotate-180")} />
          </Button>
        </div>

        {/* Collapsible Filters Panel */}
        <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card className="border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md shadow-sm">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-slate-500">Category</label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="bg-white dark:bg-slate-950"><SelectValue placeholder="Any" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Categories</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.slug}>{category.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-slate-500">Level</label>
                    <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                      <SelectTrigger className="bg-white dark:bg-slate-950"><SelectValue placeholder="Any" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Levels</SelectItem>
                        <SelectItem value="BEGINNER">Beginner</SelectItem>
                        <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                        <SelectItem value="ADVANCED">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-slate-500">Min Price ($)</label>
                    <Input type="number" placeholder="0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="bg-white dark:bg-slate-950" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-slate-500">Max Price ($)</label>
                    <Input type="number" placeholder="1000" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="bg-white dark:bg-slate-950" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-slate-500">Sort By</label>
                    <Select value={`${sortBy}-${sortOrder}`} onValueChange={(val) => { const [s, o] = val.split('-'); setSortBy(s); setSortOrder(o); }}>
                      <SelectTrigger className="bg-white dark:bg-slate-950"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="created_at-desc">Newest</SelectItem>
                        <SelectItem value="rating-desc">Top Rated</SelectItem>
                        <SelectItem value="price-asc">Price: Low to High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-200/50 dark:border-slate-800/50">
                  <span className="text-sm text-muted-foreground">{pagination.totalCount} results</span>
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-500 hover:text-red-600 hover:bg-red-50">Reset Filters</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
        </AnimatePresence>
      </div>

      {/* Loading Skeleton */}
      {loading && courses.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-video rounded-xl w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex justify-between pt-2">
                 <Skeleton className="h-8 w-8 rounded-full" />
                 <Skeleton className="h-4 w-12" />
              </div>
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-full w-fit mx-auto mb-4 shadow-sm">
             <Search className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">No courses found</h3>
          <p className="text-slate-500 mt-1 mb-6">Try adjusting your filters or search terms.</p>
          <Button onClick={clearFilters} variant="outline">Clear Filters</Button>
        </div>
      ) : (
        <div className={cn(
          "grid gap-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-500",
          viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'
        )}>
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className="flex justify-center pt-8">
          <Pagination>
            <PaginationContent>
              {pagination.hasPreviousPage && (
                <PaginationItem>
                  <PaginationPrevious onClick={() => setCurrentPage(c => c - 1)} className="cursor-pointer" />
                </PaginationItem>
              )}
              <PaginationItem>
                  <PaginationLink isActive>{pagination.currentPage}</PaginationLink>
              </PaginationItem>
              {pagination.hasNextPage && (
                <PaginationItem>
                  <PaginationNext onClick={() => setCurrentPage(c => c + 1)} className="cursor-pointer" />
                </PaginationItem>
              )}
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
