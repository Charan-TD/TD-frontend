import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "https://train-dhaba-backend-dev.up.railway.app/api/v1";

const ACCESS_TOKEN_KEY = "train_dabba_access_token";

/** Fired when the API rejects the login (e.g. it expired); the portal signs out. */
export const SESSION_EXPIRED_EVENT = "train-dabba:session-expired";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,

  prepareHeaders: (headers) => {
    headers.set("Content-Type", "application/json");

    if (typeof window !== "undefined") {
      const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);

      if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
      }
    }

    return headers;
  },
});

// A wrong password on the sign-in form is also a 401; that must not count
// as an expired session.
const isLoginRequest = (args: string | FetchArgs) =>
  (typeof args === "string" ? args : args.url).includes("/auth/employee/login");

/**
 * Login tokens expire on the backend's schedule. When a request comes back
 * 401 the session is over, so announce SESSION_EXPIRED_EVENT and let the
 * portal return to the sign-in screen instead of leaving every page broken.
 * (403 means "not allowed", not "expired", so it is passed through.)
 */
const baseQueryWithSessionCheck: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401 && !isLoginRequest(args) && typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "baseApi",

  baseQuery: baseQueryWithSessionCheck,

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
