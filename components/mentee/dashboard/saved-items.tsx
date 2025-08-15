import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bookmark, ExternalLink, Trash2 } from "lucide-react"

interface SavedItemsProps {
  onMentorSelect: (mentorId: string) => void
}

export function SavedItems({ onMentorSelect }: SavedItemsProps) {
  const savedItems = [
    {
      id: 1,
      title: "Best Practices for React Development",
      description: "A comprehensive guide to React best practices and patterns",
      url: "https://example.com/react-best-practices",
      savedAt: "2 days ago"
    },
    {
      id: 2,
      title: "Career Growth in Tech Industry",
      description: "How to advance your career in technology",
      url: "https://example.com/career-growth",
      savedAt: "1 week ago"
    },
    {
      id: 3,
      title: "Interview Preparation Guide",
      description: "Complete guide to technical interviews",
      url: "https://example.com/interview-prep",
      savedAt: "2 weeks ago"
    }
  ]

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Saved Items
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Your bookmarked content and resources
          </p>
        </div>

        <div className="grid gap-6">
          {savedItems.map((item) => (
            <Card key={item.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Bookmark className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Saved {item.savedAt}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {item.description}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-2">
                      <ExternalLink className="w-4 h-4" />
                      View
                    </Button>
                    <Button size="sm" variant="ghost" className="gap-2 text-red-600 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
} 