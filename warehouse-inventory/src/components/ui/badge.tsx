import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "purple"
  | "gray";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variants: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-700",
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
  gray: "bg-gray-100 text-gray-500",
};

export function Badge({ variant = "default", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

// Map inventory status to badge variant
export function statusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    AVAILABLE: "success",
    RESERVED: "warning",
    ISSUED: "info",
    WITH_TECHNICIAN: "info",
    INSTALLED: "purple",
    CONSUMED: "purple",
    RETURNED_GOOD: "success",
    RETURNED_DEFECTIVE: "danger",
    FOR_INSPECTION: "warning",
    DEFECTIVE: "danger",
    FOR_REPAIR: "warning",
    SCRAPPED: "gray",
    LOST: "danger",
    TRANSFERRED: "info",
  };
  return map[status] ?? "default";
}
