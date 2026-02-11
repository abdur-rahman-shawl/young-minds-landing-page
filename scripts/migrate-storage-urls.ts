import { db } from '@/lib/db';
import { mentors, mentorContent, sectionContentItems, courses } from '@/lib/db/schema';
import { normalizeStorageValue } from '@/lib/storage';
import { sql } from 'drizzle-orm';

const log = (message: string) => {
  console.log(`[migrate-storage-urls] ${message}`);
};

async function updateMentorUrls() {
  const rows = await db
    .select({
      id: mentors.id,
      profileImageUrl: mentors.profileImageUrl,
      bannerImageUrl: mentors.bannerImageUrl,
      resumeUrl: mentors.resumeUrl,
    })
    .from(mentors);

  let updated = 0;
  for (const row of rows) {
    const nextProfile = normalizeStorageValue(row.profileImageUrl);
    const nextBanner = normalizeStorageValue(row.bannerImageUrl);
    const nextResume = normalizeStorageValue(row.resumeUrl);

    const needsUpdate =
      nextProfile !== row.profileImageUrl ||
      nextBanner !== row.bannerImageUrl ||
      nextResume !== row.resumeUrl;

    if (!needsUpdate) continue;

    await db
      .update(mentors)
      .set({
        profileImageUrl: nextProfile,
        bannerImageUrl: nextBanner,
        resumeUrl: nextResume,
        updatedAt: sql`NOW()`,
      })
      .where(sql`${mentors.id} = ${row.id}`);

    updated += 1;
  }

  log(`Mentors updated: ${updated}`);
}

async function updateMentorContentUrls() {
  const rows = await db
    .select({
      id: mentorContent.id,
      fileUrl: mentorContent.fileUrl,
    })
    .from(mentorContent);

  let updated = 0;
  for (const row of rows) {
    const nextFileUrl = normalizeStorageValue(row.fileUrl);
    if (nextFileUrl === row.fileUrl) continue;

    await db
      .update(mentorContent)
      .set({
        fileUrl: nextFileUrl,
        updatedAt: sql`NOW()`,
      })
      .where(sql`${mentorContent.id} = ${row.id}`);

    updated += 1;
  }

  log(`Mentor content updated: ${updated}`);
}

async function updateContentItemUrls() {
  const rows = await db
    .select({
      id: sectionContentItems.id,
      fileUrl: sectionContentItems.fileUrl,
    })
    .from(sectionContentItems);

  let updated = 0;
  for (const row of rows) {
    const nextFileUrl = normalizeStorageValue(row.fileUrl);
    if (nextFileUrl === row.fileUrl) continue;

    await db
      .update(sectionContentItems)
      .set({
        fileUrl: nextFileUrl,
        updatedAt: sql`NOW()`,
      })
      .where(sql`${sectionContentItems.id} = ${row.id}`);

    updated += 1;
  }

  log(`Section content items updated: ${updated}`);
}

async function updateCourseThumbnails() {
  const rows = await db
    .select({
      id: courses.id,
      thumbnailUrl: courses.thumbnailUrl,
    })
    .from(courses);

  let updated = 0;
  for (const row of rows) {
    const nextThumbnail = normalizeStorageValue(row.thumbnailUrl);
    if (nextThumbnail === row.thumbnailUrl) continue;

    await db
      .update(courses)
      .set({
        thumbnailUrl: nextThumbnail,
        updatedAt: sql`NOW()`,
      })
      .where(sql`${courses.id} = ${row.id}`);

    updated += 1;
  }

  log(`Course thumbnails updated: ${updated}`);
}

async function main() {
  log('Starting storage URL migration...');
  await updateMentorUrls();
  await updateMentorContentUrls();
  await updateContentItemUrls();
  await updateCourseThumbnails();
  log('Storage URL migration complete.');
  process.exit(0);
}

main().catch((error) => {
  console.error('[migrate-storage-urls] Failed:', error);
  process.exit(1);
});
