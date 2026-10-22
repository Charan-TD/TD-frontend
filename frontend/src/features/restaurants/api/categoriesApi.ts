import { baseApi } from "../../admin/api/baseApi";

/** A food category created by an admin (not tied to one restaurant). */
export type AdminCategory = {
  id: number | string;
  category_id: string;
  category_name: string;
  is_active: boolean | null;
};

export const categoriesApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getAdminCategories: builder.query<AdminCategory[], void>({
      query: () => "/admin/categories",
      transformResponse: (response: { data?: AdminCategory[] }) =>
        Array.isArray(response.data) ? response.data : [],
      providesTags: [{ type: "AdminCategory", id: "LIST" }],
    }),

    createAdminCategory: builder.mutation<AdminCategory, { name: string }>({
      query: (body) => ({ url: "/admin/categories", method: "POST", body }),
      transformResponse: (response: { data: AdminCategory }) => response.data,
      invalidatesTags: [{ type: "AdminCategory", id: "LIST" }],
    }),
  }),
});

export const { useGetAdminCategoriesQuery, useCreateAdminCategoryMutation } = categoriesApi;
