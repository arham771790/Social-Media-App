"use client"

import * as React from "react"
import { cva } from "class-variance-authority"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-[calc(var(--radius)+2px)] border p-5 pr-8 shadow-[0_24px_60px_-32px_rgba(0,0,0,0.95)] backdrop-blur-xl transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.02))] bg-card/95 text-foreground",
        destructive:
          "destructive border-destructive/25 bg-destructive/12 text-destructive-foreground",
        success: "border-emerald-500/20 bg-emerald-500/12 text-emerald-100",
        warning: "border-amber-500/20 bg-amber-500/12 text-amber-100",
        info: "border-sky-500/20 bg-sky-500/12 text-sky-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef(({ className, variant, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = "Toast"

const ToastAction = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-transparent px-3.5 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-destructive/20 group-[.destructive]:hover:bg-destructive/18 group-[.destructive]:focus:ring-destructive/30",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = "ToastAction"

const ToastClose = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "absolute right-2.5 top-2.5 rounded-full border border-transparent p-1.5 text-foreground/50 opacity-0 transition-all hover:border-white/10 hover:bg-white/[0.04] hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring/40 group-hover:opacity-100 group-[.destructive]:text-red-200 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400/40",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </div>
))
ToastClose.displayName = "ToastClose"

const ToastTitle = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm font-semibold tracking-[-0.01em]", className)}
    {...props}
  />
))
ToastTitle.displayName = "ToastTitle"

const ToastDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm leading-6 opacity-90", className)}
    {...props}
  />
))
ToastDescription.displayName = "ToastDescription"

const ToastViewport = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-3 p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = "ToastViewport"

const ToastProvider = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("", className)}
    {...props}
  />
))
ToastProvider.displayName = "ToastProvider"

export {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
}
