"use client";

import { useEffect, useState } from "react";

import type { Module, UserActivity } from "../models/portal";
import type { CustomerUser } from "../models/customerUser";

import { Icon } from "../components/Icon";
import { ComingSoonPanel } from "../components/ComingSoonPanel";
import { UserAvatar } from "../components/UserAvatar";

import {
  useUsersViewModel,
  type UserWorkspace,
} from "../viewmodels/usersViewModel";

import { useGetRidersQuery } from "../../riders/api/ridersApi";
import { useGetRestaurantsQuery } from "../../restaurants/api/restaurantsApi";
import { useGetOrdersQuery } from "../../orders/api/ordersApi";
import { useGetStationsQuery } from "../../stations/api/stationsApi";

type Props = {
  modules: Module[];
  userActivities: UserActivity[];
  selectedServiceId: string;
  selectedSubsection: string;
  onSelectService: (id: string, subsectionId?: string) => void;
};

export function ManagementView({
  modules,
  userActivities,
  selectedServiceId,
  selectedSubsection,
  onSelectService,
}: Props) {
  const activeModule =
    modules.find((module) => module.id === selectedServiceId) ??
    modules[0];

  const section =
    selectedSubsection.split("-")[0] || "users";

  if (section === "users") {
    return (
      <UsersWorkspace
        subsection={selectedSubsection as UserWorkspaceMap}
        userActivities={userActivities}
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
      <StationWorkspace
        subsection={selectedSubsection}
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
        <h2>{activeModule?.title ?? "Management"}</h2>
        <p>
          {activeModule?.description ??
            "Operational workspace"}
        </p>
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
  userActivities,
}: {
  subsection: UserWorkspaceMap;
  userActivities: UserActivity[];
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

          <span className="activity-live-pill">
            <i />
          </span>
        </header>

        <div className="user-activity-grid">
          {userActivities.map((activity) => (
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

                <span className="activity-status-dot" />
              </div>

              <p>{activity.label}</p>
              <strong>{activity.value}</strong>
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
    />
  );
}

function UsersTable({
  blockedOnly,
}: {
  blockedOnly: boolean;
}) {
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

        <button
          type="button"
          className="secondary-button"
          onClick={() => vm.refresh()}
          disabled={vm.isFetching}
        >
          Refresh
        </button>
      </header>

      <div className="user-toolbar">
        <input
          value={vm.search}
          onChange={(e) =>
            vm.onSearch(e.target.value)
          }
          placeholder="Search by name, email or phone…"
          aria-label="Search users"
        />

        <span>
          {vm.isFetching
            ? "Syncing…"
            : `${vm.users.length} shown`}
        </span>
      </div>

      {vm.isLoading && (
        <div className="api-state">
          Loading users…
        </div>
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
                          size="small"
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
                        disabled={vm.isUpdating}
                      >
                        {String(
                          user.status
                        ).toLowerCase() ===
                          "blocked"
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
}: {
  user: CustomerUser;
  onClose: () => void;
  onToggleBlock: () => void;
  isUpdating: boolean;
}) {
  return (
    <div className="user-details-panel">
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
        Admin actions here are limited to account
        status.
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
          disabled={isUpdating}
        >
          {String(user.status).toLowerCase() ===
            "blocked"
            ? "Unblock user"
            : "Block user"}
        </button>
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
    isError,
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
    isError,
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
        order.id,
        order.customer_user_id ?? "—",
        order.restaurant_station_service_id ??
        "—",
        order.status ?? "—",
      ])}
      columns={[
        "Order ID",
        "Customer User ID",
        "Restaurant Service ID",
        "Status",
      ]}
      loading={isLoading}
      error={isError}
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

function StationWorkspace({
  subsection,
}: {
  subsection: string;
}) {
  const {
    data: stations = [],
    isLoading,
    isError,
  } = useGetStationsQuery();

  if (subsection === "stations-inactive") {
    return (
      <ComingSoonPanel
        eyebrow="STATIONS"
        title="Inactive / Suspended"
        description="The current stations API does not expose a status field, so inactive filtering is not connected yet."
      />
    );
  }

  if (subsection === "stations-performance") {
    return (
      <ComingSoonPanel
        eyebrow="STATIONS"
        title="Performance"
        description="Station performance data is not connected to an API yet."
      />
    );
  }

  const rows = stations.map((station) => [
    station.name,
    station.code ?? "—",
    station.city ?? "—",
  ]);

  return (
    <OperationalWorkspace
      title="All Stations"
      eyebrow="ALL STATIONS"
      description="Stations available in the current database response."
      rows={rows}
      columns={["Station", "Code", "City"]}
      loading={isLoading}
      error={isError}
    />
  );
}

function RestaurantWorkspace({
  subsection,
}: {
  subsection: string;
}) {
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<string | null>(null);

  const {
    data: restaurants = [],
    isLoading,
    isError,
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
    const pendingRestaurants =
      restaurants.filter(
        (restaurant) =>
          String(restaurant.status).toLowerCase() ===
          "pending"
      );

    return (
      <OperationalWorkspace
        title="Restaurant Approvals"
        eyebrow="APPROVALS"
        description="Restaurants with a pending status."
        rows={pendingRestaurants.map((restaurant) => [
          restaurant.name,
          restaurant.id,
          restaurant.status ?? "—",
        ])}
        columns={["Restaurant", "ID", "Status"]}
        loading={isLoading}
        error={isError}
      />
    );
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
      <ComingSoonPanel
        eyebrow="RESTAURANT"
        title={selectedRestaurant}
        description="Restaurant detail data is not connected to an API yet."
      />
    );
  }

  return (
    <RestaurantList
      restaurants={restaurants}
      onSelect={setSelectedRestaurant}
      loading={isLoading}
      error={isError}
    />
  );
}

function RestaurantList({
  restaurants,
  onSelect,
  loading,
  error,
}: {
  restaurants: {
    id: string;
    name: string;
    status: string | null;
  }[];
  onSelect: (name: string) => void;
  loading: boolean;
  error: boolean;
}) {
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
      </header>

      <div className="workspace-stat-row">
        <div>
          <strong>
            {loading ? "…" : restaurants.length}
          </strong>
          <span>Restaurants</span>
        </div>

        <div>
          <strong>
            {error ? "Error" : "Live"}
          </strong>
          <span>API status</span>
        </div>
      </div>

      {error && (
        <div className="api-state api-state--error">
          Unable to load restaurants. Check the API
          connection.
        </div>
      )}

      {!loading && !error && (
        <div className="user-table-wrap">
          <table className="user-table">
            <thead>
              <tr>
                <th>Restaurant</th>
                <th>ID</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {restaurants.map((restaurant) => (
                <tr key={restaurant.id}>
                  <td>
                    <button
                      type="button"
                      className="table-link-button"
                      onClick={() =>
                        onSelect(restaurant.name)
                      }
                    >
                      {restaurant.name}
                    </button>
                  </td>

                  <td>{restaurant.id}</td>

                  <td>
                    <span className="role-pill">
                      {restaurant.status ?? "—"}
                    </span>
                  </td>

                  <td>
                    <button
                      type="button"
                      className="table-action"
                      onClick={() =>
                        onSelect(restaurant.name)
                      }
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!restaurants.length && (
            <div className="api-state">
              No restaurants found.
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
  rows,
  columns,
  loading = false,
  error = false,
}: {
  title: string;
  eyebrow?: string;
  description: string;
  rows: string[][];
  columns: string[];
  loading?: boolean;
  error?: boolean;
}) {
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
      </header>

      <div className="workspace-stat-row">
        <div>
          <strong>
            {loading ? "…" : rows.length}
          </strong>
          <span>Items in this view</span>
        </div>

        <div>
          <strong>
            {error ? "Error" : "Live"}
          </strong>
          <span>API status</span>
        </div>
      </div>

      {error && (
        <div className="api-state api-state--error">
          Unable to load data. Check the API
          connection and try again.
        </div>
      )}

      {loading && (
        <div className="api-state">
          Loading data…
        </div>
      )}

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

