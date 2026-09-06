import { serverSupabaseClient } from '#supabase/server'
import { normalize } from '../../utils/normalize'
import { invalidateCatalogSnapshot } from '../../utils/catalogSnapshot'
import { requireUserId } from '../../utils/authUser'
import { nameContainsYear } from '#shared/utils/modelYearRule'

interface Body {
  brand?: string
  name?: string
  categoryId?: string
  parentId?: string | null
}

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)

  const body = await readBody<Body>(event)
  const brand = body.brand?.trim()
  const name = body.name?.trim()
  const categoryId = body.categoryId?.trim()

  if (!brand || !name || !categoryId) {
    throw createError({ statusCode: 400, statusMessage: 'brand, name und categoryId sind Pflicht' })
  }
  // Design spec section 4.1: a build year belongs on the individual gear
  // item, never in the catalog name. See shared/utils/modelYearRule.ts for
  // why this check lives there instead of a local copy.
  if (nameContainsYear(name)) {
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
      created_by: userId,
      is_verified: false,
    })
    .select('id')
    .single()

  if (error) throw createError({ statusCode: 400, statusMessage: error.message })

  invalidateCatalogSnapshot()
  return { id: data.id }
})
