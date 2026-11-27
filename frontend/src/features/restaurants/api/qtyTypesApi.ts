import { baseApi } from "../../admin/api/baseApi";

export type QtyTypeStatus = "active" | "inactive";

/** A shared portion size ("Half", "Full", "500 ml") every restaurant can pick when adding a menu item. */
export type QtyType = {
  id: string;
  /** Readable ID, e.g. QTY001. */
  code: string | null;
  name: string;
  status: QtyTypeStatus;
};

const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);

function normalizeQtyType(row: Record<string, unknown>): QtyType {
  return {
    id: String(row.id ?? ""),
    code: text(row.qty_type_id),
    name: text(row.qty_type_name) ?? "Unnamed",
    status: String(row.status ?? "").toLowerCase() === "inactive" ? "inactive" : "active",
  };
}

export const qtyTypesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** GET /admin/qty-types: shared quantity types (restaurant-specific ones are not included). */
    getQtyTypes: builder.query<QtyType[], void>({
      query: () => "/admin/qty-types",
      transformResponse: (response: { data?: unknown }) =>
        (Array.isArray(response.data) ? response.data : [])
          .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
          .map(normalizeQtyType),
      providesTags: (result) => [
        ...(result ?? []).map((item) => ({ type: "QtyType" as const, id: item.id })),
        { type: "QtyType" as const, id: "LIST" },
      ],
    }),
    createQtyType: builder.mutation<unknown, { name: string; status: QtyTypeStatus }>({
      query: ({ name, status }) => ({ url: "/admin/qty-types", method: "POST", body: { qty_type_name: name, status } }),
      invalidatesTags: (_result, error) => (error ? [] : [{ type: "QtyType", id: "LIST" }]),
    }),
    updateQtyType: builder.mutation<unknown, { id: string; name?: string; status?: QtyTypeStatus }>({
      query: ({ id, name, status }) => ({
        url: `/admin/qty-types/${encodeURIComponent(id)}`,
        method: "PATCH",
        body: { ...(name !== undefined ? { qty_type_name: name } : {}), ...(status ? { status } : {}) },
      }),
      invalidatesTags: (_result, error) => (error ? [] : [{ type: "QtyType", id: "LIST" }]),
    }),
    /** Fails with 409 while a menu item still uses the quantity type. */
    deleteQtyType: builder.mutation<unknown, string>({
      query: (id) => ({ url: `/admin/qty-types/${encodeURIComponent(id)}`, method: "DELETE" }),
      invalidatesTags: (_result, error) => (error ? [] : [{ type: "QtyType", id: "LIST" }]),
    }),
  }),
});

export const { useGetQtyTypesQuery, useCreateQtyTypeMutation, useUpdateQtyTypeMutation, useDeleteQtyTypeMutation } = qtyTypesApi;
