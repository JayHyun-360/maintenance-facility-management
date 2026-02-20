"use client";

import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const toastVariants = cva({
  variants: {
    variant: {
      default: "bg-white text-gray-900 border border-gray-200 shadow-lg",
      destructive: "bg-red-600 text-white border border-red-600",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

interface ToastProps
  extends
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root>,
    VariantProps<typeof toastVariants> {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  ToastProps
>(({ className, variant, open, onOpenChange, ...props }, ref) => (
  <ToastPrimitives.Provider>
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      open={open}
      onOpenChange={onOpenChange}
      {...props}
    >
      <ToastPrimitives.Title />
      <ToastPrimitives.Description />
      <ToastPrimitives.Action altText="Action" />
      <ToastPrimitives.Close />
    </ToastPrimitives.Root>
    <ToastPrimitives.Viewport />
  </ToastPrimitives.Provider>
));

Toast.displayName = ToastPrimitives.Root.displayName;

export { ToastPrimitives, Toast };
