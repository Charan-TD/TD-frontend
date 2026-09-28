import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not defined");
}

if (!supabaseAnonKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined");
}

export const baseApi = createApi({
  reducerPath: "baseApi",

  baseQuery: fetchBaseQuery({
    baseUrl: `${supabaseUrl}/rest/v1`,

    prepareHeaders: (headers) => {
      headers.set("apikey", supabaseAnonKey);
      headers.set("Authorization", `Bearer ${supabaseAnonKey}`);
      headers.set("Content-Type", "application/json");

      return headers;
    },
  }),

  tagTypes: ["User", "AdminUser", "AdminAccess", "Restaurant", "Order", "Rider", "Station", "Employee", "Role", "Permission"],

  endpoints: () => ({}),
});