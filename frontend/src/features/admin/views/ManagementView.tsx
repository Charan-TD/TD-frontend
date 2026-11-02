"use client";

import { useEffect, useState, type ReactNode } from "react";
import { OrderStatus } from "../../orders/components/OrderStatus";

import type { CustomerUser } from "../models/customerUser";

import { Icon } from "../components/Icon";
import { ManagementActionButton } from "../components/ManagementActionButton";
import { ManagementStatus } from "../components/ManagementStatus";
import { TransientSuccessMessage } from "../components/TransientSuccessMessage";
import { ListToolbar } from "../components/ListToolbar";
import { StatusTabs } from "../components/StatusTabs";
import { ListPagination } from "../components/ListPagination";
import { PrimaryActionButton } from "../components/PrimaryActionButton";
import { SectionActions } from "../components/SectionActions";
import { PaymentsView } from "./PaymentsView";
import { ComingSoonPanel } from "../components/ComingSoonPanel";
import { UserAvatar } from "../components/UserAvatar";
import { SkeletonTable } from "../components/Skeleton";
import { noAccess } from "../models/disabledReason";
import { formatStatusLabel } from "../models/formatStatusLabel";

import {
  isUserBlocked,
  useUsersViewModel,
  type UserWorkspace,
} from "../viewmodels/usersViewModel";


