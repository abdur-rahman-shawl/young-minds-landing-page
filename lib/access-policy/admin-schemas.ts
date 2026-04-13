import { z } from 'zod';

import { accessPolicyConfigOverridesSchema } from '@/lib/access-policy/runtime-config';

export const adminUpsertAccessPolicyDraftInputSchema = z.object({
  overrides: accessPolicyConfigOverridesSchema.default({}),
  notes: z
    .string()
    .trim()
    .max(2000, 'Notes must be 2000 characters or fewer')
    .nullable()
    .optional(),
});

export const adminResetAccessPolicyDraftInputSchema = z
  .object({
    source: z.enum(['published', 'baseline']).default('published'),
  })
  .optional();

export type AdminUpsertAccessPolicyDraftInput = z.infer<
  typeof adminUpsertAccessPolicyDraftInputSchema
>;
export type AdminResetAccessPolicyDraftInput = z.infer<
  typeof adminResetAccessPolicyDraftInputSchema
>;
