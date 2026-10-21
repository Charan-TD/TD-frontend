import { baseApi } from "../../admin/api/baseApi";

export type MenuItem = {
  id: string;
  restaurantId: string | null;
  name: string;
  description: string | null;
  /** What the customer pays: the listed price minus any discount. */
  price: number | null;
  /** The listed price before discount; null when there is no discount. */
  originalPrice: number | null;
  prepMinutes: number | null;
  category: string | null;
  subCategory: string | null;
  /** "veg", "non_veg" or "egg". */
  foodServed: string | null;
  imageUrl: string | null;
  /** The restaurant's own on/off switch. */
  ownerAvailable: boolean;
  /** Admin status: true = active, false = inactive, null = pending (not yet reviewed). */
  adminAvailable: boolean | null;
  inactiveReason: string | null;
};

type Raw = Record<string, unknown>;

const PAGE_SIZE = 100;

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;

const num = (value: unknown): number | null => {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null;
};

/** total_price is the listed price; the discount (flat amount or percent) comes off it. */
function pricing(raw: Raw): { price: number | null; originalPrice: number | null } {
  const total = num(raw.total_price) ?? num(raw.price);
  if (total == null) return { price: null, originalPrice: null };

  const percent = num(raw.disc_percent) ?? 0;
  const flat = num(raw.flat_amount) ?? 0;
  const discount =
    raw.discount_type === "percent" ? (total * percent) / 100 : raw.discount_type === "flat" ? flat : 0;
  const final = Math.max(0, Math.round((total - discount) * 100) / 100);

  return final < total ? { price: final, originalPrice: total } : { price: total, originalPrice: null };
}

/** A name given as a plain string or as a nested { category_name | name } object. */
const nameOf = (value: unknown): string | null =>
  text(value) ?? (value && typeof value === "object" ? text((value as Raw).category_name) ?? text((value as Raw).name) : null);

/**
 * The backend has spelled these several ways. When only a parent category is supplied alongside
 * category_name, category_name is the more specific one, so it becomes the subcategory.
 */
function categories(raw: Raw): { category: string | null; subCategory: string | null } {
  const subCategory =
    nameOf(raw.sub_category_name) ?? nameOf(raw.sub_category) ?? nameOf(raw.subcategory_name) ?? nameOf(raw.subcategory);
  const parent = nameOf(raw.parent_category_name) ?? nameOf(raw.parent_category);
  const category = nameOf(raw.category_name) ?? nameOf(raw.category);

  if (parent && !subCategory) return { category: parent, subCategory: category };
  return { category, subCategory };
}

function normalizeMenuItem(raw: Raw): MenuItem {
  const images = Array.isArray(raw.img_urls) ? raw.img_urls : [];
  // food_served arrives as "veg", ["veg"] or [].
  const foodServed = Array.isArray(raw.food_served) ? raw.food_served[0] : raw.food_served;

  return {
    id: String(raw.id ?? raw.menu_item_id ?? ""),
    restaurantId: text(raw.restaurant_id),
    name: text(raw.name) ?? text(raw.item_name) ?? "Unnamed item",
    description: text(raw.description),
    ...pricing(raw),
    prepMinutes: num(raw.preparation_time_minutes),
    ...categories(raw),
    foodServed: text(foodServed),
    imageUrl: text(images[0]) ?? text(raw.img_url) ?? text(raw.image_url),
    ownerAvailable: raw.owner_is_available !== false,
    adminAvailable: typeof raw.admin_is_available === "boolean" ? raw.admin_is_available : null,
    inactiveReason: text(raw.admin_item_inactive_reason),
  };
}

export type RestaurantMenu = {
  items: MenuItem[];
  /** How many items the API returned in total, and from which restaurants (for the empty state). */
  scanned: number;
  restaurantNames: string[];
};

type ListPage = { items: Raw[]; totalPages: number };

/** Envelope: { data: { total, page, limit, total_pages, items: [...] } } */
function readPage(response: unknown): ListPage {
  const data = (response as { data?: unknown } | null)?.data;
  if (Array.isArray(data)) return { items: data as Raw[], totalPages: 1 };
  const body = (data ?? {}) as Raw;
  const items = (body.items ?? body.menu_items ?? body.rows ?? []) as Raw[];
  return { items: Array.isArray(items) ? items : [], totalPages: num(body.total_pages) ?? 1 };
}

export const menuItemsApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    /**
     * GET /admin/menu-items for one restaurant. The server-side restaurant_id
     * filter is tried first; if it returns nothing, every page is scanned and
     * filtered here, so the tab still works if the filter is not honoured.
     */
    getRestaurantMenuItems: builder.query<RestaurantMenu, { id: string; name: string }>({
      async queryFn({ id: restaurantId, name: restaurantName }, _api, _extra, baseQuery) {
        const fetchPage = (page: number, filtered: boolean) =>
          baseQuery({
            url: "/admin/menu-items",
            params: { page, limit: PAGE_SIZE, ...(filtered ? { restaurant_id: restaurantId } : {}) },
          });
        // Match by id, or by name if the list screen's id is not the one the items carry.
        const mine = (rows: Raw[]) =>
          rows.filter(
            (row) =>
              String(row.restaurant_id ?? "").toLowerCase() === restaurantId.toLowerCase() ||
              String(row.restaurant_name ?? "").trim().toLowerCase() === restaurantName.trim().toLowerCase(),
          );

        const filtered = await fetchPage(1, true);
        if (filtered.error) return { error: filtered.error };

        const firstPage = readPage(filtered.data);
        let rows = mine(firstPage.items);
        let scanned = firstPage.items;

        if (rows.length === 0) {
          // Nothing matched: scan the unfiltered list.
          const all: Raw[] = [];
          let totalPages = 1;
          for (let page = 1; page <= totalPages; page += 1) {
            const result = await fetchPage(page, false);
            if (result.error) return { error: result.error };
            const parsed = readPage(result.data);
            totalPages = parsed.totalPages;
            all.push(...parsed.items);
          }
          rows = mine(all);
          scanned = all;
        }

        return {
          data: {
            items: rows.map(normalizeMenuItem),
            scanned: scanned.length,
            restaurantNames: [...new Set(scanned.map((row) => String(row.restaurant_name ?? "")).filter(Boolean))],
          },
        };
      },
      providesTags: (_result, _error, { id }) => [{ type: "MenuItem", id }],
    }),

    /** PATCH /admin/menu-items/{id}/status. A reason is only allowed when deactivating. */
    setMenuItemStatus: builder.mutation<
      void,
      { restaurantId: string; itemId: string; active: boolean; reason?: string }
    >({
      query: ({ itemId, active, reason }) => ({
        url: `/admin/menu-items/${itemId}/status`,
        method: "PATCH",
        body: active
          ? { admin_is_available: true }
          : { admin_is_available: false, ...(reason?.trim() ? { admin_item_inactive_reason: reason.trim() } : {}) },
      }),
      invalidatesTags: (_result, _error, { restaurantId }) => [{ type: "MenuItem", id: restaurantId }],
    }),
  }),
});

export const { useGetRestaurantMenuItemsQuery, useSetMenuItemStatusMutation } = menuItemsApi;
