import { serverSupabaseServiceRole } from '#supabase/server'

/**
 * Nur Gear-Seiten. Profile stehen laut Abschnitt 10 hinter dem Login und
 * gehoeren nicht in eine Sitemap - die waere sonst eine Landkarte genau der
 * Seiten, die nicht oeffentlich sein sollen.
 */
export default defineEventHandler(async (event) => {
  const admin = serverSupabaseServiceRole(event)
  const { data, error } = await admin.from('catalog_items').select('slug, created_at').not('slug', 'is', null)

  if (error) {
    throw createError({ statusCode: 502, statusMessage: `Katalog nicht ladbar: ${error.message}` })
  }

  const origin = getRequestURL(event).origin
  const urls = (data ?? [])
    .map(
      (row: any) =>
        `  <url><loc>${origin}/gear/${row.slug}</loc><lastmod>${new Date(row.created_at).toISOString().slice(0, 10)}</lastmod></url>`,
    )
    .join('\n')

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`
})
