import { baseApi } from "../../admin/api/baseApi";

export type Restaurant = {
  id: string;
  name: string;
  status: string | null;
};

export const restaurantsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getRestaurants: builder.query<Restaurant[], void>({
      query: () => ({
        url: "/restaurants",
        method: "GET",
        params: {
          select: "id,name,status",
          order: "name.asc",
        },
      }),
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
