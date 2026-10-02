"use client";

import { useEffect, useMemo, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";

import type { AdminProfile, Screen } from "../models/portal";
import { adminPortalService } from "../services/adminPortalService";
import {
  useEmployeeMeQuery,
  type EmployeeMeData,
} from "../api/authApi";
import { baseApi } from "../api/baseApi";
import { clearAuthSession } from "../authSlice";
import { store } from "../store";
import {
  normalizePermissionMap,
  can,
  sectionsWithRead,
  type PermissionAction,
} from "../models/access";
import type { PortalSection } from "../models/portal";

const STORAGE_KEYS = [
  "train_dabba_access_token",
  "train_dabba_refresh_token",
  "train_dabba_employee",
  "train_dabba_role",
  "train_dabba_permissions",
];

/** Screens that need a permission before they may be opened at all. */
const screenRequirement: Partial<
  Record<Screen, [PortalSection, PermissionAction]>
> = {
  employees: ["employees", "read"],
  "employee-details": ["employees", "read"],
  "employee-activity": ["employees", "read"],
  "assign-role": ["employees", "read"],
};

/**
 * Builds the portal profile from an authenticated employee. Name, role and
 * access ALWAYS come from the server response - never from a default.
 */
function buildAdminProfile(
  session: EmployeeMeData,
  previous?: AdminProfile,
): AdminProfile {
  const sameEmployee = previous?.employeeId === session.employee.id;

  let permissionMap = session.permissions;
  let roleName = session.role?.name;

  if ((!permissionMap || Object.keys(permissionMap).length === 0) && sameEmployee && previous) {
    permissionMap = previous.permissions;
  }

  if (typeof window !== "undefined") {
    if (!permissionMap || Object.keys(permissionMap).length === 0) {
      try {
        permissionMap = JSON.parse(
          localStorage.getItem("train_dabba_permissions") || "{}",
        );
      } catch {
        permissionMap = {};
      }
    }

    if (!roleName) {
      try {
        const storedRole = JSON.parse(
          localStorage.getItem("train_dabba_role") || "null",
        );
        if (storedRole && typeof storedRole.name === "string") {
          roleName = storedRole.name;
        }
      } catch {
        // Keep the previous/default role label below.
      }
    }
  }

  const permissions = normalizePermissionMap(permissionMap);

  return {
    employeeId: session.employee.id,
    name: session.employee.name,
    email: session.employee.email,
    phone: sameEmployee ? previous!.phone : "",
    location: sameEmployee ? previous!.location : "",
    role: roleName ?? (sameEmployee ? previous?.role : undefined) ?? "Employee",
    lastLogin: "Today",
    access: sectionsWithRead(permissions),
    permissions,
  };
}

export function useAdminPortalViewModel() {
  const [screen, setScreen] = useState<Screen>("login");

  const [admin, setAdmin] = useState<AdminProfile>(
    adminPortalService.getAdmin(),
  );

  const [menuQuery, setMenuQuery] = useState("");
  const [menuCategory, setMenuCategory] = useState("All items");
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [managementOpen, setManagementOpen] = useState(true);
  const [selectedManagementId, setSelectedManagementId] = useState("menu");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  );
  const [selectedSubsection, setSelectedSubsection] = useState("users-all");

  // The access token lives in state (not read from localStorage during
  // render) so login/logout re-render deterministically and SSR/hydration
  // never disagree.
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("train_dabba_access_token");
    setAccessToken(token);

    if (!token) return;

    try {
      const employee = JSON.parse(localStorage.getItem("train_dabba_employee") || "null");
      const role = JSON.parse(localStorage.getItem("train_dabba_role") || "null");
      const permissions = JSON.parse(localStorage.getItem("train_dabba_permissions") || "{}");

      if (employee?.id && permissions) {
        setAdmin(buildAdminProfile({ employee, role, permissions: normalizePermissionMap(permissions) }));
        setScreen("dashboard");
      }
    } catch {
      // Invalid stored JSON is ignored; /me or a new login will recover state.
    }
  }, []);

  // `currentData` (not `data`) is used on purpose: it is undefined until the
  // response for THIS token arrives, so a previous employee's cached profile
  // can never be re-applied to the person who just logged in.
  const {
    currentData: employeeSession,
    isSuccess: isSessionValid,
    isError: isSessionError,
    error: sessionError,
  } = useEmployeeMeQuery(accessToken ?? skipToken);

  const logout = () => {
    STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    store.dispatch(clearAuthSession());
    store.dispatch(baseApi.util.resetApiState());

    setAccessToken(null);
    setAdmin(adminPortalService.getAdmin());
    setSelectedEmployeeId(null);
    setPendingAction(null);
    setNoticeOpen(false);
    setSavedMessage("");
    setScreen("login");
  };

  /** Called by the login form with the server's login response. */
  const startSession = (session: EmployeeMeData & { accessToken: string }) => {
    setAdmin(buildAdminProfile(session));
    setAccessToken(session.accessToken);
    setScreen("dashboard");
    window.scrollTo({ top: 0 });
  };

  // Page refresh / returning user: restore the profile from /me.
  useEffect(() => {
    if (!accessToken || !employeeSession?.data) return;

    // Always take the freshest permissions the server reports.
    setAdmin((current) => buildAdminProfile(employeeSession.data, current));
    setScreen((current) => (current === "login" ? "dashboard" : current));
  }, [employeeSession, accessToken]);

  // Only an authentication failure ends the session; a network blip does not.
  useEffect(() => {
    if (!accessToken || !isSessionError) return;

    const status = (sessionError as { status?: unknown } | undefined)?.status;
    if (status === 401 || status === 403) logout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, isSessionError, sessionError]);

  const data = useMemo(
    () => ({
      metrics: adminPortalService.getMetrics(),
      modules: adminPortalService.getModules(),
      menu: adminPortalService.getMenu(),
      activities: adminPortalService.getActivities(),
      userActivities: adminPortalService.getUserActivities(),
    }),
    [],
  );

  const filteredMenu = data.menu.filter((item) => {
    const matchesCategory =
      menuCategory === "All items" || item.category === menuCategory;

    const needle = menuQuery.toLowerCase();

    return (
      matchesCategory &&
      (item.name.toLowerCase().includes(needle) ||
        item.kitchen.toLowerCase().includes(needle))
    );
  });

  const navigate = (next: Screen) => {
    // "login" is the sign-out destination: it must wipe the session, not just
    // swap the screen (the old behaviour left the previous user's token,
    // cached profile and full access in place for the next person).
    if (next === "login") {
      logout();
      return;
    }

    const requirement = screenRequirement[next];
    if (requirement && !can(admin.permissions, requirement[0], requirement[1])) {
      return;
    }

    setScreen(next);
    setNoticeOpen(false);
    setSavedMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const [pendingAction, setPendingAction] = useState<
    "add-employee" | null
  >(null);

  const triggerQuickAction = (action: "add-employee") => {
    if (
      !can(admin.permissions, "employees", "read") ||
      !can(admin.permissions, "employees", "insert")
    ) {
      return;
    }

    setPendingAction(action);
    navigate("employees");
  };

  const clearPendingAction = () => setPendingAction(null);

  const saveProfile = (
    updates: Pick<
      AdminProfile,
      "name" | "email" | "phone" | "location"
    >,
  ) => {
    setAdmin((current) => ({
      ...current,
      ...updates,
    }));

    setSavedMessage("Profile changes saved locally");

    setTimeout(() => navigate("profile"), 650);
  };

  const selectEmployee = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    navigate("employee-details");
  };

  const selectManagementService = (
    serviceId: string,
    subsectionId?: string,
  ) => {
    setSelectedManagementId(serviceId);

    if (subsectionId) {
      setSelectedSubsection(subsectionId);
    }

    setManagementOpen(true);
    navigate("management");
  };

  return {
    screen,
    admin,
    data,
    filteredMenu,
    menuQuery,
    menuCategory,
    noticeOpen,
    savedMessage,
    managementOpen,
    selectedManagementId,
    selectedEmployeeId,
    selectedSubsection,
    pendingAction,

    navigate,
    startSession,
    saveProfile,
    selectManagementService,
    selectEmployee,
    setSelectedEmployeeId,
    setMenuQuery,
    setMenuCategory,
    setNoticeOpen,
    setManagementOpen,
    triggerQuickAction,
    clearPendingAction,

    isSessionValid,
  };
}