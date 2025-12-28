"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type PlanStatus = "active" | "draft" | "archived";

interface PlanForm {
  id: string;
  planKey: string;
  name: string;
  description: string;
  status: PlanStatus;
  standardAmount: string;
  introAmount: string;
  currency: string;
  introDurationIntervals: string;
  seats: string;
  highlights: string;
}

type FeatureInterval = "none" | "month" | "year";

interface PlanFeatureConfig {
  key: string;
  label: string;
  description?: string;
  isIncluded: boolean;
  limitCount: string;
  limitMinutes: string;
  limitText: string;
  priceAmount: string;
  priceCurrency: string;
  limitInterval: FeatureInterval;
  limitIntervalCount: string;
}

const mentorPlansSeed: PlanForm[] = [
  {
    id: "mentor_silver",
    planKey: "mentor_silver",
    name: "Silver",
    description: "Entry plan for mentors",
    status: "active",
    standardAmount: "999",
    introAmount: "0",
    currency: "INR",
    introDurationIntervals: "1",
    seats: "",
    highlights: "Limited AI visibility, 1 paid video session, limited knowledge hub access",
  },
  {
    id: "mentor_gold",
    planKey: "mentor_gold",
    name: "Gold",
    description: "Growth plan for mentors",
    status: "active",
    standardAmount: "2999",
    introAmount: "999",
    currency: "INR",
    introDurationIntervals: "1",
    seats: "",
    highlights: "25 AI appearances/month, 5-10 paid sessions, limited knowledge hub access",
  },
  {
    id: "mentor_platinum",
    planKey: "mentor_platinum",
    name: "Platinum",
    description: "Advanced plan for mentors",
    status: "active",
    standardAmount: "4999",
    introAmount: "1999",
    currency: "INR",
    introDurationIntervals: "1",
    seats: "",
    highlights: "100 AI appearances/month, 10-20 paid sessions, analytics access",
  },
  {
    id: "mentor_diamond",
    planKey: "mentor_diamond",
    name: "Diamond",
    description: "Premium plan for mentors",
    status: "active",
    standardAmount: "9999",
    introAmount: "2999",
    currency: "INR",
    introDurationIntervals: "1",
    seats: "",
    highlights: "Unlimited visibility, 20-30 paid sessions, deep analytics, partner offers",
  },
  {
    id: "mentor_consulting_org",
    planKey: "mentor_consulting_org",
    name: "Consulting Org",
    description: "Organization plan for mentor teams",
    status: "active",
    standardAmount: "19999",
    introAmount: "9999",
    currency: "INR",
    introDurationIntervals: "1",
    seats: "5",
    highlights: "Team roadmap, 25 sessions (60 mins), deep analytics, unlimited visibility",
  },
];

const menteePlansSeed: PlanForm[] = [
  {
    id: "mentee_intro",
    planKey: "mentee_intro",
    name: "Introduction Plan",
    description: "Free trial for everyone",
    status: "active",
    standardAmount: "0",
    introAmount: "0",
    currency: "INR",
    introDurationIntervals: "1",
    seats: "",
    highlights: "3 AI sessions, 1 free call, limited knowledge hub access",
  },
  {
    id: "mentee_youth",
    planKey: "mentee_youth",
    name: "Youth",
    description: "Students plan",
    status: "active",
    standardAmount: "1999",
    introAmount: "499",
    currency: "INR",
    introDurationIntervals: "1",
    seats: "",
    highlights: "10 AI sessions/month, 5 paid calls, counseling discounts",
  },
  {
    id: "mentee_professionals",
    planKey: "mentee_professionals",
    name: "Professionals",
    description: "Working individuals/startups/business owners",
    status: "active",
    standardAmount: "4999",
    introAmount: "999",
    currency: "INR",
    introDurationIntervals: "1",
    seats: "",
    highlights: "20 AI sessions/month, 8 paid calls, analytics access",
  },
  {
    id: "mentee_corporates",
    planKey: "mentee_corporates",
    name: "Corporates",
    description: "Max 5-member team",
    status: "active",
    standardAmount: "23999",
    introAmount: "9999",
    currency: "INR",
    introDurationIntervals: "1",
    seats: "5",
    highlights: "Unlimited AI, 10 paid calls, deep analytics, org discount",
  },
];

