"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AdminProfile, Screen } from "../models/portal";
import type { NavigationSectionId } from "../models/navigation";
import { navigationGroups, navigationSections, navigationSubsections } from "../models/navigation";
import { missingPermissions } from "../models/access";
import { noAccess } from "../models/disabledReason";
import { useSidebarViewModel } from "../viewmodels/sidebarViewModel";
import { Brand } from "./Brand";
import { SectionActionsContext } from "./SectionActions";
import { Icon } from "./Icon";
import { UserAvatar } from "./UserAvatar";
import { useGetRegistrationRequestsQuery } from "../../restaurants/api/registrationRequestsApi";
import { useGetProfileEditRequestsQuery } from "../../restaurants/api/profileEditRequestsApi";

type Props = {
  title: string; subtitle: string; screen: Screen; admin: AdminProfile; noticeOpen: boolean;
  selectedManagementId: string; managementOpen: boolean;
  selectedSubsection: string; onNavigate: (screen: Screen) => void;
  onSelectManagement: (serviceId: string, subsectionId?: string) => void;
  onToggleManagement: () => void; onToggleNotice: () => void; onQuickAddEmployee: () => void; children: ReactNode;
};

/**
 * A dashboard quick-action button. Every employee sees
 * the same shortcuts; what changes is whether it is usable:
 *  - allowed  -> normal button, runs the action
 *  - blocked  -> greyed out, the cursor becomes the "not allowed" symbol, the
 *                tooltip names the missing permission, and a click does nothing.
 * aria-disabled (rather than the disabled attribute) is used so the tooltip
 * and cursor still work on a blocked button.
 */
function QuickAction({ label, task, icon, missing, enabledTitle, attention = false, primary = false, onRun }: {
  label: string; task: string; icon: Parameters<typeof Icon>[0]["name"]; missing: string[]; enabledTitle: string;
  attention?: boolean; primary?: boolean; onRun: () => void;
}) {
  const blocked = missing.length > 0;

  return (
    <button
      type="button"
      className={`topbar-action-link${primary ? " topbar-action-link--primary" : ""}${blocked ? " is-disabled" : ""}`}
      aria-disabled={blocked}
      data-tooltip={blocked ? noAccess(task) : enabledTitle}
      data-tooltip-kind={blocked ? "access" : undefined}
      data-tooltip-icon={blocked ? undefined : icon}
      onClick={() => { if (!blocked) onRun(); }}
    >
      {attention && <span className="topbar-action-blink" aria-hidden="true" />}
      <Icon name={icon} size={14} /><span>{label}</span>
    </button>
  );
}

const screenToSection: Partial<Record<Screen, NavigationSectionId>> = { dashboard: "dashboard", management: "users", employees: "employees", "employee-details": "employees", "assign-role": "employees", "employee-activity": "employees" };
const screenToEmployeeSubsection: Partial<Record<Screen, string>> = { employees: "employees-all", "employee-details": "employees-all", "assign-role": "employees-roles", "employee-activity": "employees-activity" };

const managementPageCopy: Record<string, { title: string; subtitle: string }> = {
  "users-all": { title: "Customer Accounts & Access", subtitle: "Manage registered customers and review their account status." },
  "users-complaints": { title: "Customer Complaints & Resolution", subtitle: "Review and track issues reported by customers." },
  "users-activity": { title: "Customer Activity & Engagement", subtitle: "View customer engagement and activity across the platform." },
  "restaurants-all": { title: "Restaurant Partners & Operations", subtitle: "Manage restaurant profiles, availability, and account status." },
  "restaurants-performance": { title: "Restaurant Performance & Service", subtitle: "Monitor restaurant service and performance information." },
  "restaurants-approvals": { title: "Restaurant Applications & Approvals", subtitle: "Review restaurant applications and profile changes." },
  "restaurants-complaints": { title: "Restaurant Complaints & Resolution", subtitle: "Review and track issues reported about restaurants." },
  "riders-all": { title: "Delivery Team Management", subtitle: "Manage riders, station handlers, and their assignments." },
  "riders-handlers": { title: "Delivery Team Management", subtitle: "Manage riders, station handlers, and their assignments." },
  "riders-approvals": { title: "Rider Applications & Verification", subtitle: "Review rider applications and verification details." },
  "riders-blocked": { title: "Rider Access & Restrictions", subtitle: "Review rider accounts that are unavailable for deliveries." },
  "riders-complaints": { title: "Delivery Complaints & Resolution", subtitle: "Review and track issues reported about riders." },
  "orders-all": { title: "Order Management & Tracking", subtitle: "Review orders across stations, restaurants, and trains." },
  "orders-active": { title: "Active Orders & Delivery Tracking", subtitle: "Track orders currently moving through the delivery process." },
  "orders-delivered": { title: "Delivered Orders", subtitle: "Review orders that have been delivered." },
  "orders-cancelled": { title: "Order Cancellations & Review", subtitle: "Review orders that were cancelled." },
  "grouporders-all": { title: "Group Order Management", subtitle: "Review customer requests and manage restaurant assignments." },
  "stations-all": { title: "Station Network & Operations", subtitle: "Manage station records and their active status." },
  "stations-performance": { title: "Station Performance & Deliveries", subtitle: "Track order activity and delivery progress by station." },
  "sales-all": { title: "Payments & Transactions", subtitle: "View and manage all payments, settlements and transactions across the platform." },
  "sales-payouts": { title: "Payments & Transactions", subtitle: "View and manage all payments, settlements and transactions across the platform." },
  "sales-settlements": { title: "Payments & Transactions", subtitle: "View and manage all payments, settlements and transactions across the platform." },
  "sales-refunds": { title: "Payments & Transactions", subtitle: "View and manage all payments, settlements and transactions across the platform." },
  "marketing-offers": { title: "Promotional Offers & Discounts", subtitle: "Create and manage promotional offers for customers." },
  "marketing-coupons": { title: "Coupon Codes & Promotions", subtitle: "Create and manage customer discount codes." },
  "marketing-campaigns": { title: "Marketing Campaigns & Outreach", subtitle: "Manage promotional campaigns across the platform." },
  "marketing-analytics": { title: "Marketing Performance & Analytics", subtitle: "Review campaign and promotion performance." },
  "reports-sales": { title: "Sales & Revenue Reports", subtitle: "Review sales and revenue reporting." },
  "reports-orders": { title: "Order Trends & Fulfillment Reports", subtitle: "Review order volume and fulfillment reporting." },
  "reports-users": { title: "Customer Growth & Activity Reports", subtitle: "Review customer account and activity reporting." },
  "reports-operations": { title: "Platform Operations & Reports", subtitle: "Review activity across the platform’s operational sections." },
};

