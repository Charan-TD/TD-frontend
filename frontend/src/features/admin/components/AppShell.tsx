"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AdminProfile, Module, PortalSection, Screen } from "../models/portal";
import type { NavigationSectionId } from "../models/navigation";
import { navigationGroups, navigationSections, navigationSubsections } from "../models/navigation";
import { missingPermissions } from "../models/access";
import { useSidebarViewModel } from "../viewmodels/sidebarViewModel";
import { Brand } from "./Brand";
import { Icon } from "./Icon";
import { UserAvatar } from "./UserAvatar";
import { useGetRestaurantsQuery } from "../../restaurants/api/restaurantsApi";
import { useGetRidersQuery } from "../../riders/api/ridersApi";
import { useGetEmployeesQuery } from "../../employees/api/adminUsersApi";

type Props = {
  title: string; subtitle: string; screen: Screen; admin: AdminProfile; noticeOpen: boolean;
  managementServices: Module[]; selectedManagementId: string; managementOpen: boolean;
  selectedSubsection: string; onNavigate: (screen: Screen) => void;
  onSelectManagement: (serviceId: string, subsectionId?: string) => void;
  onToggleManagement: () => void; onToggleNotice: () => void; onQuickAddEmployee: () => void; children: ReactNode;
};

/**
 * A topbar quick-action button. It is ALWAYS rendered so every employee sees
 * the same shortcuts; what changes is whether it is usable:
 *  - allowed  -> normal button, runs the action
 *  - blocked  -> greyed out, the cursor becomes the "not allowed" symbol, the
 *                tooltip names the missing permission, and a click does nothing.
 * aria-disabled (rather than the disabled attribute) is used so the tooltip
 * and cursor still work on a blocked button.
 */
function QuickAction({ label, icon, missing, enabledTitle, attention = false, primary = false, onRun }: {
  label: string; icon: Parameters<typeof Icon>[0]["name"]; missing: string[]; enabledTitle: string;
  attention?: boolean; primary?: boolean; onRun: () => void;
}) {
  const blocked = missing.length > 0;

  return (
    <button
      type="button"
      className={`topbar-action-link${primary ? " topbar-action-link--primary" : ""}${blocked ? " is-disabled" : ""}`}
      aria-disabled={blocked}
      title={blocked ? `${label} is not available - you need the ${missing.join(" + ")} permission` : enabledTitle}
      onClick={() => { if (!blocked) onRun(); }}
    >
      {!blocked && attention && <span className="topbar-action-blink" aria-hidden="true" />}
      <Icon name={icon} size={14} /><span>{label}</span>
    </button>
  );
}

const screenToSection: Partial<Record<Screen, NavigationSectionId>> = { dashboard: "dashboard", management: "users", employees: "employees", "employee-details": "employees", "assign-role": "employees", "employee-activity": "employees" };

