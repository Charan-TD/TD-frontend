import { baseApi } from "../../admin/api/baseApi";

export type Station = {
  id: string;
  name: string;
  code: string | null;
  city: string | null;
  state?: string | null;
  // Postgres can return decimals as strings, so both are accepted.
  latitude?: number | string | null;
  longitude?: number | string | null;
  /** Missing on older servers; a station is treated as active unless this is false. */
  status?: boolean | null;
  created_at?: string | null;
};

/** Fields accepted by POST /stations (and, all optional, by PUT /stations/:id). */
export type StationInput = {
  name: string;
  code: string;
  city: string;
  state: string;
  latitude?: number;
  longitude?: number;
  status?: boolean;
};

type StationList = {
  stations: Station[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

type StationResponse = { success: boolean; data: Station };

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

    createStation: builder.mutation<Station, StationInput>({
      query: (body) => ({ url: "/stations", method: "POST", body }),
      transformResponse: (response: StationResponse) => response.data,
      invalidatesTags: [{ type: "Station", id: "LIST" }],
    }),

    updateStation: builder.mutation<Station, { id: string; changes: Partial<StationInput> }>({
      query: ({ id, changes }) => ({ url: `/stations/${id}`, method: "PATCH", body: changes }),
      transformResponse: (response: StationResponse) => response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Station", id },
        { type: "Station", id: "LIST" },
      ],
    }),

  }),
});

export const {
  useGetStationsQuery,
  useCreateStationMutation,
  useUpdateStationMutation,
} = stationsApi;
