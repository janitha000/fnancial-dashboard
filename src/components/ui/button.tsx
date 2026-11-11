"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[8px] border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-[#38bdf8] focus-visible:ring-2 focus-visible:ring-[#38bdf8]/40 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-[#ef4444] aria-invalid:ring-2 aria-invalid:ring-[#ef4444]/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-[#38bdf8] text-[#0f172a] hover:bg-[#38bdf8]/90 font-medium shadow-none",
        outline:
          "border-[rgba(255,255,255,0.07)] bg-transparent text-[#f1f5f9] hover:bg-[#242932] hover:text-[#f1f5f9] aria-expanded:bg-[#242932]",
        secondary:
          "border-[rgba(255,255,255,0.07)] bg-transparent text-[#f1f5f9] hover:bg-[#242932] hover:text-[#f1f5f9] aria-expanded:bg-[#242932]",
        ghost:
          "border-transparent bg-transparent text-[#94a3b8] hover:bg-[#242932] hover:text-[#f1f5f9] aria-expanded:bg-[#242932]",
        destructive:
          "border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.12)] text-[#ef4444] hover:bg-[rgba(239,68,68,0.2)] focus-visible:border-[#ef4444]/40 focus-visible:ring-[#ef4444]/20",
        link: "text-[#38bdf8] underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[6px] px-2 text-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[6px] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-3.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[6px] in-data-[slot=button-group]:rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[6px] in-data-[slot=button-group]:rounded-md",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
