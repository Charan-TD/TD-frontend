import { baseApi } from "../../admin/api/baseApi";

export type Order = {
  id: string;
  customer_user_id: string | null;
  restaurant_station_service_id: string | null;
  status: string | null;
  /** Station the customer boards at. */
  boarding_station_id?: string | null;
  /** Present on some server versions: the station the food is delivered at. */
  delivery_station_id?: string | null;
  order_number?: string | null;
  /** The restaurant's readable ID (not its UUID). */
  restaurant_id?: string | null;
  restaurant_name?: string | null;
  journey_date?: string | null;
  /** Order total in rupees. */
  total?: number | string | null;
  created_at?: string | null;
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

    /** Every order, fetched page by page (100 at a time, up to 2,000), for per-station figures. */
    getAllOrders: builder.query<Order[], void>({
      async queryFn(_arg, _api, _extra, baseQuery) {
        const all: Order[] = [];
        for (let page = 1; page <= 20; page += 1) {
          const result = await baseQuery({ url: "/orders", method: "GET", params: { page, limit: 100 } });
          if (result.error) return { error: result.error };
          const data = (result.data as { data?: OrderList }).data;
          all.push(...(data?.orders ?? []));
          if (page >= (data?.pagination?.totalPages ?? 1)) break;
        }
        return { data: all };
      },
      providesTags: [{ type: "Order" as const, id: "LIST" }],
    }),
  }),
});

export const { useGetOrdersQuery, useGetAllOrdersQuery } = ordersApi;
