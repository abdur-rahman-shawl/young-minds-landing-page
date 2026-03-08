'use client';

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bookmark, Trash2, ArrowUpRight } from "lucide-react"
import { motion } from "framer-motion"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface SavedItemsProps {
  onMentorSelect: (mentorId: string) => void
}

export function SavedItems({ onMentorSelect }: SavedItemsProps) {
  const router = useRouter()
  const [savedItems, setSavedItems] = useState<Array<{
    id: string
    title: string
    description: string
    url: string
    savedAt: string
    tag: string
    courseId: string
    itemId: string
  }>>([])
  const [loading, setLoading] = useState(true)

  const loadSavedItems = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/student/saved-items')
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load saved items')
      }

      const mapped = (data.data || []).map((item: any) => ({
        id: item.contentItemId,
        title: item.contentItemTitle,
        description: `${item.courseTitle} • ${item.moduleTitle} / ${item.sectionTitle}`,
        url: `/learn/${item.courseId}`,
        savedAt: formatDistanceToNow(new Date(item.bookmarkedAt), { addSuffix: true }),
        tag: item.contentItemType || 'Course',
        courseId: item.courseId,
        itemId: item.contentItemId,
      }))

      setSavedItems(mapped)
    } catch (error) {
      console.error('Failed to load saved items:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to load saved items')
      setSavedItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSavedItems()
  }, [])

  const handleRemove = async (item: { courseId: string; itemId: string }) => {
    try {
      const response = await fetch(
        `/api/student/saved-items?courseId=${item.courseId}&itemId=${item.itemId}`,
        { method: 'DELETE' }
      )
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to remove saved item')
      }
      setSavedItems((prev) => prev.filter((entry) => entry.itemId !== item.itemId))
      toast.success('Removed from saved items')
    } catch (error) {
      console.error('Failed to remove saved item:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to remove saved item')
    }
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemAnim = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
            Saved Items
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Your personal library of bookmarked resources.
          </p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-full">
           <Bookmark className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {loading && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Loading saved items...
          </div>
        )}
        {!loading && savedItems.length === 0 && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            No saved course items yet.
          </div>
        )}
        {savedItems.map((item) => (
          <motion.div key={item.id} variants={itemAnim} whileHover={{ y: -5 }}>
            <Card className="h-full p-6 flex flex-col hover:shadow-lg transition-shadow border-slate-200 dark:border-slate-800 group relative overflow-hidden">
              {/* Decorative gradient blob */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-150" />
              
              <div className="flex items-start justify-between mb-4 relative z-10">
                <span className="text-xs font-medium px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-600 dark:text-slate-300">
                  {item.tag || "Resource"}
                </span>
                <span className="text-xs text-gray-400">
                  {item.savedAt}
                </span>
              </div>

              <div className="flex-1 relative z-10">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 leading-tight group-hover:text-blue-600 transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 line-clamp-3">
                  {item.description}
                </p>
              </div>

              <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 relative z-10">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 px-2"
                  onClick={() => handleRemove({ courseId: item.courseId, itemId: item.itemId })}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove
                </Button>
                
                <Button
                  size="sm"
                  variant="default"
                  className="gap-1 shadow-sm"
                  onClick={() => router.push(item.url)}
                >
                  View <ArrowUpRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
