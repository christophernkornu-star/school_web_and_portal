import * as React from "react"
import { X } from "lucide-react"

const Dialog = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { open?: boolean; onOpenChange?: (open: boolean) => void }
>(({ children, open, onOpenChange, ...props }, ref) => {
    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" {...props} ref={ref}>
            <div 
                className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-all" 
                onClick={() => onOpenChange?.(false)} 
            />
             {React.Children.map(children, (child) => {
                if (React.isValidElement(child)) {
                    return React.cloneElement(child, {  onOpenChange } as any)
                }
                return child
             })}
        </div>
    )
})
Dialog.displayName = "Dialog"

const DialogTrigger = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ children, ...props }, ref) => {
    return <div ref={ref} {...props}>{children}</div>
})
DialogTrigger.displayName = "DialogTrigger"


const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { onOpenChange?: (open: boolean) => void }
>(({ className, children, onOpenChange, ...props }, ref) => (
  <div
    ref={ref}
    className={`relative z-50 grid w-full max-w-lg gap-4 bg-background p-6 shadow-lg duration-200 border rounded-xl bg-white dark:bg-gray-900 ${className}`}
    {...props}
  >
    <div 
        className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none cursor-pointer"
        onClick={() => onOpenChange?.(false)}
    >
      <X className="h-4 w-4" />
      <span className="sr-only">Close</span>
    </div>
    {children}
  </div>
))
DialogContent.displayName = "DialogContent"

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex flex-col space-y-1.5 text-center sm:text-left ${className}`} {...props} />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${className}`} {...props} />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={`text-lg font-semibold leading-none tracking-tight ${className}`}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={`text-sm text-muted-foreground ${className}`}
    {...props}
  />
))
DialogDescription.displayName = "DialogDescription"

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
