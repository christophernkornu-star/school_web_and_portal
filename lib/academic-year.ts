import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

/**
 * Academic-year helpers.
 *
 * The "active academic year" is the year of whatever academic term is currently
 * flagged as the live term (`academic_terms.is_current = true`, surfaced in the
 * UI via the `current_term` system setting). All other years are treated as
 * "past" and are intentionally hidden from the standard teacher/report flows.
 * Past years remain reachable only through the dedicated Historical Reports.
 *
 * NOTE: These are deliberately *pure, dependency-light* helpers that take a
 * Supabase client (or a fetched terms array) so both client components and
 * plain functions can use them without RLS surprises.
 */

export interface TermLike {
  id: string
  name?: string
  academic_year?: string | number
  is_current?: boolean
  start_date?: string | null
}

/** Resolve the active academic year, trying several sources of truth. */
export async function resolveActiveAcademicYear(
  supabase: ReturnType<typeof getSupabaseBrowserClient>
): Promise<string> {
  // 1) Strongest signal: the term(s) explicitly flagged as current.
  const { data: currentTerms } = await supabase
    .from('academic_terms')
    .select('academic_year')
    .eq('is_current', true)
    .limit(1)

  if (currentTerms?.[0]?.academic_year) {
    return String(currentTerms[0].academic_year)
  }

  // 2) Fallback: the `current_term` system setting points at a term id.
  const { data: setting } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'current_term')
    .maybeSingle()

  if (setting?.setting_value) {
    const { data: term } = await supabase
      .from('academic_terms')
      .select('academic_year')
      .eq('id', setting.setting_value)
      .maybeSingle()
    if (term?.academic_year) return String(term.academic_year)
  }

  // 3) Last resort: the school's configured current academic year.
  const { data: academicSettings } = await supabase
    .from('academic_settings')
    .select('current_academic_year')
    .limit(1)

  if (academicSettings?.[0]?.current_academic_year) {
    return String(academicSettings[0].current_academic_year)
  }

  // 4) Fall back to the most recent year present in academic_terms.
  const { data: terms } = await supabase
    .from('academic_terms')
    .select('academic_year')
    .order('academic_year', { ascending: false })
    .limit(1)

  return terms?.[0]?.academic_year ? String(terms[0].academic_year) : ''
}

/**
 * Given an already-fetched array of terms, isolate the ones belonging to the
 * active academic year. Terms missing a year are kept (avoids hiding data).
 */
export function filterTermsByActiveYear(
  terms: TermLike[],
  activeYear: string
): TermLike[] {
  if (!terms || terms.length === 0) return []
  const normalized = String(activeYear || '').trim()
  if (!normalized) return terms // nothing to compare against -> show everything
  return terms.filter((t) => {
    const y = t.academic_year == null ? '' : String(t.academic_year).trim()
    return y === '' || y === normalized
  })
}

/**
 * Whether an academic year string is considered "past" relative to the active
 * year. Terms with no year are never considered past (avoids hiding data).
 */
export function isPastYear(year: string | number | null | undefined, activeYear: string): boolean {
  if (year == null || String(year).trim() === '') return false
  const y = String(year).trim()
  const a = String(activeYear || '').trim()
  if (!a) return false
  return y !== a
}
