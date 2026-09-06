import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { normalize } from '../../utils/normalize'
import { invalidateCatalogSnapshot } from '../../utils/catalogSnapshot'

interface Body {
  brand?: string
  name?: string
  categoryId?: string
  parentId?: string | null
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Nicht angemeldet' })

  const body = await readBody<Body>(event)
  const brand = body.brand?.trim()
  const name = body.name?.trim()
  const categoryId = body.categoryId?.trim()

  if (!brand || !name || !categoryId) {
    throw createError({ statusCode: 400, statusMessage: 'brand, name und categoryId sind Pflicht' })
  }
  // Regel aus Abschnitt 4.1: Baujahr gehört ins Exemplar, nie in den Katalog.
  if (/\b(19|20)\d{2}\b/.test(name)) {
    throw createError({ statusCode: 400, statusMessage: 'Baujahr gehört nicht in den Modellnamen' })
  }

  const client = await serverSupabaseClient(event)
  const normalizedBrand = normalize(brand)

  const { data: existingBrand } = await client
    .from('brands')
    .select('id')
    .eq('normalized_name', normalizedBrand)
    .maybeSingle()

  let brandId = existingBrand?.id
  if (!brandId) {
    const { data, error } = await client
      .from('brands')
      .insert({ name: brand, normalized_name: normalizedBrand })
      .select('id')
      .single()
    if (error) throw createError({ statusCode: 400, statusMessage: error.message })
    brandId = data.id
  }

  const { data, error } = await client
    .from('catalog_items')
    .insert({
      brand_id: brandId,
      category_id: categoryId,
      name,
      parent_id: body.parentId ?? null,
      created_by: user.id,
      is_verified: false,
    })
    .select('id')
    .single()

  if (error) throw createError({ statusCode: 400, statusMessage: error.message })

  invalidateCatalogSnapshot()
  return { id: data.id }
})
