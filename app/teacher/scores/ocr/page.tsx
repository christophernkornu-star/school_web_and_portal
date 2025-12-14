'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Camera, Upload, CheckCircle, XCircle, AlertCircle, Loader2, Eye, Image as ImageIcon } from 'lucide-react'
import { createWorker } from 'tesseract.js'
import { getCurrentUser, getTeacherData } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getTeacherClassAccess } from '@/lib/teacher-permissions'

interface ExtractedScore {
  studentId?: string
  studentName?: string
  subjectId?: string
  subjectName?: string
  classScore?: number
  examScore?: number
  total?: number
  confidence: number
  rawText: string
  xPosition?: number
}

interface ProcessedScore extends ExtractedScore {
  id: string
  status: 'pending' | 'verified' | 'error'
  student?: any
  error?: string
}

export default function OCRScoresPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [teacher, setTeacher] = useState<any>(null)
  const [classes, setClasses] = useState<any[]>([])
  const [allSubjects, setAllSubjects] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [terms, setTerms] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedTerm, setSelectedTerm] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [extractedScores, setExtractedScores] = useState<ProcessedScore[]>([])
  const [ocrProgress, setOcrProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [students, setStudents] = useState<any[]>([])
  const [ocrTemplate, setOcrTemplate] = useState<any>(null)

  useEffect(() => {
    loadTeacherData()
  }, [router])

  useEffect(() => {
    if (selectedClass && teacher) {
      loadStudents()
      loadOcrTemplate()
      filterSubjects()
    }
  }, [selectedClass, teacher])

  function filterSubjects() {
    if (!selectedClass || classes.length === 0) return

    const cls = classes.find(c => c.class_id === selectedClass)
    if (!cls) return

    const className = cls.class_name
    let level = ''
    
    if (['KG 1', 'KG 2'].some(c => className.includes(c))) level = 'kindergarten'
    else if (['Basic 1', 'Basic 2', 'Basic 3'].some(c => className.includes(c))) level = 'lower_primary'
    else if (['Basic 4', 'Basic 5', 'Basic 6'].some(c => className.includes(c))) level = 'upper_primary'
    else if (['JHS 1', 'JHS 2', 'JHS 3'].some(c => className.includes(c))) level = 'jhs'

    if (level) {
      const filtered = allSubjects.filter(s => s.level === level)
      if (filtered.length > 0) {
        setSubjects(filtered)
      } else {
        // Fallback if no subjects match the level (e.g. if levels aren't set in DB)
        setSubjects(allSubjects)
      }
    } else {
      setSubjects(allSubjects)
    }
  }

  async function loadOcrTemplate() {
    try {
      const { data } = await supabase
        .from('ocr_templates')
        .select('*')
        .eq('class_id', selectedClass)
        .eq('teacher_id', teacher.id)
        .maybeSingle()
      
      if (data) {
        console.log('Loaded OCR Template:', data)
        setOcrTemplate(data)
      }
    } catch (err) {
      console.error('Error loading OCR template:', err)
    }
  }

  async function loadTeacherData() {
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login?portal=teacher')
        return
      }

      const { data: teacherData, error: teacherError } = await getTeacherData(user.id)
      if (teacherError || !teacherData) {
        setError('Teacher profile not found')
        setLoading(false)
        return
      }

      setTeacher(teacherData)

      // Load teacher's assigned classes
      const classAccess = await getTeacherClassAccess(teacherData.profile_id)
      setClasses(classAccess)

      // Load subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, name, code, level')
        .order('name')

      if (!subjectsError && subjectsData) {
        setAllSubjects(subjectsData)
        setSubjects(subjectsData)
      }

      // Load terms
      const { data: termsData, error: termsError } = await supabase
        .from('academic_terms')
        .select('*')
        .order('created_at', { ascending: false })

      if (!termsError && termsData) {
        setTerms(termsData)
        
        // Auto-select current term from system settings
        try {
          const { data: currentTermData } = await supabase
            .from('system_settings')
            .select('setting_value')
            .eq('setting_key', 'current_term')
            .maybeSingle() as { data: any }
          
          if (currentTermData?.setting_value) {
            const matchingTerm = termsData.find((t: any) => t.id === currentTermData.setting_value)
            if (matchingTerm) {
              setSelectedTerm(currentTermData.setting_value)
            }
          }
        } catch (err) {
          console.error('Error loading current term:', err)
        }
      }

    } catch (err: any) {
      console.error('Error loading teacher data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadStudents() {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', selectedClass)
        .eq('status', 'active')
        .order('student_id')

      if (error) throw error
      setStudents(data || [])
    } catch (err: any) {
      console.error('Error loading students:', err)
    }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB')
      return
    }

    setImage(file)
    setError(null)
    setExtractedScores([])

    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  function calculateSimilarity(str1: string, str2: string): number {
    // Levenshtein distance for fuzzy matching
    const s1 = str1.toLowerCase().trim()
    const s2 = str2.toLowerCase().trim()
    
    const len1 = s1.length
    const len2 = s2.length
    
    if (len1 === 0) return len2 === 0 ? 1 : 0
    if (len2 === 0) return 0
    
    const matrix: number[][] = []
    
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j
    }
    
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (s1.charAt(i - 1) === s2.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          )
        }
      }
    }
    
    const maxLen = Math.max(len1, len2)
    const distance = matrix[len1][len2]
    return 1 - (distance / maxLen)
  }

  async function preprocessImage(file: File): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      const img = new Image()

      img.onload = () => {
        // Set canvas size
        canvas.width = img.width
        canvas.height = img.height

        // Draw original image
        ctx.drawImage(img, 0, 0)

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        // Image enhancement for better OCR
        for (let i = 0; i < data.length; i += 4) {
          // Convert to grayscale
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3
          
          // Simple contrast stretching instead of hard threshold
          // This preserves more detail while improving readability
          let val = avg;
          if (val < 50) val = 0; // Darken darks
          else if (val > 200) val = 255; // Lighten lights
          else {
            // Linear stretch for midtones
            val = (val - 50) * (255 / 150);
          }
          
          const final = Math.max(0, Math.min(255, val));

          data[i] = final     // Red
          data[i + 1] = final // Green
          data[i + 2] = final // Blue
        }

        // Put processed image back
        ctx.putImageData(imageData, 0, 0)

        // Return as data URL
        resolve(canvas.toDataURL('image/png'))
      }

      img.src = URL.createObjectURL(file)
    })
  }

  async function processImage() {
    if (!image || !selectedClass) {
      setError('Please select a class and upload an image')
      return
    }

    if (students.length === 0) {
      setError('No students found in the selected class')
      return
    }

    setProcessing(true)
    setError(null)
    setOcrProgress(0)

    try {
      // Preprocess image for better OCR accuracy
      const preprocessedImage = await preprocessImage(image)

      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 50)) // First 50% for preprocessing
          }
        }
      })

      // Configure for better handwriting recognition
      await worker.setParameters({
        tessedit_pageseg_mode: 6, // Assume uniform block of text
      } as any)

      setOcrProgress(50)

      const result = await worker.recognize(preprocessedImage)
      
      setOcrProgress(75)

      await worker.terminate()

      // Advanced Analysis using full OCR data (lines, words, geometry)
      const parsed = analyzeOCRData(result.data)
      setExtractedScores(parsed)

      setOcrProgress(100)

      if (parsed.length === 0) {
        setError('No scores detected. Please ensure the image contains student names and scores.')
      } else {
        setSuccessMessage(`Successfully detected ${parsed.length} scores!`)
      }

    } catch (err: any) {
      console.error('OCR Error:', err)
      setError('Failed to process image: ' + err.message)
    } finally {
      setProcessing(false)
      setOcrProgress(0)
    }
  }

  function analyzeOCRData(ocrData: any): ProcessedScore[] {
    let lines = ocrData?.lines

    // Fallback: Try to extract lines from blocks if not at top level
    if (!lines || lines.length === 0) {
      if (ocrData?.blocks) {
        lines = []
        ocrData.blocks.forEach((block: any) => {
          block.paragraphs?.forEach((p: any) => {
            if (p.lines) lines.push(...p.lines)
          })
        })
      }
    }

    if (!lines || lines.length === 0) {
      if (ocrData?.text) {
         console.log('Falling back to text-based analysis due to missing line data')
         return analyzeTextOnly(ocrData.text, students, subjects, selectedSubject)
      }

      console.warn('Invalid OCR data structure - no lines found:', ocrData)
      return []
    }

    if (students.length === 0) {
      console.warn('No students loaded for matching. Ensure a class is selected.')
    }

    const results: ProcessedScore[] = []
    
    // 1. Detect Subjects in Header (First few lines)
    const headerLines = lines.slice(0, 5)
    const detectedSubjects: { id: string, name: string, x: number, width: number }[] = []
    
    const clean = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '')

    headerLines.forEach((line: any) => {
      line.words.forEach((word: any) => {
        const wordText = clean(word.text)
        if (wordText.length < 3) return

        let bestSubject: any = null
        let bestScore = 0

        subjects.forEach(sub => {
          const subName = clean(sub.name)
          const score = calculateSimilarity(wordText, subName)
          const contains = subName.includes(wordText) || wordText.includes(subName)
          
          if (score > 0.8 || (contains && wordText.length > 3)) {
            if (score > bestScore) {
              bestScore = score
              bestSubject = sub
            }
          }
        })

        if (bestSubject && bestScore > 0.6) {
          const existing = detectedSubjects.find(ds => 
             Math.abs(ds.x - word.bbox.x0) < 50
          )
          if (!existing) {
            detectedSubjects.push({
              id: bestSubject.id,
              name: bestSubject.name,
              x: word.bbox.x0,
              width: word.bbox.x1 - word.bbox.x0
            })
          }
        }
      })
    })

    detectedSubjects.sort((a, b) => a.x - b.x)

    // Fallback: Use learned template if no subjects detected or partial detection
    if (detectedSubjects.length === 0 && ocrTemplate?.column_config) {
      console.log('Using learned OCR template for columns')
      const config = ocrTemplate.column_config as any[]
      config.forEach(col => {
        detectedSubjects.push({
          id: col.subject_id,
          name: col.subject_name,
          x: col.x_offset,
          width: 100 // Default width
        })
      })
      detectedSubjects.sort((a, b) => a.x - b.x)
    }

    // 2. Process Rows
    console.log(`Processing ${lines.length} lines against ${students.length} students`)
    
    lines.forEach((line: any) => {
      const lineText = line.text
      
      // Skip header lines that match subject names
      if (detectedSubjects.some(ds => calculateSimilarity(clean(lineText), clean(ds.name)) > 0.8)) {
        return
      }

      const studentMatch = findBestStudentMatch(lineText)
      
      // Extract numbers from the line
      const numbers: { value: number, x: number, confidence: number }[] = []
      
      line.words.forEach((word: any) => {
        let text = word.text
          .replace(/[O]/g, '0')
          .replace(/[I|l]/g, '1')
          .replace(/[S]/g, '5')
          .replace(/[Z]/g, '2')
          .replace(/[B]/g, '8')
          .replace(/,/g, '.')
        
        if (/^\d+(\.\d+)?$/.test(text)) {
          const val = parseFloat(text)
          if (!isNaN(val) && val <= 100) {
            numbers.push({
              value: val,
              x: word.bbox.x0,
              confidence: word.confidence
            })
          }
        }
      })

      numbers.sort((a, b) => a.x - b.x)

      if (studentMatch) {
        const { student, confidence } = studentMatch
        
        if (numbers.length > 0) {
          if (detectedSubjects.length > 0) {
            detectedSubjects.forEach((ds, index) => {
              let matchedNum = null
              
              if (numbers.length === detectedSubjects.length) {
                matchedNum = numbers[index]
              } else {
                matchedNum = numbers.reduce((prev, curr) => {
                  return (Math.abs(curr.x - ds.x) < Math.abs(prev.x - ds.x) ? curr : prev)
                })
                if (Math.abs(matchedNum.x - ds.x) > 300) matchedNum = null
              }

              if (matchedNum) {
                results.push({
                  id: `score-${student.id}-${ds.id}`,
                  studentId: student.student_id,
                  studentName: `${student.first_name} ${student.last_name}`,
                  subjectId: ds.id,
                  subjectName: ds.name,
                  classScore: 0,
                  examScore: 0,
                  total: matchedNum.value,
                  confidence: (confidence + matchedNum.confidence / 100) / 2,
                  rawText: lineText,
                  xPosition: matchedNum.x,
                  status: 'pending',
                  student: student
                })
              }
            })
          } else if (selectedSubject) {
            const subjectName = subjects.find(s => s.id === selectedSubject)?.name || 'Unknown'
            
            if (numbers.length >= 2) {
              results.push({
                id: `score-${student.id}`,
                studentId: student.student_id,
                studentName: `${student.first_name} ${student.last_name}`,
                subjectId: selectedSubject,
                subjectName: subjectName,
                classScore: numbers[0].value,
                examScore: numbers[1].value,
                total: numbers[0].value + numbers[1].value,
                confidence: (confidence + (numbers[0].confidence + numbers[1].confidence) / 200) / 2,
                rawText: lineText,
                xPosition: numbers[0].x, // Use first number as anchor
                status: 'pending',
                student: student
              })
            } else if (numbers.length === 1) {
              results.push({
                id: `score-${student.id}`,
                studentId: student.student_id,
                studentName: `${student.first_name} ${student.last_name}`,
                subjectId: selectedSubject,
                subjectName: subjectName,
                classScore: 0,
                examScore: 0,
                total: numbers[0].value,
                confidence: (confidence + numbers[0].confidence / 100) / 2,
                rawText: lineText,
                xPosition: numbers[0].x,
                status: 'pending',
                student: student
              })
            }
          }
        }
      } else if (numbers.length > 0 && (detectedSubjects.length > 0 || selectedSubject)) {
        // Found numbers but no student match - add as "Unknown Student"
        const subjectId = detectedSubjects.length > 0 ? detectedSubjects[0].id : selectedSubject
        const subjectName = detectedSubjects.length > 0 ? detectedSubjects[0].name : (subjects.find(s => s.id === selectedSubject)?.name || 'Unknown')
        
        results.push({
          id: `unknown-${Math.random().toString(36).substr(2, 9)}`,
          studentName: 'Unknown Student',
          subjectId: subjectId,
          subjectName: subjectName,
          classScore: 0,
          examScore: 0,
          total: numbers[0].value,
          confidence: 0.5,
          rawText: lineText,
          status: 'error',
          error: 'Student not identified'
        })
      }
    })

    // 3. Post-process results to merge Class/Exam pairs
    const mergedResults: ProcessedScore[] = []
    const groupedResults: Record<string, ProcessedScore[]> = {}

    results.forEach(r => {
      const key = `${r.studentId}-${r.subjectId}`
      if (!groupedResults[key]) groupedResults[key] = []
      groupedResults[key].push(r)
    })

    Object.values(groupedResults).forEach(group => {
      if (group.length === 2) {
        // Sort by X position (Left = Class, Right = Exam)
        group.sort((a, b) => (a.xPosition || 0) - (b.xPosition || 0))
        
        // Cap scores at max values
        let classScore = group[0].total || 0
        let examScore = group[1].total || 0
        
        if (classScore > 40) classScore = 40
        if (examScore > 60) examScore = 60
        
        mergedResults.push({
          ...group[0],
          id: group[0].id, // Keep first ID
          classScore: classScore,
          examScore: examScore,
          total: classScore + examScore,
          confidence: (group[0].confidence + group[1].confidence) / 2
        })
      } else {
        // Single score - check if it needs capping based on context
        // If it's a single score, we don't know if it's class or exam or total
        // But usually single score = total. If total > 100, cap at 100
        const r = group[0]
        if (r.total && r.total > 100) r.total = 100
        mergedResults.push(r)
      }
    })

    return mergedResults
  }

  function analyzeTextOnly(text: string, students: any[], subjects: any[], defaultSubjectId: string): ProcessedScore[] {
    const lines = text.split('\n').filter(l => l.trim().length > 0)
    const results: ProcessedScore[] = []
    
    console.log('Running text-only analysis on', lines.length, 'lines')

    // Try to detect subjects from the first few lines
    let detectedSubjects: any[] = []
    const clean = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '')

    for (let i = 0; i < Math.min(5, lines.length); i++) {
      console.log(`Header Line ${i}:`, lines[i]) // Log header lines for debugging
      const words = lines[i].split(/\s+/)
      words.forEach(word => {
        const wordText = clean(word)
        if (wordText.length < 2) return // Allow 2 chars for "Ma" (Math)

        let bestSubject: any = null
        let bestScore = 0

        subjects.forEach(sub => {
          const subName = clean(sub.name)
          const score = calculateSimilarity(wordText, subName)
          
          // Lower threshold to catch bad OCR (e.g. Sdence -> Science)
          if (score > 0.55 && score > bestScore) {
            bestScore = score
            bestSubject = sub
          }
          
          // Special handling for R.M.E
          if (subName.includes('rme') || subName.includes('religious')) {
             if (wordText.includes('rme') || wordText.includes('r19e') || wordText.includes('r.m.e') || wordText.includes('219e')) {
                bestScore = 0.9
                bestSubject = sub
             }
          }
          
          // Special handling for Math
          if (subName.includes('math')) {
             if (wordText.includes('math') || wordText.includes('moth') || wordText.includes('muth') || wordText === 'ma' || wordText.includes('malf') || wordText.includes('mat')) {
                bestScore = 0.9
                bestSubject = sub
             }
          }
          
          // Special handling for R.M.E
          if (subName.includes('rme') || subName.includes('religious')) {
             if (wordText.includes('rme') || wordText.includes('r19e') || wordText.includes('r.m.e') || wordText.includes('219e') || wordText.includes('eve') || wordText.includes('wc')) {
                bestScore = 0.9
                bestSubject = sub
             }
          }
        })

        if (bestSubject) {
          // Avoid duplicates (only add if not already in list)
          if (!detectedSubjects.some(s => s.id === bestSubject.id)) {
             detectedSubjects.push(bestSubject)
          }
        }
      })
    }

    console.log('Detected subjects in text:', detectedSubjects.map(s => s.name))

    lines.forEach(line => {
      // Clean line
      const cleanLine = line.trim()
      
      // Try to find student
      const studentMatch = findBestStudentMatch(cleanLine)
      
      // Improved number extraction with typo correction
      const numbers: number[] = []
      const words = cleanLine.split(/[\s,|]+/) // Split by space, comma, or pipe
      
      words.forEach(w => {
        // Clean common OCR number typos
        let valStr = w.replace(/O/g, '0')
                     .replace(/o/g, '0')
                     .replace(/l/g, '1')
                     .replace(/I/g, '1')
                     .replace(/g/g, '8') // Changed g to 8 based on user feedback (4g -> 48)
                     .replace(/s/g, '5')
                     .replace(/S/g, '5')
                     .replace(/B/g, '8')
                     .replace(/R/g, '8') // R looks like 8
                     .replace(/G/g, '6') // G looks like 6
                     .replace(/b/g, '6')
                     .replace(/q/g, '9')
                     .replace(/\.$/, '') // Remove trailing dot
        
        if (/^\d+(\.\d+)?$/.test(valStr)) {
          const val = parseFloat(valStr)
          if (val <= 100) numbers.push(val)
        }
      })
      
      if (numbers.length > 0) {
        const student = studentMatch?.student
        const confidence = studentMatch?.confidence || 0.5
        const studentName = student ? `${student.first_name} ${student.last_name}` : 'Unknown Student'
        const studentId = student ? student.student_id : `unknown-${Math.random().toString(36).substr(2, 5)}`
        const status = student ? 'pending' : 'error'
        const error = student ? undefined : 'Student not identified'

        if (detectedSubjects.length > 0) {
           // Map numbers to detected subjects
           // Determine if we are in "Class + Exam" mode (2 cols) or "Total" mode (1 col)
           // We check which count is closer to the number of values found
           
           const expectedPairs = detectedSubjects.length * 2
           const expectedSingles = detectedSubjects.length
           
           // If numbers found is closer to pairs count, assume pairs
           const isPairs = Math.abs(numbers.length - expectedPairs) <= Math.abs(numbers.length - expectedSingles)
           
           detectedSubjects.forEach((sub, idx) => {
             if (isPairs) {
               let classScore = numbers[idx * 2] || 0
               let examScore = numbers[idx * 2 + 1] || 0
               
               // Cap scores at max values
               if (classScore > 40) classScore = 40
               if (examScore > 60) examScore = 60
               
               results.push({
                  id: `score-${studentId}-${sub.id}`,
                  studentId: studentId,
                  studentName: studentName,
                  subjectId: sub.id,
                  subjectName: sub.name,
                  classScore: classScore,
                  examScore: examScore,
                  total: classScore + examScore,
                  confidence: confidence,
                  rawText: cleanLine,
                  status: status,
                  student: student,
                  error: error
               })
             } else {
               // Assume just Total Score
               let total = numbers[idx] || 0
               if (total > 100) total = 100
               
               results.push({
                  id: `score-${studentId}-${sub.id}`,
                  studentId: studentId,
                  studentName: studentName,
                  subjectId: sub.id,
                  subjectName: sub.name,
                  classScore: 0,
                  examScore: 0,
                  total: total,
                  confidence: confidence,
                  rawText: cleanLine,
                  status: status,
                  student: student,
                  error: error
               })
             }
           })
        } else if (defaultSubjectId) {
           const subjectName = subjects.find(s => s.id === defaultSubjectId)?.name || 'Unknown'
           
           if (numbers.length >= 2) {
             let classScore = numbers[0]
             let examScore = numbers[1]
             
             // Cap scores
             if (classScore > 40) classScore = 40
             if (examScore > 60) examScore = 60
             
             results.push({
                id: `score-${studentId}`,
                studentId: studentId,
                studentName: studentName,
                subjectId: defaultSubjectId,
                subjectName: subjectName,
                classScore: classScore,
                examScore: examScore,
                total: classScore + examScore,
                confidence: confidence,
                rawText: cleanLine,
                status: status,
                student: student,
                error: error
             })
           } else if (numbers.length === 1) {
             results.push({
                id: `score-${studentId}`,
                studentId: studentId,
                studentName: studentName,
                subjectId: defaultSubjectId,
                subjectName: subjectName,
                classScore: 0,
                examScore: 0,
                total: numbers[0],
                confidence: confidence,
                rawText: cleanLine,
                status: status,
                student: student,
                error: error
             })
           }
        } else {
           // No subject detected and no default subject
           if (numbers.length >= 1) {
             results.push({
                id: `score-${studentId}`,
                studentId: studentId,
                studentName: studentName,
                subjectId: '',
                subjectName: 'Select Subject',
                classScore: numbers.length >= 2 ? numbers[0] : 0,
                examScore: numbers.length >= 2 ? numbers[1] : 0,
                total: numbers.length >= 2 ? numbers[0] + numbers[1] : numbers[0],
                confidence: confidence,
                rawText: cleanLine,
                status: 'error',
                student: student,
                error: 'Please select a subject'
             })
           }
        }
      }
    })
    
    return results
  }

  function findBestStudentMatch(text: string): { student: any, confidence: number } | null {
    if (!text || text.length < 2) return null // Allow 2 chars for short names/initials
    
    // Clean text but keep spaces to separate words
    const cleanText = text.replace(/[0-9]/g, '').replace(/[^a-zA-Z\s]/g, ' ').trim().toLowerCase()
    if (cleanText.length < 2) return null

    // Extract the first word (token) which is likely the name
    const firstToken = cleanText.split(/\s+/)[0]

    let bestMatch = null
    let bestScore = 0

    for (const student of students) {
      const first = (student.first_name || '').toLowerCase()
      const last = (student.last_name || '').toLowerCase()
      const full = `${first} ${last}`
      const reverse = `${last} ${first}`
      
      // 1. Full Text Matching
      const scoreFull = calculateSimilarity(cleanText, full)
      const scoreReverse = calculateSimilarity(cleanText, reverse)
      
      // 2. First Token Matching (Crucial for "Ao 24 4g..." -> "Ao")
      let tokenScore = 0
      if (firstToken.length >= 2) {
         const tokenScoreFull = calculateSimilarity(firstToken, full)
         const tokenScoreFirst = calculateSimilarity(firstToken, first)
         const tokenScoreLast = calculateSimilarity(firstToken, last)
         tokenScore = Math.max(tokenScoreFull, tokenScoreFirst, tokenScoreLast)
      }

      let containsScore = 0
      if (cleanText.includes(first) && cleanText.includes(last)) containsScore = 0.9
      else if (cleanText.includes(first) || cleanText.includes(last)) containsScore = 0.7
      
      // Check for partial matches at start of line (e.g. "Ao" for "Amoah")
      if (cleanText.startsWith(first.substring(0, 2)) || cleanText.startsWith(last.substring(0, 2))) {
         if (containsScore < 0.5) containsScore = 0.5
      }
      
      // Super loose match for very short OCR text (e.g. "Ao" -> "Amoah")
      // We use firstToken here because cleanText might contain garbage like "g o rg"
      const targetText = firstToken.length >= 2 ? firstToken : cleanText
      
      if (targetText.length <= 3) {
          // Check if first letter matches first or last name
          if (first.startsWith(targetText.charAt(0)) || last.startsWith(targetText.charAt(0))) {
              // Check if other chars are present in the name
              let matchCount = 0;
              for(let char of targetText) {
                  if (full.includes(char)) matchCount++;
              }
              
              // If all characters in the short text are found in the name
              if (matchCount === targetText.length) {
                  if (containsScore < 0.6) containsScore = 0.6
              }
          }
      }

      const maxScore = Math.max(scoreFull, scoreReverse, containsScore, tokenScore)
      
      if (maxScore > bestScore) {
        bestScore = maxScore
        bestMatch = student
      }
    }

    // Uniqueness check
    if (bestMatch && bestScore > 0.4) {
       let similarCount = 0
       const targetText = firstToken.length >= 2 ? firstToken : cleanText
       
       for (const student of students) {
          if (student.id === bestMatch.id) continue
          const first = (student.first_name || '').toLowerCase()
          const last = (student.last_name || '').toLowerCase()
          const full = `${first} ${last}`
          
          if (targetText.length <= 3) {
             let matchCount = 0;
             for(let char of targetText) {
                 if (full.includes(char)) matchCount++;
             }
             if (matchCount === targetText.length && (first.startsWith(targetText.charAt(0)) || last.startsWith(targetText.charAt(0)))) {
                 similarCount++
             }
          }
       }
       
       if (similarCount === 0 && targetText.length <= 3) {
          bestScore += 0.2 
       }
    }

    if (bestScore > 0.4) { // Lower threshold
      return { student: bestMatch, confidence: bestScore }
    }
    return null
  }

  function updateScore(id: string, field: string, value: any) {
    setExtractedScores(prev => prev.map(score => {
      if (score.id === id) {
        const updated = { ...score, [field]: value }
        
        if (field === 'classScore' || field === 'examScore') {
          const classScore = field === 'classScore' ? parseFloat(value) || 0 : score.classScore || 0
          const examScore = field === 'examScore' ? parseFloat(value) || 0 : score.examScore || 0
          updated.total = classScore + examScore
        }

        if (field === 'studentId' && value) {
          const student = students.find(s => s.student_id === value)
          if (student) {
            updated.student = student
            updated.status = 'verified'
            updated.error = undefined
          } else {
            updated.student = undefined
            updated.status = 'error'
            updated.error = 'Student not found'
          }
        }

        return updated
      }
      return score
    }))
  }

  function removeScore(id: string) {
    setExtractedScores(prev => prev.filter(score => score.id !== id))
  }

  async function saveScores() {
    const validScores = extractedScores.filter(s => s.status === 'verified' && s.student)

    if (validScores.length === 0) {
      setError('No valid scores to save. Please verify all entries.')
      return
    }

    if (validScores.some(s => !s.subjectId && !selectedSubject)) {
      setError('Some scores are missing a subject. Please select a default subject or re-scan.')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      const className = classes.find(c => c.class_id === selectedClass)?.class_name || ''
      
      const scoresToInsert = validScores.map(score => {
        const gradeData = calculateGradeAndRemark(score.total!, className)
        return {
          student_id: score.student!.id,
          subject_id: score.subjectId || selectedSubject,
          term_id: selectedTerm,
          class_score: score.classScore,
          exam_score: score.examScore,
          total: score.total,
          grade: gradeData.grade,
          remarks: gradeData.remark,
          teacher_id: teacher.id
        }
      })

      const { error: insertError } = await supabase
        .from('scores')
        .insert(scoresToInsert)

      if (insertError) throw insertError

      // Learn from this submission
      await updateOcrTemplate(validScores)

      setSuccessMessage(`Successfully saved ${validScores.length} scores!`)
      
      setTimeout(() => {
        setImage(null)
        setImagePreview(null)
        setExtractedScores([])
        setSuccessMessage(null)
      }, 3000)

    } catch (err: any) {
      console.error('Error saving scores:', err)
      setError('Failed to save scores: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  async function updateOcrTemplate(scores: ProcessedScore[]) {
    try {
      const subjectGroups: Record<string, number[]> = {}
      
      scores.forEach(s => {
        const subId = s.subjectId || selectedSubject
        if (subId && s.xPosition) {
          if (!subjectGroups[subId]) subjectGroups[subId] = []
          subjectGroups[subId].push(s.xPosition)
        }
      })

      const config = Object.entries(subjectGroups).map(([subId, xs]) => {
        const avgX = xs.reduce((a, b) => a + b, 0) / xs.length
        const subName = scores.find(s => (s.subjectId || selectedSubject) === subId)?.subjectName || 
                        subjects.find(s => s.id === subId)?.name
        return { subject_id: subId, subject_name: subName, x_offset: avgX }
      })

      if (config.length > 0) {
        console.log('Updating OCR Template:', config)
        await supabase.from('ocr_templates').upsert({
          teacher_id: teacher.id,
          class_id: selectedClass,
          column_config: config
        }, { onConflict: 'teacher_id,class_id' })
        
        // Refresh local template
        setOcrTemplate({
          teacher_id: teacher.id,
          class_id: selectedClass,
          column_config: config
        })
      }
    } catch (err) {
      console.error('Error updating OCR template:', err)
      // Don't block the user if learning fails
    }
  }

  function calculateGradeAndRemark(total: number, classLevel: string): { grade: string, remark: string } {
    // Determine if Primary (Basic 1-6) or JHS (Basic 7-9)
    // Handle both "Basic" and "Primary" naming conventions
    const isPrimary = (classLevel.includes('basic') || classLevel.includes('primary') || 
                      classLevel.includes('Basic') || classLevel.includes('Primary')) && 
                      (classLevel.includes('1') || classLevel.includes('2') || 
                       classLevel.includes('3') || classLevel.includes('4') || 
                       classLevel.includes('5') || classLevel.includes('6')) &&
                      !classLevel.includes('JHS') && !classLevel.includes('jhs')
    
    if (isPrimary) {
      // PRIMARY GRADING SYSTEM (Standard Based Curriculum)
      if (total >= 80) return { grade: '1', remark: 'Highly Proficient' }
      if (total >= 70) return { grade: '2', remark: 'Proficient' }
      if (total >= 60) return { grade: '3', remark: 'Approaching Proficiency' }
      if (total >= 50) return { grade: '4', remark: 'Developing' }
      return { grade: '5', remark: 'Beginning' }
    } else {
      // JHS GRADING SYSTEM (Basic 7-9)
      if (total >= 80) return { grade: '1', remark: 'High proficient' }
      if (total >= 70) return { grade: '2', remark: 'Proficient' }
      if (total >= 60) return { grade: '3', remark: 'Proficient' }
      if (total >= 50) return { grade: '4', remark: 'Approaching proficiency' }
      if (total >= 40) return { grade: '5', remark: 'Developing' }
      return { grade: '6', remark: 'Emerging' }
    }
  }

  function calculateGrade(total: number): string {
    if (total >= 80) return 'A'
    if (total >= 70) return 'B'
    if (total >= 60) return 'C'
    if (total >= 50) return 'D'
    if (total >= 40) return 'E'
    return 'F'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-ghana-green mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/teacher/scores" className="text-ghana-green hover:text-green-700">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">OCR Score Entry</h1>
                <p className="text-xs md:text-sm text-gray-600">Upload an image of your score sheet</p>
              </div>
            </div>
            <Camera className="w-6 h-6 md:w-8 md:h-8 text-ghana-green" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-4 md:py-8">
        <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <p className="text-green-800 font-medium text-sm md:text-base">{successMessage}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <p className="text-red-800 text-sm md:text-base">{error}</p>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 md:p-6">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              <span>How to Use OCR Score Entry</span>
            </h3>
            <div className="text-sm text-gray-700 space-y-2">
              <p><strong>Step 1:</strong> Select class, subject, and term</p>
              <p><strong>Step 2:</strong> Take a clear photo or upload an image of your score sheet</p>
              <p><strong>Step 3:</strong> Click "Process Image" to extract scores</p>
              <p><strong>Step 4:</strong> Review and verify the extracted data</p>
              <p><strong>Step 5:</strong> Save the scores to the system</p>
              
              <div className="mt-4 pt-4 border-t border-blue-300">
                <p className="font-medium mb-2">Supported Formats:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>Multi-Subject Columns:</strong> Write subject names at the top (e.g., "Math", "English"). Scores below will be mapped to the nearest subject column.</li>
                  <li><strong>Single Subject:</strong> Select a subject manually if no header is detected.</li>
                  <li><strong>Row Format:</strong> <code>Student Name/ID  Score1  Score2 ...</code></li>
                </ul>
                <p className="mt-3 text-xs text-gray-600">
                  <strong>Note:</strong> The system uses geometric analysis to map scores to subjects. Ensure columns are aligned vertically.
                </p>
                <div className="mt-3 bg-green-50 border border-green-200 rounded p-2">
                  <p className="text-xs text-green-800 font-medium">✨ Enhanced OCR Features:</p>
                  <ul className="text-xs text-green-700 mt-1 space-y-1">
                    <li>• <strong>Column Detection:</strong> Automatically detects subject columns from headers</li>
                    <li>• <strong>Smart Mapping:</strong> Maps scores to subjects based on vertical alignment</li>
                    <li>• <strong>Fuzzy Matching:</strong> Matches student names even with typos</li>
                    <li>• <strong>Handwriting Support:</strong> Optimized for handwritten score sheets</li>
                    <li>• <strong>Adaptive Learning:</strong> Remembers your column layout for future scans</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                  Class *
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent"
                  disabled={processing}
                >
                  <option value="">Select Class</option>
                  {classes.map(cls => (
                    <option key={cls.class_id} value={cls.class_id}>
                      {cls.class_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                  Default Subject (Optional)
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent"
                  disabled={processing}
                >
                  <option value="">Select Subject (Fallback)</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                  Term *
                </label>
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent"
                  disabled={processing}
                >
                  <option value="">Select Term</option>
                  {terms.map(term => (
                    <option key={term.id} value={term.id}>
                      {term.term_name} ({term.academic_year})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedClass && students.length > 0 && (
              <p className="mt-3 text-sm text-gray-600">
                {students.length} student{students.length !== 1 ? 's' : ''} in this class
              </p>
            )}
          </div>

          {/* Image Upload */}
          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Upload Score Sheet Image</h3>
            
            <div className="space-y-4">
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent"
                  disabled={processing}
                />
              </div>

              {imagePreview && (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Score sheet preview"
                    className="max-w-full h-auto max-h-96 mx-auto border border-gray-300 rounded-lg"
                  />
                  {!processing && (
                    <button
                      onClick={() => {
                        setImage(null)
                        setImagePreview(null)
                        setExtractedScores([])
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {image && !processing && extractedScores.length === 0 && (
                <button
                  onClick={processImage}
                  disabled={!selectedClass || !selectedTerm}
                  className="w-full bg-ghana-green text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Eye className="w-5 h-5" />
                  <span>Process Image</span>
                </button>
              )}

              {processing && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 md:p-6">
                  <div className="flex items-center space-x-4">
                    <Loader2 className="w-8 h-8 animate-spin text-ghana-green" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">Processing image...</p>
                      <div className="mt-2 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-ghana-green h-2 rounded-full transition-all duration-300"
                          style={{ width: `${ocrProgress}%` }}
                        />
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{ocrProgress}%</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Extracted Scores */}
          {extractedScores.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  Extracted Scores ({extractedScores.length})
                </h3>
                <button
                  onClick={saveScores}
                  disabled={processing || extractedScores.filter(s => s.status === 'verified').length === 0}
                  className="w-full md:w-auto bg-ghana-green text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>Save All Scores</span>
                </button>
              </div>

              <div className="space-y-3">
                {extractedScores.map(score => (
                  <div
                    key={score.id}
                    className={`border rounded-lg p-4 ${
                      score.status === 'verified' ? 'border-green-300 bg-green-50' :
                      score.status === 'error' ? 'border-red-300 bg-red-50' :
                      'border-yellow-300 bg-yellow-50'
                    }`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start md:items-center">
                      <div className="md:col-span-3">
                        <label className="block text-xs md:text-sm text-gray-600 mb-1">Student ID *</label>
                        <select
                          value={score.student?.student_id || score.studentId || ''}
                          onChange={(e) => updateScore(score.id, 'studentId', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        >
                          <option value="">Select Student</option>
                          {students.map(student => (
                            <option key={student.id} value={student.student_id}>
                              {student.student_id} - {student.first_name} {student.last_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs md:text-sm text-gray-600 mb-1">Subject</label>
                        <div className="text-sm font-medium text-gray-800 truncate px-3 py-2 bg-gray-50 border border-gray-200 rounded" title={score.subjectName}>
                          {score.subjectName || 'Unknown'}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 md:contents">
                        <div className="md:col-span-2">
                          <label className="block text-xs md:text-sm text-gray-600 mb-1">Class (40)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="40"
                            value={score.classScore || ''}
                            onChange={(e) => updateScore(score.id, 'classScore', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs md:text-sm text-gray-600 mb-1">Exam (60)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="60"
                            value={score.examScore || ''}
                            onChange={(e) => updateScore(score.id, 'examScore', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs md:text-sm text-gray-600 mb-1">Total</label>
                          <input
                            type="text"
                            value={score.total?.toFixed(1) || ''}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-gray-100 font-semibold"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end md:justify-start space-x-2 md:col-span-1 mt-2 md:mt-0">
                        {score.status === 'verified' && (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                        {score.status === 'error' && (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        {score.status === 'pending' && (
                          <AlertCircle className="w-5 h-5 text-yellow-600" />
                        )}
                        <button
                          onClick={() => removeScore(score.id)}
                          className="text-red-600 hover:text-red-700 p-1"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {score.error && (
                      <p className="text-xs text-red-600 mt-2">{score.error}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1 truncate">Raw: {score.rawText}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
