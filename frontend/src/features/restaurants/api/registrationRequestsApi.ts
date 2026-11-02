import { baseApi } from "../../admin/api/baseApi";
import { publicRestaurantId, restaurantIdFromRequest } from "./restaurantId";

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
  logoUrl: string | null;
  /** "Traindhaba" or "restaurant": who supplies the delivery riders. */
  ridersOwner: string | null;
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
    restaurantId: restaurantIdFromRequest(raw),
    status: status === "approved" || status === "rejected" ? status : "pending",
    rejectionReason: text(raw.rejection_reason),
    createdAt: text(raw.submitted_time) ?? text(raw.created_at),
    restaurantName: text(restaurant.name) ?? "Unnamed restaurant",
    ownerName: text(restaurant.owner_name),
    restaurantType: text(restaurant.restaurant_type),
    logoUrl: text(restaurant.logo_url) ?? text(restaurant.logo),
    ridersOwner: text(restaurant.riders_owner) ?? text(raw.riders_owner),
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
      async queryFn(id, _api, _extraOptions, baseQuery) {
        const publicId = publicRestaurantId(id);
        if (!publicId) return { error: { status: "CUSTOM_ERROR", error: "This request does not include a valid public restaurant ID. Refresh approvals; if the issue continues, the API must include restaurant.restaurant_id." } };
        const result = await baseQuery(`/restaurants/${encodeURIComponent(publicId)}`);
        if (result.error) return { error: result.error };
        return { data: (result.data as { data: RestaurantReview }).data };
      },
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
