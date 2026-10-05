import { getAuthToken } from '../services/api.ts';

/**
 * Downloads a file directly via client-side Blob to avoid browser navigation
 * and prevent "Action required to load your app" cookie blocking in preview environments.
 */
export async function downloadFileDirectly(fileId: string, filename: string): Promise<void> {
  const token = getAuthToken();
  const url = `/api/files/${fileId}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;

  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Clean up object URL after download trigger
  setTimeout(() => {
    window.URL.revokeObjectURL(blobUrl);
  }, 2000);
}
