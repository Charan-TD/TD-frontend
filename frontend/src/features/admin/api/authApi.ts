import { baseApi } from "./baseApi";

import type {
    AuthEmployee,
    AuthRole,
} from "../models/auth";

export type EmployeeLoginRequest = {
    email: string;
    password: string;
};

export type EmployeeLoginData = {
    employee: AuthEmployee;
    role: AuthRole | null;
    permissions: string[];
    accessToken: string;
    refreshToken: string;
};

export type EmployeeLoginResponse = {
    success: boolean;
    message: string;
    data: EmployeeLoginData;
};

export type EmployeeMeData = {
    employee: AuthEmployee;
    role: AuthRole | null;
    permissions: string[];
};

export type EmployeeMeResponse = {
    success: boolean;
    message: string;
    data: EmployeeMeData;
};

export const authApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        employeeLogin: builder.mutation<
            EmployeeLoginResponse,
            EmployeeLoginRequest
        >({
            query: (body) => ({
                url: "/auth/employee/login",
                method: "POST",
                body,
            }),
        }),

        // The argument is the access token. It is never sent in the URL - the
        // Authorization header does that - it only makes the cache entry
        // per-session, so one employee's cached profile can never be served
        // to the next employee who logs in on the same browser.
        employeeMe: builder.query<EmployeeMeResponse, string>({
            query: () => ({
                url: "/auth/employee/me",
                method: "GET",
            }),
        }),
    }),
});

export const {
    useEmployeeLoginMutation,
    useEmployeeMeQuery,
} = authApi;