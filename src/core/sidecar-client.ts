/**
 * Graceful local sidecar inference client (LLM-Optional).
 * Non-blocking probe to loopback only (localhost:8000).
 * Never contacts external networks and silently degrades if absent.
 */

export interface SidecarStatus {
  isAvailable: boolean;
  endpoint?: string;
  version?: string;
}

export function isSidecarFeatureEnabled(): boolean {
  try {
    return Boolean(import.meta.env?.VITE_LOCAL_SIDECAR_ENABLED === 'true');
  } catch {
    return false;
  }
}

export async function probeLocalSidecar(
  endpoint = 'http://localhost:8000/health'
): Promise<SidecarStatus> {
  if (!isSidecarFeatureEnabled()) {
    return { isAvailable: false };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 250);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        isAvailable: true,
        endpoint,
        version: data.version || 'local-active',
      };
    }
  } catch {
    // Silently fall back to deterministic mode.
    // Absence of sidecar causes zero warnings or UI errors.
  } finally {
    clearTimeout(timeoutId);
  }

  return { isAvailable: false };
}