const mentorFeatureBase: Array<Pick<PlanFeatureConfig, "key" | "label" | "description">> = [
  { key: "mentor_profile", label: "Mentor Profile" },
  { key: "company_page", label: "Company Page" },
  { key: "ai_visibility", label: "AI push visibility", description: "Search appearance & visibility" },
  { key: "lead_qualifying_session", label: "Lead qualifying session (free)" },
  { key: "paid_video_sessions", label: "Paid 1:1 video sessions" },
  { key: "create_post_content", label: "Create & post content" },
  { key: "roadmap_upload", label: "Roadmap / whitepaper upload" },
  { key: "knowledge_hub_access", label: "Knowledge hub access" },
  { key: "industry_expert_listing", label: "Industry expert listing" },
  { key: "roadmap_download", label: "Roadmap / whitepaper download" },
  { key: "live_sessions", label: "Live sessions" },
  { key: "courses_pre_recorded", label: "Courses / pre-recorded videos" },
  { key: "analytics_dashboard", label: "Analytics dashboard" },
  { key: "priority_support", label: "Priority support" },
  { key: "exclusive_partner_offers", label: "Exclusive partner offers" },
  { key: "early_access_new_features", label: "Early access to new features" },
];

const menteeFeatureBase: Array<Pick<PlanFeatureConfig, "key" | "label" | "description">> = [
  { key: "individual_profile_page", label: "Individual profile page" },
  { key: "company_page", label: "Company page" },
  { key: "ai_search_sessions", label: "AI search sessions" },
  { key: "free_video_call", label: "Free 1:1 video call" },
  { key: "paid_video_calls", label: "Paid 1:1 video calls" },
  { key: "counseling_sessions", label: "Counseling sessions" },
  { key: "create_post_content", label: "Create & post content" },
  { key: "roadmap_download", label: "Roadmap / whitepaper download" },
  { key: "knowledge_hub_access", label: "Knowledge hub access" },
  { key: "industry_expert_access", label: "Industry expert access" },
  { key: "live_sessions", label: "Live sessions" },
  { key: "courses_pre_recorded", label: "Courses / pre-recorded sessions" },
  { key: "analytics_dashboard", label: "Analytics dashboard" },
  { key: "priority_support", label: "Priority support" },
  { key: "exclusive_partner_offers", label: "Exclusive partner offers" },
  { key: "early_access_new_features", label: "Early access to new features" },
];

const mentorFeatureDefaults: Record<string, Partial<PlanFeatureConfig>> = {
  mentor_profile: { isIncluded: true },
  company_page: { isIncluded: true },
  ai_visibility: {
    isIncluded: true,
    limitText: "Limited",
    limitInterval: "month",
    limitIntervalCount: "1",
  },
  lead_qualifying_session: { isIncluded: true, limitMinutes: "30", limitCount: "1" },
  paid_video_sessions: { isIncluded: true, limitMinutes: "45", limitCount: "1" },
  create_post_content: { isIncluded: true, limitText: "Unlimited" },
  roadmap_upload: { isIncluded: true, limitText: "Unlimited" },
  knowledge_hub_access: { isIncluded: true, limitText: "Limited" },
  industry_expert_listing: { isIncluded: false },
  roadmap_download: { isIncluded: false },
  live_sessions: { isIncluded: false },
  courses_pre_recorded: { isIncluded: false },
  analytics_dashboard: { isIncluded: false },
  priority_support: { isIncluded: false },
  exclusive_partner_offers: { isIncluded: false },
  early_access_new_features: { isIncluded: false },
};

