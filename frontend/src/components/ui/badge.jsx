import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90 shadow-sm",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90 shadow-sm",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 shadow-sm",
        outline:
          "text-foreground border-border bg-background [a&]:hover:bg-accent [a&]:hover:text-accent-foreground shadow-sm",
        success: "border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 shadow-sm",
        warning: "border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100 shadow-sm",
        info: "border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 shadow-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, className }))}
      {...props} />
  );
}

export { Badge, badgeVariants }
