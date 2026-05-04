import * as React from "react"

import { cn } from "@/lib/utils"

function Input({
  className,
  type,
  ...props
}) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground/90 selection:bg-primary selection:text-primary-foreground flex h-11 w-full min-w-0 rounded-2xl border border-border/70 bg-background/35 px-4 py-2.5 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-[border-color,background-color,box-shadow,color] duration-200 outline-none file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-primary/40 focus-visible:bg-background/55 focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:border-primary/20",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className
      )}
      {...props} />
  );
}

export { Input }
