"use client";

interface UsageMeterProps {
  name: string;
  valueType: "count" | "minutes" | "amount" | "percent" | "text" | "boolean" | "json";
  usageCount?: number;
  usageMinutes?: number;
  usageAmount?: number;
  limitCount?: number | null;
  limitMinutes?: number | null;
  limitAmount?: number | null;
  limitPercent?: number | null;
  unit?: string | null;
}

function formatUsage({
  valueType,
  usageCount = 0,
  usageMinutes = 0,
  usageAmount = 0,
  limitCount,
  limitMinutes,
  limitAmount,
  limitPercent,
  unit,
}: UsageMeterProps) {
  switch (valueType) {
    case "minutes":
      return {
        usage: usageMinutes,
        limit: limitMinutes,
        label: unit || "minutes",
      };
    case "amount":
      return {
        usage: usageAmount,
        limit: limitAmount,
        label: unit || "amount",
      };
    case "percent":
      return {
        usage: usageAmount,
        limit: limitPercent,
        label: unit || "percent",
      };
    default:
      return {
        usage: usageCount,
        limit: limitCount,
        label: unit || "count",
      };
  }
}

export function UsageMeter(props: UsageMeterProps) {
  const { name, valueType } = props;
  const { usage, limit, label } = formatUsage(props);

  const percent =
    typeof limit === "number" && limit > 0 ? Math.min(100, (usage / limit) * 100) : 0;

  const meterColor =
    percent >= 90 ? "bg-red-500" : percent >= 70 ? "bg-amber-500" : "bg-emerald-500";

  const limitText = typeof limit === "number" ? `${limit} ${label}` : "Unlimited";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{name}</span>
        <span className="text-muted-foreground">
          {usage} / {limitText}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100">
        <div
          className={`h-2 rounded-full transition-all ${meterColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {percent >= 90 && (
        <p className="text-xs text-red-600">
          You are close to your limit. Consider upgrading to avoid interruptions.
        </p>
      )}
    </div>
  );
}
