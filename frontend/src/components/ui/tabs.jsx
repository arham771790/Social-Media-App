"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  ...props
}) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-4", className)}
      {...props} />
  );
}

function TabsList({
  className,
  ...props
}) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex min-h-11 w-fit items-center justify-center gap-1 rounded-full border border-border/70 bg-background/30 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-sm",
        className
      )}
      {...props} />
  );
}

function TabsTrigger({
  className,
  ...props
}) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-transparent px-4 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-[background-color,border-color,color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-white/10 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-[0_10px_25px_-18px_rgba(0,0,0,0.85)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:not([class*='size-'])]:size-4",
        className
      )}
      {...props} />
  );
}

function TabsContent({
  className,
  ...props
}) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 rounded-[calc(var(--radius)+2px)] outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background", className)}
      {...props} />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
