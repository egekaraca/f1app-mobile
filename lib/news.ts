import { XMLParser } from 'fast-xml-parser';

export interface NewsItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  imageUrl?: string;
}

const RSS_FEEDS = [
  'https://www.formula1.com/en/latest/all.xml',
  'https://www.motorsport.com/f1/rss/',
  'https://www.autosport.com/rss/f1/',
];

export async function fetchF1News(): Promise<NewsItem[]> {
  const allNews: NewsItem[] = [];
  
  for (const feedUrl of RSS_FEEDS) {
    try {
      const response = await fetch(feedUrl);
      if (!response.ok) continue;
      
      const xmlText = await response.text();
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
      });
      
      const result = parser.parse(xmlText);
      const items = result?.rss?.channel?.item || result?.feed?.entry || [];
      
      const newsItems: NewsItem[] = Array.isArray(items) ? items.map((item: any) => ({
        title: item.title || item['title']['#text'] || '',
        description: item.description || item.summary || item['content']['#text'] || '',
        link: item.link || item['@_href'] || '',
        pubDate: item.pubDate || item.published || '',
        imageUrl: item['media:thumbnail']?.['@_url'] || 
                 item['enclosure']?.['@_url'] || 
                 item['media:content']?.['@_url'] ||
                 extractImageFromDescription(item.description || item.summary || ''),
      })) : [];
      
      allNews.push(...newsItems);
    } catch (error) {
      console.error(`Error fetching news from ${feedUrl}:`, error);
    }
  }
  
  // Sort by publication date (newest first) and limit to 20 items
  return allNews
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, 20);
}

function extractImageFromDescription(description: string): string | undefined {
  const imgMatch = description.match(/<img[^>]+src="([^"]+)"/i);
  return imgMatch ? imgMatch[1] : undefined;
}

