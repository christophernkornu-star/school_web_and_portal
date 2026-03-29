
/**
 * Standardized Remarks Utilities
 * Used for generating auto-remarks on report cards based on performance and attendance.
 */

export const ATTITUDE_REMARKS = {
  excellent: ['Excellent attitude towards learning', 'Shows great enthusiasm', 'Very positive and motivated', 'Exceptionally dedicated', 'Highly focused and eager to learn', 'Consistently displays a proactive learning attitude', 'Demonstrates an exemplary approach to daily tasks', 'Self-driven and takes initiative naturally'],
  good: ['Good attitude towards learning', 'Shows interest in studies', 'Positive and cooperative', 'Generally motivated', 'Reliable and maintains a good learning pace', 'Shows willingness to tackle new challenges', 'Consistently attentive and participates often'],
  average: ['Satisfactory attitude', 'Needs to show more interest', 'Could be more enthusiastic', 'Average motivation'],
  poor: ['Needs improvement in attitude', 'Shows little interest', 'Must develop better attitude', 'Requires motivation']
}

export const INTEREST_REMARKS = {
  excellent: [
    'Enjoys reading storybooks and solving challenging math problems',
    'Likes leading group discussions and helping peers with studies',
    'Shows keen interest in science experiments and creative writing',
    'Active in quiz competitions and enjoys learning new topics',
    'Loves exploring library books and participating in class debates'
  ],
  good: [
    'Enjoys playing football and participating in cultural activities',
    'Likes drawing and engaging in creative arts',
    'Shows interest in gardening and nature studies',
    'Enjoys storytelling and listening to folklore',
    'Likes participating in school worship and singing'
  ],
  average: [
    'Likes playing with friends during break time',
    'Enjoys traditional games like Ampe and Oware',
    'Shows interest in practical agriculture and hands-on tasks',
    'Likes drumming and dancing during cultural events',
    'Enjoys listening to stories but needs to read more'
  ],
  poor: [
    'Likes playing football but needs to focus more on reading',
    'Enjoys running errands but should spend more time on homework',
    'Likes playing excessively during class hours',
    'Shows interest in games but lacks focus in academic work',
    'Enjoys socialising but needs to develop interest in books'
  ]
}

export const CONDUCT_REMARKS = {
  excellent: ['Excellent conduct', 'Well-behaved and respectful', 'A role model to others', 'Outstanding behaviour', 'Exemplary manners towards staff and peers', 'Polite, courteous, and highly dependable', 'Sets a positive behavioral standard for the class'],
  good: ['Good conduct', 'Generally well-behaved', 'Respectful to teachers and peers', 'Behaves appropriately', 'Friendly and maintains good relationships', 'Follows instructions without hesitation', 'Displays good manners in most situations'],
  average: ['Satisfactory conduct', 'Behaviour needs improvement', 'Occasionally disruptive', 'Must be more disciplined'],
  poor: ['Poor conduct', 'Frequently misbehaves', 'Needs serious improvement', 'Must change behaviour']
}

export const CLASS_TEACHER_REMARKS = {
  excellent: ['An outstanding student! Keep up the excellent work', 'Exceptional performance. A pleasure to teach', 'Brilliant work this term. Very proud of you', 'Excellent results. Continue to aim high'],
  good: ['Good performance this term. Keep it up', 'A hardworking student with good results', 'Well done! Continue to work hard', 'Good progress shown. Maintain the effort'],
  average: ['Average performance. Can do better with more effort', 'Fair results. Needs to work harder', 'Satisfactory work but must improve', 'More effort needed to achieve better results'],
  poor: ['Poor performance. Needs serious improvement', 'Must work much harder next term', 'Below expectations. Requires extra effort', 'Needs to focus more on studies']
}

