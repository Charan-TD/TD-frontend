import { baseApi } from "../../admin/api/baseApi";

/** A food category. `created_by` is "admin" or "restaurant". */
export type AdminCategory = {
  category_id: string;
  category_name: string;
  created_by?: string | null;
  /** Temporary signed URL of the category image, when the server returns it. */
  cat_img_url?: string | null;
};

export const categoriesApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getAdminCategories: builder.query<AdminCategory[], void>({
      query: () => "/admin/categories",
      transformResponse: (response: { data?: AdminCategory[] | { categories?: AdminCategory[] } }) => {
        const data = response.data;
        return Array.isArray(data) ? data : (data?.categories ?? []);
      },
      providesTags: [{ type: "AdminCategory", id: "LIST" }],
    }),

    /** Sent as multipart/form-data: category_name plus the image file in cat_img_id. */
    createAdminCategory: builder.mutation<AdminCategory, FormData>({
      query: (body) => ({ url: "/admin/categories", method: "POST", body }),
      transformResponse: (response: { data: AdminCategory }) => response.data,
      invalidatesTags: [{ type: "AdminCategory", id: "LIST" }],
    }),
  }),
});

export const { useGetAdminCategoriesQuery, useCreateAdminCategoryMutation } = categoriesApi;
