import { baseApi } from "../../admin/api/baseApi";
import type { Pagination } from "../../admin/api/apiTypes";

export type Restaurant = {
  id: string;
  name: string;
  status: string | null;
};

export type RestaurantList = {
  restaurants: Restaurant[];
  pagination: Pagination;
};

export const restaurantsApi = baseApi.injectEndpoints({
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
      transformResponse: (response: { success: boolean; data: RestaurantList }) => response.data?.restaurants ?? [],
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
