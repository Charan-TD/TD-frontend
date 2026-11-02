import { baseApi } from "../../admin/api/baseApi";

export type Order = {
  id: string;
  customer_user_id?: string | null;
  train_id?: string | null;
  coach?: string | null;
  seat?: string | null;
  pnr?: string | null;
  queue_time_minutes?: number | null;
  delivery_deadline?: string | null;
  is_deliverable?: boolean | null;
  journey_date?: string | null;
  subtotal?: number | string | null;
  tax?: number | string | null;
  packaging_fee?: number | string | null;
  delivery_fee?: number | string | null;
  customer_note?: string | null;
  discount?: number | string | null;
  delivery_train_stop_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  restaurant_station_service_id?: string | null;
  status: string | null;
  /** Readable status, e.g. "Delivered". */
  status_label?: string | null;
  /** Station the customer boards at. */
  boarding_station_id?: string | null;
  /** Station names may be returned by deployments that join the station record. */
  station_name?: string | null;
  boarding_station_name?: string | null;
  /** Present on some server versions: the station the food is delivered at. */
  delivery_station_id?: string | null;
  order_number?: string | null;
  /** The restaurant's readable ID (not its UUID). */
  restaurant_id?: string | null;
  restaurant_name?: string | null;
  /** The station the food is delivered at. */
  delivery_station_name?: string | null;
  delivery_station_code?: string | null;
  items_summary?: string | null;
  /** Ordered items, when the server sends them as a list. */
  items?: { name?: string | null; item_name?: string | null; quantity?: number | null; qty?: number | null }[] | null;
  /** Customer details, when the server joins the customer record. */
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_mobile?: string | null;
  train_number?: string | null;
  train_name?: string | null;
  /** Order total in rupees. */
  total?: number | string | null;
};

/** Newer servers may omit `id`; fall back to the order number (or position) so every order has a unique key. */
const withId = (order: Order, index: number): Order => (order.id ? order : { ...order, id: order.order_number ?? `order-${index}` });

type OrderList = {
  orders: Order[];
  /** Newer servers send a plain total; older ones a pagination object. */
  total?: number;
  pagination?: { page: number; limit: number; total: number; totalPages: number };
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
      transformResponse: (response: { success: boolean; data: OrderList }) => (response.data?.orders ?? []).map(withId),
      providesTags: (result) =>
        result
          ? [
              ...result.map((order) => ({ type: "Order" as const, id: order.id })),
              { type: "Order" as const, id: "LIST" },
            ]
          : [{ type: "Order" as const, id: "LIST" }],
    }),

    /** Fetch all order pages for the admin list and per-station figures. */
    getAllOrders: builder.query<Order[], void>({
      async queryFn(_arg, _api, _extra, baseQuery) {
        const all: Order[] = [];
        for (let page = 1; ; page += 1) {
          const result = await baseQuery({ url: "/orders", method: "GET", params: { page, limit: 100 } });
          if (result.error) return { error: result.error };
          const data = (result.data as { data?: OrderList }).data;
          const batch = (data?.orders ?? []).map((order, index) => withId(order, all.length + index));
          all.push(...batch);
          const total = data?.total ?? data?.pagination?.total ?? 0;
          const totalPages = data?.pagination?.totalPages;
          if (typeof totalPages === "number" ? page >= totalPages : batch.length < 100 || all.length >= total) break;
        }
        return { data: all };
      },
      providesTags: [{ type: "Order" as const, id: "LIST" }],
    }),
  }),
});

export const { useGetOrdersQuery, useGetAllOrdersQuery } = ordersApi;
