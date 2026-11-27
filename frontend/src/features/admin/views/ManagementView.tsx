"use client";

import { useState } from "react";

import type { CustomerUser } from "../models/customerUser";

import { TransientSuccessMessage } from "../components/TransientSuccessMessage";
import { StatusTabs } from "../components/StatusTabs";
import { UserDetailsPanel } from "./UserDetailsPanel";
import { UserActivityView } from "./UserActivityView";
import { ComplaintsView } from "./ComplaintsView";
import { setActivityFocus } from "../viewmodels/activityFocus";
import { PayoutsScreen, RefundsScreen, SettlementsScreen, TransactionsScreen } from "../../payments/views/PaymentScreens";
import { SectionSearch } from "../components/SectionActions";
import { PageFooter } from "../components/PageFooter";
import { InitialsAvatar } from "../components/InitialsAvatar";
import { StatusSwitch } from "../components/StatusSwitch";
import { SkeletonTable } from "../components/Skeleton";
import { noAccess } from "../models/disabledReason";

import {
  isUserBlocked,
  useUsersViewModel,
} from "../viewmodels/usersViewModel";


import type { Restaurant } from "../../restaurants/api/restaurantsApi";
import { RestaurantListView } from "./RestaurantListView";
import { RestaurantPerformanceView } from "./RestaurantPerformanceView";
import { RecommendedMenuView } from "./RecommendedMenuView";
import { RestaurantApprovalsView } from "./RestaurantApprovalsView";
import { RestaurantDetailsView } from "./RestaurantDetailsView";
import { OrdersView } from "../../orders/views/OrdersView";
import { GroupOrdersView } from "../../orders/views/GroupOrdersView";
import { DeliveryPartnersView } from "../../riders/views/DeliveryPartnersView";
import { StationsView } from "../../stations/views/StationsView";
import { StationPerformanceView } from "../../stations/views/StationPerformanceView";
import { OperationsAnalyticsView, OrdersAnalyticsView, SalesAnalyticsView, UsersAnalyticsView } from "../../analytics/views/AnalyticsViews";
import { FeedbackComplaintsView, ReviewsView } from "../../feedback/FeedbackViews";
import { RatingsView } from "../../feedback/RatingsView";
import { ReplyModerationView } from "../../feedback/ReplyModerationView";
import { QtyTypesView } from "../../restaurants/views/QtyTypesView";
import { CampaignsView } from "../../marketing/views/CampaignsView";
import { MarketingPerformanceView } from "../../marketing/views/MarketingPerformanceView";
import { OffersView } from "../../marketing/views/OffersView";

type Props = {
  selectedSubsection: string;
  onSelectSubsection: (subsection: string) => void;
  /** Whether the signed-in person may block / unblock users. */
  canUpdateUsers: boolean;
  /** What the signed-in person may do with stations. */
  stationAccess: { insert: boolean; update: boolean };
  /** Whether the signed-in person may add restaurant categories. */
  canAddRestaurantCategory: boolean;
  canBlockRestaurants: boolean;
  canUnblockRestaurants: boolean;
  canAssignGroupOrders: boolean;
  /** Whether the signed-in person may approve or reject restaurant replies to reviews. */
  canModerateReplies: boolean;
  /** Whether the signed-in person may add, edit or delete shared quantity types. */
  canEditQtyTypes: boolean;
};

