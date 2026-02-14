import { supabaseAdmin } from '@/lib/supabase-admin'
import Link from 'next/link'

export default async function HomeEvents() {
  const { data: events } = await supabaseAdmin
    .from('events')
    .select('*')
    .order('event_date', { ascending: true })
    .limit(3)

  if (!events || events.length === 0) {
    return null
  }

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-3xl font-bold text-methodist-blue">Upcoming Events</h3>
          <Link href="/events" className="text-ghana-green hover:text-green-700 font-semibold">
            View All →
          </Link>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {events.map((event: any) => (
            <div key={event.id} className="bg-gray-50 rounded-lg p-6 border-l-4 border-methodist-gold hover:shadow-lg transition-shadow">
              <div className="flex items-start space-x-4">
                <div className="bg-methodist-blue text-white rounded-lg p-3 text-center min-w-[60px]">
                  <div className="text-2xl font-bold">{new Date(event.event_date).getDate()}</div>
                  <div className="text-xs uppercase">{new Date(event.event_date).toLocaleString('default', { month: 'short' })}</div>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-gray-800 mb-2">{event.title}</h4>
                  <p className="text-gray-600 text-sm mb-3">{event.description}</p>
                  {event.location && (
                    <p className="text-xs text-gray-500">📍 {event.location}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
