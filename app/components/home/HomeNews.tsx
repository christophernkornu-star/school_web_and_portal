import { supabaseAdmin } from '@/lib/supabase-admin'
import LatestNews from '@/components/LatestNews'

export default async function HomeNews() {
  const { data: news } = await supabaseAdmin
    .from('news')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(3)

  if (!news || news.length === 0) {
    return null
  }

  return <LatestNews news={news} />
}
