import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({
  className,
  ...props
}) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-border/70 placeholder:text-muted-foreground/90 flex min-h-24 w-full resize-none rounded-[1.35rem] border bg-background/35 px-4 py-3 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-[border-color,background-color,box-shadow,color] duration-200 outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-primary/40 focus-visible:bg-background/55 focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:border-primary/20",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className
      )}
      {...props} />
  );
}

export { Textarea }
