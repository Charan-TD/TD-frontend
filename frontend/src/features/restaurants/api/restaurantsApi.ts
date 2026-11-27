import { baseApi } from "../../admin/api/baseApi";
import type { Pagination } from "../../admin/api/apiTypes";
import { listTotal } from "../../admin/api/listTotal";

export type Restaurant = {
  id: string;
  name: string;
  status: string | null;
  /** OPEN or CLOSED right now, from the restaurant's operating hours. */
  onlineStatus: string | null;
  rating: number | null;
  type: string | null;
  ownerName: string | null;
  /** Owner's mobile, falling back to the restaurant's contact number. */
  phone: string | null;
  email: string | null;
  /** The restaurant's logo, when it has uploaded one. */
  logoUrl: string | null;
  /** The raw list row, used to show details when the restaurant has no public ID to look up. */
  record: Record<string, unknown>;
};

export type RestaurantList = {
  restaurants: Restaurant[];
  pagination: Pagination;
};

/** Average rating from the API. Postgres averages arrive as strings ("4.50"), so accept both; 0 or missing means no ratings yet. */
export function ratingOf(value: unknown): number | null {
  const parsed = typeof value === "string" && value.trim() ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 10) / 10 : null;
}

function normalizeRestaurantPage(data: unknown): Restaurant[] {
  const payload = data as Record<string, unknown> | unknown[] | undefined;
  const rows = (Array.isArray(payload)
    ? payload
    : (payload?.restaurants ?? payload?.rows ?? payload?.items ?? [])) as Record<string, unknown>[];
  const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);
  return rows.map((row) => ({
    type: text(row.restaurant_type),
    ownerName: text(row.owner_name),
    phone: text(row.owner_mobile) ?? text(row.restaurant_contact),
    email: text(row.restaurant_email),
    logoUrl: text(row.logo_url) ?? text(row.logo),
    id: String(row.restaurant_id ?? row.public_restaurant_id ?? row.id ?? ""),
    name: String(row.name ?? row.rest_name ?? row.restaurant_name ?? "Unnamed restaurant"),
    status: row.status == null ? null : String(row.status),
    onlineStatus: row.online_status == null ? null : String(row.online_status),
    rating: ratingOf(row.rating),
    record: row,
  }));
}

