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
  /** Restaurant record embedded in the list response; used when no public ID exists. */
  restaurantRecord: RestaurantReview | null;
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
    // Pending registrations may lack restaurant.restaurant_id; fall back to restaurant.id.
    restaurantId: restaurantIdFromRequest(raw) || text(restaurant.id) || "",
    status: status === "approved" || status === "rejected" ? status : "pending",
    rejectionReason: text(raw.rejection_reason),
    createdAt: text(raw.submitted_time) ?? text(raw.created_at),
    restaurantName: text(restaurant.name) ?? "Unnamed restaurant",
    ownerName: text(restaurant.owner_name),
    restaurantType: text(restaurant.restaurant_type),
    logoUrl: text(restaurant.logo_url) ?? text(restaurant.logo),
    ridersOwner: text(restaurant.riders_owner) ?? text(raw.riders_owner),
    restaurantRecord: Object.keys(restaurant).length
      ? ({ ...restaurant, id: String(restaurant.id ?? ""), name: text(restaurant.name) ?? "Unnamed restaurant" } as RestaurantReview)
      : null,
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
        if (!publicId) return { error: { status: "CUSTOM_ERROR", error: "This request does not include a valid public restaurant ID." } };
        const result = await baseQuery(`/restaurants/${encodeURIComponent(publicId)}`);
        if (result.error) return { error: result.error };
        return { data: (result.data as { data: RestaurantReview }).data };
      },
      providesTags: (_result, _error, id) => [{ type: "Restaurant", id }],
    }),

    /**
     * Accept and reject are separate calls: PATCH .../by-phone/{phone}/accept (no body) and
     * PATCH .../by-phone/{phone}/reject (body { rejection_reason }). The API takes no request ID:
     * it resolves the latest pending registration for the owner's 10-digit mobile number.
     * `requestId` is only used here to refresh the cache.
     */
    decideRegistration: builder.mutation<
      null,
      { requestId: string; phone: string | null; decision: "ACCEPTED" | "REJECTED"; rejection_reason?: string }
    >({
      async queryFn({ phone, decision, rejection_reason }, _api, _extraOptions, baseQuery) {
        const digits = (phone ?? "").replace(/[\s+-]/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
        if (!/^[6-9]\d{9}$/.test(digits)) {
          return { error: { status: "CUSTOM_ERROR", error: "This request has no valid 10-digit owner mobile number, which the approval API needs." } };
        }
        const base = `/admin/restaurant-registration-requests/by-phone/${digits}`;
        const result = decision === "REJECTED"
          ? await baseQuery({ url: `${base}/reject`, method: "PATCH", body: { rejection_reason } })
          : await baseQuery({ url: `${base}/accept`, method: "PATCH" });
        return result.error ? { error: result.error } : { data: null };
      },
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
