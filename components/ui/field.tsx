import * as React from "react"

import { cn } from "@/lib/utils"

type FieldOrientation = "vertical" | "horizontal" | "responsive"

const getOrientationClasses = (orientation: FieldOrientation) => {
  if (orientation === "horizontal") {
    return "flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4"
  }
  if (orientation === "responsive") {
    return "flex flex-col gap-2 @container/field-group:flex-row @container/field-group:items-center @container/field-group:gap-4"
  }
  return "flex flex-col gap-2"
}

type FieldProps = React.HTMLAttributes<HTMLDivElement> & {
  orientation?: FieldOrientation
}

export const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ className, orientation = "vertical", ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="group"
        className={cn(getOrientationClasses(orientation), className)}
        {...props}
      />
    )
  },
)
Field.displayName = "Field"

export const FieldGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("@container/field-group flex flex-col gap-4", className)}
      {...props}
    />
  )
})
FieldGroup.displayName = "FieldGroup"

export const FieldLabel = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => {
  return (
    <label
      ref={ref}
      className={cn("text-sm font-semibold leading-none", className)}
      {...props}
    />
  )
})
FieldLabel.displayName = "FieldLabel"

