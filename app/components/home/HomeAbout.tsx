import { supabaseAdmin } from '@/lib/supabase-admin'

export default async function HomeAbout() {
  const [studentRes, teacherRes] = await Promise.all([
    supabaseAdmin
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabaseAdmin
      .from('teachers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
  ])

  const studentCount = studentRes.count || 0
  const teacherCount = teacherRes.count || 0

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h3 className="text-3xl font-bold mb-4 text-methodist-blue">
              About Our School
            </h3>
            <p className="text-gray-700 mb-4 text-justify">
              Biriwa Methodist 'C' Basic School is one of the leading basic educational institutions in the Central Region of Ghana,
              committed to providing quality education from KG 1 through to Basic 9.
            </p>
            <p className="text-gray-700 mb-4 text-justify">
              Guided by our motto <span className="font-bold text-methodist-blue">"Discipline with Hardwork"</span>, 
              we combine academic excellence with moral education, preparing students for success in their
              future academic pursuits and as responsible citizens of Ghana.
            </p>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="text-center p-4 bg-white rounded-lg shadow-md border-2 border-transparent hover:border-methodist-blue transition-colors">
                <div className="text-3xl font-bold text-methodist-blue">{studentCount}</div>
                <div className="text-sm text-gray-600 font-semibold">Students</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-md border-2 border-transparent hover:border-ghana-green transition-colors">
                <div className="text-3xl font-bold text-ghana-green">{teacherCount}</div>
                <div className="text-sm text-gray-600 font-semibold">Teachers</div>
              </div>
            </div>
          </div>
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <div className="mb-6">
              <div className="inline-block bg-ghana-red text-white px-4 py-2 rounded-full text-sm font-bold mb-3">
                MISSION STATEMENT
              </div>
              <p className="text-gray-700 leading-relaxed text-justify">
                To provide relevant education and to offer the highest learning environment in which 
                students irrespective of race, ethnic, and religious background are motivated and 
                supported in order to achieve their full potential in their academic discipline and 
                to become productive members of the society and as individuals.
              </p>
            </div>
            <div>
              <div className="inline-block bg-ghana-red text-white px-4 py-2 rounded-full text-sm font-bold mb-3">
                VISION STATEMENT
              </div>
              <p className="text-gray-700 leading-relaxed text-justify">
                To develop well rounded, confident and responsible individuals who aspire to 
                achieve their full potential by providing a serene, happy, safe and supportive 
                learning environment in which everyone is unique and all achievement are celebrated.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
