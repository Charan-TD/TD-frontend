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

/** sessionStorage key holding which request caused the last sign-out, so the sign-in screen can show it. */
export const LAST_401_KEY = "train_dabba_last_401";

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
    // Record which request was rejected and why, so a surprise sign-out can be traced.
    const request = typeof args === "string" ? { method: "GET", url: args } : { method: args.method ?? "GET", url: args.url };
    const reason = (result.error.data as { message?: string } | undefined)?.message ?? "no message";
    const detail = `${request.method} ${request.url} returned 401: ${reason}`;
    console.warn("[auth] Signed out after a rejected request —", detail);
    try {
      sessionStorage.setItem(LAST_401_KEY, detail);
    } catch {
      // Storage can be unavailable (private mode); the console line above still has it.
    }
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
    "AdminCategory",
    "MenuItem",
    "RegistrationRequest",
    "ProfileEditRequest",
    "Order",
    "Rider",
    "Station",
    "Employee",
    "Role",
    "Permission",
  ],

  endpoints: () => ({}),
});
