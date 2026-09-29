import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type {
    AuthEmployee,
    AuthRole,
} from "./models/auth";

type AuthState = {
    employee: AuthEmployee | null;
    role: AuthRole | null;
    permissions: string[];
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
};

const initialState: AuthState = {
    employee: null,
    role: null,
    permissions: [],
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setAuthSession: (
            state,
            action: PayloadAction<{
                employee: AuthEmployee;
                role: AuthRole | null;
                permissions: string[];
                accessToken: string;
                refreshToken: string;
            }>,
        ) => {
            state.employee = action.payload.employee;
            state.role = action.payload.role;
            state.permissions = action.payload.permissions;
            state.accessToken = action.payload.accessToken;
            state.refreshToken = action.payload.refreshToken;
            state.isAuthenticated = true;
        },

        clearAuthSession: (state) => {
            state.employee = null;
            state.role = null;
            state.permissions = [];
            state.accessToken = null;
            state.refreshToken = null;
            state.isAuthenticated = false;
        },
    },
});

export const {
    setAuthSession,
    clearAuthSession,
} = authSlice.actions;

export default authSlice.reducer;