export const HEADTEACHER_REMARKS = {
  excellent: ['Excellent performance! The school is proud of you', 'Outstanding achievement. Keep it up', 'A remarkable student. Continue the good work', 'Exceptional results. Well done!'],
  good: ['Good performance. Continue to work hard', 'Well done. Maintain your good work', 'Commendable effort. Keep improving', 'Good progress. Stay focused'],
  average: ['Average performance. More effort is required', 'Satisfactory but can do better', 'Needs to put in more effort', 'Fair results. Improvement expected'],
  poor: ['Below average. Serious improvement needed', 'Performance not satisfactory. Must work harder', 'Disappointing results. Requires immediate attention', 'Needs to take studies more seriously']
}

export function getPerformanceLevel(averageScore: number): 'excellent' | 'good' | 'average' | 'poor' {
  if (averageScore >= 80) return 'excellent'
  if (averageScore >= 60) return 'good'
  if (averageScore >= 40) return 'average'
  return 'poor'
}

// Seeded random number generator
function seededRandom(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}

export function getAutoRemark(remarkType: string, averageScore: number, attendancePercentage?: number, seedStr?: string): string {
  let level = getPerformanceLevel(averageScore)
  
  // Adjust level based on attendance for teacher remarks
  if (attendancePercentage !== undefined && (remarkType === 'classTeacher' || remarkType === 'headTeacher')) {
    if (attendancePercentage < 50) {
      level = 'poor'
    } else if (attendancePercentage < 70 && level !== 'poor') {
      level = 'average'
    } else if (attendancePercentage < 85 && level === 'excellent') {
      level = 'good'
    }
  }

  let remarks: string[] = []
  
  switch (remarkType) {
    case 'attitude':
      remarks = ATTITUDE_REMARKS[level]
      break
    case 'interest':
      remarks = INTEREST_REMARKS[level]
      break
    case 'conduct':
      remarks = CONDUCT_REMARKS[level]
      break
    case 'classTeacher':
      remarks = CLASS_TEACHER_REMARKS[level]
      break
    case 'headTeacher':
      remarks = HEADTEACHER_REMARKS[level]
      break
    default:
        return ''
  }
  
  let selectedRemark = '';
  if (remarks.length > 0) {
      if (seedStr) {
          // Use deterministic random selection if seed is provided
          const seed = `${seedStr}-${remarkType}`;
          const index = Math.floor(seededRandom(seed) * remarks.length);
          selectedRemark = remarks[index];
      } else {
          // Use regular random
          selectedRemark = remarks[Math.floor(Math.random() * remarks.length)];
      }
  }

  // Append attendance remark for attitude if attendance is poor (50% or less)
  if (remarkType === 'attitude' && attendancePercentage !== undefined && attendancePercentage <= 50) {
    const poorAttendancePhrases = [". Not regular in school", ". Truant"];
    const phraseIndex = seedStr 
        ? Math.floor(seededRandom(`${seedStr}-truancy`) * poorAttendancePhrases.length)
        : Math.floor(Math.random() * poorAttendancePhrases.length);
    selectedRemark += poorAttendancePhrases[phraseIndex];
  }
  
  return selectedRemark
}

export function getAllRemarks(remarkType: string): string[] {
  switch (remarkType) {
    case 'attitude':
      return [...ATTITUDE_REMARKS.excellent, ...ATTITUDE_REMARKS.good, ...ATTITUDE_REMARKS.average, ...ATTITUDE_REMARKS.poor]
    case 'interest':
      return [...INTEREST_REMARKS.excellent, ...INTEREST_REMARKS.good, ...INTEREST_REMARKS.average, ...INTEREST_REMARKS.poor]
    case 'conduct':
      return [...CONDUCT_REMARKS.excellent, ...CONDUCT_REMARKS.good, ...CONDUCT_REMARKS.average, ...CONDUCT_REMARKS.poor]
    case 'classTeacher':
      return [...CLASS_TEACHER_REMARKS.excellent, ...CLASS_TEACHER_REMARKS.good, ...CLASS_TEACHER_REMARKS.average, ...CLASS_TEACHER_REMARKS.poor]
    case 'headTeacher':
      return [...HEADTEACHER_REMARKS.excellent, ...HEADTEACHER_REMARKS.good, ...HEADTEACHER_REMARKS.average, ...HEADTEACHER_REMARKS.poor]
    default:
      return []
  }
}
