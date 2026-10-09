"use client";

import { AppShell } from "./components/AppShell";
import { can } from "./models/access";
import { DashboardView } from "./views/DashboardView";
import { EditProfileView } from "./views/EditProfileView";
import { LoginView } from "./views/LoginView";
import { ManagementView } from "./views/ManagementView";
import { ProfileView } from "./views/ProfileView";
import { useAdminPortalViewModel } from "./viewmodels/useAdminPortalViewModel";
import { EmployeesView } from "../employees/views/EmployeesView";
import { EmployeeDetailsView } from "../employees/views/EmployeeDetailsView";
import { EmployeeActivityView } from "../employees/views/EmployeeActivityView";
import { AssignRoleView } from "../employees/views/AssignRoleView";

// The dashboard greeting uses the signed-in employee's own name.
const buildPageCopy = (employeeName: string) => ({
  dashboard: { title: `Hello ${employeeName.trim() || "there"} 🤗`, subtitle: "Here’s a focused operational view of Train Dabba today." },
  management: { title: "Platform Operations", subtitle: "Live oversight of customers, fleet, vendors, and station hubs." },
  employees: { title: "Team & Access Control", subtitle: "Manage staff accounts, department roles, and administrative privileges." },
  "employee-details": { title: "Staff Profile", subtitle: "Review account information, assigned responsibilities, and status." },
  "employee-activity": { title: "Employee Activity", subtitle: "See which employee performed which administrative action." },
  "assign-role": { title: "Role Privileges", subtitle: "Configure reusable roles and assign platform access." },
  profile: { title: "My Profile", subtitle: "Your account credentials, access level, and admin activity." },
});

export function App() {
  const vm = useAdminPortalViewModel();
  const pageCopy = buildPageCopy(vm.admin.name);
  if (vm.screen === "login") return <LoginView onSignIn={vm.startSession} />;
  if (vm.screen === "edit-profile") return <EditProfileView admin={vm.admin} savedMessage={vm.savedMessage} onBack={() => vm.navigate("profile")} onSave={vm.saveProfile} />;

  const shellProps = {
    screen: vm.screen, admin: vm.admin, noticeOpen: vm.noticeOpen,
    selectedManagementId: vm.selectedManagementId, selectedSubsection: vm.selectedSubsection, managementOpen: vm.managementOpen,
    onNavigate: vm.navigate, onSelectManagement: vm.selectManagementService,
    onToggleManagement: () => vm.setManagementOpen(!vm.managementOpen), onToggleNotice: () => vm.setNoticeOpen(!vm.noticeOpen),
    onQuickAddEmployee: () => vm.triggerQuickAction("add-employee"),
  };

  if (vm.screen === "employees") return <AppShell title={pageCopy.employees.title} subtitle={pageCopy.employees.subtitle} {...shellProps}>{<EmployeesView permissions={vm.admin.permissions} onOpenDetails={vm.selectEmployee} onManageRoles={() => vm.navigate("assign-role")} autoOpenCreate={vm.pendingAction === "add-employee"} onAutoOpenHandled={vm.clearPendingAction} />}</AppShell>;
  if (vm.screen === "employee-details" && vm.selectedEmployeeId) return <AppShell title={pageCopy["employee-details"].title} subtitle={pageCopy["employee-details"].subtitle} {...shellProps}>{<EmployeeDetailsView employeeId={vm.selectedEmployeeId} permissions={vm.admin.permissions} onBack={() => vm.navigate("employees")} onAssignRole={() => vm.navigate("assign-role")} />}</AppShell>;
  if (vm.screen === "employee-activity") return <AppShell title={pageCopy["employee-activity"].title} subtitle={pageCopy["employee-activity"].subtitle} {...shellProps}>{<EmployeeActivityView onBack={() => vm.navigate("employees")} />}</AppShell>;
  if (vm.screen === "assign-role") return <AppShell title={pageCopy["assign-role"].title} subtitle={pageCopy["assign-role"].subtitle} {...shellProps}>{<AssignRoleView permissions={vm.admin.permissions} onBack={() => vm.navigate("employees")} />}</AppShell>;

  const copy = pageCopy[vm.screen];
  return <AppShell title={copy.title} subtitle={copy.subtitle} {...shellProps}>
    {vm.screen === "dashboard" && <DashboardView access={vm.admin.access} onNavigateManagement={() => vm.navigate("management")} />}
    {vm.screen === "management" && <ManagementView selectedSubsection={vm.selectedSubsection} canUpdateUsers={can(vm.admin.permissions, "users", "update")} />}
    {vm.screen === "profile" && <ProfileView admin={vm.admin} onEdit={() => vm.navigate("edit-profile")} />}
  </AppShell>;
}
