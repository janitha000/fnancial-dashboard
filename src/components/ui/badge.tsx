"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors font-mono [font-feature-settings:'tnum']",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#38bdf8] text-[#0f172a]",
        secondary:
          "border-[rgba(255,255,255,0.07)] bg-[#242932] text-[#94a3b8]",
        destructive:
          "border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.12)] text-[#ef4444]",
        outline:
          "border-[rgba(255,255,255,0.07)] text-[#f1f5f9] bg-transparent",
        success:
          "border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.12)] text-[#22c55e]",
        warning:
          "border-[rgba(234,179,8,0.2)] bg-[rgba(234,179,8,0.12)] text-[#eab308]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
