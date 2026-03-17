import { and, eq, lte, isNotNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  mentorContent,
  courses,
  courseModules,
  courseSections,
  sectionContentItems,
} from '@/lib/db/schema';
import { deleteStorageValues, normalizeStorageValue } from '@/lib/storage';

const log = (message: string) => {
  console.log(`[purge-deleted-mentor-content] ${message}`);
};

async function getContentFileValues(contentId: string): Promise<Array<string | null>> {
  const values: Array<string | null> = [];

  const contentRows = await db.select({
    fileUrl: mentorContent.fileUrl,
  })
    .from(mentorContent)
    .where(eq(mentorContent.id, contentId))
    .limit(1);

  if (contentRows.length) {
    values.push(contentRows[0].fileUrl);
  }

  const courseRows = await db.select({
    id: courses.id,
    thumbnailUrl: courses.thumbnailUrl,
  })
    .from(courses)
    .where(eq(courses.contentId, contentId));

  for (const courseRow of courseRows) {
    values.push(courseRow.thumbnailUrl);

    const itemRows = await db.select({
      fileUrl: sectionContentItems.fileUrl,
    })
      .from(sectionContentItems)
      .innerJoin(courseSections, eq(sectionContentItems.sectionId, courseSections.id))
      .innerJoin(courseModules, eq(courseSections.moduleId, courseModules.id))
      .where(eq(courseModules.courseId, courseRow.id));

    for (const itemRow of itemRows) {
      values.push(itemRow.fileUrl);
    }
  }

  return values;
}

async function purgeOneContent(contentId: string) {
  const rawValues = await getContentFileValues(contentId);
  const normalizedValues = rawValues.map((value) => normalizeStorageValue(value));
  await deleteStorageValues(normalizedValues);

  await db.delete(mentorContent).where(eq(mentorContent.id, contentId));
}

async function main() {
  const now = new Date();
  log(`Starting purge run at ${now.toISOString()}`);

  const candidates = await db.select({
    id: mentorContent.id,
    deletedAt: mentorContent.deletedAt,
    purgeAfterAt: mentorContent.purgeAfterAt,
  })
    .from(mentorContent)
    .where(and(
      isNotNull(mentorContent.deletedAt),
      isNotNull(mentorContent.purgeAfterAt),
      lte(mentorContent.purgeAfterAt, now)
    ));

  if (!candidates.length) {
    log('No content eligible for purge.');
    return;
  }

  log(`Found ${candidates.length} content item(s) eligible for purge.`);
  let successCount = 0;
  let failureCount = 0;

  for (const candidate of candidates) {
    try {
      await purgeOneContent(candidate.id);
      successCount += 1;
      log(`Purged content ${candidate.id}`);
    } catch (error) {
      failureCount += 1;
      console.error(`[purge-deleted-mentor-content] Failed to purge ${candidate.id}:`, error);
    }
  }

  log(`Purge completed. Success: ${successCount}, Failed: ${failureCount}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[purge-deleted-mentor-content] Unhandled error:', error);
    process.exit(1);
  });
