import { baseApi } from "../../admin/api/baseApi";

/** A food category. `created_by` is "admin" or "restaurant". */
export type AdminCategory = {
  category_id: string;
  category_name: string;
  created_by?: string | null;
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

    createAdminCategory: builder.mutation<AdminCategory, { category_name: string }>({
      query: (body) => ({ url: "/admin/categories", method: "POST", body }),
      transformResponse: (response: { data: AdminCategory }) => response.data,
      invalidatesTags: [{ type: "AdminCategory", id: "LIST" }],
    }),
  }),
});

export const { useGetAdminCategoriesQuery, useCreateAdminCategoryMutation } = categoriesApi;