import { useGetAllRestaurantsQuery, useSetRestaurantBlockedMutation, type Restaurant } from "../../restaurants/api/restaurantsApi";
import { RestaurantApprovalsView } from "./RestaurantApprovalsView";
import { RestaurantDetailsView } from "./RestaurantDetailsView";
import { ReviewModal } from "../components/ReviewModal";
import { useGetAllOrdersQuery, type Order } from "../../orders/api/ordersApi";
import { GroupOrdersView } from "../../orders/views/GroupOrdersView";
import { DeliveryPartnersView } from "../../riders/views/DeliveryPartnersView";
import { StationsView } from "../../stations/views/StationsView";
import { AddCategoryPanel } from "../../restaurants/views/AddCategoryPanel";

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
}: Props) {
  const section =
    selectedSubsection.split("-")[0] || "users";

  if (section === "users") {
    return (
      <UsersWorkspace
        subsection={selectedSubsection as UserWorkspaceMap}
        canUpdateUsers={canUpdateUsers}
      />
    );
  }

  if (section === "riders") {
    return (
      <DeliveryPartnersView
        subsection={selectedSubsection}
      />
    );
  }

  if (section === "restaurants") {
    return (
      <RestaurantWorkspace
        subsection={selectedSubsection}
        canAddCategory={canAddRestaurantCategory}
        canBlockRestaurants={canBlockRestaurants}
        canUnblockRestaurants={canUnblockRestaurants}
      />
    );
  }

  if (section === "grouporders") return <GroupOrdersView canAssign={canAssignGroupOrders} />;

  if (section === "orders") {
    return (
      <OrderWorkspace
        subsection={selectedSubsection}
      />
    );
  }

  if (section === "sales") {
    return (
      <PaymentsView key={selectedSubsection} subsection={selectedSubsection} onSelectSubsection={onSelectSubsection} />
    );
  }

  if (section === "stations") {
    return (
      <StationsView
        subsection={selectedSubsection}
        canInsert={stationAccess.insert}
        canUpdate={stationAccess.update}
      />
    );
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

// User activity has no API yet, so these cards show "-" instead of a number.
const userActivityCards = [
  { id: "active", label: "Currently active users", description: "Users active on the platform right now", icon: "users", tone: "saffron" },
  { id: "searching", label: "Searching for food", description: "Users browsing kitchens and food items", icon: "search", tone: "orange" },
  { id: "payment", label: "At payment stage", description: "Orders waiting for payment completion", icon: "wallet", tone: "violet" },
  { id: "waiting", label: "Waiting for order", description: "Successful orders awaiting delivery", icon: "bag", tone: "indigo" },
  { id: "cancelled", label: "Cancelled orders", description: "Orders cancelled by users or system", icon: "chart", tone: "slate" },
  { id: "successful", label: "Successful orders", description: "Orders completed successfully today", icon: "check", tone: "mint" },
] as const;

type UserWorkspaceMap =
  | "users-all"
  | "users-blocked"
  | "users-complaints"
  | "users-activity";

function UsersWorkspace({
  subsection,
  canUpdateUsers,
}: {
  subsection: UserWorkspaceMap;
  canUpdateUsers: boolean;
}) {
  if (subsection === "users-complaints") {
    return (
      <ComingSoonPanel
        eyebrow="COMPLAINTS"
        title="User complaints"
        description="Complaint data is not connected to an API yet."
      />
    );
  }

  if (subsection === "users-activity") {
    return (
      <section className="user-activity-workspace">
        <header className="user-activity-header">
          <div><h2>User activities</h2><p>See where users and orders are in the journey right now.</p></div>
        </header>

        <div className="user-activity-grid">
          {userActivityCards.map((activity) => (
            <article
              className={`user-activity-card user-activity-card--${activity.tone}`}
              key={activity.id}
            >
              <div className="user-activity-card__top">
                <span
                  className={`user-activity-icon tone-${activity.tone}`}
                >
                  <Icon
                    name={activity.icon}
                    size={19}
                  />
                </span>
              </div>

              <p>{activity.label}</p>
              <strong>-</strong>
              <small>{activity.description}</small>
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <UsersTable
      blockedOnly={subsection === "users-blocked"}
      canUpdateUsers={canUpdateUsers}
    />
  );
}

function UsersTable({
  blockedOnly,
  canUpdateUsers,
}: {
  blockedOnly: boolean;
  canUpdateUsers: boolean;
}) {
  const blockUserHint = (user: CustomerUser) =>
    noAccess(isUserBlocked(user) ? "unblock users" : "block users");

  const [userFilter, setUserFilter] = useState<"all" | "active" | "blocked">(blockedOnly ? "blocked" : "all");
  const vm = useUsersViewModel(userFilter);

  return (
    <section className="user-management-workspace">


      <StatusTabs label="Filter users by status" value={userFilter} onChange={(value) => { vm.onSearch(vm.search); setUserFilter(value as "all" | "active" | "blocked"); }} tabs={[{ id: "all", label: "All users", count: vm.userCounts.all }, { id: "active", label: "Active", count: vm.userCounts.active }, { id: "blocked", label: "Inactive / Blocked", count: vm.userCounts.blocked }]} />
      <TransientSuccessMessage message={vm.successMessage} />

      {vm.errorMessage && (
        <div className="api-state api-state--error">
          {vm.errorMessage}
        </div>
      )}
      <ListToolbar value={vm.search} onChange={vm.onSearch} placeholder="Search by name, email, phone or customer ID..." label="the user list" refreshing={vm.isFetching} onRefresh={() => vm.refresh()} />

      {vm.isLoading && (
        <SkeletonTable
          columns={["User", "Email", "Phone", "Status", "Action"]}
        />
      )}

      {vm.isError && (
        <div className="api-state api-state--error">
          Unable to load users. Check the API
          connection and Refresh.
        </div>
      )}

      {!vm.isLoading && !vm.isError && (
        <>
          <div className="user-table-wrap">
            <table className="user-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {vm.users.map((user) => (
                  <tr
                    key={user.customer_id || user.id}
                    className="clickable-list-row"
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
                      <div className="user-cell">
                        <UserAvatar
                          name={user.full_name}
                          imageUrl={
                            user.profile_image_url
                          }
                          size="medium"
                        />

                      <span>
                          <button
                            type="button"
                            className="table-link-button"
                            onClick={(event) => { event.stopPropagation(); vm.setSelectedUser(user); }}
                            aria-label={`View ${user.full_name || "user"}`}
                          >
                            {user.full_name ?? "Unnamed user"}
                          </button>

                          <small>
                            ID {user.customer_id || user.id}
                          </small>
                        </span>
                      </div>
                    </td>

                    <td>
                      {user.email ?? "-"}
                    </td>

                    <td>
                      {user.phone ?? "-"}
                    </td>

                    <td>
                      <ManagementStatus status={user.status} />
                    </td>

                    <td>
                      <ManagementActionButton
                        action={isUserBlocked(user) ? "unblock" : "block"}
                        stateIndicator={isUserBlocked(user) ? "blocked" : "active"}
                        ariaLabel={isUserBlocked(user) ? `Unblock ${user.full_name || "user"}` : `Block ${user.full_name || "user"}`}
                        onClick={() =>
                          vm.toggleBlock(user)
                        }
                        disabled={!canUpdateUsers || vm.isUpdating}
                        tooltip={!canUpdateUsers ? blockUserHint(user) : vm.isUpdating ? "Please wait, another user's status is being updated" : undefined}
                        tooltipKind={canUpdateUsers ? undefined : "access"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!vm.users.length && (
              <div className="api-state">
                No users found.
              </div>
            )}
          </div>

          {vm.users.length > 0 && <ListPagination page={vm.page} count={vm.totalPages} onChange={vm.setPage} disabled={vm.isFetching} />}
        </>
      )}

      {vm.selectedUser && (
        <UserDetailsPanel
          user={vm.selectedUser}
          onClose={() =>
            vm.setSelectedUser(null)
          }
          onToggleBlock={() =>
            vm.toggleBlock(vm.selectedUser!)
          }
          isUpdating={vm.isUpdating}
          canUpdate={canUpdateUsers}
          successMessage={vm.successMessage}
        />
      )}
    </section>
  );
}

function UserDetailsPanel({
  user,
  onClose,
  onToggleBlock,
  isUpdating,
  canUpdate,
  successMessage,
}: {
  user: CustomerUser;
  onClose: () => void;
  onToggleBlock: () => void;
  isUpdating: boolean;
  canUpdate: boolean;
  successMessage: string;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
    <div
      className="modal-card modal-card--pop user-details-modal"
      role="dialog"
      aria-modal="true"
      aria-label="User details"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="user-details-header">
        <div className="user-cell">
          <UserAvatar
            name={user.full_name}
            imageUrl={user.profile_image_url}
            size="large"
          />

          <span>
            <span className="eyebrow">
              USER DETAILS
            </span>

            <h3>
              {user.full_name ?? "Unnamed user"}
            </h3>

            <small>{user.customer_id || user.id}</small>
          </span>
        </div>

        <button
          className="icon-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <TransientSuccessMessage message={successMessage} />

      <div className="user-detail-grid">
        <article>
          <span>Name</span>
          <strong>
            {user.full_name ?? "-"}
          </strong>
        </article>

        <article>
          <span>Email</span>
          <strong>
            {user.email ?? "-"}
          </strong>
        </article>

        <article>
          <span>Phone</span>
          <strong>
            {user.phone ?? "-"}
          </strong>
        </article>

        <article>
          <span>Status</span>
          <strong>{formatStatusLabel(user.status)}</strong>
        </article>
      </div>

      <div className="read-only-note">
        Registered user information is view-only.
      </div>

      <div className="user-details-actions">
        <button
          className="secondary-button"
          onClick={onClose}
        >
          Close
        </button>

        <button
          className="primary-button"
          onClick={onToggleBlock}
          disabled={!canUpdate || isUpdating}
          data-tooltip={!canUpdate ? noAccess(isUserBlocked(user) ? "unblock users" : "block users") : isUpdating ? "Please wait, the user's status is being updated" : undefined}
          data-tooltip-kind={canUpdate ? undefined : "access"}
        >
          {isUserBlocked(user)
            ? "Unblock user"
            : "Block user"}
        </button>
      </div>
    </div>
    </div>
  );
}

function OrderWorkspace({
  subsection,
}: {
  subsection: string;
}) {
  const {
    data: orders = [],
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetAllOrdersQuery();

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderFilter, setOrderFilter] = useState<"all" | "active" | "delivered" | "cancelled">(subsection === "orders-active" ? "active" : subsection === "orders-delivered" ? "delivered" : subsection === "orders-cancelled" ? "cancelled" : "all");
  useEffect(() => {
    setOrderFilter(subsection === "orders-active" ? "active" : subsection === "orders-delivered" ? "delivered" : subsection === "orders-cancelled" ? "cancelled" : "all");
  }, [subsection]);
  const activeOrders = orders.filter((order) => !["CANCELLED", "DELIVERED"].includes(String(order.status).toUpperCase()));
  const cancelledOrders = orders.filter((order) => String(order.status).toUpperCase() === "CANCELLED");
  const deliveredOrders = orders.filter((order) => String(order.status).toUpperCase() === "DELIVERED");
  const visibleOrders = orderFilter === "active" ? activeOrders : orderFilter === "delivered" ? deliveredOrders : orderFilter === "cancelled" ? cancelledOrders : orders;
  const title = orderFilter === "active" ? "Active Orders" : orderFilter === "delivered" ? "Delivered Orders" : orderFilter === "cancelled" ? "Cancelled Orders" : "All Orders";
  const description = orderFilter === "active" ? "Orders that are currently moving through the delivery flow." : orderFilter === "delivered" ? "Orders that have been delivered." : orderFilter === "cancelled" ? "Orders that have been cancelled." : "Orders returned from the orders API.";

  const orderItems = (order: Order) => order.items?.length
    ? order.items.map((item) => `${item.name ?? item.item_name ?? "Item"} × ${item.quantity ?? item.qty ?? 1}`).join(", ")
    : order.items_summary || "Not provided";
  const detailRows = selectedOrder ? [
    ["Order number", selectedOrder.order_number],
    ["Customer name", selectedOrder.customer_name],
    ["Mobile number", selectedOrder.customer_phone ?? selectedOrder.customer_mobile],
    ["PNR", selectedOrder.pnr],
    ["Train", [selectedOrder.train_number, selectedOrder.train_name].filter(Boolean).join(" · ")],
    ["Coach / seat", [selectedOrder.coach, selectedOrder.seat].filter(Boolean).join(" / ")],
    ["Delivery station", [selectedOrder.delivery_station_name, selectedOrder.delivery_station_code].filter(Boolean).join(" · ")],
    ["Restaurant", [selectedOrder.restaurant_name, selectedOrder.restaurant_id].filter(Boolean).join(" · ")],
    ["Items", orderItems(selectedOrder)],
    ["Total", formatOrderTotal(selectedOrder.total)],
  ] : [];

  return (
    <>
    {selectedOrder && (
      <ReviewModal
        title={`Order ${selectedOrder.order_number ?? ""}`.trim()}
        subtitle="Order details"
        compact
        closeOnAnyClick
        statusBadge={<OrderStatus status={selectedOrder.status ?? ""} />}
        onClose={() => setSelectedOrder(null)}
        footer={<button type="button" className="secondary-button" onClick={() => setSelectedOrder(null)}>Close</button>}
      >
        <dl className="order-details">
          {detailRows.map(([label, value]) => <div key={label} className={label === "Items" || label === "Restaurant" ? "order-details__wide" : undefined}><dt>{label}</dt><dd>{value || "Not provided"}</dd></div>)}
        </dl>
      </ReviewModal>
    )}
    <OperationalWorkspace
      onRowClick={(index) => setSelectedOrder(visibleOrders[index])}
      title={title}
      eyebrow={title.toUpperCase()}
      description={description}
      rows={visibleOrders.map((order) => [
        order.order_number || "-",
        order.station_name || order.boarding_station_name || order.delivery_station_name || "-",
        order.restaurant_id || "-",
        order.restaurant_name || "-",
        order.train_name || "-",
        formatOrderTotal(order.total),
        order.status || "-",
      ])}
      renderStatus={(status) => <OrderStatus status={status} />}
      columns={[
        "Order Number",
        "Station Name",
        "Restaurant ID",
        "Restaurant Name",
        "Train Name",
        "Amount",
        "Status",
      ]}
      loading={isLoading}
      error={isError}
      onRefresh={() => refetch()}
      refreshing={isFetching}
      filterTabs={[{ id: "all", label: "All Orders", count: orders.length }, { id: "active", label: "Active", count: activeOrders.length }, { id: "delivered", label: "Delivered", count: deliveredOrders.length }, { id: "cancelled", label: "Cancelled", count: cancelledOrders.length }]}
      activeFilter={orderFilter}
      onFilterChange={(value) => setOrderFilter(value as "all" | "active" | "delivered" | "cancelled")}
    />
    </>
  );
}

function formatOrderTotal(value: number | string | null | undefined): string {
  if (value == null || value === "") return "-";
  const amount = Number(value);
  return Number.isFinite(amount) ? `₹${amount.toLocaleString("en-IN")}` : "-";
}

const marketingCopy: Record<
  string,
  { title: string; description: string }
> = {
  "marketing-offers": {
    title: "Offers",
    description:
      "Offer data is not connected to an API yet.",
  },
  "marketing-coupons": {
    title: "Coupons",
    description:
      "Coupon data is not connected to an API yet.",
  },
  "marketing-campaigns": {
    title: "Campaigns",
    description:
      "Campaign data is not connected to an API yet.",
  },
  "marketing-analytics": {
    title: "Marketing Analytics",
    description:
      "Marketing analytics data is not connected to an API yet.",
  },
};

function MarketingWorkspace({
  subsection,
}: {
  subsection: string;
}) {
  const copy =
    marketingCopy[subsection] ??
    marketingCopy["marketing-offers"];

  return (
    <ComingSoonPanel
      eyebrow="MARKETING"
      title={copy.title}
      description={copy.description}
    />
  );
}

const reportsCopy: Record<
  string,
  { title: string; description: string }
> = {
  "reports-sales": {
    title: "Sales Reports",
    description:
      "Sales report data is not connected to an API yet.",
  },
  "reports-orders": {
    title: "Order Reports",
    description:
      "Order report data is not connected to an API yet.",
  },
  "reports-users": {
    title: "User Reports",
    description:
      "User report data is not connected to an API yet.",
  },
  "reports-operations": {
    title: "Operational Reports",
    description:
      "Operational report data is not connected to an API yet.",
  },
};

function ReportsWorkspace({
  subsection,
}: {
  subsection: string;
}) {
  const copy =
    reportsCopy[subsection] ??
    reportsCopy["reports-sales"];

  return (
    <ComingSoonPanel
      eyebrow="REPORTS"
      title={copy.title}
      description={copy.description}
    />
  );
}

function RestaurantWorkspace({
  subsection,
  canAddCategory,
  canBlockRestaurants,
  canUnblockRestaurants,
}: {
  subsection: string;
  canAddCategory: boolean;
  canBlockRestaurants: boolean;
  canUnblockRestaurants: boolean;
}) {
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);

  const {
    data: restaurants = [],
    isLoading,
    isFetching,
    isError,
    error: queryError,
    refetch,
  } = useGetAllRestaurantsQuery();

  useEffect(() => {
    setSelectedRestaurant(null);
  }, [subsection]);

  if (subsection === "restaurants-performance") {
    return (
      <ComingSoonPanel
        eyebrow="RESTAURANTS"
        title="Restaurant performance"
        description="Restaurant performance data is not connected to an API yet."
      />
    );
  }

  if (subsection === "restaurants-approvals") {
    return <RestaurantApprovalsView />;
  }

  if (subsection === "restaurants-complaints") {
    return (
      <ComingSoonPanel
        eyebrow="COMPLAINTS"
        title="Restaurant complaints"
        description="Complaint data is not connected to an API yet."
      />
    );
  }

  if (selectedRestaurant) {
    return (
      <RestaurantDetailsView
        restaurantId={selectedRestaurant.id}
        restaurantName={selectedRestaurant.name}
        onBack={() => setSelectedRestaurant(null)}
      />
    );
  }

  return (
    <RestaurantList
      restaurants={restaurants}
      onSelect={setSelectedRestaurant}
      canAddCategory={canAddCategory}
      canBlockRestaurants={canBlockRestaurants}
      canUnblockRestaurants={canUnblockRestaurants}
      loading={isLoading}
      error={isError}
      errorDetail={describeQueryError(queryError)}
      onRefresh={() => refetch()}
      refreshing={isFetching}
    />
  );
}

function describeQueryError(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const { status, data } = error as { status?: number | string; data?: { message?: string } };
  return [status, data?.message].filter(Boolean).join(" - ") || undefined;
}

function RestaurantList({
  restaurants,
  onSelect,
  canAddCategory,
  canBlockRestaurants,
  canUnblockRestaurants,
  loading,
  error,
  errorDetail,
  onRefresh,
  refreshing,
}: {
  restaurants: Restaurant[];
  onSelect: (restaurant: Restaurant) => void;
  canAddCategory: boolean;
  canBlockRestaurants: boolean;
  canUnblockRestaurants: boolean;
  loading: boolean;
  error: boolean;
  errorDetail?: string;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const [updateRestaurantBlocked] = useSetRestaurantBlockedMutation();
  const [updatingRestaurantId, setUpdatingRestaurantId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [restaurantFilter, setRestaurantFilter] = useState<"all" | "active" | "inactive" | "blocked">("all");
  const [categoryPanelOpen, setCategoryPanelOpen] = useState(false);
  const term = search.trim().toLowerCase();
  const activeRestaurants = restaurants.filter((restaurant) => String(restaurant.status).toLowerCase() === "active");
  const inactiveRestaurants = restaurants.filter((restaurant) => String(restaurant.status).toLowerCase() === "inactive");
  const blockedRestaurants = restaurants.filter((restaurant) => String(restaurant.status).toLowerCase() === "blocked");
  const filteredRestaurants = restaurantFilter === "active"
    ? activeRestaurants
    : restaurantFilter === "inactive"
      ? inactiveRestaurants
      : restaurantFilter === "blocked"
        ? blockedRestaurants
        : restaurants;
  const matching = term
    ? filteredRestaurants.filter((restaurant) => [
        restaurant.id,
        restaurant.name,
        restaurant.type,
        restaurant.ownerName,
        restaurant.phone,
        restaurant.email,
        restaurant.status,
        restaurant.rating == null ? null : String(restaurant.rating),
      ].some((value) => String(value ?? "").toLowerCase().includes(term)))
    : filteredRestaurants;
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(matching.length / pageSize));
  const pagedRestaurants = matching.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => setPage(1), [search, restaurantFilter]);

  const toggleRestaurantBlocked = async (restaurant: Restaurant) => {
    const isBlocked = ["inactive", "blocked"].includes(String(restaurant.status).toLowerCase());
    setUpdatingRestaurantId(restaurant.id);
    setStatusError(null);
    setStatusSuccess(null);
    try {
      await updateRestaurantBlocked({ id: restaurant.id, blocked: !isBlocked }).unwrap();
      setStatusSuccess(`Restaurant ${isBlocked ? "unblocked" : "blocked"} successfully.`);
    } catch (error) {
      setStatusError(describeQueryError(error) ?? "Unable to update restaurant status.");
    } finally {
      setUpdatingRestaurantId(null);
    }
  };

  return (
    <section className="user-management-workspace">
      <header className="employee-directory-header restaurant-directory-header">
        <div className="employee-directory-controls">
          <StatusTabs
            label="Filter restaurants by status"
            value={restaurantFilter}
            onChange={(value) => setRestaurantFilter(value as "all" | "active" | "inactive" | "blocked")}
            tabs={[
              { id: "all", label: "All Restaurants", count: restaurants.length },
              { id: "active", label: "Active", count: activeRestaurants.length },
              { id: "inactive", label: "Inactive", count: inactiveRestaurants.length },
              { id: "blocked", label: "Blocked", count: blockedRestaurants.length },
            ]}
          />
        </div>
        <SectionActions>
          <PrimaryActionButton type="button" onClick={() => setCategoryPanelOpen(true)} disabled={!canAddCategory}
            data-tooltip={canAddCategory ? "Add a food category for restaurants and view all categories." : noAccess("add categories")} data-tooltip-kind="access">Add food category</PrimaryActionButton>
        </SectionActions>
      </header>

      <AddCategoryPanel open={categoryPanelOpen} onClose={() => setCategoryPanelOpen(false)} />

      <TransientSuccessMessage message={statusSuccess} />

      {statusError && <div className="api-state api-state--error" role="alert">{statusError}</div>}

      {error && (
        <div className="api-state api-state--error">
          Unable to load restaurants. Check the API
          connection.
          {errorDetail && <> Server said: {errorDetail}</>}
        </div>
      )}

      <ListToolbar value={search} onChange={setSearch} placeholder="Search by restaurant, owner, email, phone or ID..." label="the restaurants" refreshing={refreshing} onRefresh={onRefresh} />

      {loading && !error && (
        <SkeletonTable
          columns={["Restaurant", "Contact", "Status", "Rating", "Action"]}
        />
      )}

      {!loading && !error && (
        <div className="user-table-wrap">
          <table className="user-table">
            <thead>
              <tr>
                <th>Restaurant</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Rating</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {pagedRestaurants.map((restaurant) => {
                const isBlocked = ["inactive", "blocked"].includes(String(restaurant.status).toLowerCase());
                const action = isBlocked ? "unblock" : "block";
                const allowed = isBlocked ? canUnblockRestaurants : canBlockRestaurants;
                const updating = updatingRestaurantId === restaurant.id;

                return (
                <tr
                  key={restaurant.id}
                  className="clickable-list-row"
                  tabIndex={0}
                  aria-label={`Open details for ${restaurant.name || "restaurant"}`}
                  onClick={() => onSelect(restaurant)}
                  onKeyDown={(event) => {
                    if ((event.key === "Enter" || event.key === " ") && event.target === event.currentTarget) {
                      event.preventDefault();
                      onSelect(restaurant);
                    }
                  }}
                >
                  <td>
                    <div className="restaurant-cell">
                      <UserAvatar name={restaurant.name} imageUrl={restaurant.logoUrl} size="medium" />
                      <div>
                        <button type="button" className="table-link-button" onClick={(event) => { event.stopPropagation(); onSelect(restaurant); }}>
                          {restaurant.name}
                        </button>
                        {restaurant.type && (
                          <span className="restaurant-cell__type">{restaurant.type.replace(/_/g, " ")}</span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td>
                    <div className="contact-cell">
                      {restaurant.ownerName && <strong>{restaurant.ownerName}</strong>}
                      <span>{restaurant.phone ?? "-"}</span>
                      {restaurant.email && <span>{restaurant.email}</span>}
                    </div>
                  </td>

                  <td>
                    <ManagementStatus status={restaurant.status} />
                  </td>

                  <td>{restaurant.rating != null ? `★ ${restaurant.rating.toFixed(1)}` : <span className="restaurant-cell__type">No ratings yet</span>}</td>

                  <td>
                    <ManagementActionButton
                      action={action}
                      stateIndicator={isBlocked ? "blocked" : "active"}
                      ariaLabel={`${isBlocked ? "Unblock" : "Block"} ${restaurant.name || "restaurant"}`}
                      onClick={() => toggleRestaurantBlocked(restaurant)}
                      disabled={!allowed || updating}
                      tooltip={!allowed ? noAccess(isBlocked ? "activate restaurants" : "block restaurants") : updating ? "Please wait, restaurant status is being updated" : undefined}
                      tooltipKind={!allowed ? "access" : undefined}
                    />
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>

          {!matching.length && (
            <div className="api-state">
              {restaurants.length ? `No ${restaurantFilter === "all" ? "" : `${restaurantFilter} `}restaurants${search.trim() ? ` match "${search.trim()}"` : " found"}.` : "No restaurants found."}
            </div>
          )}
        </div>
      )}
      {!loading && !error && matching.length > 0 && <ListPagination page={page} count={totalPages} onChange={setPage} disabled={refreshing} />}
    </section>
  );
}

function OperationalWorkspace({
  title,
  eyebrow,
  description,
  rows: allRows,
  renderStatus,
  columns,
  loading = false,
  error = false,
  onRefresh,
  refreshing = false,
  filterTabs,
  activeFilter,
  onFilterChange,
  onRowClick,
}: {
  onRowClick?: (rowIndex: number) => void;
  title: string;
  eyebrow?: string;
  description: string;
  rows: string[][];
  renderStatus?: (status: string) => ReactNode;
  filterTabs?: { id: string; label: string; count: number }[];
  activeFilter?: string;
  onFilterChange?: (value: string) => void;
  columns: string[];
  loading?: boolean;
  error?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();
  const matchingIndexes = allRows.map((_, index) => index).filter((index) => !term || allRows[index].some((value) => String(value).toLowerCase().includes(term)));
  const matchingRows = matchingIndexes.map((index) => allRows[index]);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(matchingRows.length / pageSize));
  const pageOffset = (page - 1) * pageSize;
  const rows = matchingRows.slice(pageOffset, page * pageSize);
  useEffect(() => setPage(1), [search, activeFilter]);

  return (
    <section className="user-management-workspace">


      {filterTabs && onFilterChange && <StatusTabs label={`${title} status filters`} value={activeFilter ?? ""} onChange={onFilterChange} tabs={filterTabs} />}
      <ListToolbar value={search} onChange={setSearch} placeholder="Search this list" label={title.toLowerCase()} refreshing={refreshing} onRefresh={() => onRefresh?.()} />

      {error && (
        <div className="api-state api-state--error">
          Unable to load data. Check the API
          connection and try again.
        </div>
      )}

      {loading && <SkeletonTable columns={columns} />}

      {!loading && !error && (
        <div className="user-table-wrap">
          <table className="user-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={`${row[0]}-${index}`}
                  className={onRowClick ? "user-table-row--clickable" : undefined}
                  style={onRowClick ? { cursor: "pointer" } : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={onRowClick ? () => onRowClick(matchingIndexes[pageOffset + index]) : undefined}
                  onKeyDown={onRowClick ? (event) => { if (event.key === "Enter") onRowClick(matchingIndexes[pageOffset + index]); } : undefined}
                >
                  {row.map(
                    (value, cellIndex) => (
                      <td
                        key={`${value}-${cellIndex}`}
                      >
                        {cellIndex ===
                          row.length - 1 ? (
                          renderStatus ? renderStatus(value) : <span className="role-pill">
                            {formatStatusLabel(typeof value === "string" ? value : String(value ?? ""))}
                          </span>
                        ) : (
                          value
                        )}
                      </td>
                    )
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {!rows.length && (
            <div className="api-state">
              No data found.
            </div>
          )}
        </div>
      )}
      {!loading && !error && matchingRows.length > 0 && <ListPagination page={page} count={totalPages} onChange={setPage} disabled={refreshing} />}
    </section>
  );
}

