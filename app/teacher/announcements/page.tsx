'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useTeacher } from '@/components/providers/TeacherContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Bell, Calendar, Filter, AlertCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function AnnouncementsPage() {
  const router = useRouter()
  const { user, teacher, loading: contextLoading } = useTeacher()
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, urgent, high, academic, general

  useEffect(() => {
    if (contextLoading) return
    if (!user || !teacher) return

    const loadAnnouncements = async () => {
      const supabase = getSupabaseBrowserClient()
      try {
        let query = supabase
            .from('announcements')
            .select('*')
            .eq('published', true)
            .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
            .order('priority', { ascending: false })
            .order('created_at', { ascending: false })
        
        const { data } = await query
        
        if (data) setAnnouncements(data)
      } catch (err) {
        console.error("Failed to load announcements", err)
      } finally {
        setLoading(false)
      }
    }
    
    loadAnnouncements()
  }, [user, teacher, contextLoading])


  const getPriorityColor = (priority: string) => {
      switch(priority?.toLowerCase()) {
          case 'urgent': return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400'
          case 'high': return 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-400'
          default: return 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400'
      }
  }

  const filteredAnnouncements = announcements.filter(a => {
     if (filter === 'all') return true
     if (filter === 'urgent') return a.priority === 'urgent'
     if (filter === 'high') return a.priority === 'high'
     return a.category === filter
  })

  if (loading) return <AnnouncementsSkeleton />

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/teacher/dashboard">
           <Button variant="ghost" size="icon">
             <ArrowLeft className="w-5 h-5" />
           </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-3">
             <div className="p-2 bg-orange-100 text-orange-600 rounded-lg dark:bg-orange-900/30 dark:text-orange-400">
                <Bell className="w-6 h-6" />
             </div>
             Announcements
          </h1>
          <p className="text-muted-foreground mt-1">Stay updated with school news and alerts</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
         <Button 
            variant={filter === 'all' ? 'default' : 'outline'} 
            onClick={() => setFilter('all')}
            size="sm"
            className="rounded-full"
         >
            All
         </Button>
         <Button 
            variant={filter === 'urgent' ? 'default' : 'outline'} 
            onClick={() => setFilter('urgent')}
            size="sm"
            className="rounded-full"
         >
            Urgent Only
         </Button>
      </div>

      <div className="space-y-6">
         {filteredAnnouncements.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed">
               <Bell className="w-12 h-12 mx-auto text-gray-300 mb-4" />
               <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No Announcements</h3>
               <p className="text-gray-500">Check back later for updates.</p>
            </div>
         ) : (
            filteredAnnouncements.map((announcement) => (
                <Card key={announcement.id} className={`overflow-hidden transition-all hover:shadow-md ${announcement.priority === 'urgent' ? 'border-l-4 border-l-red-500' : ''}`}>
                   <CardHeader className="pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                         <div className="flex items-start gap-3">
                            <Badge variant="outline" className={`${getPriorityColor(announcement.priority)} capitalize`}>
                               {announcement.priority || 'Notice'}
                            </Badge>
                            {announcement.category && (
                               <Badge variant="secondary" className="capitalize text-gray-600 dark:text-gray-400">
                                  {announcement.category}
                               </Badge>
                            )}
                         </div>
                         <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-full w-fit">
                            <Calendar className="w-4 h-4 mr-2" />
                            {new Date(announcement.created_at).toLocaleDateString(undefined, { 
                               weekday: 'short',
                               year: 'numeric', 
                               month: 'long', 
                               day: 'numeric' 
                            })}
                         </div>
                      </div>
                      <CardTitle className="text-xl mt-2 leading-tight">{announcement.title}</CardTitle>
                   </CardHeader>
                   <CardContent>
                      <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                         {announcement.content}
                      </div>
                   </CardContent>
                </Card>
            ))
         )}
      </div>
    </div>
  )
}

function AnnouncementsSkeleton() {
   return (
      <div className="container mx-auto px-4 py-8 space-y-8 max-w-5xl">
         <div className="flex items-center gap-4">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="space-y-2">
               <Skeleton className="w-48 h-8" />
               <Skeleton className="w-32 h-4" />
            </div>
         </div>
         <div className="space-y-6">
            {[1,2,3].map(i => (
               <Skeleton key={i} className="w-full h-40 rounded-xl" />
            ))}
         </div>
      </div>
   )
}
