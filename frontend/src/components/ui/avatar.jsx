"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

function Avatar({
  className,
  ...props
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn("relative flex size-10 shrink-0 overflow-hidden rounded-full border border-white/10 shadow-[0_16px_32px_-18px_rgba(0,0,0,0.85)]", className)}
      {...props} />
  );
}

function AvatarImage({
  className,
  ...props
}) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full object-cover", className)}
      {...props} />
  );
}

function AvatarFallback({
  className,
  ...props
}) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(214,173,118,0.18),rgba(255,255,255,0.04))] text-sm font-semibold text-foreground/86",
        className
      )}
      {...props} />
  );
}

export { Avatar, AvatarImage, AvatarFallback }
