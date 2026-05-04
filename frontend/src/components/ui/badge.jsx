import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.04em] [&>svg]:size-3 [&>svg]:pointer-events-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-[border-color,background-color,color,box-shadow,transform] duration-200 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
  {
    variants: {
      variant: {
        default:
          "border-primary/20 bg-primary/14 text-primary [a&]:hover:bg-primary/18",
        secondary:
          "border-border/70 bg-secondary/80 text-secondary-foreground [a&]:hover:border-primary/20 [a&]:hover:bg-secondary",
        destructive:
          "border-destructive/25 bg-destructive/12 text-destructive [a&]:hover:bg-destructive/16 focus-visible:ring-destructive/20",
        outline:
          "border-border/75 bg-background/40 text-foreground [a&]:hover:border-primary/25 [a&]:hover:bg-accent/90",
        success: "border-emerald-500/20 bg-emerald-500/12 text-emerald-300",
        warning: "border-amber-500/20 bg-amber-500/12 text-amber-300",
        info: "border-sky-500/20 bg-sky-500/12 text-sky-300",
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
