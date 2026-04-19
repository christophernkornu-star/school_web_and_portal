'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'react-hot-toast'
import { Bell, Megaphone } from 'lucide-react'

export default function SystemNotifications() {
  const supabase = getSupabaseBrowserClient()
  const hasRequestedPermission = useRef(false)

  useEffect(() => {
    // Request notification permission if not asked before
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'default' &&
      !hasRequestedPermission.current
    ) {
      hasRequestedPermission.current = true;
      Notification.requestPermission()
    }

    // Subscribe to new announcements
    const channel = supabase
      .channel('public:announcements')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'announcements',
        },
        (payload: any) => {
          const newAnnouncement = payload.new;
          
          // Ignore if it's set to not published or not intended for the portal
          // Depending on the logic, let's just show it if it's published.
          if (newAnnouncement.published === false) return;

          const title = newAnnouncement.title || 'New Announcement';
          const content = newAnnouncement.content || 'A new system announcement was posted.';

          // 1. Show In-App Toast
          toast.custom((t) => (
            <div
              className={`${
                t.visible ? 'animate-enter' : 'animate-leave'
              } max-w-md w-full bg-white dark:bg-gray-900 shadow-xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 overflow-hidden border-l-4 ${
                newAnnouncement.priority === 'high' || newAnnouncement.priority === 'urgent' 
                  ? 'border-l-red-500' 
                  : 'border-l-methodist-blue'
              }`}
            >
              <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-0.5">
                    <Megaphone className="h-6 w-6 text-methodist-blue" />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {title}
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                       {content}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex border-l border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="w-full border border-transparent rounded-none rounded-r-2xl p-4 flex items-center justify-center text-sm font-medium text-methodist-blue hover:text-blue-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Close
                </button>
              </div>
            </div>
          ), { duration: 6000, position: 'top-right' });

          // 2. Show System Device Notification
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
             try {
                new Notification('School Notification: ' + title, {
                  body: content,
                  icon: '/icon-192x192.png',
                });
             } catch(e) {
                // Ignore fallback exceptions on some mobile browsers
             }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  return null
}
