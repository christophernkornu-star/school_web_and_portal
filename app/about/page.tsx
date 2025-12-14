'use client'

import Link from 'next/link'
import { Award, Target, Heart, Users } from 'lucide-react'
import SiteHeader from '@/components/SiteHeader'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <SiteHeader />

      {/* Hero Section */}
      <section className="methodist-gradient text-white py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-4">About Our School</h2>
          <p className="text-xl text-gray-200">
            Committed to excellence in education since our establishment
          </p>
        </div>
      </section>

      {/* History Section */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-3xl font-bold text-methodist-blue mb-6">Our History</h3>
            <p className="text-gray-700 mb-4 leading-relaxed">
              Biriwa Methodist 'C' Basic School is a growing centre of excellence located in Biriwa 
              in the Central Region of Ghana, just 200 metres from the Gulf of Guinea. Established 
              during the 2011/2012 academic year, the school was carved out of the original Biriwa 
              Methodist A & B Schools to expand access to quality basic education within the community.
            </p>
            <p className="text-gray-700 mb-4 leading-relaxed">
              Situated in a vibrant coastal town where many parents are fisherfolk, the school plays 
              a vital role in providing hope, stability, and opportunity for children from diverse backgrounds.
            </p>
            <p className="text-gray-700 mb-4 leading-relaxed">
              As part of the Methodist Church Ghana's commitment to holistic education, Biriwa Methodist 'C' 
              is grounded in Christian values that promote academic excellence, strong character, moral discipline, 
              and spiritual growth. We provide a complete basic education from Kindergarten one (1) to Basic 9 
              School three (3).
            </p>
            <p className="text-gray-700 mb-4 leading-relaxed">
              Under the leadership of a transformational headteacher, <strong>Majesty Tettey</strong>, the school 
              has experienced significant progress in academics, infrastructure, and community engagement. His 
              vision-driven leadership continues to strengthen partnerships with parents, stakeholders, and the 
              wider Biriwa community.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Today, Biriwa Methodist 'C' Basic School stands as a beacon of opportunity—shaping confident, 
              disciplined, and academically competitive learners prepared for future success.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="flex items-center mb-4">
                <Target className="w-10 h-10 text-methodist-blue mr-3" />
                <h3 className="text-2xl font-bold text-gray-800">Our Mission</h3>
              </div>
              <p className="text-gray-700 leading-relaxed">
                To provide relevant education and to offer the highest learning environment in which 
                students irrespective of race, ethnic, and religious background are motivated and 
                supported in order to achieve their full potential in their academic discipline and 
                to become productive members of the society and as individuals.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="flex items-center mb-4">
                <Award className="w-10 h-10 text-ghana-green mr-3" />
                <h3 className="text-2xl font-bold text-gray-800">Our Vision</h3>
              </div>
              <p className="text-gray-700 leading-relaxed">
                To develop well rounded, confident and responsible individuals who aspire to 
                achieve their full potential by providing a serene, happy, safe and supportive 
                learning environment in which everyone is unique and all achievement are celebrated.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-6">
          <h3 className="text-3xl font-bold text-methodist-blue mb-8 text-center">Our Core Values</h3>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 text-center">
              <Users className="w-12 h-12 text-methodist-blue mx-auto mb-4" />
              <h4 className="font-bold text-lg mb-2 text-gray-800">Teamwork</h4>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6 text-center">
              <Heart className="w-12 h-12 text-ghana-red mx-auto mb-4" />
              <h4 className="font-bold text-lg mb-2 text-gray-800">Commitment</h4>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 text-center">
              <Award className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <h4 className="font-bold text-lg mb-2 text-gray-800">Discipline</h4>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 text-center">
              <Heart className="w-12 h-12 text-ghana-green mx-auto mb-4" />
              <h4 className="font-bold text-lg mb-2 text-gray-800">Faithfulness</h4>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-6 text-center">
              <Award className="w-12 h-12 text-ghana-gold mx-auto mb-4" />
              <h4 className="font-bold text-lg mb-2 text-gray-800">Integrity</h4>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 text-center">
              <Award className="w-12 h-12 text-methodist-blue mx-auto mb-4" />
              <h4 className="font-bold text-lg mb-2 text-gray-800">Accountability</h4>
            </div>
          </div>
        </div>
      </section>

      {/* Mandates Section */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <h3 className="text-3xl font-bold text-methodist-blue mb-8 text-center">Our Mandates</h3>
            
            <div className="space-y-6">
              {/* Ministry of Education Mandate */}
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-ghana-gold">
                <div className="flex items-center mb-3">
                  <span className="bg-ghana-gold text-white px-3 py-1 rounded text-sm font-bold mr-3">
                    MINISTRY OF EDUCATION MANDATE:
                  </span>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  To ensure quality and accessible education for all Ghanaians, focusing on policy 
                  formulation, coordination, monitoring, and evaluation to support human capital 
                  development and national progress.
                </p>
              </div>

              {/* Ghana Education Service Mandate */}
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-ghana-gold">
                <div className="flex items-center mb-3">
                  <span className="bg-ghana-gold text-white px-3 py-1 rounded text-sm font-bold mr-3">
                    GHANA EDUCATION SERVICE MANDATE:
                  </span>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  To ensure all Ghanaian children of school-going age receive inclusive, equitable, 
                  and quality formal education and training, effectively managing resources to meet 
                  the nation's manpower needs.
                </p>
              </div>

              {/* NaSIA Mandate */}
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-ghana-gold">
                <div className="flex items-center mb-3">
                  <span className="bg-ghana-gold text-white px-3 py-1 rounded text-sm font-bold mr-3">
                    NaSIA MANDATE:
                  </span>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  To develop, publish, promote, and license all public and private pre-tertiary schools, 
                  and enforce the highest standards for quality education in all public and private 
                  pre-tertiary educational institutions across Ghana.
                </p>
              </div>

              {/* Biriwa Methodist C Mandate */}
              <div className="bg-methodist-blue rounded-lg shadow-lg p-6 border-l-4 border-methodist-gold">
                <div className="flex items-center mb-3">
                  <span className="bg-methodist-gold text-methodist-blue px-3 py-1 rounded text-sm font-bold mr-3">
                    BIRIWA METHODIST C MANDATE:
                  </span>
                </div>
                <p className="text-white leading-relaxed">
                  To provide high-quality education that fosters the needs of its students and the 
                  broader community and to provide relevant, quality, and accessible education while 
                  providing lifelong learning and sustainable development.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Facilities */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-3xl font-bold text-methodist-blue mb-6">Our Facilities</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-6">
                <h4 className="font-bold text-lg mb-2 text-gray-800">Classrooms</h4>
                <p className="text-gray-700 text-sm">
                  Well-equipped, spacious classrooms designed for effective learning
                </p>
              </div>
              <div className="bg-white rounded-lg p-6">
                <h4 className="font-bold text-lg mb-2 text-gray-800">Library</h4>
                <p className="text-gray-700 text-sm">
                  A well-stocked library with books and resources for all grade levels
                </p>
              </div>
              <div className="bg-white rounded-lg p-6">
                <h4 className="font-bold text-lg mb-2 text-gray-800">ICT Lab</h4>
                <p className="text-gray-700 text-sm">
                  Modern computer laboratory for digital literacy education
                </p>
              </div>
              <div className="bg-white rounded-lg p-6">
                <h4 className="font-bold text-lg mb-2 text-gray-800">Sports Facilities</h4>
                <p className="text-gray-700 text-sm">
                  Playing fields and equipment for physical education and sports
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-12 bg-methodist-blue text-white">
        <div className="container mx-auto px-6 text-center">
          <h3 className="text-3xl font-bold mb-4">Visit Us</h3>
          <p className="text-xl mb-6">Biriwa, Central Region, Ghana</p>
          <p className="mb-2">Phone: +233 24 393 0752</p>
          <p className="mb-6">Email: info@biriwamethodist.edu.gh</p>
          <Link href="/admission" className="bg-ghana-gold text-methodist-blue font-bold py-3 px-8 rounded-lg hover:bg-yellow-300 transition-colors inline-block">
            Apply for Admission
          </Link>
        </div>
      </section>
    </div>
  )
}
