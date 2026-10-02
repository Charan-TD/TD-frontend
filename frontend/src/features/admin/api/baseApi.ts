import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "https://train-dhaba-backend-dev.up.railway.app/api/v1";

export const baseApi = createApi({
  reducerPath: "baseApi",

  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,

    prepareHeaders: (headers) => {
      headers.set("Content-Type", "application/json");

      if (typeof window !== "undefined") {
        const accessToken = localStorage.getItem(
          "train_dabba_access_token",
        );

        if (accessToken) {
          headers.set("Authorization", `Bearer ${accessToken}`);
        }
      }

      return headers;
    },
  }),

  tagTypes: [
    "User",
    "AdminUser",
    "AdminAccess",
    "Restaurant",
    "Order",
    "Rider",
    "Station",
    "Employee",
    "Role",
    "Permission",
  ],

  endpoints: () => ({}),
});