const mentorPlanFeatureDefaults: Record<string, Record<string, Partial<PlanFeatureConfig>>> = {
  mentor_silver: {
    ai_visibility: { limitText: "Limited" },
    paid_video_sessions: { limitCount: "1", limitMinutes: "45" },
    knowledge_hub_access: { limitText: "Limited" },
  },
  mentor_gold: {
    ai_visibility: { limitCount: "25", limitText: "", limitInterval: "month", limitIntervalCount: "1" },
    paid_video_sessions: {
      limitCount: "",
      limitText: "5-10 sessions",
      limitMinutes: "45",
      limitInterval: "month",
    },
    knowledge_hub_access: { limitText: "Limited" },
  },
  mentor_platinum: {
    ai_visibility: { limitCount: "100", limitText: "", limitInterval: "month", limitIntervalCount: "1" },
    paid_video_sessions: {
      limitCount: "",
      limitText: "10-20 sessions",
      limitMinutes: "45",
      limitInterval: "month",
    },
    knowledge_hub_access: { limitText: "Unlimited" },
    industry_expert_listing: { isIncluded: true, limitText: "1 category", limitCount: "1" },
    roadmap_download: { isIncluded: true, limitText: "1 category", limitCount: "1" },
    live_sessions: { isIncluded: true, limitMinutes: "120", limitInterval: "month" },
    courses_pre_recorded: { isIncluded: true, limitText: "2 videos/month (1 hr each)", limitInterval: "month" },
    analytics_dashboard: { isIncluded: true, limitText: "Real-time analytics" },
    priority_support: { isIncluded: true, limitText: "Chatbot" },
  },
  mentor_diamond: {
    ai_visibility: { limitText: "Unlimited (Trending Profile)" },
    paid_video_sessions: {
      limitCount: "",
      limitText: "20-30 sessions",
      limitMinutes: "45",
      limitInterval: "month",
    },
    knowledge_hub_access: { limitText: "Unlimited" },
    industry_expert_listing: { isIncluded: true, limitText: "Unlimited" },
    roadmap_download: { isIncluded: true, limitText: "Unlimited" },
    live_sessions: { isIncluded: true, limitMinutes: "240", limitInterval: "month" },
    courses_pre_recorded: { isIncluded: true, limitText: "5 videos/month (1 hr each)", limitInterval: "month" },
    analytics_dashboard: { isIncluded: true, limitText: "Deep analytics" },
    priority_support: { isIncluded: true, limitText: "Chatbot" },
    exclusive_partner_offers: { isIncluded: true },
    early_access_new_features: { isIncluded: true },
  },
  mentor_consulting_org: {
    ai_visibility: { limitText: "Unlimited" },
    paid_video_sessions: { limitCount: "25", limitMinutes: "60", limitInterval: "month" },
    create_post_content: { limitText: "Full personalized team roadmap" },
    knowledge_hub_access: { limitText: "Unlimited" },
    industry_expert_listing: { isIncluded: true, limitText: "Unlimited" },
    roadmap_download: { isIncluded: true, limitText: "Unlimited" },
    live_sessions: { isIncluded: true, limitMinutes: "240", limitInterval: "month" },
    courses_pre_recorded: { isIncluded: true, limitText: "5 videos/month (1 hr each)", limitInterval: "month" },
    analytics_dashboard: { isIncluded: true, limitText: "Deep analytics" },
    priority_support: { isIncluded: true, limitText: "Chatbot" },
    exclusive_partner_offers: { isIncluded: true },
    early_access_new_features: { isIncluded: true },
  },
};

const menteeFeatureDefaults: Record<string, Partial<PlanFeatureConfig>> = {
  individual_profile_page: { isIncluded: true },
  company_page: { isIncluded: true },
  ai_search_sessions: { isIncluded: true, limitCount: "3" },
  free_video_call: { isIncluded: true, limitCount: "1", limitMinutes: "30" },
  paid_video_calls: { isIncluded: true, limitCount: "1", limitMinutes: "45", priceAmount: "4999", priceCurrency: "INR" },
  counseling_sessions: { isIncluded: true, limitText: "Limited", priceAmount: "1999", priceCurrency: "INR" },
  create_post_content: { isIncluded: true, limitText: "Unlimited" },
  roadmap_download: { isIncluded: true, limitText: "Unlimited" },
  knowledge_hub_access: { isIncluded: true, limitText: "Limited" },
  industry_expert_access: { isIncluded: false },
  live_sessions: { isIncluded: false },
  courses_pre_recorded: { isIncluded: false },
  analytics_dashboard: { isIncluded: false },
  priority_support: { isIncluded: false },
  exclusive_partner_offers: { isIncluded: false },
  early_access_new_features: { isIncluded: false },
};

