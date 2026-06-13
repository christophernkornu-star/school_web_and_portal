'use client'

interface SectionInfo {
  id?: string
  name: string
  colour: string
  emblem_url?: string | null
}

interface SectionBadgeProps {
  section: SectionInfo | null | undefined
  size?: 'sm' | 'md' | 'lg'
  showEmblem?: boolean
  showBullet?: boolean
  className?: string
}

const sizeStyles = {
  sm: 'text-[10px] px-1.5 py-0.5 gap-1',
  md: 'text-xs px-2.5 py-1 gap-1.5',
  lg: 'text-sm px-3 py-1.5 gap-2'
}

const dotSizes = {
  sm: 6,
  md: 8,
  lg: 10
}

export function SectionBadge({
  section,
  size = 'md',
  showEmblem = true,
  showBullet = true,
  className = ''
}: SectionBadgeProps) {
  if (!section) return null

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border
        ${sizeStyles[size]} ${className}`}
      style={{
        backgroundColor: section.colour + '18',
        color: section.colour,
        borderColor: section.colour + '35'
      }}
      title={section.name}
    >
      {showBullet && (
        <span
          className="rounded-full flex-shrink-0 shadow-sm"
          style={{
            width: dotSizes[size],
            height: dotSizes[size],
            backgroundColor: section.colour
          }}
        />
      )}
      {showEmblem && section.emblem_url && (
        <img
          src={section.emblem_url}
          alt=""
          className="w-3.5 h-3.5 rounded-sm flex-shrink-0 object-cover"
        />
      )}
      <span className="truncate max-w-[120px]">{section.name}</span>
    </span>
  )
}
