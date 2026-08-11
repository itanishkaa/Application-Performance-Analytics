/**
 * The cleaning pipeline substitutes placeholder values for rows whose
 * source log was missing that field entirely (PRD section 9.4-9.6):
 * "unknown-service", "unknown-endpoint", "unknown" (release/region).
 * Those are the correct values to filter/route/group on, but showing them
 * verbatim reads like leftover raw data — so the UI shows a friendlier
 * label while routing, API calls, and grouping still use the raw value.
 */
export function formatServiceName(serviceName: string): string {
  return serviceName === "unknown-service" ? "Unknown Service" : serviceName;
}

export function formatEndpointName(endpoint: string): string {
  return endpoint === "unknown-endpoint" ? "Unknown Endpoint" : endpoint;
}

export function formatReleaseName(release: string): string {
  return release === "unknown" ? "Unclassified" : release;
}

export function formatRegionName(region: string): string {
  return region === "unknown" ? "Unclassified" : region;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
