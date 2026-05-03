import { XMLParser } from 'fast-xml-parser';

export interface NewsItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  imageUrl?: string;
  source: string;
}

const RSS_FEEDS: { url: string; source: string }[] = [
  { url: 'https://www.formula1.com/en/latest/all.xml', source: 'Formula 1' },
  { url: 'https://www.motorsport.com/f1/rss/',         source: 'Motorsport' },
  { url: 'https://www.autosport.com/rss/f1/',          source: 'Autosport'  },
];

export async function fetchF1News(): Promise<NewsItem[]> {
  const allNews: NewsItem[] = [];

  for (const feed of RSS_FEEDS) {
    try {
      const response = await fetch(feed.url);
      if (!response.ok) continue;

      const xmlText = await response.text();
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
      });

      const result = parser.parse(xmlText);
      const items = result?.rss?.channel?.item || result?.feed?.entry || [];

      // Debug: log the first item's keys to verify image field names
      if (items[0]) console.log(`[news] ${feed.source} first item keys:`, Object.keys(items[0]), 'imageUrl will be:', extractImage(items[0]));

      const newsItems: NewsItem[] = Array.isArray(items) ? items.map((item: any) => ({
        title:       extractText(item.title),
        description: extractText(item.description) || extractText(item.summary) || extractText(item['content:encoded']) || '',
        link:        extractLink(item.link),
        pubDate:     item.pubDate || item.published || '',
        imageUrl:    extractImage(item),
        source:      feed.source,
      })) : [];

      allNews.push(...newsItems);
    } catch (error) {
      console.error(`Error fetching news from ${feed.url}:`, error);
    }
  }

  return allNews
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, 20);
}

// ── Helpers ──────────────────────────────────────────────────────────

/** Safely pull a string out of a field that may be a plain string, an object
 *  with #text / __cdata, or an Atom-style object with @_href. */
function extractText(field: any): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  if (typeof field === 'number') return String(field);
  return field['#text'] || '';
}

/** Extract href from an Atom <link> element or a plain RSS string. */
function extractLink(field: any): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  // Atom: <link href="..." />  →  { @_href: "..." }
  if (field['@_href']) return field['@_href'];
  // Array of link elements (some Atom feeds) — prefer the 'alternate' rel
  if (Array.isArray(field)) {
    const alt = field.find((l: any) => l['@_rel'] === 'alternate' || !l['@_rel']);
    return alt?.['@_href'] || '';
  }
  return field['#text'] || '';
}

/** Try every known RSS/Atom image field, falling back to scraping HTML. */
function extractImage(item: any): string | undefined {
  // 1. media:thumbnail (Motorsport, many others)
  const thumb = item['media:thumbnail'];
  if (thumb?.['@_url']) return thumb['@_url'];
  // Array of thumbnails — pick the largest by width
  if (Array.isArray(thumb)) {
    const best = thumb.reduce((a: any, b: any) =>
      (parseInt(b['@_width'] ?? '0') > parseInt(a['@_width'] ?? '0') ? b : a));
    if (best?.['@_url']) return best['@_url'];
  }

  // 2. media:content (Autosport and others)
  const mc = item['media:content'];
  if (mc?.['@_url']) return mc['@_url'];
  if (Array.isArray(mc)) {
    const img = mc.find((m: any) => (m['@_medium'] === 'image' || m['@_type']?.startsWith('image')));
    if (img?.['@_url']) return img['@_url'];
    if (mc[0]?.['@_url']) return mc[0]['@_url'];
  }

  // 3. media:group (YouTube-style)
  const mg = item['media:group'];
  if (mg) {
    const mgc = mg['media:content'];
    if (mgc?.['@_url']) return mgc['@_url'];
  }

  // 4. enclosure (podcast-style RSS, but also used for images)
  const enc = item['enclosure'];
  if (enc?.['@_url'] && enc?.['@_type']?.startsWith('image')) return enc['@_url'];
  if (enc?.['@_url']) return enc['@_url'];

  // 5. image tag at item level (rare but exists)
  if (item.image?.url) return item.image.url;

  // 6. Scrape first <img> from the description/content HTML
  const html = extractText(item.description) ||
               extractText(item.summary) ||
               extractText(item['content:encoded']) || '';
  return extractImageFromHtml(html);
}

function extractImageFromHtml(html: string): string | undefined {
  // Match both double and single quoted src attributes
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : undefined;
}

