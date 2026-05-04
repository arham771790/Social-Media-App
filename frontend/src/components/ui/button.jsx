import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium tracking-[-0.01em] transition-[transform,box-shadow,background-color,border-color,color,opacity] duration-200 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:border-destructive aria-invalid:ring-destructive/20 active:translate-y-px",
  {
    variants: {
      variant: {
        default:
          "border border-primary/25 bg-primary text-primary-foreground shadow-[0_16px_36px_-20px_rgba(214,173,118,0.72)] hover:-translate-y-0.5 hover:bg-primary/92",
        destructive:
          "border border-destructive/30 bg-destructive text-destructive-foreground shadow-[0_14px_28px_-18px_rgba(194,73,55,0.8)] hover:-translate-y-0.5 hover:bg-destructive/92",
        outline:
          "border border-border/80 bg-background/40 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:-translate-y-0.5 hover:border-primary/35 hover:bg-accent/80",
        secondary:
          "border border-border/70 bg-secondary/80 text-secondary-foreground shadow-[0_12px_28px_-22px_rgba(0,0,0,0.9)] hover:-translate-y-0.5 hover:border-primary/20 hover:bg-secondary",
        ghost:
          "border border-transparent text-muted-foreground shadow-none hover:bg-white/[0.04] hover:text-foreground",
        link: "rounded-none border-0 px-0 text-primary underline-offset-4 shadow-none hover:text-primary/85 hover:underline",
        gradient: "border border-white/10 bg-[linear-gradient(135deg,rgba(214,173,118,0.96),rgba(102,126,109,0.92))] text-primary-foreground shadow-[0_18px_32px_-20px_rgba(214,173,118,0.78)] hover:-translate-y-0.5 hover:brightness-105",
      },
      size: {
        default: "h-11 px-4 py-2 has-[>svg]:px-3.5",
        sm: "h-9 gap-1.5 rounded-lg px-3.5 text-xs has-[>svg]:px-3",
        lg: "h-12 rounded-2xl px-6 text-base has-[>svg]:px-4.5",
        xl: "h-14 rounded-[1.4rem] px-8 text-lg has-[>svg]:px-6",
        icon: "size-10 rounded-full",
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
  variant,
  size,
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props} />
  );
}

export { Button, buttonVariants }
