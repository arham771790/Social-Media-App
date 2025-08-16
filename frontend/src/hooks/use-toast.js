"use client"

// This is a simple implementation since we're using shadcn/ui toast
// In a real app, you might want to use the full shadcn/ui toast hook
import { useState, useCallback } from 'react'

let toastCounter = 0

export const useToast = () => {
  const [toasts, setToasts] = useState([])
  
  const toast = useCallback((props) => {
    const id = ++toastCounter
    const { duration = 3000, ...toastProps } = props
    
    const newToast = {
      id,
      ...toastProps,
    }
    
    setToasts(prev => [...prev, newToast])
    
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, duration)
    }
    
    return {
      id,
      dismiss: () => setToasts(prev => prev.filter(t => t.id !== id))
    }
  }, [])
  
  const dismiss = useCallback((toastId) => {
    setToasts(prev => prev.filter(t => t.id !== toastId))
  }, [])
  
  return {
    toast,
    dismiss,
    toasts
  }
}