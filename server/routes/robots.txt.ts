/**
 * Vormals eine statische Datei unter public/robots.txt - die kann ihren
 * eigenen Ursprung aber nicht kennen, und eine relative "Sitemap:"-Zeile
 * ignorieren Crawler schlicht (siehe Fix-Runde Abschluss). Deshalb genau
 * dasselbe Muster wie server/routes/sitemap.xml.ts: eine Server-Route statt
 * einer statischen Datei. getRequestURL(event).origin liefert lokal
 * http://localhost:3000 und auf der gehosteten Instanz die echte Domain -
 * ohne dass irgendwo eine eigene Umgebungsvariable fuer die Site-URL
 * gepflegt werden muesste.
 */
export default defineEventHandler((event) => {
  const origin = getRequestURL(event).origin

  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  return `User-agent: *
Allow: /gear/
Disallow: /profile/
Disallow: /rig
Disallow: /settings
Disallow: /onboarding

Sitemap: ${origin}/sitemap.xml
`
})