export const restaurantsApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getRestaurants: builder.query<Restaurant[], { page?: number; limit?: number; status?: string } | void>({
      query: (arg) => ({
        url: "/restaurants",
        method: "GET",
        params: {
          page: arg?.page ?? 1,
          limit: arg?.limit ?? 100,
          ...(arg?.status ? { status: arg.status } : {}),
        },
      }),
      transformResponse: (response: { success: boolean; data: unknown }) => {
        // The deployed backend has changed shape before (name -> rest_name), so
        // accept the known envelope and field spellings.
        const data = response.data as Record<string, unknown> | unknown[] | undefined;
        const rows = (Array.isArray(data)
          ? data
          : (data?.restaurants ?? data?.rows ?? data?.items ?? [])) as Record<string, unknown>[];

        if (rows.length === 0) {
          console.warn("GET /restaurants returned no restaurants. Raw response:", response);
        }

        const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);

        return rows.map((row) => ({
          type: text(row.restaurant_type),
          ownerName: text(row.owner_name),
          phone: text(row.owner_mobile) ?? text(row.restaurant_contact),
          email: text(row.restaurant_email),
          logoUrl: text(row.logo_url) ?? text(row.logo),
          // The deployed admin API validates restaurant_id as the public
          // restaurant identifier. Prefer it when the response includes both
          // it and the internal row UUID; local API versions may only return id.
          id: String(row.restaurant_id ?? row.public_restaurant_id ?? row.id ?? ""),
          name: String(row.name ?? row.rest_name ?? row.restaurant_name ?? "Unnamed restaurant"),
          status: row.status == null ? null : String(row.status),
          onlineStatus: row.online_status == null ? null : String(row.online_status),
          rating: ratingOf(row.rating),
          record: row,
        }));
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map((restaurant) => ({ type: "Restaurant" as const, id: restaurant.id })),
              { type: "Restaurant" as const, id: "LIST" },
            ]
          : [{ type: "Restaurant" as const, id: "LIST" }],
    }),
    getAllRestaurants: builder.query<Restaurant[], void>({
      async queryFn(_arg, _api, _extraOptions, baseQuery) {
        const all: Restaurant[] = [];
        const limit = 100;
        let page = 1;
        let totalPages: number | undefined;

        while (totalPages == null || page <= totalPages) {
          const response = await baseQuery({ url: "/restaurants", method: "GET", params: { page, limit } });
          if (response.error) return { error: response.error };
          const data = (response.data as { data?: unknown } | undefined)?.data;
          const batch = normalizeRestaurantPage(data);
          all.push(...batch);
          const pagination = (data as { pagination?: { totalPages?: number } } | undefined)?.pagination;
          totalPages = pagination?.totalPages ?? (batch.length < limit ? page : undefined);
          if (!batch.length) break;
          page += 1;
        }

        return { data: all };
      },
      providesTags: (result) => result
        ? [...result.map((restaurant) => ({ type: "Restaurant" as const, id: restaurant.id })), { type: "Restaurant" as const, id: "LIST" }]
        : [{ type: "Restaurant" as const, id: "LIST" }],
    }),
    /** One server page (GET /restaurants?page&limit&status) with the server's own totals. */
    getRestaurantsPage: builder.query<{ rows: Restaurant[]; total: number; totalPages: number }, { page: number; limit: number; status?: string }>({
      async queryFn({ page, limit, status }, _api, _extraOptions, baseQuery) {
        const response = await baseQuery({ url: "/restaurants", method: "GET", params: { page, limit, ...(status ? { status } : {}) } });
        if (response.error) return { error: response.error };
        const data = (response.data as { data?: unknown } | undefined)?.data;
        const rows = normalizeRestaurantPage(data);
        const pagination = (data as { pagination?: { total?: number | string; totalPages?: number } } | undefined)?.pagination;
        const total = Number(pagination?.total ?? rows.length);
        return { data: { rows, total, totalPages: pagination?.totalPages ?? Math.max(1, Math.ceil(total / limit)) } };
      },
      providesTags: (result) => result
        ? [...result.rows.map((restaurant) => ({ type: "Restaurant" as const, id: restaurant.id })), { type: "Restaurant" as const, id: "LIST" }]
        : [{ type: "Restaurant" as const, id: "LIST" }],
    }),
    /** Total restaurants (optionally of one status), read from the server's pagination (one row is fetched). */
    getRestaurantsTotal: builder.query<number, { status?: string } | void>({
      query: (arg) => ({ url: "/restaurants", method: "GET", params: { page: 1, limit: 1, ...(arg?.status ? { status: arg.status } : {}) } }),
      transformResponse: (response: unknown) => listTotal(response),
      providesTags: [{ type: "Restaurant" as const, id: "LIST" }],
    }),
    setRestaurantBlocked: builder.mutation<unknown, { id: string; blocked: boolean }>({
      // PATCH /admin/restaurants/{restaurant_id}/status sets the admin-side ACTIVE / INACTIVE switch and
      // notifies the restaurant's app. It only works on approved restaurants (409 otherwise).
      query: ({ id, blocked }) => ({
        url: `/admin/restaurants/${encodeURIComponent(id)}/status`,
        method: "PATCH",
        body: { admin_restaurant_status: blocked ? "INACTIVE" : "ACTIVE" },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Restaurant", id },
        { type: "Restaurant", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetRestaurantsQuery,
  useGetAllRestaurantsQuery,
  useGetRestaurantsPageQuery,
  useGetRestaurantsTotalQuery,
  useSetRestaurantBlockedMutation,
} = restaurantsApi;
