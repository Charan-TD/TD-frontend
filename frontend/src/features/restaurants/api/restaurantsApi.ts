import { baseApi } from "../../admin/api/baseApi";
import type { Pagination } from "../../admin/api/apiTypes";

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
};

export type RestaurantList = {
  restaurants: Restaurant[];
  pagination: Pagination;
};

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
          id: String(row.id ?? row.restaurant_id ?? ""),
          name: String(row.name ?? row.rest_name ?? row.restaurant_name ?? "Unnamed restaurant"),
          status: row.status == null ? null : String(row.status),
          onlineStatus: row.online_status == null ? null : String(row.online_status),
          rating: typeof row.rating === "number" ? row.rating : null,
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
  }),
});

export const { useGetRestaurantsQuery } = restaurantsApi;