const menteePlanFeatureDefaults: Record<string, Record<string, Partial<PlanFeatureConfig>>> = {
  mentee_intro: {
    ai_search_sessions: { limitCount: "3", limitText: "Limited" },
    paid_video_calls: { limitCount: "1", limitMinutes: "45", priceAmount: "4999", priceCurrency: "INR" },
    counseling_sessions: { limitText: "Limited", priceAmount: "1999", priceCurrency: "INR" },
    knowledge_hub_access: { limitText: "Limited" },
  },
  mentee_youth: {
    ai_search_sessions: { limitCount: "10", limitInterval: "month", limitIntervalCount: "1" },
    paid_video_calls: { limitCount: "5", limitMinutes: "45", priceAmount: "1499", priceCurrency: "INR", limitInterval: "month" },
    counseling_sessions: {
      limitCount: "5",
      limitText: "",
      priceAmount: "599",
      priceCurrency: "INR",
      limitInterval: "month",
    },
    industry_expert_access: { isIncluded: true, limitText: "Limited" },
    live_sessions: { isIncluded: true, limitCount: "1", limitMinutes: "60", limitInterval: "month" },
    courses_pre_recorded: { isIncluded: true, limitText: "Limited access + 30% discount" },
  },
  mentee_professionals: {
    ai_search_sessions: { limitCount: "20", limitInterval: "month", limitIntervalCount: "1" },
    paid_video_calls: { limitCount: "8", limitMinutes: "45", priceAmount: "1499", priceCurrency: "INR", limitInterval: "month" },
    counseling_sessions: {
      limitCount: "10",
      limitText: "",
      priceAmount: "999",
      priceCurrency: "INR",
      limitInterval: "month",
    },
    knowledge_hub_access: { limitText: "Unlimited" },
    industry_expert_access: { isIncluded: true, limitText: "Unlimited access (rates as per expert profile)" },
    live_sessions: { isIncluded: true, limitCount: "2", limitMinutes: "60", limitInterval: "month" },
    courses_pre_recorded: { isIncluded: true, limitText: "Unlimited access + 20% discount" },
    analytics_dashboard: { isIncluded: true, limitText: "Real-time analytics" },
    priority_support: { isIncluded: true, limitText: "Chatbot" },
    exclusive_partner_offers: { isIncluded: true },
    early_access_new_features: { isIncluded: true },
  },
  mentee_corporates: {
    ai_search_sessions: { limitText: "Unlimited" },
    free_video_call: { limitText: "For 1 member only", limitCount: "1", limitMinutes: "30" },
    paid_video_calls: { limitCount: "10", limitMinutes: "45", priceAmount: "4999", priceCurrency: "INR", limitInterval: "month" },
    counseling_sessions: { isIncluded: false },
    create_post_content: { limitText: "Full personalized team roadmap" },
    knowledge_hub_access: { limitText: "Unlimited" },
    industry_expert_access: { isIncluded: true, limitText: "Unlimited calls (rates as per expert profile)" },
    live_sessions: { isIncluded: true, limitCount: "2", limitMinutes: "60", limitInterval: "month" },
    courses_pre_recorded: { isIncluded: true, limitText: "10% discount for registered org members" },
    analytics_dashboard: { isIncluded: true, limitText: "Deep analytics" },
    priority_support: { isIncluded: true, limitText: "Chatbot" },
    exclusive_partner_offers: { isIncluded: true },
    early_access_new_features: { isIncluded: true },
  },
};

const currencyOptions = ["INR", "USD", "EUR", "GBP"];

const normalizeIntegerInput = (value: string) => value.replace(/\D+/g, "");

const normalizeDecimalInput = (value: string) => {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  if (rest.length === 0) return whole;
  return `${whole}.${rest.join("")}`;
};

const buildPlanFeatures = (
  base: Array<Pick<PlanFeatureConfig, "key" | "label" | "description">>,
  globalDefaults: Record<string, Partial<PlanFeatureConfig>>,
  planOverrides: Record<string, Partial<PlanFeatureConfig>>,
) =>
  base.map((feature) => ({
    key: feature.key,
    label: feature.label,
    description: feature.description,
    isIncluded: false,
    limitCount: "",
    limitMinutes: "",
    limitText: "",
    priceAmount: "",
    priceCurrency: "",
    limitInterval: "none",
    limitIntervalCount: "1",
    ...globalDefaults[feature.key],
    ...planOverrides[feature.key],
  }));

