"use client";

import { useMemo, useState } from "react";
import type { AdminProfile, Screen } from "../models/portal";
import { adminPortalService } from "../services/adminPortalService";

export function useAdminPortalViewModel() {
  const [screen, setScreen] = useState<Screen>("login");
  const [admin, setAdmin] = useState<AdminProfile>(adminPortalService.getAdmin());
  const [menuQuery, setMenuQuery] = useState("");
  const [menuCategory, setMenuCategory] = useState("All items");
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [managementOpen, setManagementOpen] = useState(true);
  const [selectedManagementId, setSelectedManagementId] = useState("menu");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedSubsection, setSelectedSubsection] = useState("users-all");

  const data = useMemo(() => ({
    metrics: adminPortalService.getMetrics(),
    modules: adminPortalService.getModules(),
    menu: adminPortalService.getMenu(),
    activities: adminPortalService.getActivities(),
    userActivities: adminPortalService.getUserActivities(),
  }), []);

  const filteredMenu = data.menu.filter((item) => {
    const matchesCategory = menuCategory === "All items" || item.category === menuCategory;
    const needle = menuQuery.toLowerCase();
    return matchesCategory && (item.name.toLowerCase().includes(needle) || item.kitchen.toLowerCase().includes(needle));
  });

  const navigate = (next: Screen) => {
    setScreen(next);
    setNoticeOpen(false);
    setSavedMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /**
   * Quick Actions (top navbar) shortcut real, already-existing admin actions.
   * "Add employee" needs to land on the Employees screen AND open its
   * existing create form, so we carry a one-shot flag the view consumes.
   */
  const [pendingAction, setPendingAction] = useState<"add-employee" | null>(null);
  const triggerQuickAction = (action: "add-employee") => {
    setPendingAction(action);
    navigate("employees");
  };
  const clearPendingAction = () => setPendingAction(null);

  const saveProfile = (updates: Pick<AdminProfile, "name" | "email" | "phone" | "location">) => {
    setAdmin((current) => ({ ...current, ...updates }));
    setSavedMessage("Profile changes saved locally");
    setTimeout(() => navigate("profile"), 650);
  };

  const selectEmployee = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    navigate("employee-details");
  };

  const selectManagementService = (serviceId: string, subsectionId?: string) => {
    setSelectedManagementId(serviceId);
    if (subsectionId) setSelectedSubsection(subsectionId);
    setManagementOpen(true);
    navigate("management");
  };

  return {
    screen, admin, data, filteredMenu, menuQuery, menuCategory, noticeOpen, savedMessage, managementOpen, selectedManagementId, selectedEmployeeId, selectedSubsection, pendingAction,
    navigate, saveProfile, selectManagementService, selectEmployee, setSelectedEmployeeId, setMenuQuery, setMenuCategory, setNoticeOpen, setManagementOpen, triggerQuickAction, clearPendingAction,
  };
}
