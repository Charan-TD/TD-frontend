import { baseApi } from "../../admin/api/baseApi";

export type Cuisine = {
  cuisine_id: string;
  name: string;
};

export const cuisinesApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getCuisines: builder.query<Cuisine[], void>({
      query: () => "/cuisines",
      transformResponse: (response: { data?: Cuisine[] }) => (Array.isArray(response.data) ? response.data : []),
    }),
  }),
});

export const { useGetCuisinesQuery } = cuisinesApi;

/**
 * Restaurants store cuisine IDs (e.g. "C2803947234"). Turn them into names,
 * leaving any value that is not a known ID (such as a name) untouched.
 */
export function cuisineNames(value: unknown, cuisines: Cuisine[]): string[] {
  const byId = new Map(cuisines.map((cuisine) => [cuisine.cuisine_id, cuisine.name]));
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return list.map((item) => byId.get(String(item)) ?? String(item));
}
