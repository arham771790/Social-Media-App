"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"
import { cn } from "@/lib/utils"

function Switch({ className, ...props }) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        // Base style
        "peer inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent outline-none transition-all duration-300 ease-in-out",
        // State styles
        "data-[state=unchecked]:bg-white data-[state=unchecked]:border-black",
        "data-[state=checked]:bg-black data-[state=checked]:border-black",
        // Focus ring
        "focus-visible:ring-2 focus-visible:ring-primary/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          // Base knob
          "pointer-events-none block size-5 rounded-full shadow-sm transition-transform duration-300 ease-in-out",
          // Colors depending on state
          "data-[state=unchecked]:bg-black data-[state=checked]:bg-white",
          // Position depending on state
          "data-[state=unchecked]:translate-x-0 data-[state=checked]:translate-x-5"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
