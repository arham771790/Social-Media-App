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
        "border-input placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-20 w-full rounded-lg border bg-transparent px-3 py-2 text-base shadow-sm transition-all duration-200 outline-none focus-visible:border-ring hover:border-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none",
        className
      )}
      {...props} />
  );
}

export { Textarea }
