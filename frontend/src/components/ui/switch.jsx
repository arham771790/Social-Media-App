"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:data-[state=unchecked]:bg-input/80 inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent shadow-sm transition-all duration-300 ease-in-out outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:shadow-md",
        className
      )}
      {...props}>
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-5 rounded-full ring-0 transition-transform duration-300 ease-in-out data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0 shadow-sm"
        )} />
    </SwitchPrimitive.Root>
  );
}

export { Switch }
