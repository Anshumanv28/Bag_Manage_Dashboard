export type Operator = {
  phone: string;
  name: string;
  depositEnabled: boolean;
  retrieveEnabled: boolean;
};

export type CreateOperatorInput = {
  phone: string;
  name: string;
  password: string;
};

export type Booking = {
  id: string;
  candidateId: string;
  rackId: string;
  operatorId: string;
  returnOperatorId: string | null;
  status: "active" | "complete" | "flagged" | "deleted";
  createdAt: string;
  completedAt: string | null;
  updatedAt?: string;
  deletedAt?: string | null;
};

export type BookingListResponse = {
  bookings: Booking[];
  nextCursor: string | null;
};

export type BookingSummaryResponse = {
  total: number;
  active: number;
  complete: number;
  avgCompletionMinutes: number | null;
};

export type TimeBucketPoint = { bucket: string; count: number };

export type BookingTimeseriesResponse = {
  bucket: "hour" | "day";
  timezone: string;
  created: TimeBucketPoint[];
  completed: TimeBucketPoint[];
};

export type SyncSeriesPoint = {
  bucket: string;
  eventCount: number;
  mutationCount: number;
  okCount: number;
  errorCount: number;
};

export type SyncTimeseriesResponse = {
  bucket: "hour" | "day";
  timezone: string;
  series: SyncSeriesPoint[];
};

export type SyncLatestRow = {
  operatorId: string;
  deviceId: string;
  createdAt: string;
  mutationCount: number;
  okCount: number;
  errorCount: number;
};

export type SyncLatestResponse = { rows: SyncLatestRow[] };

export type SyncEventRow = {
  id: string;
  operatorId: string;
  deviceId: string;
  createdAt: string;
  mutationCount: number;
  okCount: number;
  errorCount: number;
};

export type SyncEventsResponse = {
  rows: SyncEventRow[];
  nextCursor: string | null;
};

export type ScanEventRow = {
  id: string;
  operatorId: string;
  deviceId: string | null;
  operation: "deposit" | "retrieve";
  eventType:
    | "candidate_scanned"
    | "rack_scanned"
    | "deposit_cancelled"
    | "retrieve_cancelled"
    | "scan_rejected";
  candidateId: string | null;
  rackId: string | null;
  occurredAt: string;
  createdAt: string;
  metadata: unknown;
};

export type ScanEventsResponse = {
  rows: ScanEventRow[];
  nextCursor: string | null;
};

export type ActivitiesSummaryResponse = {
  from: string;
  to: string;
  operatorId: string | null;
  deviceId: string | null;
  counts: {
    candidate_scanned: number;
    rack_scanned: number;
    deposit_confirmed: number;
    return_confirmed: number;
  };
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${text ? `: ${text}` : ""}`);
  }
  return (await res.json()) as T;
}

export function listOperators(): Promise<{ operators: Operator[] }> {
  return apiFetch(`/api/backend/api/v1/operators`);
}

export function createOperator(
  input: CreateOperatorInput,
): Promise<{ operator: Operator }> {
  return apiFetch(`/api/backend/api/v1/operators`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function patchOperator(
  phone: string,
  body: Partial<{
    name: string;
    password: string;
    depositEnabled: boolean;
    retrieveEnabled: boolean;
  }>,
): Promise<{ operator: Operator }> {
  return apiFetch(`/api/backend/api/v1/operators/${encodeURIComponent(phone)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export type FlaggedBookingsComputedRow = {
  booking: Booking;
  reasons: string[];
};

export type FlaggedBookingsComputedResponse = {
  rows: FlaggedBookingsComputedRow[];
  nextCursor: string | null;
};

export function listFlaggedBookingsComputed(params: {
  limit?: number;
  cursor?: string;
}): Promise<FlaggedBookingsComputedResponse> {
  const url = new URL(`/api/backend/api/v1/bookings/flagged`, window.location.origin);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
  return apiFetch(url.pathname + "?" + url.searchParams.toString());
}

export function listBookings(params: {
  status?: "active" | "complete";
  operatorId?: string;
  returnOperatorId?: string;
  rackId?: string;
  candidateId?: string;
  from?: string;
  to?: string;
  completedFrom?: string;
  completedTo?: string;
  limit?: number;
  cursor?: string;
}): Promise<BookingListResponse> {
  const url = new URL(`/api/backend/api/v1/bookings`, window.location.origin);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
  return apiFetch(url.pathname + "?" + url.searchParams.toString());
}

export async function deleteBooking(id: string): Promise<void> {
  const res = await fetch(`/api/backend/api/v1/bookings/${encodeURIComponent(id)}`, {
    method: "DELETE",
    cache: "no-store",
  });
  if (res.status === 204) return;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${text ? `: ${text}` : ""}`);
  }
}

export function bookingSummary(params: {
  from?: string;
  to?: string;
  status?: "active" | "complete";
  operatorId?: string;
  returnOperatorId?: string;
}): Promise<BookingSummaryResponse> {
  const url = new URL(
    `/api/backend/api/v1/analytics/bookings/summary`,
    window.location.origin,
  );
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
  return apiFetch(url.pathname + "?" + url.searchParams.toString());
}

export function bookingTimeseries(params: {
  from: string;
  to: string;
  bucket?: "hour" | "day";
  timezone?: string;
  status?: "active" | "complete";
  operatorId?: string;
  returnOperatorId?: string;
}): Promise<BookingTimeseriesResponse> {
  const url = new URL(
    `/api/backend/api/v1/analytics/bookings/timeseries`,
    window.location.origin,
  );
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
  return apiFetch(url.pathname + "?" + url.searchParams.toString());
}

export function syncTimeseries(params: {
  from: string;
  to: string;
  bucket?: "hour" | "day";
  timezone?: string;
  operatorId?: string;
  deviceId?: string;
}): Promise<SyncTimeseriesResponse> {
  const url = new URL(
    `/api/backend/api/v1/analytics/sync/timeseries`,
    window.location.origin,
  );
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
  return apiFetch(url.pathname + "?" + url.searchParams.toString());
}

export function syncLatest(params: {
  limit?: number;
  operatorId?: string;
  activeOnly?: boolean;
}): Promise<SyncLatestResponse> {
  const url = new URL(`/api/backend/api/v1/analytics/sync/latest`, window.location.origin);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
  return apiFetch(url.pathname + "?" + url.searchParams.toString());
}

export function syncEvents(params: {
  from: string;
  to: string;
  operatorId?: string;
  deviceId?: string;
  limit?: number;
  cursor?: string;
}): Promise<SyncEventsResponse> {
  const url = new URL(`/api/backend/api/v1/analytics/sync/events`, window.location.origin);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
  return apiFetch(url.pathname + "?" + url.searchParams.toString());
}

export function scanEvents(params: {
  from: string;
  to: string;
  operatorId?: string;
  deviceId?: string;
  operation?: "deposit" | "retrieve";
  eventType?: ScanEventRow["eventType"];
  limit?: number;
  cursor?: string;
}): Promise<ScanEventsResponse> {
  const url = new URL(`/api/backend/api/v1/analytics/scan-events`, window.location.origin);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
  return apiFetch(url.pathname + "?" + url.searchParams.toString());
}

export function activitiesSummary(params: {
  from: string;
  to: string;
  operatorId?: string;
  deviceId?: string;
}): Promise<ActivitiesSummaryResponse> {
  const url = new URL(
    `/api/backend/api/v1/analytics/activities/summary`,
    window.location.origin,
  );
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
  return apiFetch(url.pathname + "?" + url.searchParams.toString());
}