export function AppShell({ title, subtitle, screen, admin, noticeOpen, selectedManagementId, managementOpen, selectedSubsection, onNavigate, onSelectManagement, onToggleManagement, onToggleNotice, onQuickAddEmployee, children }: Props) {
  const [sectionActionsHost, setSectionActionsHost] = useState<HTMLDivElement | null>(null);
  const sidebarVm = useSidebarViewModel(screenToSection[screen] ?? "dashboard");
  const allowed = new Set<NavigationSectionId>(admin.access);
  // Group orders use the existing Orders API permissions, with their own navigation.
  if (allowed.has("orders")) allowed.add("grouporders");
  const sections = navigationSections.filter((item) => allowed.has(item.section));

  // What each quick action needs. Opening the target page needs `read`; the
  // action itself needs the matching write permission.
  const missingAddEmployee = missingPermissions(admin.permissions, [["employees", "read"], ["employees", "insert"]]);
  const missingApproveRestaurants = missingPermissions(admin.permissions, [["restaurants", "read"], ["restaurants", "update"]]);
  const missingPayments = missingPermissions(admin.permissions, [["sales", "read"]]);
  const missingCreateOffer = missingPermissions(admin.permissions, [["marketing", "read"], ["marketing", "insert"]]);
  const missingAddRestaurant = missingPermissions(admin.permissions, [["restaurants", "read"], ["restaurants", "insert"]]);

  /* ---------------------------------------------------------- quick action attention
   * Blink indicators on the topbar quick-action buttons so the admin can
   * tell at a glance whether that section needs attention: restaurants or
   * riders awaiting approval, or employees with no role assigned yet.
   */
  // Restaurants awaiting approval = new registrations + profile edits waiting for review.
  const { data: pendingRegistrations = [] } = useGetRegistrationRequestsQuery("pending", { skip: !allowed.has("restaurants") });
  const { data: pendingProfileEdits = [] } = useGetProfileEditRequestsQuery("pending", { skip: !allowed.has("restaurants") });

  const pendingRestaurantsCount = pendingRegistrations.length + pendingProfileEdits.length;

  useEffect(() => {
    // The management workspace can be opened from outside the sidebar (the
    // dashboard cards), so follow the chosen subsection to highlight its section.
    if (screen === "management") {
      const owner = (Object.keys(navigationSubsections) as NavigationSectionId[]).find((id) => navigationSubsections[id].some((sub) => sub.id === selectedSubsection))
        ?? navigationSections.find((item) => item.section === selectedSubsection.split("-")[0])?.section;
      if (owner && owner !== sidebarVm.selectedSection && allowed.has(owner)) {
        sidebarVm.selectSection(owner);
        sidebarVm.selectSubsection(selectedSubsection);
      }
      return;
    }

    const target = screenToSection[screen] ?? "dashboard";
    if (sidebarVm.selectedSection !== target && allowed.has(target)) sidebarVm.selectSection(target);
  }, [screen, sidebarVm.selectedSection, selectedSubsection]);

  // Employee pages are separate screens rather than management subsections,
  // so their highlighted submenu item follows the current screen.
  const activeSubsection = screenToEmployeeSubsection[screen] ?? selectedSubsection;

  const navigateSection = (section: NavigationSectionId) => {
    if (!allowed.has(section)) return;

    const isSameSection = sidebarVm.selectedSection === section;
    if (isSameSection) sidebarVm.toggleSection(section);
    else sidebarVm.selectSection(section);

    if (section === "dashboard") onNavigate("dashboard");
    else if (section === "employees") onNavigate("employees");
    else if (section === "grouporders") onSelectManagement("grouporders", "grouporders-all");
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
  const todayLabel = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const firstName =admin.name.trim().split(/\s+/)[0] || "Admin";
  const activeSection = sections.find((item) => selectedSubsection.startsWith(`${item.id}-`));
  const managementCopy = screen === "management" ? managementPageCopy[selectedSubsection] : undefined;
  const toolbarTitle = screen === "management" ? managementCopy?.title ?? activeSection?.label ?? title : title;

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

  return <SectionActionsContext.Provider value={sectionActionsHost}><div className="app-shell">
    <aside className={`sidebar ${sidebarVm.mobileMenuOpen ? "is-mobile-open" : ""}`}>
      <Brand />
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
                            <button type="button" className={activeSubsection === subItem.id ? "is-selected" : ""} onClick={() => navigateSubsection(subItem)}>
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
      <div className="sidebar-footer" ref={profileRef}>
        {profileMenuOpen && (
          <div className="settings-menu" role="menu">
            <div className="settings-menu-header"><UserAvatar name={admin.name} imageUrl={admin.imageUrl} size="medium" /><span><strong>{firstName}</strong><small>{admin.role}</small></span></div>
            <button type="button" role="menuitem" onClick={() => { setProfileMenuOpen(false); sidebarVm.setMobileMenuOpen(false); onNavigate("profile"); }}><Icon name="shield" size={14} /> Profile</button>
            <button type="button" role="menuitem" onClick={() => { setProfileMenuOpen(false); sidebarVm.setMobileMenuOpen(false); onNavigate("edit-profile"); }}><Icon name="edit" size={14} /> Edit Profile</button>
            <button type="button" role="menuitem" className="settings-menu-signout" onClick={() => { setProfileMenuOpen(false); onNavigate("login"); }}><Icon name="logout" size={14} /> Log Out</button>
          </div>
        )}
        <button type="button" className={"sidebar-link" + (profileMenuOpen ? " is-active" : "")} aria-haspopup="menu" aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen((open) => !open)}>
          <Icon name="settings" size={17} /><span>Settings</span><span className="sidebar-link-chevron"><Icon name="chevron-down" size={13} /></span>
        </button>
      </div>
    </aside>
    <main className={`app-main${screen === "dashboard" ? " app-main--dashboard" : ""}`}>
      <header className={`page-toolbar${screen === "dashboard" ? "" : " page-toolbar--section"}`}>
        <div className="page-toolbar-lead">
          <button className="mobile-menu" type="button" aria-label="Open menu" aria-expanded={sidebarVm.mobileMenuOpen} onClick={() => sidebarVm.setMobileMenuOpen((open) => !open)}><Icon name="menu" /></button>
          {screen === "dashboard" ? <div className="page-toolbar-greeting"><h1>{title}</h1><p>{todayLabel}</p></div> : <div className="page-toolbar-greeting page-toolbar-section-heading"><h1>{toolbarTitle}</h1>{selectedSubsection.startsWith("sales-") && screen === "management" && <p>{managementCopy?.subtitle}</p>}</div>}
        </div>

        {screen === "dashboard" && (
          <div className="topbar-search" ref={searchBoxRef}>
            <Icon name="search" size={15} />
            <input
              value={searchQuery}
              onChange={(event) => { setSearchQuery(event.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search"
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
        )}

        <div className="topbar-actions">
          {screen === "dashboard" ? <div className="topbar-action-links" aria-label="Quick actions">
            <QuickAction label="Payments" task="view payments" icon="wallet" missing={missingPayments} onRun={() => navigateManagementShortcut("sales", "sales-all")} enabledTitle="View payments and transactions" />
            <QuickAction label="Approve Restaurants" task="approve restaurants" icon="store" missing={missingApproveRestaurants} attention={pendingRestaurantsCount > 0} onRun={() => navigateManagementShortcut("restaurants", "restaurants-approvals")}
              enabledTitle={pendingRestaurantsCount > 0 ? `${pendingRestaurantsCount} ${pendingRestaurantsCount === 1 ? "restaurant is" : "restaurants are"} waiting for approval` : "No restaurants are waiting for approval"} />
            <QuickAction label="Create Offer" task="create offers" icon="megaphone" primary missing={missingCreateOffer} onRun={() => navigateManagementShortcut("marketing", "marketing-offers")} enabledTitle="Create a new offer for customers" />
          </div> : <div className="section-actions-host" ref={setSectionActionsHost} aria-label="Section actions" />}

          <div className="notification-wrap"><button className="icon-button" type="button" aria-label="Notifications" onClick={onToggleNotice}><Icon name="bell" /></button>{noticeOpen && <div className="notification-popover"><strong>No notifications</strong><span>You’re all caught up.</span></div>}</div>
        </div>
      </header>
      <div className="page-content">
        {children}
      </div>
    </main>
  </div></SectionActionsContext.Provider>;
}
