import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-4 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-1 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current shadow-sm",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground border-border/50",
        destructive:
          "text-destructive bg-destructive/10 border-destructive/20 [&>svg]:text-destructive *:data-[slot=alert-description]:text-destructive/80",
        success: "text-green-800 bg-green-50 border-green-200 dark:text-green-100 dark:bg-green-950 dark:border-green-800 [&>svg]:text-green-600 dark:[&>svg]:text-green-400",
        warning: "text-yellow-800 bg-yellow-50 border-yellow-200 dark:text-yellow-100 dark:bg-yellow-950 dark:border-yellow-800 [&>svg]:text-yellow-600 dark:[&>svg]:text-yellow-400",
        info: "text-blue-800 bg-blue-50 border-blue-200 dark:text-blue-100 dark:bg-blue-950 dark:border-blue-800 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400",
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