export function AppShell({ title, subtitle, screen, admin, noticeOpen, managementServices, selectedManagementId, managementOpen, selectedSubsection, onNavigate, onSelectManagement, onToggleManagement, onToggleNotice, onQuickAddEmployee, children }: Props) {
  const sidebarVm = useSidebarViewModel(screenToSection[screen] ?? "dashboard");
  const allowed = new Set<PortalSection>(admin.access);
  const sections = navigationSections.filter((item) => allowed.has(item.section));

  // What each quick action needs. Opening the target page needs `read`; the
  // action itself needs the matching write permission.
  const missingAddEmployee = missingPermissions(admin.permissions, [["employees", "read"], ["employees", "insert"]]);
  const missingApproveRestaurants = missingPermissions(admin.permissions, [["restaurants", "read"], ["restaurants", "update"]]);
  const missingApproveRiders = missingPermissions(admin.permissions, [["riders", "read"], ["riders", "update"]]);
  const missingCreateOffer = missingPermissions(admin.permissions, [["marketing", "read"], ["marketing", "insert"]]);
  const missingAddRestaurant = missingPermissions(admin.permissions, [["restaurants", "read"], ["restaurants", "insert"]]);
  const missingAddRider = missingPermissions(admin.permissions, [["riders", "read"], ["riders", "insert"]]);

  /* ---------------------------------------------------------- quick action attention
   * Blink indicators on the topbar quick-action buttons so the admin can
   * tell at a glance whether that section needs attention: restaurants or
   * riders awaiting approval, or employees with no role assigned yet.
   */
  const { data: restaurantsForAttention = [] } = useGetRestaurantsQuery(undefined, { skip: !allowed.has("restaurants") });
  const { data: ridersForAttention = [] } = useGetRidersQuery(undefined, { skip: !allowed.has("riders") });
  const { data: employeesForAttentionData } = useGetEmployeesQuery({ page: 1, limit: 100 }, { skip: !allowed.has("employees") });

  const employeesForAttention =
    employeesForAttentionData?.employees ?? [];

  const pendingRestaurantsCount = restaurantsForAttention.filter((restaurant) => String(restaurant.status).toLowerCase() === "pending").length;
  const pendingRidersCount = ridersForAttention.filter((rider) => String(rider.status).toLowerCase() === "pending").length;
  const unassignedEmployeesCount = employeesForAttention.filter((employee) => employee.role === "Unassigned").length;

  useEffect(() => {
    // Keep the independently selected management section active while the
    // shared management workspace is displayed.
    if (screen === "management") return;

    const target = screenToSection[screen] ?? "dashboard";
    if (sidebarVm.selectedSection !== target && allowed.has(target)) sidebarVm.selectSection(target);
  }, [screen, sidebarVm.selectedSection]);

  const navigateSection = (section: NavigationSectionId) => {
    if (!allowed.has(section)) return;

    const isSameSection = sidebarVm.selectedSection === section;
    if (isSameSection) sidebarVm.toggleSection(section);
    else sidebarVm.selectSection(section);

    if (section === "dashboard") onNavigate("dashboard");
    else if (section === "employees") onNavigate("employees");
    else {
      const first = navigationSubsections[section][0];
      onSelectManagement(first?.managementId ?? section, first?.id);
    }
    sidebarVm.setMobileMenuOpen(false);
  };

  const navigateSubsection = (item: (typeof sidebarVm.submenu)[number]) => {
    sidebarVm.selectSubsection(item.id);
    if (item.section === "employees") {
      onNavigate(item.id === "employees-roles" ? "assign-role" : item.id === "employees-activity" ? "employee-activity" : "employees");
    } else {
      onSelectManagement(item.managementId ?? item.section, item.id);
    }
    sidebarVm.setMobileMenuOpen(false);
  };

  const navigateManagementShortcut = (section: NavigationSectionId, subsectionId: string) => {
    if (!allowed.has(section)) return;
    sidebarVm.selectSection(section);
    onSelectManagement(section, subsectionId);
    sidebarVm.setMobileMenuOpen(false);
  };

  /* ---------------------------------------------------------- global search
   * A single search box that lets the admin jump straight to any section,
   * subsection, or common action instead of hunting through the sidebar.
   */
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const firstName = admin.name.trim().split(/\s+/)[0] || "Admin";

  type SearchResult = { id: string; label: string; group: string; icon: Parameters<typeof Icon>[0]["name"]; run: () => void };

  const searchIndex = useMemo<SearchResult[]>(() => {
    const results: SearchResult[] = [];

    sections.forEach((item) => {
      results.push({ id: `section-${item.id}`, label: item.label, group: "Go to section", icon: item.icon, run: () => navigateSection(item.section) });
      (navigationSubsections[item.section] ?? []).forEach((sub) => {
        results.push({ id: `sub-${sub.id}`, label: `${item.label} · ${sub.label}`, group: "Go to section", icon: sub.icon, run: () => navigateSubsection(sub) });
      });
    });

    // Quick actions only appear in search when the employee may actually run them.
    if (missingAddEmployee.length === 0) results.push({ id: "action-add-employee", label: "Add Employee", group: "Quick action", icon: "users", run: onQuickAddEmployee });
    if (missingAddRestaurant.length === 0) results.push({ id: "action-add-restaurant", label: "Add Restaurant", group: "Quick action", icon: "store", run: () => navigateManagementShortcut("restaurants", "restaurants-all") });
    if (missingAddRider.length === 0) results.push({ id: "action-add-rider", label: "Add Rider", group: "Quick action", icon: "rider", run: () => navigateManagementShortcut("riders", "riders-all") });
    if (missingCreateOffer.length === 0) results.push({ id: "action-create-offer", label: "Create Offer", group: "Quick action", icon: "megaphone", run: () => navigateManagementShortcut("marketing", "marketing-offers") });

    return results;
  }, [sections, onQuickAddEmployee, onSelectManagement, navigateManagementShortcut]);

  const searchResults = searchQuery.trim()
    ? searchIndex.filter((item) => item.label.toLowerCase().includes(searchQuery.trim().toLowerCase())).slice(0, 8)
    : [];

  const runSearchResult = (result: SearchResult) => {
    result.run();
    setSearchQuery("");
    setSearchOpen(false);
  };

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) setSearchOpen(false);
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setProfileMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return <div className="app-shell">
    <aside className={`sidebar ${sidebarVm.mobileMenuOpen ? "is-mobile-open" : ""}`}>
      <Brand light />
      <nav className="sidebar-nav" aria-label="Main navigation">
        {navigationGroups.map((group) => {
          const groupSections = sections.filter((item) => item.group === group.id);
          if (groupSections.length === 0) return null;

          return (
            <div className="sidebar-group" key={group.id}>
              <div className="sidebar-label">{group.label}</div>
              {groupSections.map((item) => {
                const isActive = sidebarVm.selectedSection === item.section;
                const isExpanded = sidebarVm.expandedSection === item.section;
                const submenu = navigationSubsections[item.section];
                return <div key={item.id} className="sidebar-section-group">
                  <button type="button" onClick={() => navigateSection(item.section)} className={`sidebar-link ${isActive ? "is-active" : ""}`} aria-expanded={submenu.length ? isExpanded : undefined}>
                    <Icon name={item.icon} size={17} /><span>{item.label}</span>{submenu.length > 0 && <span className="sidebar-link-chevron"><Icon name="chevron-down" size={13} /></span>}
                  </button>
                  {submenu.length > 0 && isExpanded && (
                    <div className="inline-context-sidebar">
                      <div className="context-sidebar-list">
                        {submenu.map((subItem) => (
                          <div key={subItem.id}>
                            <button type="button" className={selectedSubsection === subItem.id ? "is-selected" : ""} onClick={() => navigateSubsection(subItem)}>
                              <Icon name={subItem.icon} size={13} /><span>{subItem.label}</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>;
              })}
            </div>
          );
        })}
      </nav>
    </aside>
    <main className="app-main">
      <header className="topbar">
        <button className="mobile-menu" type="button" aria-label="Open menu" aria-expanded={sidebarVm.mobileMenuOpen} onClick={() => sidebarVm.setMobileMenuOpen((open) => !open)}><Icon name="menu" /></button>

        <div className="topbar-search" ref={searchBoxRef}>
          <Icon name="search" size={15} />
          <input
            value={searchQuery}
            onChange={(event) => { setSearchQuery(event.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Search users, restaurants, orders, riders…"
            aria-label="Search the admin portal"
          />
          {searchOpen && searchQuery.trim() && (
            <div className="topbar-search-results">
              {searchResults.length === 0 && <div className="topbar-search-empty">No matches for “{searchQuery}”.</div>}
              {searchResults.map((result) => (
                <button key={result.id} type="button" onClick={() => runSearchResult(result)}>
                  <Icon name={result.icon} size={14} />
                  <span>{result.label}</span>
                  <small>{result.group}</small>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="topbar-actions">
          <div className="topbar-action-links" aria-label="Quick actions">
            <QuickAction label="Add Employee" icon="users" missing={missingAddEmployee} attention={unassignedEmployeesCount > 0} onRun={onQuickAddEmployee}
              enabledTitle={unassignedEmployeesCount > 0 ? `Add employee (${unassignedEmployeesCount} without a role)` : "Add employee"} />
            <QuickAction label="Approve Restaurants" icon="store" missing={missingApproveRestaurants} attention={pendingRestaurantsCount > 0} onRun={() => navigateManagementShortcut("restaurants", "restaurants-approvals")}
              enabledTitle={pendingRestaurantsCount > 0 ? `Approve restaurants (${pendingRestaurantsCount} pending)` : "Approve restaurants"} />
            <QuickAction label="Approve Riders" icon="rider" missing={missingApproveRiders} attention={pendingRidersCount > 0} onRun={() => navigateManagementShortcut("riders", "riders-approvals")}
              enabledTitle={pendingRidersCount > 0 ? `Approve riders (${pendingRidersCount} pending)` : "Approve riders"} />
            <QuickAction label="Create Offer" icon="megaphone" primary missing={missingCreateOffer} onRun={() => navigateManagementShortcut("marketing", "marketing-offers")} enabledTitle="Create offer" />
          </div>

          <div className="notification-wrap"><button className="icon-button" type="button" aria-label="Notifications" onClick={onToggleNotice}><Icon name="bell" /><span className="notification-dot" /></button>{noticeOpen && <div className="notification-popover"><strong>3 items need attention</strong><span>Approvals and complaints are waiting for review.</span></div>}</div>

          <div className="topbar-profile" ref={profileRef}>
            <button type="button" className="topbar-profile-trigger" aria-label="Open my profile" aria-haspopup="menu" aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen((open) => !open)}>
              <UserAvatar name={admin.name} size="small" />
              <span className="sr-only">{firstName}</span>
            </button>
            {profileMenuOpen && (
              <div className="topbar-profile-menu" role="menu">
                <div className="topbar-profile-menu-header"><UserAvatar name={admin.name} size="medium" /><span><strong>{firstName}</strong><small>{admin.role}</small></span></div>
                <button type="button" role="menuitem" onClick={() => { setProfileMenuOpen(false); onNavigate("profile"); }}><Icon name="shield" size={14} /> My Profile</button>
                <button type="button" role="menuitem" onClick={() => { setProfileMenuOpen(false); onNavigate("edit-profile"); }}><Icon name="edit" size={14} /> Edit Profile</button>
                <button type="button" role="menuitem" className="topbar-profile-menu-signout" onClick={() => { setProfileMenuOpen(false); onNavigate("login"); }}><Icon name="logout" size={14} /> Log Out</button>
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="page-content">
        {(screen === "dashboard" || screen === "profile") && <header className="page-heading"><h1>{title}</h1><p>{subtitle}</p></header>}
        {children}
      </div>
    </main>
  </div>;
}
