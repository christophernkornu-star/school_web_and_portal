import { supabaseAdmin } from '@/lib/supabase-admin'
import HeroCarousel from '@/components/HeroCarousel'

export default async function HomeGallery() {
  const { data: galleryPhotos } = await supabaseAdmin
    .from('gallery_photos')
    .select('*')
    .eq('is_spotlight', true)
    .order('created_at', { ascending: false })
    .limit(10)

  if (!galleryPhotos || galleryPhotos.length === 0) {
    return null
  }

  return <HeroCarousel photos={galleryPhotos} />
}
