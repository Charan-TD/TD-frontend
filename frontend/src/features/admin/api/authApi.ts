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

        employeeMe: builder.query<EmployeeMeResponse, void>({
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