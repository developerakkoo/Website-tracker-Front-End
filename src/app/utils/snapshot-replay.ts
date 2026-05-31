/** Resolve page URL to a directory base for relative asset loading in replay iframe. */
export function pageUrlToBaseHref(pageUrl: string): string {
  if (!pageUrl || !pageUrl.trim()) return '';
  try {
    const u = new URL(pageUrl);
    if (u.pathname.endsWith('/')) {
      return u.href;
    }
    const path = u.pathname;
    const lastSlash = path.lastIndexOf('/');
    if (lastSlash >= 0) {
      u.pathname = path.slice(0, lastSlash + 1);
    } else {
      u.pathname = '/';
    }
    return u.href;
  } catch {
    if (pageUrl.endsWith('/')) return pageUrl;
    const idx = pageUrl.lastIndexOf('/');
    return idx >= 0 ? pageUrl.slice(0, idx + 1) : pageUrl + '/';
  }
}

export function injectBaseHref(html: string, pageUrl: string): string {
  if (!pageUrl) return html;
  const base = pageUrlToBaseHref(pageUrl).replace(/"/g, '&quot;');
  const tag = `<base href="${base}">`;
  if (/<head[^>]*>/i.test(html)) {
    if (/<base\s/i.test(html)) {
      return html.replace(/<base[^>]*>/i, tag);
    }
    return html.replace(/<head[^>]*>/i, (m) => m + tag);
  }
  return `<head>${tag}</head>` + html;
}
