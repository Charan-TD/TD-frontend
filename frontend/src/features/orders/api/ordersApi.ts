import { baseApi } from "../../admin/api/baseApi";

export type Order = {
  id: string;
  customer_user_id: string | null;
  restaurant_station_service_id: string | null;
  status: string | null;
};

type OrderList = {
  orders: Order[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export const ordersApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getOrders: builder.query<Order[], { page?: number; limit?: number; status?: string } | void>({
      query: (arg) => ({
        url: "/orders",
        method: "GET",
        params: {
          page: arg?.page ?? 1,
          limit: arg?.limit ?? 100,
          ...(arg?.status ? { status: arg.status } : {}),
        },
      }),
      transformResponse: (response: { success: boolean; data: OrderList }) => response.data?.orders ?? [],
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
