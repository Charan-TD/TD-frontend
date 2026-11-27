"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AdminProfile, Screen } from "../models/portal";
import type { NavigationSectionId } from "../models/navigation";
import { navigationSections, navigationSubsections } from "../models/navigation";
import { missingPermissions } from "../models/access";
import { noAccess } from "../models/disabledReason";
import { useSidebarViewModel } from "../viewmodels/sidebarViewModel";
import { NotificationsPanel } from "./NotificationsPanel";
import { useNotifications } from "./useNotifications";
import { SectionActionsContext, SectionSearchContext } from "./SectionActions";
import { Icon } from "./Icon";
import { UserAvatar } from "./UserAvatar";

type Props = {
  title: string; subtitle: string; screen: Screen; admin: AdminProfile; noticeOpen: boolean;
  selectedManagementId: string; managementOpen: boolean;
  selectedSubsection: string; onNavigate: (screen: Screen) => void;
  onSelectManagement: (serviceId: string, subsectionId?: string) => void;
  onToggleManagement: () => void; onToggleNotice: () => void; onQuickAddEmployee: () => void; children: ReactNode;
};

/**
 * A topbar shortcut. Every employee sees the same shortcuts; what changes is
 * whether it is usable:
 *  - allowed  -> normal button, runs the action
 *  - blocked  -> greyed out, the tooltip names the missing permission, and a click does nothing.
 * aria-disabled (rather than the disabled attribute) keeps the tooltip working.
 */
