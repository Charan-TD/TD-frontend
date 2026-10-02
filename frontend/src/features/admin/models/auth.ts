import type { PermissionMap } from "./access";

export type AuthEmployee = {
    id: string;
    emp_id: string;
    name: string;
    email: string;
    status: string;
    profile_img_url?: string | null;
};

export type AuthRole = {
    id: string;
    name: string;
};

export type AuthSession = {
    employee: AuthEmployee | null;
    role: AuthRole | null;
    permissions: PermissionMap;
    accessToken: string | null;
    refreshToken: string | null;
};
