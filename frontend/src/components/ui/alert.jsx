import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative grid w-full items-start gap-y-1 rounded-[calc(var(--radius)+2px)] border px-4 py-4 text-sm shadow-[0_18px_40px_-30px_rgba(0,0,0,0.92)] has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 grid-cols-[0_1fr] [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default: "border-white/7 bg-card/88 text-card-foreground",
        destructive:
          "border-destructive/24 bg-destructive/12 text-destructive [&>svg]:text-destructive *:data-[slot=alert-description]:text-destructive/80",
        success: "border-emerald-500/18 bg-emerald-500/10 text-emerald-300 [&>svg]:text-emerald-300",
        warning: "border-amber-500/18 bg-amber-500/10 text-amber-300 [&>svg]:text-amber-300",
        info: "border-sky-500/18 bg-sky-500/10 text-sky-300 [&>svg]:text-sky-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props} />
  );
}

function AlertTitle({
  className,
  ...props
}) {
  return (
    <div
      data-slot="alert-title"
      className={cn("col-start-2 line-clamp-1 min-h-4 font-semibold tracking-tight", className)}
      {...props} />
  );
}

function AlertDescription({
  className,
  ...props
}) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        className
      )}
      {...props} />
  );
}

export { Alert, AlertTitle, AlertDescription }
