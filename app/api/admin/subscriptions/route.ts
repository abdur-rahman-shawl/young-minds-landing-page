import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  subscriptionFeatures,
  subscriptionPlanFeatures,
  subscriptionPlanPrices,
  subscriptionPlans,
} from '@/lib/db/schema';
import { auth } from '@/lib/auth';
import { getUserWithRoles } from '@/lib/db/user-helpers';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

const planStatusEnum = z.enum(['active', 'draft', 'archived']);
const billingIntervalEnum = z.enum(['month', 'year']);

const planFeatureSchema = z.object({
  featureKey: z.string().min(1),
  isIncluded: z.boolean(),
  limitCount: z.string().optional(),
  limitMinutes: z.string().optional(),
  limitText: z.string().optional(),
  limitInterval: z.enum(['none', 'month', 'year']).optional(),
  limitIntervalCount: z.string().optional(),
  priceAmount: z.string().optional(),
  priceCurrency: z.string().optional(),
});

const planSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  status: planStatusEnum,
  metadata: z.object({
    seats: z.string().optional(),
    highlights: z.string().optional(),
  }).optional(),
  prices: z.object({
    standard: z.object({
      amount: z.string().optional(),
      currency: z.string().optional(),
    }),
    introductory: z.object({
      amount: z.string().optional(),
      currency: z.string().optional(),
      introDurationIntervals: z.string().optional(),
    }),
  }),
  features: z.array(planFeatureSchema),
});

const updatePayloadSchema = z.object({
  audience: z.enum(['mentor', 'mentee']),
  plans: z.array(planSchema).min(1),
});

async function ensureAdmin(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return {
        error: NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 },
        ),
      };
    }

    const userWithRoles = await getUserWithRoles(session.user.id);
    const isAdmin = userWithRoles?.roles?.some((role: any) => role.name === 'admin');

    if (!isAdmin) {
      return {
        error: NextResponse.json(
          { success: false, error: 'Admin access required' },
          { status: 403 },
        ),
      };
    }

    return { session };
  } catch (error) {
    console.error('Admin auth check failed:', error);
    return {
      error: NextResponse.json(
        { success: false, error: 'Authentication failed' },
        { status: 401 },
      ),
    };
  }
}

