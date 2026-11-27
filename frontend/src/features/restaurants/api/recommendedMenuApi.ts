import { API_BASE_URL, baseApi } from "../../admin/api/baseApi";

export type FoodType = "veg" | "non_veg" | "egg";

/** A dish the admin recommends to restaurants (GET /admin/recommended-menu). */
export type RecommendedItem = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  foodType: FoodType;
  imageUrl?: string;
  prepTime: number | null;
  active: boolean;
};

type Raw = Record<string, unknown>;
const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);

/** A signed URL when the server sends one, otherwise the stored path on the API's own host. */
function imageOf(raw: Raw): string | undefined {
  const urls = Array.isArray(raw.img_urls) ? raw.img_urls : [];
  const direct = text(urls[0]) ?? text(raw.img_url) ?? text(raw.image_url);
  if (direct) return direct;
  const path = text(raw.img_path);
  if (!path) return undefined;
  if (/^https?:/.test(path)) return path;
  try {
    return new URL(path, API_BASE_URL).toString();
  } catch {
    return undefined;
  }
}

function normalize(raw: Raw): RecommendedItem {
  const food = String(raw.food_served ?? "veg");
  return {
    id: String(raw.id ?? ""),
    name: text(raw.name) ?? "Unnamed item",
    categoryId: text(raw.category_id) ?? "",
    categoryName: text(raw.category_name) ?? "",
    foodType: food === "non_veg" || food === "egg" ? food : "veg",
    imageUrl: imageOf(raw),
    prepTime: typeof raw.preparation_time_minutes === "number" ? raw.preparation_time_minutes : null,
    active: raw.is_active !== false,
  };
}

export const recommendedMenuApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    /** Reads every page (100 at a time). */
    getRecommendedMenu: builder.query<RecommendedItem[], void>({
      async queryFn(_arg, _api, _extra, baseQuery) {
        const all: RecommendedItem[] = [];
        let page = 1;
        for (;;) {
          const result = await baseQuery({ url: "/admin/recommended-menu", params: { page, limit: 100 } });
          if (result.error) return { error: result.error };
          const data = (result.data as { data?: { items?: Raw[]; pagination?: { total_pages?: number; totalPages?: number } } } | undefined)?.data;
          const items = data?.items ?? [];
          all.push(...items.map(normalize));
          const pages = data?.pagination?.total_pages ?? data?.pagination?.totalPages ?? (items.length < 100 ? page : page + 1);
          if (!items.length || page >= pages) break;
          page += 1;
        }
        return { data: all };
      },
      providesTags: [{ type: "RecommendedMenu", id: "LIST" }],
    }),

    /** Multipart: name, category, food_served, preparation_time_minutes, total_price and the image in img_id. */
    createRecommendedItem: builder.mutation<null, FormData>({
      async queryFn(body, _api, _extra, baseQuery) {
        const result = await baseQuery({ url: "/admin/recommended-menu", method: "POST", body });
        return result.error ? { error: result.error } : { data: null };
      },
      invalidatesTags: [{ type: "RecommendedMenu", id: "LIST" }],
    }),

    /** Multipart with only the changed fields; a new image in img_id replaces the old one. */
    updateRecommendedItem: builder.mutation<null, { id: string; body: FormData }>({
      async queryFn({ id, body }, _api, _extra, baseQuery) {
        const result = await baseQuery({ url: `/admin/recommended-menu/${encodeURIComponent(id)}`, method: "PATCH", body });
        return result.error ? { error: result.error } : { data: null };
      },
      invalidatesTags: [{ type: "RecommendedMenu", id: "LIST" }],
    }),

    /** One DELETE per item; fails if any of them fails, after trying all. */
    deleteRecommendedItems: builder.mutation<null, string[]>({
      async queryFn(ids, _api, _extra, baseQuery) {
        const results = await Promise.all(ids.map((id) => baseQuery({ url: `/admin/recommended-menu/${encodeURIComponent(id)}`, method: "DELETE" })));
        const failed = results.find((result) => result.error);
        return failed?.error ? { error: failed.error } : { data: null };
      },
      invalidatesTags: [{ type: "RecommendedMenu", id: "LIST" }],
    }),
  }),
});

export const { useGetRecommendedMenuQuery, useCreateRecommendedItemMutation, useUpdateRecommendedItemMutation, useDeleteRecommendedItemsMutation } = recommendedMenuApi;
