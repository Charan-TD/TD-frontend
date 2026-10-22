"use client";

import { useEffect, useState } from "react";

import type { CustomerUser } from "../models/customerUser";

import { Icon } from "../components/Icon";
import { RefreshButton } from "../components/RefreshButton";
import { ComingSoonPanel } from "../components/ComingSoonPanel";
import { UserAvatar } from "../components/UserAvatar";
import { SkeletonTable } from "../components/Skeleton";
import { noAccess } from "../models/disabledReason";

import {
  isUserBlocked,
  useUsersViewModel,
  type UserWorkspace,
} from "../viewmodels/usersViewModel";

import { useGetRidersQuery } from "../../riders/api/ridersApi";
import { useGetRestaurantsQuery, type Restaurant } from "../../restaurants/api/restaurantsApi";
import { RestaurantApprovalsView } from "./RestaurantApprovalsView";
import { RestaurantDetailsView } from "./RestaurantDetailsView";
import { useGetOrdersQuery } from "../../orders/api/ordersApi";
import { StationsView } from "../../stations/views/StationsView";
import { AddCategoryPanel } from "../../restaurants/views/AddCategoryPanel";

type Props = {
  selectedSubsection: string;
  /** Whether the signed-in person may block / unblock users. */
  canUpdateUsers: boolean;
  /** What the signed-in person may do with stations. */
  stationAccess: { insert: boolean; update: boolean };
  /** Whether the signed-in person may add restaurant categories. */
  canAddRestaurantCategory: boolean;
};

