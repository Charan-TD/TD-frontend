import { baseApi } from "../../admin/api/baseApi";

export type Rider = {
  id: string;
  full_name: string | null;
  status: string | null;
  phone?: string | null;
  email?: string | null;
  license_number?: string | null;
  vehicle_type?: string | null;
  vehicle_number?: string | null;
  profile_image_url?: string | null;
};

export type CreateRiderInput = {
  license_number: string;
  full_name?: string;
  phone?: string;
  vehicle_type?: string;
  vehicle_number?: string;
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
    createRider: builder.mutation<Rider, CreateRiderInput>({
      query: (body) => ({ url: "/delivery-partner-users", method: "POST", body }),
      transformResponse: (response: { success: boolean; data: Rider }) => response.data,
      invalidatesTags: [{ type: "Rider", id: "LIST" }],
    }),
    getAllRiders: builder.query<Rider[], void>({
      async queryFn(_arg, _api, _extraOptions, baseQuery) {
        const all: Rider[] = [];
        const limit = 100;
        let page = 1;
        let totalPages: number | undefined;

        while (totalPages == null || page <= totalPages) {
          const response = await baseQuery({ url: "/delivery-partner-users", method: "GET", params: { page, limit } });
          if (response.error) return { error: response.error };
          const data = (response.data as { data?: RiderList } | undefined)?.data;
          const batch = data?.deliveryPartners ?? [];
          all.push(...batch);
          totalPages = data?.pagination?.totalPages ?? (batch.length < limit ? page : undefined);
          if (!batch.length) break;
          page += 1;
        }

        return { data: all };
      },
      providesTags: (result) => result
        ? [...result.map((rider) => ({ type: "Rider" as const, id: rider.id })), { type: "Rider" as const, id: "LIST" }]
        : [{ type: "Rider" as const, id: "LIST" }],
    }),
  }),
});

export const { useGetRidersQuery, useGetAllRidersQuery, useCreateRiderMutation } = ridersApi;
