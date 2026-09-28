import { baseApi } from "../../admin/api/baseApi";

export type Station = {
  id: string;
  name: string;
  code: string | null;
  city: string | null;
};

export const stationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getStations: builder.query<Station[], void>({
      query: () => ({
        url: "/stations",
        method: "GET",
        params: {
          select: "id,name,code,city",
          order: "name.asc",
        },
      }),
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