export function AdminSubscriptions() {
  const [mentorPlans, setMentorPlans] = useState<PlanForm[]>(mentorPlansSeed);
  const [menteePlans, setMenteePlans] = useState<PlanForm[]>(menteePlansSeed);
  const [selectedMentorPlanId, setSelectedMentorPlanId] = useState(mentorPlansSeed[0]?.id ?? "");
  const [selectedMenteePlanId, setSelectedMenteePlanId] = useState(menteePlansSeed[0]?.id ?? "");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [mentorPlanFeatures, setMentorPlanFeatures] = useState<
    Record<string, PlanFeatureConfig[]>
  >(() =>
    Object.fromEntries(
      mentorPlansSeed.map((plan) => [
        plan.id,
        buildPlanFeatures(
          mentorFeatureBase,
          mentorFeatureDefaults,
          mentorPlanFeatureDefaults[plan.id] ?? {},
        ),
      ]),
    ),
  );
  const [menteePlanFeatures, setMenteePlanFeatures] = useState<
    Record<string, PlanFeatureConfig[]>
  >(() =>
    Object.fromEntries(
      menteePlansSeed.map((plan) => [
        plan.id,
        buildPlanFeatures(
          menteeFeatureBase,
          menteeFeatureDefaults,
          menteePlanFeatureDefaults[plan.id] ?? {},
        ),
      ]),
    ),
  );

  const stats = useMemo(() => {
    const all = [...mentorPlans, ...menteePlans];
    const active = all.filter((plan) => plan.status === "active").length;
    return { total: all.length, active };
  }, [mentorPlans, menteePlans]);

  const updatePlan = (
    audience: "mentor" | "mentee",
    id: string,
    field: keyof PlanForm,
    value: string,
  ) => {
    const setter = audience === "mentor" ? setMentorPlans : setMenteePlans;
    setter((prev) =>
      prev.map((plan) => (plan.id === id ? { ...plan, [field]: value } : plan))
    );
  };

  const handleSave = (audience: "mentor" | "mentee") => {
    const plans = audience === "mentor" ? mentorPlans : menteePlans;
    const planFeatures = audience === "mentor" ? mentorPlanFeatures : menteePlanFeatures;

    const payload = {
      audience,
      plans: plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        status: plan.status,
        metadata: {
          seats: plan.seats,
          highlights: plan.highlights,
        },
        prices: {
          standard: {
            amount: plan.standardAmount,
            currency: plan.currency,
          },
          introductory: {
            amount: plan.introAmount,
            currency: plan.currency,
            introDurationIntervals: plan.introDurationIntervals,
          },
        },
        features: (planFeatures[plan.id] ?? []).map((feature) => ({
          featureKey: feature.key,
          isIncluded: feature.isIncluded,
          limitCount: feature.limitCount,
          limitMinutes: feature.limitMinutes,
          limitText: feature.limitText,
          limitInterval: feature.limitInterval,
          limitIntervalCount: feature.limitIntervalCount,
          priceAmount: feature.priceAmount,
          priceCurrency: feature.priceCurrency,
        })),
      })),
    };

    setIsSaving(true);
    fetch("/api/admin/subscriptions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({ success: false }));
        if (!res.ok || !json?.success) {
          throw new Error(json?.error || "Failed to update subscriptions");
        }
        toast.success(
          `${audience === "mentor" ? "Mentor" : "Mentee"} plans updated successfully`,
        );
      })
      .catch((error) => {
        console.error("Failed to update subscriptions:", error);
        toast.error(error instanceof Error ? error.message : "Failed to update subscriptions");
      })
      .finally(() => setIsSaving(false));
  };

  const updatePlanFeature = (
    audience: "mentor" | "mentee",
    planId: string,
    featureKey: string,
    field: keyof PlanFeatureConfig,
    value: string | boolean,
  ) => {
    const setter = audience === "mentor" ? setMentorPlanFeatures : setMenteePlanFeatures;
    setter((prev) => ({
      ...prev,
      [planId]: prev[planId].map((feature) =>
        feature.key === featureKey ? { ...feature, [field]: value } : feature,
      ),
    }));
  };

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/admin/subscriptions");
        const json = await res.json().catch(() => ({ success: false }));
        if (!res.ok || !json?.success) {
          throw new Error(json?.error || "Failed to load subscriptions");
        }

        const plans = json.data as Array<{
          id: string;
          planKey: string;
          audience: "mentor" | "mentee";
          name: string;
          description: string | null;
          status: PlanStatus;
          metadata?: Record<string, unknown>;
          prices?: {
            standard?: { amount?: string | null; currency?: string | null };
            introductory?: {
              amount?: string | null;
              currency?: string | null;
              introDurationIntervals?: number | null;
            };
          } | null;
          features?: Array<{
            featureKey: string;
            name: string;
            description?: string | null;
            isIncluded: boolean;
            limitCount?: number | null;
            limitMinutes?: number | null;
            limitText?: string | null;
            limitInterval?: "month" | "year" | null;
            limitIntervalCount?: number | null;
            priceAmount?: string | null;
            priceCurrency?: string | null;
          }>;
        }>;

        const mappedPlans = plans.map((plan) => {
          const metadata = plan.metadata ?? {};
          const standard = plan.prices?.standard;
          const intro = plan.prices?.introductory;
          const currency = standard?.currency || intro?.currency || "INR";
          return {
            id: plan.id,
            planKey: plan.planKey,
            name: plan.name,
            description: plan.description ?? "",
            status: plan.status,
            standardAmount: standard?.amount ? String(standard.amount) : "0",
            introAmount: intro?.amount ? String(intro.amount) : "0",
            currency,
            introDurationIntervals: intro?.introDurationIntervals
              ? String(intro.introDurationIntervals)
              : "1",
            seats: metadata?.seats ? String(metadata.seats) : "",
            highlights: metadata?.highlights ? String(metadata.highlights) : "",
          } satisfies PlanForm;
        });

        const mentorPlans = mappedPlans.filter((plan) =>
          plans.find((raw) => raw.id === plan.id)?.audience === "mentor",
        );
        const menteePlans = mappedPlans.filter((plan) =>
          plans.find((raw) => raw.id === plan.id)?.audience === "mentee",
        );

        const mentorFeatures: Record<string, PlanFeatureConfig[]> = {};
        const menteeFeatures: Record<string, PlanFeatureConfig[]> = {};

        plans.forEach((plan) => {
          const featureList = (plan.features ?? []).map((feature) => ({
            key: feature.featureKey,
            label: feature.name,
            description: feature.description ?? undefined,
            isIncluded: feature.isIncluded,
            limitCount: feature.limitCount ? String(feature.limitCount) : "",
            limitMinutes: feature.limitMinutes ? String(feature.limitMinutes) : "",
            limitText: feature.limitText ?? "",
            priceAmount: feature.priceAmount ? String(feature.priceAmount) : "",
            priceCurrency: feature.priceCurrency ?? "",
            limitInterval: feature.limitInterval ?? "none",
            limitIntervalCount: feature.limitIntervalCount
              ? String(feature.limitIntervalCount)
              : "1",
          }));

          if (plan.audience === "mentor") {
            mentorFeatures[plan.id] = featureList;
          } else {
            menteeFeatures[plan.id] = featureList;
          }
        });

        if (isMounted) {
          setMentorPlans(mentorPlans);
          setMenteePlans(menteePlans);
          setMentorPlanFeatures(mentorFeatures);
          setMenteePlanFeatures(menteeFeatures);
          setSelectedMentorPlanId(mentorPlans[0]?.id ?? "");
          setSelectedMenteePlanId(menteePlans[0]?.id ?? "");
        }
      } catch (error) {
        console.error("Failed to load subscriptions:", error);
        if (isMounted) {
          toast.error(
            error instanceof Error ? error.message : "Failed to load subscriptions",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const renderPlans = (audience: "mentor" | "mentee", plans: PlanForm[]) => {
    if (isLoading) {
      return (
        <div className="space-y-6">
          <Card className="border-gray-200/70 bg-white shadow-sm dark:border-gray-800/70 dark:bg-gray-950">
            <CardHeader>
              <CardTitle className="text-base">Loading plans...</CardTitle>
              <CardDescription>Please wait while we fetch subscription data.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {audience === "mentor" ? "Mentor Plans" : "Mentee Plans"}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Configure pricing, introductory offers, and key highlights for each plan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Total: {plans.length}</Badge>
          <Badge variant="outline">Active: {plans.filter((p) => p.status === "active").length}</Badge>
          <Button size="sm" onClick={() => handleSave(audience)} disabled={isSaving || isLoading}>
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <Card className="h-fit border-gray-200/70 bg-white shadow-sm dark:border-gray-800/70 dark:bg-gray-950">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Plans</CardTitle>
            <CardDescription>Select a plan to edit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {plans.map((plan) => {
              const isActive =
                audience === "mentor"
                  ? plan.id === selectedMentorPlanId
                  : plan.id === selectedMenteePlanId;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() =>
                    audience === "mentor"
                      ? setSelectedMentorPlanId(plan.id)
                      : setSelectedMenteePlanId(plan.id)
                  }
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                    isActive
                      ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                      : "border-gray-200/70 bg-white text-gray-700 hover:border-blue-200 hover:bg-blue-50/70 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-200 dark:hover:border-blue-900/60 dark:hover:bg-blue-950/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{plan.name}</p>
                      <p className="text-xs text-gray-500">{plan.description}</p>
                    </div>
                    <Badge variant={plan.status === "active" ? "default" : "secondary"}>
                      {plan.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {plan.currency} {plan.standardAmount}/mo
                  </p>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {(() => {
          const activePlanId =
            audience === "mentor" ? selectedMentorPlanId : selectedMenteePlanId;
          const plan = plans.find((item) => item.id === activePlanId) ?? plans[0];
          if (!plan) return null;
          return (
            <Card className="border-gray-200/70 bg-white shadow-sm dark:border-gray-800/70 dark:bg-gray-950">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <p className="text-xs text-gray-500">Key: {plan.planKey}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {plan.currency} {plan.standardAmount}/mo
                    </Badge>
                    <Badge variant={plan.status === "active" ? "default" : "secondary"}>
                      {plan.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`${plan.id}-name`}>Plan name</Label>
                  <Input
                    id={`${plan.id}-name`}
                    value={plan.name}
                    onChange={(event) =>
                      updatePlan(audience, plan.id, "name", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${plan.id}-status`}>Status</Label>
                  <Select
                    value={plan.status}
                    onValueChange={(value) =>
                      updatePlan(audience, plan.id, "status", value as PlanStatus)
                    }
                  >
                    <SelectTrigger id={`${plan.id}-status`}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor={`${plan.id}-standard`}>Standard price</Label>
                  <Input
                    id={`${plan.id}-standard`}
                    inputMode="decimal"
                    value={plan.standardAmount}
                    onChange={(event) =>
                      updatePlan(
                        audience,
                        plan.id,
                        "standardAmount",
                        normalizeDecimalInput(event.target.value),
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${plan.id}-intro`}>Intro price</Label>
                  <Input
                    id={`${plan.id}-intro`}
                    inputMode="decimal"
                    value={plan.introAmount}
                    onChange={(event) =>
                      updatePlan(
                        audience,
                        plan.id,
                        "introAmount",
                        normalizeDecimalInput(event.target.value),
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${plan.id}-currency`}>Currency</Label>
                  <Select
                    value={plan.currency}
                    onValueChange={(value) =>
                      updatePlan(audience, plan.id, "currency", value)
                    }
                  >
                    <SelectTrigger id={`${plan.id}-currency`}>
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyOptions.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`${plan.id}-intro-duration`}>Intro duration (months)</Label>
                  <Input
                    id={`${plan.id}-intro-duration`}
                    inputMode="numeric"
                    value={plan.introDurationIntervals}
                    onChange={(event) =>
                      updatePlan(
                        audience,
                        plan.id,
                        "introDurationIntervals",
                        normalizeIntegerInput(event.target.value),
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${plan.id}-seats`}>Seat limit (optional)</Label>
                  <Input
                    id={`${plan.id}-seats`}
                    inputMode="numeric"
                    value={plan.seats}
                    onChange={(event) =>
                      updatePlan(
                        audience,
                        plan.id,
                        "seats",
                        normalizeIntegerInput(event.target.value),
                      )
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${plan.id}-highlights`}>Highlights</Label>
                <Textarea
                  id={`${plan.id}-highlights`}
                  rows={3}
                  value={plan.highlights}
                  onChange={(event) =>
                    updatePlan(audience, plan.id, "highlights", event.target.value)
                  }
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Plan features
                  </h3>
                  <span className="text-xs text-gray-500">Toggle and adjust limits</span>
                </div>
                <div className="space-y-4 rounded-xl border border-gray-200/70 bg-gray-50/40 p-4 dark:border-gray-800/70 dark:bg-gray-900/40">
                  {(audience === "mentor"
                    ? mentorPlanFeatures[plan.id]
                    : menteePlanFeatures[plan.id]
                  )?.map((feature) => (
                    <div
                      key={`${plan.id}-${feature.key}`}
                      className="rounded-lg border border-gray-200/60 bg-white p-4 shadow-sm dark:border-gray-800/60 dark:bg-gray-950"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {feature.label}
                          </p>
                          {feature.description ? (
                            <p className="text-xs text-gray-500">{feature.description}</p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Included</span>
                          <Switch
                            checked={feature.isIncluded}
                            onCheckedChange={(checked) =>
                              updatePlanFeature(
                                audience,
                                plan.id,
                                feature.key,
                                "isIncluded",
                                checked,
                              )
                            }
                          />
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`${plan.id}-${feature.key}-count`}>Limit count</Label>
                          <Input
                            id={`${plan.id}-${feature.key}-count`}
                            inputMode="numeric"
                            value={feature.limitCount}
                            onChange={(event) =>
                              updatePlanFeature(
                                audience,
                                plan.id,
                                feature.key,
                                "limitCount",
                                normalizeIntegerInput(event.target.value),
                              )
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`${plan.id}-${feature.key}-minutes`}>Limit minutes</Label>
                          <Input
                            id={`${plan.id}-${feature.key}-minutes`}
                            inputMode="numeric"
                            value={feature.limitMinutes}
                            onChange={(event) =>
                              updatePlanFeature(
                                audience,
                                plan.id,
                                feature.key,
                                "limitMinutes",
                                normalizeIntegerInput(event.target.value),
                              )
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`${plan.id}-${feature.key}-text`}>Limit text</Label>
                          <Input
                            id={`${plan.id}-${feature.key}-text`}
                            value={feature.limitText}
                            onChange={(event) =>
                              updatePlanFeature(
                                audience,
                                plan.id,
                                feature.key,
                                "limitText",
                                event.target.value,
                              )
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`${plan.id}-${feature.key}-interval`}>Limit interval</Label>
                          <Select
                            value={feature.limitInterval || "none"}
                            onValueChange={(value) =>
                              updatePlanFeature(
                                audience,
                                plan.id,
                                feature.key,
                                "limitInterval",
                                value as FeatureInterval,
                              )
                            }
                          >
                            <SelectTrigger id={`${plan.id}-${feature.key}-interval`}>
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="month">Per month</SelectItem>
                              <SelectItem value="year">Per year</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`${plan.id}-${feature.key}-interval-count`}>
                            Interval count
                          </Label>
                          <Input
                            id={`${plan.id}-${feature.key}-interval-count`}
                            inputMode="numeric"
                            value={feature.limitIntervalCount}
                            onChange={(event) =>
                              updatePlanFeature(
                                audience,
                                plan.id,
                                feature.key,
                                "limitIntervalCount",
                                normalizeIntegerInput(event.target.value),
                              )
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`${plan.id}-${feature.key}-price`}>Per-session price</Label>
                          <Input
                            id={`${plan.id}-${feature.key}-price`}
                            inputMode="decimal"
                            value={feature.priceAmount}
                            onChange={(event) =>
                              updatePlanFeature(
                                audience,
                                plan.id,
                                feature.key,
                                "priceAmount",
                                normalizeDecimalInput(event.target.value),
                              )
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`${plan.id}-${feature.key}-price-currency`}>
                            Price currency
                          </Label>
                          <Select
                            value={feature.priceCurrency}
                            onValueChange={(value) =>
                              updatePlanFeature(
                                audience,
                                plan.id,
                                feature.key,
                                "priceCurrency",
                                value,
                              )
                            }
                          >
                            <SelectTrigger id={`${plan.id}-${feature.key}-price-currency`}>
                              <SelectValue placeholder="Currency" />
                            </SelectTrigger>
                            <SelectContent>
                              {currencyOptions.map((currency) => (
                                <SelectItem key={currency} value={currency}>
                                  {currency}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              </CardContent>
            </Card>
          );
        })()}
      </div>
    </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200/70 bg-white p-6 shadow-sm dark:border-gray-800/60 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Manage Subscriptions
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Edit pricing, introductory offers, and plan highlights for mentors and mentees.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary">Plans: {stats.total}</Badge>
            <Badge variant="outline">Active: {stats.active}</Badge>
          </div>
        </div>
      </div>

      <Tabs defaultValue="mentor" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="mentor">Mentor</TabsTrigger>
          <TabsTrigger value="mentee">Mentee</TabsTrigger>
        </TabsList>
        <TabsContent value="mentor" className="space-y-6">
          {renderPlans("mentor", mentorPlans)}
        </TabsContent>
        <TabsContent value="mentee" className="space-y-6">
          {renderPlans("mentee", menteePlans)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