const parseIntOrNull = (value?: string) => {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const parseDecimalOrNull = (value?: string) => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await ensureAdmin(request);
    if ('error' in adminCheck) {
      return adminCheck.error;
    }

    const plans = await db
      .select()
      .from(subscriptionPlans)
      .orderBy(subscriptionPlans.sortOrder);

    const planIds = plans.map((plan) => plan.id);

    const prices = planIds.length
      ? await db
          .select()
          .from(subscriptionPlanPrices)
          .where(inArray(subscriptionPlanPrices.planId, planIds))
      : [];

    const features = await db.select().from(subscriptionFeatures);

    const planFeatures = planIds.length
      ? await db
          .select({
            planId: subscriptionPlanFeatures.planId,
            featureId: subscriptionPlanFeatures.featureId,
            isIncluded: subscriptionPlanFeatures.isIncluded,
            limitCount: subscriptionPlanFeatures.limitCount,
            limitMinutes: subscriptionPlanFeatures.limitMinutes,
            limitText: subscriptionPlanFeatures.limitText,
            limitInterval: subscriptionPlanFeatures.limitInterval,
            limitIntervalCount: subscriptionPlanFeatures.limitIntervalCount,
            priceAmount: subscriptionPlanFeatures.priceAmount,
            priceCurrency: subscriptionPlanFeatures.priceCurrency,
            notes: subscriptionPlanFeatures.notes,
            featureKey: subscriptionFeatures.featureKey,
            featureName: subscriptionFeatures.name,
            featureDescription: subscriptionFeatures.description,
            valueType: subscriptionFeatures.valueType,
            unit: subscriptionFeatures.unit,
          })
          .from(subscriptionPlanFeatures)
          .innerJoin(
            subscriptionFeatures,
            eq(subscriptionPlanFeatures.featureId, subscriptionFeatures.id),
          )
          .where(inArray(subscriptionPlanFeatures.planId, planIds))
      : [];

    const featuresByPlan = planFeatures.reduce<Record<string, typeof planFeatures>>((acc, item) => {
      if (!acc[item.planId]) acc[item.planId] = [];
      acc[item.planId].push(item);
      return acc;
    }, {});

    const pricesByPlan = prices.reduce<Record<string, typeof prices>>((acc, item) => {
      if (!acc[item.planId]) acc[item.planId] = [];
      acc[item.planId].push(item);
      return acc;
    }, {});

    const featureCatalog = features.map((feature) => ({
      id: feature.id,
      featureKey: feature.featureKey,
      name: feature.name,
      description: feature.description,
      valueType: feature.valueType,
      unit: feature.unit,
    }));

    const data = plans.map((plan) => {
      const planPrices = pricesByPlan[plan.id] ?? [];
      const standardPrice = planPrices.find((price) => price.priceType === 'standard');
      const introPrice = planPrices.find((price) => price.priceType === 'introductory');
      const planFeatureRows = featuresByPlan[plan.id] ?? [];
      const planFeatureMap = new Map(
        planFeatureRows.map((row) => [row.featureKey, row]),
      );

      const mergedFeatures = featureCatalog.map((feature) => {
        const featureRow = planFeatureMap.get(feature.featureKey);
        return {
          featureKey: feature.featureKey,
          name: feature.name,
          description: feature.description,
          valueType: feature.valueType,
          unit: feature.unit,
          isIncluded: featureRow?.isIncluded ?? false,
          limitCount: featureRow?.limitCount ?? null,
          limitMinutes: featureRow?.limitMinutes ?? null,
          limitText: featureRow?.limitText ?? null,
          limitInterval: featureRow?.limitInterval ?? null,
          limitIntervalCount: featureRow?.limitIntervalCount ?? null,
          priceAmount: featureRow?.priceAmount ?? null,
          priceCurrency: featureRow?.priceCurrency ?? null,
          notes: featureRow?.notes ?? null,
        };
      });

      return {
        id: plan.id,
        planKey: plan.planKey,
        audience: plan.audience,
        name: plan.name,
        description: plan.description,
        status: plan.status,
        sortOrder: plan.sortOrder,
        metadata: plan.metadata ?? {},
        prices: {
          standard: standardPrice
            ? {
                amount: standardPrice.amount,
                currency: standardPrice.currency,
                billingInterval: standardPrice.billingInterval,
                billingIntervalCount: standardPrice.billingIntervalCount,
              }
            : null,
          introductory: introPrice
            ? {
                amount: introPrice.amount,
                currency: introPrice.currency,
                billingInterval: introPrice.billingInterval,
                billingIntervalCount: introPrice.billingIntervalCount,
                introDurationIntervals: introPrice.introDurationIntervals,
              }
            : null,
        },
        features: mergedFeatures,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Admin subscriptions GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch subscriptions' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const adminCheck = await ensureAdmin(request);
    if ('error' in adminCheck) {
      return adminCheck.error;
    }

    const payload = updatePayloadSchema.parse(await request.json());

    const planIds = payload.plans.map((plan) => plan.id);
    const existingPlans = await db
      .select({
        id: subscriptionPlans.id,
        metadata: subscriptionPlans.metadata,
      })
      .from(subscriptionPlans)
      .where(inArray(subscriptionPlans.id, planIds));

    const metadataByPlan = new Map(
      existingPlans.map((plan) => [plan.id, plan.metadata ?? {}]),
    );

    const featureRows = await db.select().from(subscriptionFeatures);
    const featureIdByKey = new Map(
      featureRows.map((feature) => [feature.featureKey, feature.id]),
    );

    for (const plan of payload.plans) {
      const existingMetadata = metadataByPlan.get(plan.id) ?? {};
      const nextMetadata = {
        ...existingMetadata,
        seats: plan.metadata?.seats ?? existingMetadata.seats,
        highlights: plan.metadata?.highlights ?? existingMetadata.highlights,
      };

      await db
        .update(subscriptionPlans)
        .set({
          name: plan.name,
          description: plan.description,
          status: plan.status,
          metadata: nextMetadata,
          updatedAt: new Date(),
        })
        .where(
          and(eq(subscriptionPlans.id, plan.id), eq(subscriptionPlans.audience, payload.audience)),
        );

      const existingPrices = await db
        .select()
        .from(subscriptionPlanPrices)
        .where(eq(subscriptionPlanPrices.planId, plan.id));

      const standardPrice = existingPrices.find((price) => price.priceType === 'standard');
      const introPrice = existingPrices.find((price) => price.priceType === 'introductory');

      const standardAmount = parseDecimalOrNull(plan.prices.standard.amount);
      const standardCurrency = plan.prices.standard.currency?.trim() || standardPrice?.currency || 'INR';

      if (standardPrice) {
        await db
          .update(subscriptionPlanPrices)
          .set({
            amount: standardAmount ?? '0',
            currency: standardCurrency,
            updatedAt: new Date(),
          })
          .where(eq(subscriptionPlanPrices.id, standardPrice.id));
      } else {
        await db.insert(subscriptionPlanPrices).values({
          planId: plan.id,
          priceType: 'standard',
          billingInterval: 'month',
          billingIntervalCount: 1,
          amount: standardAmount ?? '0',
          currency: standardCurrency,
        });
      }

      const introAmount = parseDecimalOrNull(plan.prices.introductory.amount);
      const introCurrency = plan.prices.introductory.currency?.trim() || introPrice?.currency || standardCurrency;
      const introDuration = parseIntOrNull(plan.prices.introductory.introDurationIntervals);

      if (introPrice) {
        await db
          .update(subscriptionPlanPrices)
          .set({
            amount: introAmount ?? '0',
            currency: introCurrency,
            introDurationIntervals: introDuration,
            updatedAt: new Date(),
          })
          .where(eq(subscriptionPlanPrices.id, introPrice.id));
      } else {
        await db.insert(subscriptionPlanPrices).values({
          planId: plan.id,
          priceType: 'introductory',
          billingInterval: 'month',
          billingIntervalCount: 1,
          amount: introAmount ?? '0',
          currency: introCurrency,
          introDurationIntervals: introDuration,
        });
      }

      for (const feature of plan.features) {
        const featureId = featureIdByKey.get(feature.featureKey);
        if (!featureId) continue;

        const limitInterval =
          feature.limitInterval && feature.limitInterval !== 'none'
            ? billingIntervalEnum.parse(feature.limitInterval)
            : null;

        await db
          .insert(subscriptionPlanFeatures)
          .values({
            planId: plan.id,
            featureId,
            isIncluded: feature.isIncluded,
            limitCount: parseIntOrNull(feature.limitCount),
            limitMinutes: parseIntOrNull(feature.limitMinutes),
            limitText: feature.limitText || null,
            limitInterval,
            limitIntervalCount: parseIntOrNull(feature.limitIntervalCount) ?? 1,
            priceAmount: parseDecimalOrNull(feature.priceAmount),
            priceCurrency: feature.priceCurrency || null,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [subscriptionPlanFeatures.planId, subscriptionPlanFeatures.featureId],
            set: {
              isIncluded: feature.isIncluded,
              limitCount: parseIntOrNull(feature.limitCount),
              limitMinutes: parseIntOrNull(feature.limitMinutes),
              limitText: feature.limitText || null,
              limitInterval,
              limitIntervalCount: parseIntOrNull(feature.limitIntervalCount) ?? 1,
              priceAmount: parseDecimalOrNull(feature.priceAmount),
              priceCurrency: feature.priceCurrency || null,
              updatedAt: new Date(),
            },
          });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload', details: error.flatten() },
        { status: 400 },
      );
    }
    console.error('Admin subscriptions PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update subscriptions' },
      { status: 500 },
    );
  }
}
