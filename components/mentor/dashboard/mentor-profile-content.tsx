"use client";

import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Book, FileText, ExternalLink } from 'lucide-react';
import { useTRPCClient } from '@/lib/trpc/react';

interface PublicContentItem {
  id: string;
  title: string;
  description?: string;
  type: 'COURSE' | 'FILE' | 'URL';
  displayOrder: number;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  fileUrl?: string;
  url?: string;
  urlTitle?: string;
  urlDescription?: string;
  course?: {
    difficulty: string;
    duration?: number;
    category?: string;
    tags?: string[];
    thumbnailUrl?: string;
    learningOutcomes?: string[];
    enrollmentCount: number;
  };
}

function usePublicContent(mentorId: string) {
  const trpcClient = useTRPCClient();

  return useQuery<PublicContentItem[]>({
    queryKey: ['public-content', mentorId],
    queryFn: () => trpcClient.public.getMentorPublicContent.query({ mentorId }),
    enabled: !!mentorId,
  });
}

const getContentIcon = (type: string) => {
  switch (type) {
    case 'COURSE': return <Book className="w-5 h-5 text-blue-500" />;
    case 'FILE': return <FileText className="w-5 h-5 text-orange-500" />;
    case 'URL': return <ExternalLink className="w-5 h-5 text-green-500" />;
    default: return <FileText className="w-5 h-5" />;
  }
};

export function MentorProfileContent({ mentorId }: { mentorId: string }) {
  const { data: content = [], isLoading } = usePublicContent(mentorId);

  // Don't show the section if there's no content
  if (!isLoading && content.length === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Content & Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="animate-pulse p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Content & Resources</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {content.map((item) => (
          <div
            key={item.id}
            className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{getContentIcon(item.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                    {item.title}
                  </h3>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {item.type}
                  </Badge>
                </div>

                {item.description && (
                  <p className="text-gray-600 dark:text-gray-400 text-xs line-clamp-2">
                    {item.description}
                  </p>
                )}

                {/* Course details */}
                {item.course && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 text-xs border-0">
                      {item.course.difficulty}
                    </Badge>
                    {item.course.category && (
                      <Badge variant="outline" className="text-xs">
                        {item.course.category}
                      </Badge>
                    )}
                    {item.course.duration && (
                      <span className="text-xs text-gray-500">
                        {Math.round(item.course.duration / 60)}h {item.course.duration % 60}m
                      </span>
                    )}
                  </div>
                )}

                {/* URL link */}
                {item.type === 'URL' && item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-xs mt-1 inline-block"
                  >
                    {item.urlTitle || 'View Resource →'}
                  </a>
                )}

                {/* File info */}
                {item.type === 'FILE' && item.fileName && (
                  <p className="text-xs text-gray-500 mt-1">
                    {item.fileName}
                    {item.fileSize && ` (${(item.fileSize / 1024 / 1024).toFixed(1)} MB)`}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
