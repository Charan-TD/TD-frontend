import { baseApi } from "../../admin/api/baseApi";
import { publicRestaurantId } from "../../restaurants/api/restaurantId";

export const groupOrderUuid = (value: unknown): string | null => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim()) ? value.trim() : null;

export type GroupOrder = {
  key: string;
  uuid: string | null;
  requestNumber: string | null;
  contactName: string;
  mobile: string;
  email: string | null;
  groupSize: number | null;
  details: string;
  status: string;
  restaurantId: string | null;
  restaurantName: string | null;
  createdAt: string | null;
};
export type GroupOrderRestaurant = { id: string; name: string };
export type GroupOrderItemSelection = { menuItemId: string; quantity: number };
const text = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;

function responseRows(response: unknown, field: string): Record<string, unknown>[] {
  const envelope = response as { data?: unknown; success?: boolean } | null;
  if (envelope?.success === false) throw new Error("The API could not retrieve these records.");
  const data = envelope?.data;
  const rows = Array.isArray(data) ? data : (data as Record<string, unknown> | null)?.[field];
  if (!Array.isArray(rows) || rows.some((r) => !r || typeof r !== "object")) {
    throw new Error(`Unexpected ${field} response. Please check the API response format.`);
  }
  return rows;
}

export function normalizeGroupOrders(response: unknown): GroupOrder[] {
  return responseRows(response, "group_orders").map((row, index) => ({
    uuid: groupOrderUuid(row.uuid) ?? groupOrderUuid(row.id) ?? groupOrderUuid(row.group_order_id),
    // Prefer server identity. The fallback display key is never an assignment ID.
    key: groupOrderUuid(row.uuid) ?? groupOrderUuid(row.id) ?? groupOrderUuid(row.group_order_id) ?? `${JSON.stringify([row.group_order_id, row.contact_name, row.mobile_number, row.created_at, row.order_details])}:${index}`,
    requestNumber: text(row.grp_ord_id) ?? text(row.group_order_number) ?? (groupOrderUuid(row.group_order_id) ? null : text(row.group_order_id)),
    contactName: text(row.contact_name) ?? "Not provided",
    mobile: text(row.mobile_number) ?? "Not provided",
    email: text(row.email),
    groupSize: Number.isInteger(row.group_size) ? Number(row.group_size) : null,
    details: text(row.order_details) ?? "No order details provided.",
    status: text(row.status) ?? "PENDING",
    restaurantId: text(row.restaurant_id),
    restaurantName: text(row.restaurant_name),
    createdAt: text(row.created_at),
  }));
}

export function normalizeGroupOrderRestaurants(response: unknown): GroupOrderRestaurant[] {
  return responseRows(response, "restaurants").map((row) => {
    const id = text(row.restaurant_id);
    const name = text(row.name);
    if (!id || !name) throw new Error("The restaurant list is missing a public ID or name.");
    return { id, name };
  });
}

export const groupOrdersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminGroupOrders: builder.query<GroupOrder[], void>({
      query: () => "/orders/group-orders",
      transformResponse: normalizeGroupOrders,
      providesTags: [{ type: "Order", id: "GROUP_LIST" }],
    }),
    getGroupOrderRestaurants: builder.query<GroupOrderRestaurant[], void>({
      query: () => "/orders/group-orders/restaurants",
      transformResponse: normalizeGroupOrderRestaurants,
      providesTags: [{ type: "Restaurant", id: "GROUP_ELIGIBLE" }],
    }),
    assignGroupOrderRestaurant: builder.mutation<null, { grpOrdId: string; restaurantId: string; items?: GroupOrderItemSelection[] }>({
      async queryFn({ grpOrdId, restaurantId, items }, _api, _extra, baseQuery) {
        // The API addresses an order by its public grp_ord_id (e.g. GRP-D299KB), not the row UUID.
        const orderId = text(grpOrdId);
        const restaurant = publicRestaurantId(restaurantId);
        // The API takes menu item UUIDs and whole-number quantities of at least 1.
        if (items?.some((item) => !groupOrderUuid(item.menuItemId) || !Number.isInteger(item.quantity) || item.quantity < 1)) return { error: { status: "CUSTOM_ERROR", error: "Each selected menu item needs a valid ID and a quantity of at least 1." } };
        if (!orderId || groupOrderUuid(orderId) || !restaurant) return { error: { status: "CUSTOM_ERROR", error: "A public group order ID and public restaurant ID are required." } };
        const result = await baseQuery({ url: `/orders/group-orders/${encodeURIComponent(orderId)}/restaurant`, method: "POST", body: { restaurant_id: restaurant, ...(items?.length ? { restaurant_menu_items_id: items.map((item) => ({ restaurant_menu_item_id: item.menuItemId, quantity: item.quantity })) } : {}) } });
        if (result.error) return { error: result.error };
        const response = result.data as { success?: boolean; message?: string } | undefined;
        if (response?.success === false) return { error: { status: "CUSTOM_ERROR", error: response.message ?? "Restaurant assignment failed." } };
        // RTK Query rejects `{ data: undefined }` as an empty result, so success is `null`.
        return { data: null };
      },
      invalidatesTags: (_result, error) => error ? [] : [{ type: "Order", id: "GROUP_LIST" }],
    }),
  }),
  overrideExisting: true,
});

export const { useGetAdminGroupOrdersQuery, useGetGroupOrderRestaurantsQuery, useAssignGroupOrderRestaurantMutation } = groupOrdersApi;
