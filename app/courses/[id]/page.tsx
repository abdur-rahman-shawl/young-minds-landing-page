'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    if (params.id) {
      router.replace(`/dashboard?section=courses&courseId=${params.id}`);
    }
  }, [params.id, router]);

  return null;
}
