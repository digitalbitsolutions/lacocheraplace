function toQueryUrl(base, params) {
  const url = new URL(base);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  return url.toString();
}

export async function searchUnsplash(keyword, accessKey, perPage) {
  const url = toQueryUrl('https://api.unsplash.com/search/photos', {
    query: keyword,
    per_page: Math.min(perPage, 30),
    orientation: 'landscape',
    content_filter: 'high',
  });
  const res = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
      'Accept-Version': 'v1',
    },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || []).map((item) => ({
    id: item.id,
    source: 'unsplash',
    title: item.slug || '',
    description: item.description || item.alt_description || '',
    alt: item.alt_description || '',
    tags: (item.tags || []).map((t) => t.title).join(' '),
    originalUrl: item.links?.html || '',
    downloadUrl: item.urls?.regular || item.urls?.full || '',
    photographer: item.user?.name || '',
    license: 'Unsplash License',
  }));
}

export async function searchPexels(keyword, apiKey, perPage) {
  const url = toQueryUrl('https://api.pexels.com/v1/search', {
    query: keyword,
    per_page: Math.min(perPage, 80),
    orientation: 'landscape',
  });
  const res = await fetch(url, {
    headers: { Authorization: apiKey },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.photos || []).map((item) => ({
    id: item.id,
    source: 'pexels',
    title: item.alt || '',
    description: item.alt || '',
    alt: item.alt || '',
    tags: '',
    originalUrl: item.url || '',
    downloadUrl: item.src?.large2x || item.src?.large || item.src?.original || '',
    photographer: item.photographer || '',
    license: 'Pexels License',
  }));
}

export async function searchPixabay(keyword, apiKey, perPage) {
  const url = toQueryUrl('https://pixabay.com/api/', {
    key: apiKey,
    q: keyword,
    image_type: 'photo',
    safesearch: 'true',
    per_page: Math.min(perPage, 200),
    orientation: 'horizontal',
  });
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.hits || []).map((item) => ({
    id: item.id,
    source: 'pixabay',
    title: item.tags || '',
    description: item.tags || '',
    alt: '',
    tags: item.tags || '',
    originalUrl: item.pageURL || '',
    downloadUrl: item.largeImageURL || item.webformatURL || '',
    photographer: item.user || '',
    license: 'Pixabay Content License',
  }));
}

