import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full rounded-xl border border-brand-border/70 bg-card px-3.5 py-3 text-base font-medium text-brand-teal-ink shadow-none transition-[background-color,border-color,box-shadow] outline-none",
        "placeholder:font-normal placeholder:text-muted-foreground/65",
        "hover:border-brand-coral/35 hover:bg-brand-cream/60",
        "focus-visible:border-brand-coral/55 focus-visible:bg-card focus-visible:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-brand-coral)_14%,transparent)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-destructive)_14%,transparent)]",
        "md:text-sm",
        "dark:bg-input/30 dark:aria-invalid:border-destructive/50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
