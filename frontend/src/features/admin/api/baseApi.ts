import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!apiBaseUrl) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL is not defined");
}

export const baseApi = createApi({
  reducerPath: "baseApi",

  baseQuery: fetchBaseQuery({
    baseUrl: apiBaseUrl,

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