import { baseApi } from "../../admin/api/baseApi";
import { restaurantIdFromRequest } from "./restaurantId";

export type ProfileEditStatus = "pending" | "approved" | "rejected";

/** A restaurant's request to change its profile after registration. */
export type ProfileEditRequest = {
  id: string;
  restaurantId: string;
  status: ProfileEditStatus;
  /** New values the restaurant asked for, keyed by field name. */
  requestedChanges: Record<string, unknown>;
  /** The values at the time of the request, for comparison. */
  previousValues: Record<string, unknown>;
  rejectionReason: string | null;
  createdAt: string | null;
};

type Raw = Record<string, unknown>;

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

function normalize(raw: Raw): ProfileEditRequest {
  const status = String(raw.status ?? "pending").toLowerCase();
  return {
    id: String(raw.id ?? raw.request_id ?? ""),
    restaurantId: restaurantIdFromRequest(raw),
    status: status === "approved" || status === "rejected" ? status : "pending",
    requestedChanges: asObject(raw.requested_changes),
    previousValues: asObject(raw.previous_values),
    rejectionReason: text(raw.rejection_reason),
    createdAt: text(raw.created_at),
  };
}

export const profileEditRequestsApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getProfileEditRequests: builder.query<ProfileEditRequest[], ProfileEditStatus>({
      query: (status) => ({
        url: "/admin/restaurant-profile-requests",
        method: "GET",
        params: { status },
      }),
      transformResponse: (response: { data?: unknown }) => {
        const data = response.data as Raw[] | { requests?: Raw[] } | undefined;
        const rows = Array.isArray(data) ? data : (data?.requests ?? []);
        return rows.map(normalize);
      },
      providesTags: (result) => [
        ...(result ?? []).map((request) => ({ type: "ProfileEditRequest" as const, id: request.id })),
        { type: "ProfileEditRequest" as const, id: "LIST" },
      ],
    }),

    approveProfileEdit: builder.mutation<void, string>({
      query: (id) => ({ url: `/admin/restaurant-profile-requests/${id}/approve`, method: "PATCH" }),
      invalidatesTags: [
        { type: "ProfileEditRequest", id: "LIST" },
        { type: "Restaurant", id: "LIST" },
      ],
    }),

    rejectProfileEdit: builder.mutation<void, { id: string; rejection_reason: string }>({
      query: ({ id, rejection_reason }) => ({
        url: `/admin/restaurant-profile-requests/${id}/reject`,
        method: "PATCH",
        body: { rejection_reason },
      }),
      invalidatesTags: [{ type: "ProfileEditRequest", id: "LIST" }],
    }),
  }),
});

export const {
  useGetProfileEditRequestsQuery,
  useApproveProfileEditMutation,
  useRejectProfileEditMutation,
} = profileEditRequestsApi;
