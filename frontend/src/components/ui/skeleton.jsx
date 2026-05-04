import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}) {
  return (
    <div
      data-slot="skeleton"
      className={cn("rounded-xl bg-[linear-gradient(110deg,rgba(255,255,255,0.03)_8%,rgba(255,255,255,0.09)_18%,rgba(255,255,255,0.03)_33%)] bg-[length:200%_100%] animate-[surface-shimmer_1.6s_linear_infinite]", className)}
      {...props} />
  );
}

export { Skeleton }
