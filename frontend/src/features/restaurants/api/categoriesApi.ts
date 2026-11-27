import { baseApi } from "../../admin/api/baseApi";

/** A food category. `created_by` is "admin" or "restaurant". */
export type AdminCategory = {
  category_id: string;
  category_name: string;
  created_by?: string | null;
  /** Temporary signed URL of the category image, when the server returns it. */
  cat_img_url?: string | null;
};

/** The image URL may arrive under a few different keys; settle on cat_img_url. */
const withImageUrl = (category: AdminCategory): AdminCategory => {
  const raw = category as AdminCategory & Record<string, unknown>;
  const url = [raw.cat_img_url, raw.cat_img_id, raw.category_img_url, raw.img_url, raw.image_url].find(
    (value): value is string => typeof value === "string" && /^(https?:|data:|\/)/.test(value),
  );
  return { ...category, cat_img_url: url ?? null };
};

export const categoriesApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getAdminCategories: builder.query<AdminCategory[], void>({
      query: () => "/admin/categories",
      transformResponse: (response: { data?: AdminCategory[] | { categories?: AdminCategory[] } }) => {
        const data = response.data;
        const list = Array.isArray(data) ? data : (data?.categories ?? []);
        return list.map(withImageUrl);
      },
      providesTags: [{ type: "AdminCategory", id: "LIST" }],
    }),

    /** Sent as multipart/form-data: category_name plus the image file in cat_img_id. */
    createAdminCategory: builder.mutation<AdminCategory, FormData>({
      query: (body) => ({ url: "/admin/categories", method: "POST", body }),
      transformResponse: (response: { data: AdminCategory }) => response.data,
      invalidatesTags: [{ type: "AdminCategory", id: "LIST" }],
    }),

    /** PATCH /admin/categories/{id}: JSON { category_name } (max 150 characters). */
    updateAdminCategory: builder.mutation<AdminCategory, { categoryId: string; categoryName: string }>({
      query: ({ categoryId, categoryName }) => ({
        url: `/admin/categories/${encodeURIComponent(categoryId)}`,
        method: "PATCH",
        body: { category_name: categoryName },
      }),
      transformResponse: (response: { data: AdminCategory }) => response.data,
      invalidatesTags: [{ type: "AdminCategory", id: "LIST" }],
    }),

    /** PATCH /admin/categories/{id}/image: multipart with the new image in cat_img_id (JPG, PNG or WEBP, max 2 MB). */
    updateAdminCategoryImage: builder.mutation<AdminCategory, { categoryId: string; body: FormData }>({
      query: ({ categoryId, body }) => ({
        url: `/admin/categories/${encodeURIComponent(categoryId)}/image`,
        method: "PATCH",
        body,
      }),
      transformResponse: (response: { data: AdminCategory }) => response.data,
      invalidatesTags: [{ type: "AdminCategory", id: "LIST" }],
    }),
  }),
});

export const {
  useGetAdminCategoriesQuery,
  useCreateAdminCategoryMutation,
  useUpdateAdminCategoryMutation,
  useUpdateAdminCategoryImageMutation,
} = categoriesApi;
