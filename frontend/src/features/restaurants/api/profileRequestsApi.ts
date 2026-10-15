import { baseApi } from "../../admin/api/baseApi";

export type ProfileRequestStatus = "pending" | "approved" | "rejected";

export type ProfileRequest = {
  id: string;
  restaurantId: string | null;
  restaurantName: string;
  status: ProfileRequestStatus;
  /** Fields the restaurant asked to change, including document URLs. */
  requestedChanges: Record<string, unknown>;
  rejectionReason: string | null;
  createdAt: string | null;
};

type RawRequest = Record<string, unknown>;

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;

/**
 * The backend docs don't describe the list/detail payloads yet, so accept the
 * usual envelope shapes and field spellings instead of assuming one.
 */
function normalizeRequest(raw: RawRequest): ProfileRequest {
  const restaurant = (raw.restaurant ?? {}) as RawRequest;
  const status = String(raw.status ?? "pending").toLowerCase();

  return {
    id: String(raw.id ?? raw.request_id ?? ""),
    restaurantId: text(raw.restaurant_id) ?? text(restaurant.id),
    restaurantName:
      text(raw.rest_name) ??
      text(raw.restaurant_name) ??
      text(restaurant.rest_name) ??
      text(restaurant.name) ??
      "Unnamed restaurant",
    status: status === "approved" || status === "rejected" ? status : "pending",
    requestedChanges: (raw.requested_changes ?? raw.requestedChanges ?? {}) as Record<string, unknown>,
    rejectionReason: text(raw.rejection_reason),
    createdAt: text(raw.created_at) ?? text(raw.createdAt),
  };
}

function extractList(response: unknown): RawRequest[] {
  const data = (response as { data?: unknown })?.data;
  if (Array.isArray(data)) return data as RawRequest[];
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    for (const key of ["requests", "items", "profile_requests", "data"]) {
      if (Array.isArray(record[key])) return record[key] as RawRequest[];
    }
  }
  return [];
}

export const profileRequestsApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getProfileRequests: builder.query<ProfileRequest[], { status?: ProfileRequestStatus } | void>({
      query: (arg) => ({
        url: "/admin/restaurant-profile-requests",
        method: "GET",
        params: { page: 1, limit: 100, ...(arg?.status ? { status: arg.status } : {}) },
      }),
      transformResponse: (response: unknown) => extractList(response).map(normalizeRequest),
      providesTags: (result) => [
        ...(result ?? []).map((request) => ({ type: "ProfileRequest" as const, id: request.id })),
        { type: "ProfileRequest" as const, id: "LIST" },
      ],
    }),

    getProfileRequest: builder.query<ProfileRequest, string>({
      query: (id) => `/admin/restaurant-profile-requests/${id}`,
      transformResponse: (response: { data?: RawRequest }) => normalizeRequest(response.data ?? {}),
      providesTags: (_result, _error, id) => [{ type: "ProfileRequest", id }],
    }),

    approveProfileRequest: builder.mutation<void, string>({
      query: (id) => ({ url: `/admin/restaurant-profile-requests/${id}/approve`, method: "PATCH" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "ProfileRequest", id },
        { type: "ProfileRequest", id: "LIST" },
        { type: "Restaurant", id: "LIST" },
      ],
    }),

    rejectProfileRequest: builder.mutation<void, { id: string; rejection_reason: string }>({
      query: ({ id, rejection_reason }) => ({
        url: `/admin/restaurant-profile-requests/${id}/reject`,
        method: "PATCH",
        body: { rejection_reason },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "ProfileRequest", id },
        { type: "ProfileRequest", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetProfileRequestsQuery,
  useGetProfileRequestQuery,
  useApproveProfileRequestMutation,
  useRejectProfileRequestMutation,
} = profileRequestsApi;
