import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { adminProcedure, createTRPCRouter, mentorProcedure } from '../init';
import {
  ContentServiceError,
  archiveContent,
  createContent,
  createContentItem,
  createModule,
  createSection,
  deleteContent,
  deleteContentItem,
  deleteModule,
  deleteSection,
  getContent,
  listAdminContent,
  listContent,
  listProfileContent,
  reviewAdminContent,
  saveCourse,
  submitContentForReview,
  updateContent,
  updateContentItem,
  updateModule,
  updateProfileContent,
  updateSection,
} from '@/lib/content/server/service';
import {
  archiveContentInputSchema,
  createContentInputSchema,
  createContentItemInputSchema,
  createModuleInputSchema,
  createSectionInputSchema,
  deleteContentInputSchema,
  deleteContentItemInputSchema,
  deleteModuleInputSchema,
  deleteSectionInputSchema,
  getContentInputSchema,
  listAdminContentInputSchema,
  reviewAdminContentInputSchema,
  saveCourseInputSchema,
  submitContentForReviewInputSchema,
  updateContentInputSchema,
  updateContentItemInputSchema,
  updateProfileContentInputSchema,
  updateSectionInputSchema,
  updateModuleInputSchema,
} from '@/lib/content/server/schemas';

function mapStatusToTRPCCode(status: number): TRPCError['code'] {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    default:
      return 'INTERNAL_SERVER_ERROR';
  }
}

function throwAsTRPCError(error: unknown, fallbackMessage: string): never {
  if (error instanceof TRPCError) {
    throw error;
  }

  if (error instanceof ContentServiceError) {
    throw new TRPCError({
      code: mapStatusToTRPCCode(error.status),
      message: error.message,
      cause: error,
    });
  }

  if (error instanceof z.ZodError) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: error.errors[0]?.message ?? 'Invalid input',
      cause: error,
    });
  }

  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: fallbackMessage,
    cause: error instanceof Error ? error : undefined,
  });
}

export const contentRouter = createTRPCRouter({
  list: mentorProcedure.query(async ({ ctx }) => {
    try {
      return await listContent(ctx.userId, ctx.currentUser);
    } catch (error) {
      throwAsTRPCError(error, 'Failed to fetch content');
    }
  }),
  get: mentorProcedure
    .input(getContentInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await getContent(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch content');
      }
    }),
  create: mentorProcedure
    .input(createContentInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createContent(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to create content');
      }
    }),
  update: mentorProcedure
    .input(updateContentInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateContent(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to update content');
      }
    }),
  archive: mentorProcedure
    .input(archiveContentInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await archiveContent(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to update content status');
      }
    }),
  delete: mentorProcedure
    .input(deleteContentInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteContent(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to delete content');
      }
    }),
  saveCourse: mentorProcedure
    .input(saveCourseInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await saveCourse(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to save course');
      }
    }),
  createModule: mentorProcedure
    .input(createModuleInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createModule(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to create module');
      }
    }),
  updateModule: mentorProcedure
    .input(updateModuleInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateModule(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to update module');
      }
    }),
  deleteModule: mentorProcedure
    .input(deleteModuleInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteModule(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to delete module');
      }
    }),
  createSection: mentorProcedure
    .input(createSectionInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createSection(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to create section');
      }
    }),
  updateSection: mentorProcedure
    .input(updateSectionInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateSection(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to update section');
      }
    }),
  deleteSection: mentorProcedure
    .input(deleteSectionInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteSection(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to delete section');
      }
    }),
  createContentItem: mentorProcedure
    .input(createContentItemInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createContentItem(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to create content item');
      }
    }),
  updateContentItem: mentorProcedure
    .input(updateContentItemInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateContentItem(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to update content item');
      }
    }),
  deleteContentItem: mentorProcedure
    .input(deleteContentItemInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteContentItem(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to delete content item');
      }
    }),
  submitForReview: mentorProcedure
    .input(submitContentForReviewInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await submitContentForReview(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to submit content for review');
      }
    }),
  profileList: mentorProcedure.query(async ({ ctx }) => {
    try {
      return await listProfileContent(ctx.userId, ctx.currentUser);
    } catch (error) {
      throwAsTRPCError(error, 'Failed to fetch profile content');
    }
  }),
  profileUpdate: mentorProcedure
    .input(updateProfileContentInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateProfileContent(ctx.userId, input, ctx.currentUser);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to update profile content');
      }
    }),
  adminList: adminProcedure
    .input(listAdminContentInputSchema)
    .query(async ({ input }) => {
      try {
        return await listAdminContent(input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch admin content');
      }
    }),
  adminReview: adminProcedure
    .input(reviewAdminContentInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await reviewAdminContent(ctx.userId, input);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to review content');
      }
    }),
});
