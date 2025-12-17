import Link from 'next/link'

export default function NotFound() {
  const buttonBase = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2"
  const defaultVariant = "bg-slate-900 text-white hover:bg-slate-900/90"
  const outlineVariant = "border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900"

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="space-y-4">
        <h1 className="text-9xl font-bold text-slate-900">404</h1>
        <h2 className="text-2xl font-semibold tracking-tight">Page not found</h2>
        <p className="text-slate-500 max-w-[500px]">
          Sorry, we couldn't find the page you're looking for. It might have been moved, deleted, or never existed.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Link href="/" className={`${buttonBase} ${defaultVariant}`}>
            Go Home
          </Link>
          <Link href="/login" className={`${buttonBase} ${outlineVariant}`}>
            Login
          </Link>
        </div>
      </div>
    </div>
  )
}
