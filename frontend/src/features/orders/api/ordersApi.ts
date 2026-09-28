import { baseApi } from "../../admin/api/baseApi";

export type Order = {
  id: string;
  customer_user_id: string | null;
  restaurant_station_service_id: string | null;
  status: string | null;
};

export const ordersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOrders: builder.query<Order[], void>({
      query: () => ({
        url: "/orders",
        method: "GET",
        params: {
          select: "id,customer_user_id,restaurant_station_service_id,status",
          order: "created_at.desc",
        },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map((order) => ({ type: "Order" as const, id: order.id })),
              { type: "Order" as const, id: "LIST" },
            ]
          : [{ type: "Order" as const, id: "LIST" }],
    }),
  }),
});

export const { useGetOrdersQuery } = ordersApi;
