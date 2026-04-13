export type Operator = { phone: string; name: string };

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
  status: "active" | "complete";
  createdAt: string;
  completedAt: string | null;
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

