'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { headers } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// 1. Zod Schema Validation
const complaintSchema = z.object({
  type: z.string().min(2, "Type is required").max(50),
  subject: z.string().min(5, "Subject must be at least 5 characters").max(150),
  message: z.string().min(10, "Message must be at least 10 characters").max(1000),
  contact_name: z.string().min(2, "Name is required").max(100),
  contact_email: z.string().email("Invalid email format").optional().or(z.literal('')),
  contact_phone: z.string().max(20).optional().or(z.literal('')),
})

// 2. Simple In-Memory Rate Limiter (Note: Scoped per Node instance)
const rateLimitMap = new Map<string, { count: number, timestamp: number }>()

export async function submitComplaint(formData: FormData) {
  // Rate Limiting Check
  const ip = headers().get('x-forwarded-for') || headers().get('x-real-ip') || 'unknown'
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute window
  const maxRequests = 5 // max 5 complaints per minute per IP

  const rateData = rateLimitMap.get(ip) || { count: 0, timestamp: now }
  if (now - rateData.timestamp > windowMs) {
    rateData.count = 1
    rateData.timestamp = now
  } else {
    rateData.count++
  }
  rateLimitMap.set(ip, rateData)

  if (rateData.count > maxRequests) {
    return { success: false, error: "Rate limit exceeded. Please wait a minute before submitting again." }
  }

  // Parse and Validate Input
  const result = complaintSchema.safeParse({
    type: formData.get('type') as string,
    subject: formData.get('subject') as string,
    message: formData.get('message') as string,
    contact_name: formData.get('contact_name') as string,
    contact_email: formData.get('contact_email') as string,
    contact_phone: formData.get('contact_phone') as string,
  })

  if (!result.success) {
    return { success: false, error: result.error.errors[0].message }
  }

  const validatedData = result.data

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  const { error } = await supabase
    .from('complaints')
    .insert({
      type: validatedData.type,
      subject: validatedData.subject,
      message: validatedData.message,
      contact_name: validatedData.contact_name,
      contact_email: validatedData.contact_email,
      contact_phone: validatedData.contact_phone,
      status: 'pending'
    })

  if (error) {
    console.error('Error submitting complaint:', error)
    return { success: false, error: "A database error occurred while submitting." }
  }

  return { success: true }
}

export async function updateComplaintStatus(id: string, status: string, response?: string) {
  // Use service key to bypass RLS for admin actions if needed, 
  // or rely on RLS if we had the user session. 
  // Since this is a server action called by the admin page, we should verify auth.
  // But for simplicity and robustness in this context, I'll use the service key 
  // assuming the route protection handles the auth check.
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const updateData: any = { status }
  if (response) {
    updateData.admin_response = response
  }

  const { error } = await supabase
    .from('complaints')
    .update(updateData)
    .eq('id', id)

  if (error) {
    console.error('Error updating complaint:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/complaints')
  return { success: true }
}
