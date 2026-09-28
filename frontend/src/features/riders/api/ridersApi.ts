import { baseApi } from "../../admin/api/baseApi";

export type Rider = {
  id: string;
  full_name: string | null;
  status: string | null;
};

export const ridersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getRiders: builder.query<Rider[], void>({
      query: () => ({
        url: "/delivery_partner_users",
        method: "GET",
        params: {
          select: "id,full_name,status",
          order: "created_at.desc",
        },
      }),
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
