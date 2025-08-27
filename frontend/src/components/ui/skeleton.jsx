import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-muted/50 animate-pulse rounded-lg shadow-sm", className)}
      {...props} />
  );
}

export { Skeleton }
