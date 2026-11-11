import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#14171c] px-2.5 py-1 text-sm text-[#f1f5f9] placeholder:text-[#64748b] transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[#f1f5f9] focus-visible:border-[#38bdf8] focus-visible:ring-2 focus-visible:ring-[#38bdf8]/40 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-[#ef4444] aria-invalid:ring-2 aria-invalid:ring-[#ef4444]/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
