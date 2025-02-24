import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

interface TabsProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {
  disableHash?: boolean
}

const Tabs = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Root>, TabsProps>(
  ({ disableHash = false, onValueChange, value, ...props }, ref) => {
    // Initialize internal state from URL hash or defaultValue
    const [internalValue, setInternalValue] = React.useState<string | undefined>(() => {
      if (!disableHash && typeof window !== "undefined") {
        const hash = window.location.hash.slice(1)
        return hash || props.defaultValue
      }
      return props.defaultValue
    })

    // Use layout effect to synchronously set the tab based on the URL hash on mount/refresh.
    React.useLayoutEffect(() => {
      if (!disableHash && typeof window !== "undefined") {
        const hash = window.location.hash.slice(1)
        if (hash && hash !== internalValue) {
          setInternalValue(hash)
        }
      }
    }, [disableHash, internalValue])

    const handleValueChange = React.useCallback(
      (newValue: string) => {
        if (!disableHash) {
          window.location.hash = newValue
        }
        if (value === undefined) {
          setInternalValue(newValue)
        }
        if (onValueChange) {
          onValueChange(newValue)
        }
      },
      [disableHash, onValueChange, value]
    )

    // Decide current value based on controlled or internal state.
    const currentValue = value === undefined ? internalValue : value

    return (
      <TabsPrimitive.Root
        ref={ref}
        value={currentValue}
        onValueChange={handleValueChange}
        {...props}
      />
    )
  }
)
Tabs.displayName = TabsPrimitive.Root.displayName

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