export function ManagementView({
  selectedSubsection,
  canUpdateUsers,
  stationAccess,
  canAddRestaurantCategory,
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
      <RiderWorkspace
        subsection={selectedSubsection}
      />
    );
  }

  if (section === "restaurants") {
    return (
      <RestaurantWorkspace
        subsection={selectedSubsection}
        canAddCategory={canAddRestaurantCategory}
      />
    );
  }

  if (section === "orders") {
    return (
      <OrderWorkspace
        subsection={selectedSubsection}
      />
    );
  }

  if (section === "sales") {
    return (
      <SalesWorkspace
        subsection={selectedSubsection}
      />
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

// User activity has no API yet, so these cards show "—" instead of a number.
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
          <div>
            <h2>User activities</h2>
            <p>
              See where users and orders are in the
              journey right now.
            </p>
          </div>
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
              <strong>—</strong>
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

  const vm = useUsersViewModel(
    blockedOnly ? "blocked" : "all"
  );

  return (
    <section className="user-management-workspace">
      <header className="user-activity-header">
        <div>
          <h2>
            {blockedOnly
              ? "Inactive / blocked users"
              : "All users"}
          </h2>

          <p>
            {blockedOnly
              ? "Accounts that need administrative attention."
              : "Registered users, including newly registered users."}
          </p>
        </div>

        <RefreshButton refreshing={vm.isFetching} label="the user list" onRefresh={() => vm.refresh()} />
      </header>

      {vm.errorMessage && (
        <div className="api-state api-state--error">
          {vm.errorMessage}
        </div>
      )}

      <div className="workspace-stat-row">
        <div>
          <strong>{vm.isLoading ? "…" : vm.users.length}</strong>
          <span>Users</span>
        </div>
      </div>

      <div className="list-search">
        <input
          type="search"
          value={vm.search}
          onChange={(e) =>
            vm.onSearch(e.target.value)
          }
          placeholder="Search by name, email or phone…"
          aria-label="Search users"
        />
      </div>

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
                  <tr key={user.id}>
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
                          <strong>
                            {user.full_name ??
                              "Unnamed user"}
                          </strong>

                          <small>
                            ID {user.id}
                          </small>
                        </span>
                      </div>
                    </td>

                    <td>
                      {user.email ?? "—"}
                    </td>

                    <td>
                      {user.phone ?? "—"}
                    </td>

                    <td>
                      <span className="role-pill">
                        {user.status}
                      </span>
                    </td>

                    <td>
                      <button
                        className="table-action"
                        type="button"
                        onClick={() =>
                          vm.setSelectedUser(user)
                        }
                      >
                        View
                      </button>

                      <button
                        className="table-action table-action--danger"
                        type="button"
                        onClick={() =>
                          vm.toggleBlock(user)
                        }
                        disabled={!canUpdateUsers || vm.isUpdating}
                        data-tooltip={!canUpdateUsers ? blockUserHint(user) : vm.isUpdating ? "Please wait, another user's status is being updated" : undefined}
                        data-tooltip-kind={canUpdateUsers ? undefined : "access"}
                      >
                        {isUserBlocked(user)
                          ? "Unblock"
                          : "Block"}
                      </button>
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

          <div className="assign-role-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={vm.goToPreviousPage}
              disabled={
                !vm.hasPreviousPage ||
                vm.isFetching
              }
              data-tooltip={!vm.hasPreviousPage ? "You are already on the first page" : vm.isFetching ? "Still loading, please wait" : undefined}
            >
              ← Previous
            </button>

            <span>
              Page {vm.page}
            </span>

            <button
              type="button"
              className="primary-button"
              onClick={vm.goToNextPage}
              disabled={
                !vm.hasNextPage ||
                vm.isFetching
              }
              data-tooltip={!vm.hasNextPage ? "You are already on the last page" : vm.isFetching ? "Still loading, please wait" : undefined}
            >
              Next →
            </button>
          </div>
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
}: {
  user: CustomerUser;
  onClose: () => void;
  onToggleBlock: () => void;
  isUpdating: boolean;
  canUpdate: boolean;
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

            <small>{user.id}</small>
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

      <div className="user-detail-grid">
        <article>
          <span>Name</span>
          <strong>
            {user.full_name ?? "—"}
          </strong>
        </article>

        <article>
          <span>Email</span>
          <strong>
            {user.email ?? "—"}
          </strong>
        </article>

        <article>
          <span>Phone</span>
          <strong>
            {user.phone ?? "—"}
          </strong>
        </article>

        <article>
          <span>Status</span>
          <strong>{user.status}</strong>
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

function RiderWorkspace({
  subsection,
}: {
  subsection: string;
}) {
  const {
    data: riders = [],
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetRidersQuery();

  if (subsection === "riders-approvals") {
    const pendingRiders = riders.filter(
      (rider) =>
        String(rider.status).toLowerCase() ===
        "pending"
    );

    return (
      <OperationalWorkspace
        title="Approvals"
        eyebrow="APPROVALS"
        description="Review rider applications and verification status."
        rows={pendingRiders.map((rider) => [
          rider.full_name ?? "Unnamed rider",
          rider.id,
          rider.status ?? "—",
        ])}
        columns={["Rider", "ID", "Status"]}
        loading={isLoading}
        error={isError}
        onRefresh={() => refetch()}
        refreshing={isFetching}
      />
    );
  }

  if (subsection === "riders-blocked") {
    const blockedRiders = riders.filter((rider) =>
      ["blocked", "inactive"].includes(
        String(rider.status).toLowerCase()
      )
    );

    return (
      <OperationalWorkspace
        title="Inactive / Blocked"
        eyebrow="INACTIVE / BLOCKED"
        description="Riders who are currently unavailable for delivery work."
        rows={blockedRiders.map((rider) => [
          rider.full_name ?? "Unnamed rider",
          rider.id,
          rider.status ?? "—",
        ])}
        columns={["Rider", "ID", "Status"]}
        loading={isLoading}
        error={isError}
        onRefresh={() => refetch()}
        refreshing={isFetching}
      />
    );
  }

  if (subsection === "riders-complaints") {
    return (
      <ComingSoonPanel
        eyebrow="COMPLAINTS"
        title="Rider complaints"
        description="Complaint data is not connected to an API yet."
      />
    );
  }

  return (
    <OperationalWorkspace
      title="All Riders"
      eyebrow="ALL RIDERS"
      description="A clear view of rider accounts and current status."
      rows={riders.map((rider) => [
        rider.full_name ?? "Unnamed rider",
        rider.id,
        rider.status ?? "—",
      ])}
      columns={["Rider", "ID", "Status"]}
      loading={isLoading}
      error={isError}
      onRefresh={() => refetch()}
      refreshing={isFetching}
    />
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
  } = useGetOrdersQuery();

  const visibleOrders =
    subsection === "orders-active"
      ? orders.filter(
        (order) =>
          ![
            "cancelled",
            "completed",
            "delivered",
          ].includes(
            String(order.status).toLowerCase()
          )
      )
      : subsection === "orders-cancelled"
        ? orders.filter(
          (order) =>
            String(order.status).toLowerCase() ===
            "cancelled"
        )
        : orders;

  const title =
    subsection === "orders-active"
      ? "Active Orders"
      : subsection === "orders-cancelled"
        ? "Cancelled Orders"
        : "All Orders";

  const description =
    subsection === "orders-active"
      ? "Orders that are currently moving through the delivery flow."
      : subsection === "orders-cancelled"
        ? "Orders that have been cancelled."
        : "Orders returned from the orders API.";

  return (
    <OperationalWorkspace
      title={title}
      eyebrow={title.toUpperCase()}
      description={description}
      rows={visibleOrders.map((order) => [
        order.order_number ?? "—",
        order.customer_user_id ?? "—",
        order.restaurant_id ?? "—",
        order.status ?? "—",
      ])}
      columns={[
        "Order Number",
        "Customer User ID",
        "Restaurant ID",
        "Status",
      ]}
      loading={isLoading}
      error={isError}
      onRefresh={() => refetch()}
      refreshing={isFetching}
    />
  );
}

function SalesWorkspace({
  subsection,
}: {
  subsection: string;
}) {
  const titleMap: Record<
    string,
    { title: string; description: string }
  > = {
    "sales-transactions": {
      title: "Transactions",
      description:
        "Transaction data is not connected to an API yet.",
    },
    "sales-settlements": {
      title: "Settlements",
      description:
        "Settlement data is not connected to an API yet.",
    },
    "sales-payouts": {
      title: "Restaurant Payouts",
      description:
        "Payout data is not connected to an API yet.",
    },
    "sales-reports": {
      title: "Revenue Reports",
      description:
        "Revenue report data is not connected to an API yet.",
    },
  };

  const copy =
    titleMap[subsection] ??
    titleMap["sales-transactions"];

  return (
    <ComingSoonPanel
      eyebrow="SALES"
      title={copy.title}
      description={copy.description}
    />
  );
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
}: {
  subsection: string;
  canAddCategory: boolean;
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
  } = useGetRestaurantsQuery();

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

  if (subsection === "restaurants-blocked") {
    const blockedRestaurants =
      restaurants.filter((restaurant) =>
        ["blocked", "inactive"].includes(
          String(restaurant.status).toLowerCase()
        )
      );

    return (
      <OperationalWorkspace
        title="Inactive / Blocked Restaurants"
        eyebrow="INACTIVE / BLOCKED"
        description="Restaurants that are currently unavailable."
        rows={blockedRestaurants.map((restaurant) => [
          restaurant.name,
          restaurant.id,
          restaurant.status ?? "—",
        ])}
        columns={["Restaurant", "ID", "Status"]}
        loading={isLoading}
        error={isError}
        onRefresh={() => refetch()}
        refreshing={isFetching}
      />
    );
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
  return [status, data?.message].filter(Boolean).join(" — ") || undefined;
}

function RestaurantList({
  restaurants,
  onSelect,
  canAddCategory,
  loading,
  error,
  errorDetail,
  onRefresh,
  refreshing,
}: {
  restaurants: Restaurant[];
  onSelect: (restaurant: Restaurant) => void;
  canAddCategory: boolean;
  loading: boolean;
  error: boolean;
  errorDetail?: string;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const [search, setSearch] = useState("");
  const [categoryPanelOpen, setCategoryPanelOpen] = useState(false);
  const term = search.trim().toLowerCase();
  const matching = term
    ? restaurants.filter((restaurant) => restaurant.name.toLowerCase().includes(term))
    : restaurants;

  return (
    <section className="user-management-workspace">
      <header className="user-activity-header">
        <div>
          <h2>All restaurants</h2>
          <p>
            Restaurants returned from the current
            database response.
          </p>
        </div>

        <div className="employee-header-actions">
          <RefreshButton refreshing={refreshing} label="the restaurants" onRefresh={onRefresh} />
          <button
            type="button"
            className="primary-button"
            onClick={() => setCategoryPanelOpen(true)}
            disabled={!canAddCategory}
            data-tooltip={canAddCategory ? "Add a food category for restaurants and view all categories." : noAccess("add categories")}
            data-tooltip-kind="access"
          >
            Add food category
          </button>
        </div>
      </header>

      <AddCategoryPanel open={categoryPanelOpen} onClose={() => setCategoryPanelOpen(false)} />

      <div className="workspace-stat-row">
        <div>
          <strong>
            {loading ? "…" : term ? `${matching.length} of ${restaurants.length}` : restaurants.length}
          </strong>
          <span>Restaurants</span>
        </div>
      </div>

      <div className="list-search">
        <input
          type="search"
          placeholder="Search restaurants by name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search restaurants by name"
        />
      </div>

      {error && (
        <div className="api-state api-state--error">
          Unable to load restaurants. Check the API
          connection.
          {errorDetail && <> Server said: {errorDetail}</>}
        </div>
      )}

      {loading && !error && (
        <SkeletonTable
          columns={["Restaurant", "Contact", "Online", "Rating", "Action"]}
        />
      )}

      {!loading && !error && (
        <div className="user-table-wrap">
          <table className="user-table">
            <thead>
              <tr>
                <th>Restaurant</th>
                <th>Contact</th>
                <th>Online</th>
                <th>Rating</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {matching.map((restaurant) => (
                <tr key={restaurant.id}>
                  <td>
                    <div className="restaurant-cell">
                      <UserAvatar name={restaurant.name} size="medium" />
                      <div>
                        <button type="button" className="table-link-button" onClick={() => onSelect(restaurant)}>
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
                      <span>{restaurant.phone ?? "—"}</span>
                      {restaurant.email && <span>{restaurant.email}</span>}
                    </div>
                  </td>

                  <td>
                    {restaurant.onlineStatus ? (
                      <span className={`status-pill${restaurant.onlineStatus === "OPEN" ? " status-pill--live" : ""}`}>
                        <i />
                        {restaurant.onlineStatus === "OPEN" ? "Open" : "Closed"}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td>{restaurant.rating != null ? `★ ${restaurant.rating}` : "—"}</td>

                  <td>
                    <button
                      type="button"
                      className="table-action"
                      onClick={() =>
                        onSelect(restaurant)
                      }
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!matching.length && (
            <div className="api-state">
              {restaurants.length ? `No restaurants match "${search.trim()}".` : "No restaurants found."}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function OperationalWorkspace({
  title,
  eyebrow,
  description,
  rows: allRows,
  columns,
  loading = false,
  error = false,
  onRefresh,
  refreshing = false,
}: {
  title: string;
  eyebrow?: string;
  description: string;
  rows: string[][];
  columns: string[];
  loading?: boolean;
  error?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();
  const rows = term
    ? allRows.filter((row) => row.some((value) => String(value).toLowerCase().includes(term)))
    : allRows;

  return (
    <section className="user-management-workspace">
      <header className="user-activity-header">
        <div>
          {eyebrow && (
            <span className="eyebrow">
              {eyebrow}
            </span>
          )}

          <h2>{title}</h2>
          <p>{description}</p>
        </div>

        {onRefresh && <RefreshButton refreshing={refreshing} onRefresh={onRefresh} />}
      </header>

      <div className="workspace-stat-row">
        <div>
          <strong>
            {loading ? "…" : term ? `${rows.length} of ${allRows.length}` : rows.length}
          </strong>
          <span>Items in this view</span>
        </div>
      </div>

      <div className="list-search">
        <input
          type="search"
          placeholder="Search this list"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search this list"
        />
      </div>

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
                >
                  {row.map(
                    (value, cellIndex) => (
                      <td
                        key={`${value}-${cellIndex}`}
                      >
                        {cellIndex ===
                          row.length - 1 ? (
                          <span className="role-pill">
                            {value}
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
    </section>
  );
}

