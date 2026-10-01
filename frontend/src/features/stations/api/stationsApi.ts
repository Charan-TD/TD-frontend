import { baseApi } from "../../admin/api/baseApi";

export type Station = {
  id: string;
  name: string;
  code: string | null;
  city: string | null;
};

type StationList = {
  stations: Station[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export const stationsApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getStations: builder.query<Station[], { page?: number; limit?: number } | void>({
      query: (arg) => ({
        url: "/stations",
        method: "GET",
        params: { page: arg?.page ?? 1, limit: arg?.limit ?? 100 },
      }),
      transformResponse: (response: { success: boolean; data: StationList }) => response.data?.stations ?? [],
      providesTags: (result) =>
        result
          ? [
              ...result.map((station) => ({ type: "Station" as const, id: station.id })),
              { type: "Station" as const, id: "LIST" },
            ]
          : [{ type: "Station" as const, id: "LIST" }],
    }),
  }),
});

export const { useGetStationsQuery } = stationsApi;
