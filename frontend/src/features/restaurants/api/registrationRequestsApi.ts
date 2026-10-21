import { baseApi } from "../../admin/api/baseApi";

export type RegistrationStatus = "pending" | "approved" | "rejected";

export type RegistrationRequest = {
  requestId: string;
  restaurantId: string;
  status: RegistrationStatus;
  rejectionReason: string | null;
  createdAt: string | null;
  restaurantName: string;
  ownerName: string | null;
  restaurantType: string | null;
};

/** Full review record from GET /restaurants/{id}, including signed document links. */
export type RestaurantReview = Record<string, unknown> & {
  id: string;
  name: string;
};

type Raw = Record<string, unknown>;

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;

function normalizeRequest(raw: Raw): RegistrationRequest {
  const restaurant = (raw.restaurant ?? {}) as Raw;
  const status = String(raw.request_status ?? raw.status ?? "pending").toLowerCase();

  return {
    requestId: String(raw.request_id ?? raw.id ?? ""),
    restaurantId: String(raw.restaurant_id ?? restaurant.id ?? ""),
    status: status === "approved" || status === "rejected" ? status : "pending",
    rejectionReason: text(raw.rejection_reason),
    createdAt: text(raw.submitted_time) ?? text(raw.created_at),
    restaurantName: text(restaurant.name) ?? "Unnamed restaurant",
    ownerName: text(restaurant.owner_name),
    restaurantType: text(restaurant.restaurant_type),
  };
}

export const registrationRequestsApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getRegistrationRequests: builder.query<RegistrationRequest[], RegistrationStatus>({
      query: (status) => ({
        url: "/admin/restaurant-registration-requests",
        method: "GET",
        params: { status },
      }),
      transformResponse: (response: { data?: Raw[] }) =>
        (Array.isArray(response.data) ? response.data : []).map(normalizeRequest),
      providesTags: (result) => [
        ...(result ?? []).map((request) => ({ type: "RegistrationRequest" as const, id: request.requestId })),
        { type: "RegistrationRequest" as const, id: "LIST" },
      ],
    }),

    getRestaurantReview: builder.query<RestaurantReview, string>({
      query: (id) => `/restaurants/${id}`,
      transformResponse: (response: { data: RestaurantReview }) => response.data,
      providesTags: (_result, _error, id) => [{ type: "Restaurant", id }],
    }),

    decideRegistration: builder.mutation<
      void,
      { requestId: string; decision: "ACCEPTED" | "REJECTED"; rejection_reason?: string }
    >({
      query: ({ requestId, decision, rejection_reason }) => ({
        url: `/admin/restaurant-registration-requests/${requestId}`,
        method: "PATCH",
        body: decision === "REJECTED" ? { decision, rejection_reason } : { decision },
      }),
      invalidatesTags: [
        { type: "RegistrationRequest", id: "LIST" },
        { type: "Restaurant", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetRegistrationRequestsQuery,
  useGetRestaurantReviewQuery,
  useDecideRegistrationMutation,
} = registrationRequestsApi;
