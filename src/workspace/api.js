const parseError = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const payload = await response.json();
    return payload;
  }
  return { error: `Errore HTTP ${response.status}` };
};

export async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const payload = await parseError(response);
    const error = new Error(payload.error || `Errore HTTP ${response.status}`);
    error.status = response.status;
    error.details = payload.details;
    throw error;
  }
  if (response.status === 204) return null;
  return response.json();
}

export async function downloadFile(path, options = {}) {
  const response = await fetch(`/api${path}`, { headers: options.headers || {} });
  if (!response.ok) {
    const payload = await parseError(response);
    const error = new Error(payload.error || `Errore HTTP ${response.status}`);
    error.status = response.status;
    error.details = payload.details;
    throw error;
  }
  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const filename = disposition.match(/filename="([^"]+)"/)?.[1] || 'sibillini-impact-export';
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}

export async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('Copia non riuscita. Seleziona e copia il link manualmente.');
}
