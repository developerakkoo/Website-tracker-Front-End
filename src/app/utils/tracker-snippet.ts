/** API origin for tracker.js and __trackerBase (no trailing /api). */
export function getTrackerDomain(apiUrl: string): string {
  const trimmed = apiUrl.replace(/\/+$/, '');
  if (trimmed.endsWith('/api')) {
    return trimmed.slice(0, -4);
  }
  return trimmed;
}

export function buildInstallationSnippet(trackerDomain: string, apiKey: string): string {
  const base = trackerDomain.replace(/\/+$/, '');
  return `<script>
(function(w,d,s,u,k,b){
  w.__trackerKey = k;
  w.__trackerBase = b;
  var js = d.createElement(s);
  js.async = true;
  js.src = u;
  var f = d.getElementsByTagName(s)[0];
  f.parentNode.insertBefore(js,f);
})(window, document, "script",
   "${base}/tracker.js",
   "${apiKey}",
   "${base}");
</script>`;
}

/** Common misconfigurations that block installation pings. */
export function getSnippetConfigWarnings(trackerDomain: string): string[] {
  const warnings: string[] = [];
  const base = trackerDomain.replace(/\/+$/, '');

  if (!base) {
    warnings.push('API URL is not configured. Set API_URL in environment.prod.ts and rebuild.');
    return warnings;
  }

  if (base.includes('://.') || /https:\/[^/]/.test(base)) {
    warnings.push('Tracker URL looks malformed (check https:// has two slashes and a valid host).');
  }

  if (base.endsWith('/api')) {
    warnings.push('Tracker base must not end with /api — pings would hit /api/api/installation/ping.');
  }

  if (base.includes('/api/tracker.js') || `${base}/tracker.js`.includes('/api/tracker.js')) {
    warnings.push('Load tracker.js from /tracker.js on the API host, not /api/tracker.js.');
  }

  if (
    !base.startsWith('https://') &&
    !base.startsWith('http://localhost') &&
    !base.startsWith('http://127.0.0.1')
  ) {
    warnings.push('Production sites should use https:// for __trackerBase to avoid mixed-content blocking.');
  }

  return warnings;
}
