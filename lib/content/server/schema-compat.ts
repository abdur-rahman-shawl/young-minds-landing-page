import { mentorContent } from '@/lib/db/schema';

export const CONTENT_OPTIONAL_COLUMN_MAP = {
  statusBeforeArchive: 'status_before_archive',
  requireReviewAfterRestore: 'require_review_after_restore',
  deletedAt: 'deleted_at',
  deletedBy: 'deleted_by',
  deleteReason: 'delete_reason',
  purgeAfterAt: 'purge_after_at',
} as const;

export type ContentOptionalColumnKey = keyof typeof CONTENT_OPTIONAL_COLUMN_MAP;
export type ContentSchemaCapabilities = Record<ContentOptionalColumnKey, boolean>;

export function createContentSchemaCapabilities(
  columnNames: Iterable<string>
): ContentSchemaCapabilities {
  const columns = new Set(columnNames);

  return {
    statusBeforeArchive: columns.has(
      CONTENT_OPTIONAL_COLUMN_MAP.statusBeforeArchive
    ),
    requireReviewAfterRestore: columns.has(
      CONTENT_OPTIONAL_COLUMN_MAP.requireReviewAfterRestore
    ),
    deletedAt: columns.has(CONTENT_OPTIONAL_COLUMN_MAP.deletedAt),
    deletedBy: columns.has(CONTENT_OPTIONAL_COLUMN_MAP.deletedBy),
    deleteReason: columns.has(CONTENT_OPTIONAL_COLUMN_MAP.deleteReason),
    purgeAfterAt: columns.has(CONTENT_OPTIONAL_COLUMN_MAP.purgeAfterAt),
  };
}

export function buildContentSelectShape(capabilities: ContentSchemaCapabilities) {
  return {
    id: mentorContent.id,
    mentorId: mentorContent.mentorId,
    title: mentorContent.title,
    description: mentorContent.description,
    type: mentorContent.type,
    status: mentorContent.status,
    fileUrl: mentorContent.fileUrl,
    fileName: mentorContent.fileName,
    fileSize: mentorContent.fileSize,
    mimeType: mentorContent.mimeType,
    url: mentorContent.url,
    urlTitle: mentorContent.urlTitle,
    urlDescription: mentorContent.urlDescription,
    submittedForReviewAt: mentorContent.submittedForReviewAt,
    reviewedAt: mentorContent.reviewedAt,
    reviewedBy: mentorContent.reviewedBy,
    reviewNote: mentorContent.reviewNote,
    flagReason: mentorContent.flagReason,
    flaggedAt: mentorContent.flaggedAt,
    flaggedBy: mentorContent.flaggedBy,
    createdAt: mentorContent.createdAt,
    updatedAt: mentorContent.updatedAt,
    ...(capabilities.statusBeforeArchive
      ? { statusBeforeArchive: mentorContent.statusBeforeArchive }
      : {}),
    ...(capabilities.requireReviewAfterRestore
      ? {
          requireReviewAfterRestore: mentorContent.requireReviewAfterRestore,
        }
      : {}),
    ...(capabilities.deletedAt ? { deletedAt: mentorContent.deletedAt } : {}),
    ...(capabilities.deleteReason
      ? { deleteReason: mentorContent.deleteReason }
      : {}),
    ...(capabilities.purgeAfterAt
      ? { purgeAfterAt: mentorContent.purgeAfterAt }
      : {}),
  };
}

export function normalizeContentRow<T extends Record<string, unknown>>(
  row: T,
  capabilities: ContentSchemaCapabilities
) {
  return {
    ...row,
    statusBeforeArchive: capabilities.statusBeforeArchive
      ? ((row as Record<string, unknown>).statusBeforeArchive as string | null) ??
        null
      : null,
    requireReviewAfterRestore: capabilities.requireReviewAfterRestore
      ? Boolean(
          (row as Record<string, unknown>).requireReviewAfterRestore ?? false
        )
      : false,
    deletedAt: capabilities.deletedAt
      ? ((row as Record<string, unknown>).deletedAt as Date | null) ?? null
      : null,
    deleteReason: capabilities.deleteReason
      ? ((row as Record<string, unknown>).deleteReason as string | null) ?? null
      : null,
    purgeAfterAt: capabilities.purgeAfterAt
      ? ((row as Record<string, unknown>).purgeAfterAt as Date | null) ?? null
      : null,
  };
}

export function getMissingContentColumns(
  capabilities: ContentSchemaCapabilities,
  requiredColumns: ContentOptionalColumnKey[]
) {
  return requiredColumns
    .filter((key) => !capabilities[key])
    .map((key) => CONTENT_OPTIONAL_COLUMN_MAP[key]);
}