export function ManagementView({
  selectedSubsection,
  onSelectSubsection,
  canUpdateUsers,
  stationAccess,
  canAddRestaurantCategory,
  canBlockRestaurants,
  canUnblockRestaurants,
  canAssignGroupOrders,
  canModerateReplies,
  canEditQtyTypes,
}: Props) {
  const section =
    selectedSubsection.split("-")[0] || "users";

  if (section === "users") {
    return (
      <UsersWorkspace
        onSelectSubsection={onSelectSubsection}
        subsection={selectedSubsection as UserWorkspaceMap}
        canUpdateUsers={canUpdateUsers}
      />
    );
  }

  if (section === "riders") {
    return (
      <DeliveryPartnersView
        subsection={selectedSubsection}
        onSelectSubsection={onSelectSubsection}
      />
    );
  }

  if (section === "restaurants") {
    return (
      <RestaurantWorkspace
        canModerateReplies={canModerateReplies}
        subsection={selectedSubsection}
        onSelectSubsection={onSelectSubsection}
        canAddCategory={canAddRestaurantCategory}
        canBlockRestaurants={canBlockRestaurants}
        canUnblockRestaurants={canUnblockRestaurants}
        canEditQtyTypes={canEditQtyTypes}
      />
    );
  }

  if (section === "grouporders") return <GroupOrdersView canAssign={canAssignGroupOrders} />;

  if (section === "orders") {
    return (
      <OrdersView />
    );
  }

  if (section === "sales") {
    if (selectedSubsection === "sales-payouts") return <PayoutsScreen />;
    if (selectedSubsection === "sales-settlements") return <SettlementsScreen />;
    if (selectedSubsection === "sales-refunds") return <RefundsScreen />;
    return <TransactionsScreen />;
  }

  if (section === "stations") {
    return (
      <StationsView
        canInsert={stationAccess.insert}
        canUpdate={stationAccess.update}
      />
    );
  }

  if (section === "feedback") {
    if (selectedSubsection === "feedback-replies") return <ReplyModerationView canModerate={canModerateReplies} />;
    if (selectedSubsection === "feedback-ratings") return <RatingsView />;
    return selectedSubsection === "feedback-complaints" ? <FeedbackComplaintsView /> : <ReviewsView />;
  }

  if (section === "marketing") {
    return (
      <MarketingWorkspace
        subsection={selectedSubsection}
      />
    );
  }

  if (section === "reports") {
    return (
      <ReportsWorkspace
        subsection={selectedSubsection}
      />
    );
  }

  return (
    <section className="management-hero">
      <div>
        <h2>Management</h2>
        <p>Operational workspace</p>
      </div>
    </section>
  );
}

type UserWorkspaceMap =
  | "users-all"
  | "users-blocked"
  | "users-complaints"
  | "users-activity";

function UsersWorkspace({
  subsection,
  canUpdateUsers,
  onSelectSubsection,
}: {
  onSelectSubsection: (subsection: string) => void;
  subsection: UserWorkspaceMap;
  canUpdateUsers: boolean;
}) {
  if (subsection === "users-complaints") return <ComplaintsView />;
  if (subsection === "users-activity") return <UserActivityView />;

  return (
    <UsersTable
      onSelectSubsection={onSelectSubsection}
      blockedOnly={subsection === "users-blocked"}
      canUpdateUsers={canUpdateUsers}
    />
  );
}

