import { baseApi } from "./baseApi";
import type { CustomerUser } from "../models/customerUser";

const USERS_PATH = "/customer_users";

export type GetUsersResponse = {
  users: CustomerUser[];
  hasMore: boolean;
};

export const usersApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getUsers: builder.query<
      GetUsersResponse,
      {
        search?: string;
        limit?: number;
        offset?: number;
        status?: "all" | "blocked";
      }
    >({
      query: ({
        search = "",
        limit = 10,
        offset = 0,
        status = "all",
      }) => {
        const trimmedSearch = search.trim();

        return {
          url: USERS_PATH,
          method: "GET",
          params: {
            select: "*",
            order: "created_at.desc",
            limit,
            offset,

            ...(trimmedSearch
              ? {
                or: `(full_name.ilike.*${trimmedSearch}*,email.ilike.*${trimmedSearch}*,phone.ilike.*${trimmedSearch}*)`,
              }
              : {}),

            ...(status === "blocked"
              ? {
                status: "in.(blocked,inactive)",
              }
              : {}),
          },
        };
      },

      transformResponse: (
        response: CustomerUser[],
        _meta,
        arg
      ): GetUsersResponse => {
        const limit = arg.limit ?? 10;

        return {
          users: response,
          hasMore: response.length === limit,
        };
      },

      providesTags: (result) =>
        result
          ? [
            ...result.users.map((user) => ({
              type: "User" as const,
              id: user.id,
            })),
            {
              type: "User" as const,
              id: "LIST",
            },
          ]
          : [
            {
              type: "User" as const,
              id: "LIST",
            },
          ],
    }),

    updateUserStatus: builder.mutation<
      CustomerUser,
      {
        id: string;
        status: string;
      }
    >({
      query: ({ id, status }) => ({
        url: USERS_PATH,
        method: "PATCH",
        params: {
          id: `eq.${id}`,
        },
        body: {
          status,
        },
        headers: {
          Prefer: "return=representation",
        },
      }),

      transformResponse: (response: CustomerUser[]) => response[0],

      invalidatesTags: (_result, _error, { id }) => [
        {
          type: "User",
          id,
        },
        {
          type: "User",
          id: "LIST",
        },
      ],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useUpdateUserStatusMutation,
} = usersApi;