function QuickAction({ label, task, icon, missing, enabledTitle, count = 0, primary = false, onRun }: {
  label: string; task: string; icon: Parameters<typeof Icon>[0]["name"]; missing: string[]; enabledTitle: string;
  count?: number; primary?: boolean; onRun: () => void;
}) {
  const blocked = missing.length > 0;

  return (
    <button
      type="button"
      className={`td-top-btn${primary ? " td-top-btn--primary" : ""}${blocked ? " is-disabled" : ""}`}
      aria-disabled={blocked}
      data-tooltip={blocked ? noAccess(task) : enabledTitle}
      data-tooltip-kind={blocked ? "access" : undefined}
      onClick={() => { if (!blocked) onRun(); }}
    >
      {primary ? <Icon name={icon} size={14} stroke={2.4} /> : <Icon name={icon} size={16} />}<span>{label}</span>
      {count > 0 && <b className="td-top-count">{count}</b>}
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
  "restaurants-menu": { title: "Recommended Menu", subtitle: "Suggest categories and items restaurants can add to their menu." },
  "restaurants-approvals": { title: "Restaurant Applications & Approvals", subtitle: "Review restaurant applications, profile changes and review replies." },
  "riders-all": { title: "Delivery Team Management", subtitle: "Manage riders, station handlers, and their assignments." },
  "riders-handlers": { title: "Delivery Team Management", subtitle: "Manage riders, station handlers, and their assignments." },
  "riders-approvals": { title: "Rider Applications & Verification", subtitle: "Review rider applications and verification details." },
  "riders-blocked": { title: "Rider Access & Restrictions", subtitle: "Review rider accounts that are unavailable for deliveries." },
  "riders-complaints": { title: "Delivery Complaints & Resolution", subtitle: "Review and track issues reported about riders." },
  "orders-all": { title: "Order Management & Tracking", subtitle: "Review orders across stations, restaurants, and trains." },
  "orders-active": { title: "Active Orders & Delivery Tracking", subtitle: "Track orders currently moving through the delivery process." },
  "orders-delivered": { title: "Delivered Orders", subtitle: "Review orders that have been delivered." },
  "orders-cancelled": { title: "Order Cancellations & Review", subtitle: "Review orders that were cancelled." },
  "feedback-reviews": { title: "Customer Reviews & Ratings", subtitle: "See what customers say about restaurants and deliveries." },
  "feedback-replies": { title: "Restaurant Reply Approvals", subtitle: "Approve or reject restaurant replies before customers see them." },
  "feedback-ratings": { title: "Restaurant & Menu Ratings", subtitle: "Average ratings and review counts for restaurants and menu items." },
  "restaurants-qty": { title: "Quantity Types", subtitle: "Manage the portion sizes every restaurant can choose from." },
  "feedback-complaints": { title: "Complaints & Resolution", subtitle: "Review and reply to complaints from customers and restaurants." },
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
  "reports-restaurants": { title: "Restaurant Performance", subtitle: "Orders, sales and ratings for every restaurant." },
  "reports-stations": { title: "Station Performance", subtitle: "Review order activity by station." },
  "reports-marketing": { title: "Marketing Performance", subtitle: "Review campaign and promotion performance." },
};

export function AppShell({ title, screen, admin, noticeOpen, selectedSubsection, onNavigate, onSelectManagement, onToggleNotice, onQuickAddEmployee, children }: Props) {
  const [sectionActionsHost, setSectionActionsHost] = useState<HTMLDivElement | null>(null);
  const [sectionSearchHost, setSectionSearchHost] = useState<HTMLDivElement | null>(null);
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
  // Approvals badge, bell dot and the notifications drawer all read from the same data.
  const notifications = useNotifications((section) => (allowed as Set<string>).has(section));


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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Keeps the sidebar in sync with the screen; sidebarVm/allowed change identity every render and would loop.
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
    else if (!navigationSubsections[section].length) onSelectManagement(section, `${section}-all`);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Quick-action availability is derived from the omitted values on every render; only the listed inputs should rebuild this list.
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

  const isDashboard = screen === "dashboard";
  const bellDot = notifications.unreadCount > 0;

  return <SectionActionsContext.Provider value={sectionActionsHost}><SectionSearchContext.Provider value={sectionSearchHost}><div className="td-shell app-shell">
    <aside className={`td-sidebar ${sidebarVm.mobileMenuOpen ? "is-mobile-open" : ""}`}>
      <div className="td-brand">
        <svg width="26" height="32" viewBox="0 0 26 32" aria-hidden="true"><path d="M13 0C5.8 0 0 5.6 0 12.6 0 22 13 32 13 32s13-10 13-19.4C26 5.6 20.2 0 13 0Z" fill="#fa8a1b"/><rect x="6.5" y="6.5" width="13" height="11" rx="2.6" fill="none" stroke="#fff" strokeWidth="1.8"/><path d="M6.5 12h13M10 20l-1.6 2.2M16 20l1.6 2.2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>
        <span><b>TRAIN</b><b>DHABA</b></span>
      </div>
      <nav className="td-nav" aria-label="Main navigation">
        {sections.map((item) => {
          const isActive = sidebarVm.selectedSection === item.section;
          const isExpanded = sidebarVm.expandedSection === item.section;
          const submenu = navigationSubsections[item.section];
          return <div key={item.id}>
            <button type="button" onClick={() => navigateSection(item.section)} className={`td-nav-item${isActive ? " is-active" : ""}`} aria-expanded={submenu.length ? isExpanded : undefined} aria-current={isActive ? "page" : undefined}>
              <Icon name={item.icon} size={16} /><span>{item.label}</span>{submenu.length > 0 && <span className="td-nav-chevron"><Icon name="chevron-down" size={13} /></span>}
            </button>
            {submenu.length > 0 && isExpanded && (
              <div className="td-subnav">
                {submenu.map((subItem) => (
                  <button key={subItem.id} type="button" className={activeSubsection === subItem.id ? "is-selected" : ""} onClick={() => navigateSubsection(subItem)}><Icon name={subItem.icon} size={13} /><span>{subItem.label}</span></button>
                ))}
              </div>
            )}
          </div>;
        })}
        <div className="td-nav-settings" ref={profileRef}>
          {profileMenuOpen && (
            <div className="td-popmenu" role="menu">
              <div className="td-popmenu-head"><UserAvatar name={admin.name} imageUrl={admin.imageUrl} size="medium" /><span><strong>{firstName}</strong><small>{admin.role}</small></span></div>
              <button type="button" role="menuitem" onClick={() => { setProfileMenuOpen(false); sidebarVm.setMobileMenuOpen(false); onNavigate("profile"); }}><Icon name="shield" size={14} /> Profile</button>
              <button type="button" role="menuitem" onClick={() => { setProfileMenuOpen(false); sidebarVm.setMobileMenuOpen(false); onNavigate("edit-profile"); }}><Icon name="edit" size={14} /> Edit Profile</button>
            </div>
          )}
          <button type="button" className={"td-nav-item" + (profileMenuOpen ? " is-active" : "")} aria-haspopup="menu" aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen((open) => !open)}>
            <Icon name="settings" size={16} /><span>Settings</span>
          </button>
        </div>
      </nav>
      <div className="td-sidebar-foot">
        <button type="button" className="td-logout" onClick={() => onNavigate("login")}><Icon name="logout" size={16} /><span>Log Out</span></button>
      </div>
    </aside>
    {sidebarVm.mobileMenuOpen && <div className="td-scrim" onClick={() => sidebarVm.setMobileMenuOpen(false)} aria-hidden="true" />}
    <main className={`td-main app-main${isDashboard ? " app-main--dashboard" : ""}`}>
      <header className={`td-topbar${isDashboard ? "" : " td-topbar--section"}`}>
        <button className="td-menu-btn" type="button" aria-label="Open menu" aria-expanded={sidebarVm.mobileMenuOpen} onClick={() => sidebarVm.setMobileMenuOpen((open) => !open)}><Icon name="menu" /></button>
        {isDashboard ? (
          <div className="td-search" ref={searchBoxRef}>
            <input
              value={searchQuery}
              onChange={(event) => { setSearchQuery(event.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search here"
              aria-label="Search the admin portal"
            />
            <Icon name="search" size={15} />
            {searchOpen && searchQuery.trim() && (
              <div className="td-search-results">
                {searchResults.length === 0 && <div className="td-search-empty">No matches for “{searchQuery}”.</div>}
                {searchResults.map((result) => (
                  <button key={result.id} type="button" onClick={() => runSearchResult(result)}>
                    <Icon name={result.icon} size={14} /><span>{result.label}</span><small>{result.group}</small>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <><div className="td-search-host" ref={setSectionSearchHost} /><div className="td-topbar-title"><h1>{toolbarTitle}</h1>{selectedSubsection.startsWith("sales-") && screen === "management" && <p>{managementCopy?.subtitle}</p>}</div></>
        )}

        <div className="td-topbar-actions">
          {isDashboard ? <>
            <QuickAction label="Approvals" task="approve restaurants" icon="store" missing={missingApproveRestaurants} count={notifications.pendingApprovals} onRun={() => navigateManagementShortcut("restaurants", "restaurants-approvals")}
              enabledTitle={notifications.pendingApprovals > 0 ? `${notifications.pendingApprovals} waiting for approval` : "Nothing is waiting for approval"} />
            <QuickAction label="Payments" task="view payments" icon="wallet" missing={missingPayments} onRun={() => navigateManagementShortcut("sales", "sales-all")} enabledTitle="View payments and transactions" />
            <QuickAction label="Create offer" task="create offers" icon="plus" primary missing={missingCreateOffer} onRun={() => navigateManagementShortcut("marketing", "marketing-offers")} enabledTitle="Create a new offer for customers" />
          </> : <div className="section-actions-host" ref={setSectionActionsHost} aria-label="Section actions" />}
          <button className="td-bell" type="button" aria-label={bellDot ? `Notifications, ${notifications.unreadCount} unread` : "Notifications"} aria-expanded={noticeOpen} onClick={onToggleNotice}><Icon name="bell" size={17} />{bellDot && <i />}</button>
        </div>
      </header>
      <div className="page-content td-content">
        {children}
      </div>
    </main>
    {noticeOpen && <NotificationsPanel state={notifications} onClose={onToggleNotice} onOpen={(section, subsection) => navigateManagementShortcut(section as NavigationSectionId, subsection ?? section)} />}
  </div></SectionSearchContext.Provider></SectionActionsContext.Provider>;
}
