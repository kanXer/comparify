import { FareComparisonResponse } from './types';

/**
 * Fast, zero-bundle-cost browser download for .xlsx report via backend API
 * Does not bundle SheetJS (300KB) into client browser bundles
 */
export async function exportComparisonToExcel(data: FareComparisonResponse) {
  try {
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      throw new Error(`Export failed with status ${res.status}`);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    const citySlug =
      data.city?.split(',')?.[0]?.trim()?.toLowerCase()?.replace(/[^a-z0-9]/g, '') || 'report';
    const timestamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `camparify-comparison-${citySlug}-${timestamp}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err: any) {
    console.error('[Export] Failed to download Excel report:', err.message);
  }
}