function UsersTable({
  blockedOnly,
  canUpdateUsers,
  onSelectSubsection,
}: {
  onSelectSubsection: (subsection: string) => void;
  blockedOnly: boolean;
  canUpdateUsers: boolean;
}) {
  const blockUserHint = (user: CustomerUser) =>
    noAccess(isUserBlocked(user) ? "unblock users" : "block users");

  const [userFilter, setUserFilter] = useState<"all" | "active" | "blocked">(blockedOnly ? "blocked" : "all");
  const vm = useUsersViewModel(userFilter);

  const joined = (value: string | null | undefined) => {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime()) ? `Joined ${date.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}` : null;
  };

  return (
    <section className="td-page">
      <SectionSearch value={vm.search} onChange={vm.onSearch} placeholder="Search users by name, phone or email" />
      <TransientSuccessMessage message={vm.successMessage} />

      {vm.errorMessage && <div className="api-state api-state--error">{vm.errorMessage}</div>}

      <div className={"td-table-card" + (vm.isFetching ? " is-refreshing" : "")}>
        <div className="td-table-card-head">
          <h3>User List</h3>
          <StatusTabs placement="inline" label="Filter users by status" value={userFilter} onChange={(value) => { vm.onSearch(vm.search); setUserFilter(value as "all" | "active" | "blocked"); }}
            tabs={[{ id: "all", label: "All", count: vm.userCounts.all }, { id: "active", label: "Active", count: vm.userCounts.active }, { id: "blocked", label: "Blocked", count: vm.userCounts.blocked }]} />
        </div>

        {vm.isLoading && <SkeletonTable columns={["Customer", "Phone", "Email", "Status"]} />}
        {vm.isError && <div className="api-state api-state--error">Unable to load users. Check the API connection and refresh.</div>}

        {!vm.isLoading && !vm.isError && (
          <>
            <div className="td-table-scroll">
              <table className="td-table">
                <thead>
                  <tr><th>Customer</th><th>Phone</th><th>Email</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {vm.users.map((user) => (
                    <tr
                      key={user.customer_id || user.id}
                      className="is-clickable"
                      tabIndex={0}
                      aria-label={`Open details for ${user.full_name || "user"}`}
                      onClick={() => vm.setSelectedUser(user)}
                      onKeyDown={(event) => {
                        if ((event.key === "Enter" || event.key === " ") && event.target === event.currentTarget) {
                          event.preventDefault();
                          vm.setSelectedUser(user);
                        }
                      }}
                    >
                      <td>
                        <div className="td-member">
                          <InitialsAvatar name={user.full_name} imageUrl={user.profile_image_url} size={36} />
                          <span><strong>{user.full_name ?? "Unnamed user"}</strong><small>{joined(user.created_at) ?? `ID ${user.customer_id || user.id}`}</small></span>
                        </div>
                      </td>
                      <td className="td-muted">{user.phone ?? "-"}</td>
                      <td className="td-muted">{user.email ?? "-"}</td>
                      <td>
                        <StatusSwitch
                          checked={!isUserBlocked(user)}
                          onLabel="Active"
                          offLabel="Blocked"
                          label={`${isUserBlocked(user) ? "Unblock" : "Block"} ${user.full_name || "user"}`}
                          disabled={!canUpdateUsers || vm.isUpdating}
                          tooltip={!canUpdateUsers ? blockUserHint(user) : vm.isUpdating ? "Please wait, another user's status is being updated" : undefined}
                          tooltipKind={canUpdateUsers ? undefined : "access"}
                          onChange={() => vm.toggleBlock(user)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!vm.users.length && <div className="api-state">No users found.</div>}
            </div>

            {vm.users.length > 0 && <PageFooter page={vm.page} totalPages={vm.totalPages} total={vm.totalUsers} pageSize={vm.pageSize} shown={vm.users.length} noun="users" onChange={vm.setPage} disabled={vm.isFetching} />}
          </>
        )}
      </div>

      {vm.selectedUser && (
        <UserDetailsPanel
          user={vm.selectedUser}
          onClose={() =>
            vm.setSelectedUser(null)
          }
          onToggleBlock={() =>
            vm.toggleBlock(vm.selectedUser!)
          }
          onViewActivity={() => { setActivityFocus(vm.selectedUser!.id); onSelectSubsection("users-activity"); }}
          onViewAllOrders={() => onSelectSubsection("orders-all")}
          isUpdating={vm.isUpdating}
          canUpdate={canUpdateUsers}
          successMessage={vm.successMessage}
        />
      )}
    </section>
  );
}

function MarketingWorkspace({ subsection }: { subsection: string }) {
  if (subsection === "marketing-campaigns") return <CampaignsView />;
  if (subsection === "marketing-coupons") return <OffersView kind="coupon" />;
  return <OffersView />;
}

function ReportsWorkspace({ subsection }: { subsection: string }) {
  if (subsection === "reports-orders") return <OrdersAnalyticsView />;
  if (subsection === "reports-users") return <UsersAnalyticsView />;
  if (subsection === "reports-operations") return <OperationsAnalyticsView />;
  if (subsection === "reports-restaurants") return <RestaurantPerformanceView />;
  if (subsection === "reports-stations") return <StationPerformanceView />;
  if (subsection === "reports-marketing") return <MarketingPerformanceView />;
  return <SalesAnalyticsView />;
}

function RestaurantWorkspace({
  subsection,
  onSelectSubsection,
  canAddCategory,
  canBlockRestaurants,
  canUnblockRestaurants,
  canEditQtyTypes,
  canModerateReplies,
}: {
  subsection: string;
  onSelectSubsection: (subsection: string) => void;
  canModerateReplies: boolean;
  canAddCategory: boolean;
  canBlockRestaurants: boolean;
  canUnblockRestaurants: boolean;
  canEditQtyTypes: boolean;
}) {
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);

  const [restaurantSubsection, setRestaurantSubsection] = useState(subsection);
  if (restaurantSubsection !== subsection) {
    setRestaurantSubsection(subsection);
    setSelectedRestaurant(null);
  }

  if (subsection === "restaurants-approvals") {
    return <RestaurantApprovalsView canModerateReplies={canModerateReplies} />;
  }

  if (subsection === "restaurants-menu") {
    return <RecommendedMenuView canAddCategory={canAddCategory} />;
  }

  if (subsection === "restaurants-qty") {
    return <QtyTypesView canEdit={canEditQtyTypes} />;
  }

  if (selectedRestaurant) {
    return (
      <RestaurantDetailsView
        restaurantId={selectedRestaurant.id}
        restaurantName={selectedRestaurant.name}
        fallback={{ ...selectedRestaurant.record, id: selectedRestaurant.id, name: selectedRestaurant.name }}
        onBack={() => setSelectedRestaurant(null)}
      />
    );
  }

  return (
    <RestaurantListView
      onSelect={setSelectedRestaurant}
      onReviewApprovals={() => onSelectSubsection("restaurants-approvals")}
      canBlockRestaurants={canBlockRestaurants}
      canUnblockRestaurants={canUnblockRestaurants}
    />
  );
}
