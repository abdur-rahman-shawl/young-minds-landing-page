import { z } from 'zod';

import {
  getPublicCourseDetail,
  listPublicContentItemReviews,
  listPublicCourseReviews,
  listPublicCourses,
} from '@/lib/courses/server/public-service';
import {
  listCitiesByStateId,
  listCountries,
  listStatesByCountryId,
} from '@/lib/locations/server/service';
import {
  getMentorPublicContent,
  listPublicMentors,
} from '@/lib/mentor/server/public-service';
import { throwAsTRPCError } from '@/lib/trpc/router-error';

import { createTRPCRouter, publicProcedure } from '../init';

const courseDifficultySchema = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']);
const sortBySchema = z.enum(['created_at', 'price', 'rating', 'enrollment_count']);
const sortOrderSchema = z.enum(['asc', 'desc']);

export const publicRouter = createTRPCRouter({
  listCourses: publicProcedure
    .input(
      z
        .object({
          page: z.number().int().positive().optional(),
          limit: z.number().int().positive().optional(),
          search: z.string().trim().optional(),
          category: z.string().trim().optional(),
          difficulty: courseDifficultySchema.optional(),
          minPrice: z.number().nonnegative().optional(),
          maxPrice: z.number().nonnegative().optional(),
          sortBy: sortBySchema.optional(),
          sortOrder: sortOrderSchema.optional(),
          featured: z.boolean().optional(),
          mentorId: z.string().uuid().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      try {
        return await listPublicCourses(input ?? {});
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch courses');
      }
    }),
  getCourse: publicProcedure
    .input(
      z.object({
        courseId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return await getPublicCourseDetail(input.courseId, ctx.userId);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch course details');
      }
    }),
  listCourseReviews: publicProcedure
    .input(
      z.object({
        courseId: z.string().uuid(),
        limit: z.number().int().positive().optional(),
        offset: z.number().int().min(0).optional(),
        includeMine: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return await listPublicCourseReviews(input.courseId, ctx.userId, {
          limit: input.limit,
          offset: input.offset,
          includeMine: input.includeMine,
        });
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch reviews');
      }
    }),
  listContentItemReviews: publicProcedure
    .input(
      z.object({
        courseId: z.string().uuid(),
        itemId: z.string().uuid(),
        limit: z.number().int().positive().optional(),
        offset: z.number().int().min(0).optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        return await listPublicContentItemReviews(input.courseId, input.itemId, {
          limit: input.limit,
          offset: input.offset,
        });
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch reviews');
      }
    }),
  listMentors: publicProcedure
    .input(
      z
        .object({
          page: z.number().int().positive().optional(),
          pageSize: z.number().int().positive().optional(),
          q: z.string().trim().optional(),
          industry: z.string().trim().optional(),
          availableOnly: z.boolean().optional(),
          aiSearch: z.boolean().optional(),
          aiFilterOnly: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      try {
        return await listPublicMentors(ctx.userId, input ?? {});
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch mentors');
      }
    }),
  getMentorPublicContent: publicProcedure
    .input(
      z.object({
        mentorId: z.string().uuid(),
      })
    )
    .query(async ({ input }) => {
      try {
        return await getMentorPublicContent(input.mentorId);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch public content');
      }
    }),
  listCountries: publicProcedure.query(async () => {
    try {
      return await listCountries();
    } catch (error) {
      throwAsTRPCError(error, 'Failed to fetch countries');
    }
  }),
  listStates: publicProcedure
    .input(
      z.object({
        countryId: z.number().int().positive(),
      })
    )
    .query(async ({ input }) => {
      try {
        return await listStatesByCountryId(input.countryId);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch states');
      }
    }),
  listCities: publicProcedure
    .input(
      z.object({
        stateId: z.number().int().positive(),
      })
    )
    .query(async ({ input }) => {
      try {
        return await listCitiesByStateId(input.stateId);
      } catch (error) {
        throwAsTRPCError(error, 'Failed to fetch cities');
      }
    }),
});
