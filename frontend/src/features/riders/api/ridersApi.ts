import { baseApi } from "../../admin/api/baseApi";

export type Rider = {
  id: string;
  full_name: string | null;
  status: string | null;
};

type RiderList = {
  deliveryPartners: Rider[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export const ridersApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getRiders: builder.query<Rider[], { page?: number; limit?: number; status?: string } | void>({
      query: (arg) => ({
        url: "/delivery-partner-users",
        method: "GET",
        params: {
          page: arg?.page ?? 1,
          limit: arg?.limit ?? 100,
          ...(arg?.status ? { status: arg.status } : {}),
        },
      }),
      transformResponse: (response: { success: boolean; data: RiderList }) => response.data?.deliveryPartners ?? [],
      providesTags: (result) =>
        result
          ? [
              ...result.map((rider) => ({ type: "Rider" as const, id: rider.id })),
              { type: "Rider" as const, id: "LIST" },
            ]
          : [{ type: "Rider" as const, id: "LIST" }],
    }),
  }),
});

export const { useGetRidersQuery } = ridersApi;
