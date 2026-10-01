import { baseApi } from "./baseApi";
import type { CustomerUser } from "../models/customerUser";
import type { Pagination } from "./apiTypes";

const USERS_PATH = "/customer-users";

type CustomerUserList = {
  customers: CustomerUser[];
  pagination: Pagination;
};

export type GetUsersResponse = {
  users: CustomerUser[];
  pagination: Pagination;
  hasMore: boolean;
};

export const usersApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getUsers: builder.query<
      GetUsersResponse,
      { search?: string; page?: number; limit?: number; status?: "all" | "blocked" }
    >({
      query: ({ page = 1, limit = 10, status = "all" }) => ({
        url: USERS_PATH,
        method: "GET",
        params: {
          page,
          limit,
          ...(status === "blocked" ? { status: "INACTIVE" } : {}),
        },
      }),
      transformResponse: (response: { success: boolean; data: CustomerUserList }) => {
        const data = response.data;
        const pagination = data?.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 1 };
        return {
          users: data?.customers ?? [],
          pagination,
          hasMore: pagination.page < pagination.totalPages,
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.users.map((user) => ({ type: "User" as const, id: user.id })),
              { type: "User" as const, id: "LIST" },
            ]
          : [{ type: "User" as const, id: "LIST" }],
    }),

    updateUserStatus: builder.mutation<CustomerUser, { id: string; status: string }>({
      query: ({ id, status }) => ({
        url: `${USERS_PATH}/${id}`,
        method: "PUT",
        body: { status: status.toUpperCase() },
      }),
      transformResponse: (response: { success: boolean; data: CustomerUser }) => response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "User", id },
        { type: "User", id: "LIST" },
      ],
    }),
  }),
});

export const { useGetUsersQuery, useUpdateUserStatusMutation } = usersApi;
