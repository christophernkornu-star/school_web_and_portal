import * as React from "react"

const Tabs = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { defaultValue?: string; value?: string; onValueChange?: (value: string) => void }
>(({ className, defaultValue, value, onValueChange, children, ...props }, ref) => {
  const [selected, setSelected] = React.useState(value || defaultValue || "")
  
  React.useEffect(() => {
    if (value !== undefined) {
      setSelected(value)
    }
  }, [value])

  const handleValueChange = (newValue: string) => {
    if (value === undefined) {
        setSelected(newValue)
    }
    onValueChange?.(newValue)
  }

  return (
    <div ref={ref} className={className} {...props} data-state={selected}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { selectedValue: selected, onValueChange: handleValueChange } as any)
        }
        return child
      })}
    </div>
  )
})
Tabs.displayName = "Tabs"

const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { selectedValue?: string; onValueChange?: (value: string) => void }
>(({ className, selectedValue, onValueChange, children, ...props }, ref) => (
  <div
    ref={ref}
    className={`inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground ${className}`}
    {...props}
  >
    {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { selectedValue, onValueChange } as any)
        }
        return child
      })}
  </div>
))
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string; selectedValue?: string; onValueChange?: (value: string) => void }
>(({ className, value, selectedValue, onValueChange, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${selectedValue === value ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-900"} ${className}`}
    onClick={() => onValueChange?.(value)}
    {...props}
  />
))
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string; selectedValue?: string }
>(({ className, value, selectedValue, ...props }, ref) => {
  if (value !== selectedValue) return null
  return (
    <div
      ref={ref}
      className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}
      {...props}
    />
  )
})
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
