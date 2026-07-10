import * as React from "react"
import { createPortal } from "react-dom"
import { ChevronDown } from "lucide-react"

// A simple Select implementation using standard HTML select for robustness but styled
// Note: Keep the API compatible with Shadcn UI where possible

let selectIdCounter = 0

const SelectContext = React.createContext<{ 
    value?: string; 
    onValueChange?: (value: string) => void; 
    open: boolean; 
    setOpen: (o: boolean) => void;
    triggerRef: React.MutableRefObject<HTMLButtonElement | null>
}>({ 
    open: false, 
    setOpen: () => {},
    triggerRef: { current: null }
})

// Shared state or event listener to close other selects would differ, 
// but for a simple fix we can use a click outside listener.

const Select = React.forwardRef<
    HTMLDivElement,
    { value?: string; onValueChange?: (value: string) => void; children?: React.ReactNode, name?: string }
>(({ value, onValueChange, children }, ref) => {
        const [open, setOpen] = React.useState(false)
    const containerRef = React.useRef<HTMLDivElement | null>(null)
    const triggerRef = React.useRef<HTMLButtonElement | null>(null)
    // Stable id across re-renders
    const [selectId] = React.useState(() => `select-${++selectIdCounter}`)

    // Listen for custom event to close other selects
    React.useEffect(() => {
        const handleCloseOthers = (e: CustomEvent) => {
            if (e.detail?.id !== containerRef.current?.id) {
                setOpen(false)
            }
        }
        document.addEventListener('close-other-selects', handleCloseOthers as EventListener)
        return () => {
            document.removeEventListener('close-other-selects', handleCloseOthers as EventListener)
        }
    }, [])

        // Close on click outside
        React.useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (open && containerRef.current && !containerRef.current.contains(event.target as Node)) {
                    setOpen(false)
                }
            }
            document.addEventListener("mousedown", handleClickOutside)
            return () => {
                 document.removeEventListener("mousedown", handleClickOutside)
            }
        }, [open])

    return (
         <SelectContext.Provider value={{ value, onValueChange, open, setOpen, triggerRef }}>
                        <div 
                            className="relative"  
                            id={selectId}
                ref={(node) => {
                    containerRef.current = node
                    if (typeof ref === 'function') ref(node)
                    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
                }}
            >
                {children}
            </div>
         </SelectContext.Provider>
    )
})
Select.displayName = "Select"

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
    const { setOpen, open, triggerRef } = React.useContext(SelectContext)
    
    const handleClick = (e: React.MouseEvent) => {
        if (!open) {
            // Dispatch event to close others before opening this one
            const event = new CustomEvent('close-other-selects', { 
                detail: { id: (e.target as HTMLElement).closest('.relative')?.id } 
            })
            document.dispatchEvent(event)
        }
        setOpen(!open)
    }

    return (
        <button 
            type="button"
            className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
            onClick={handleClick}
                        ref={(node) => {
                triggerRef.current = node
                if (typeof ref === 'function') ref(node)
                else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node
            }}
            {...props}
        >
            {children}
            <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
    )
})
SelectTrigger.displayName = "SelectTrigger"


const SelectValue = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & { placeholder?: string }
>(({ className, placeholder, children, ...props }, ref) => {
  const { value } = React.useContext(SelectContext)
  return (
    <span ref={ref} className={className} {...props}>
      {children || value || placeholder}
    </span>
  )
})
SelectValue.displayName = "SelectValue"

const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
        const { open, setOpen, triggerRef } = React.useContext(SelectContext)
    const contentRef = React.useRef<HTMLDivElement | null>(null)
    const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>({ display: 'none' })

    React.useEffect(() => {
        if (!open || !triggerRef.current) return

        const calculatePosition = () => {
            const triggerRect = triggerRef.current!.getBoundingClientRect()
            const viewportHeight = window.innerHeight
            const dropdownHeight = 240 // matches max-h-60
            const spaceBelow = viewportHeight - triggerRect.bottom - 4
            const spaceAbove = triggerRect.top - 4
            const opensUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow

            setDropdownStyle({
                position: 'fixed',
                left: triggerRect.left + 'px',
                width: Math.max(triggerRect.width, 180) + 'px',
                zIndex: 9999,
                top: opensUpward ? 'auto' : (triggerRect.bottom + 4) + 'px',
                bottom: opensUpward ? (viewportHeight - triggerRect.top + 4) + 'px' : 'auto',
            })
        }

        requestAnimationFrame(calculatePosition)

        // Close on scroll
        const handleScroll = () => setOpen(false)
        window.addEventListener('scroll', handleScroll, { once: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [open, setOpen])

    if (!open) return null

    return createPortal(
        <div 
            ref={(node) => {
                contentRef.current = node
                if (typeof ref === 'function') ref(node)
                else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
            }}
            className={`bg-white dark:bg-gray-900 border rounded-md shadow-md p-1 max-h-60 overflow-auto ${className || ''}`} 
            style={dropdownStyle}
            {...props}
        >
            {children}
        </div>,
        document.body
    )
})
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, children, value, ...props }, ref) => {
   const { onValueChange, setOpen } = React.useContext(SelectContext)
  return (
    <div
      ref={ref}
      className={`relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer ${className}`}
      onClick={() => {
          onValueChange?.(value)
          setOpen(false)
      }}
      {...props}
    >
      <span className="truncate">{children}</span>
    </div>
  )
})
SelectItem.displayName = "SelectItem"

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
}

const SelectGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => <div ref={ref} {...props} />)
SelectGroup.displayName = "SelectGroup"

const SelectLabel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => <div ref={ref} {...props} />)
SelectLabel.displayName = "SelectLabel"

const SelectSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => <div ref={ref} {...props} />)
SelectSeparator.displayName = "SelectSeparator"
