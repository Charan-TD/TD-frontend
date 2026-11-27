"use client";

import { useState } from "react";

import { useGetAllRestaurantsQuery, useGetRestaurantsPageQuery, useGetRestaurantsTotalQuery, useSetRestaurantBlockedMutation, type Restaurant } from "../../restaurants/api/restaurantsApi";
import { Icon } from "../components/Icon";
import { InitialsAvatar } from "../components/InitialsAvatar";
import { PageFooter } from "../components/PageFooter";
import { SectionSearch } from "../components/SectionActions";
import { SkeletonTable } from "../components/Skeleton";
import { StatusSwitch } from "../components/StatusSwitch";
import { StatusTabs } from "../components/StatusTabs";
import { TransientSuccessMessage } from "../components/TransientSuccessMessage";
import { noAccess } from "../models/disabledReason";
import { formatStatusLabel } from "../models/formatStatusLabel";

type Filter = "all" | "active" | "inactive" | "pending" | "blocked";
const PAGE_SIZE = 10;
/** The tabs the server can filter by (GET /restaurants?status=). */
const STATUS_PARAM: Partial<Record<Filter, string>> = { active: "ACTIVE", inactive: "INACTIVE", pending: "PENDING" };

const statusOf = (restaurant: Restaurant) => String(restaurant.status ?? "").toLowerCase();
const isUnnamed = (restaurant: Restaurant) => !restaurant.name || restaurant.name === "Unnamed restaurant";

export function describeQueryError(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const { status, data } = error as { status?: number | string; data?: { message?: string } };
  return [status, data?.message].filter(Boolean).join(" - ") || undefined;
}

type Props = {
  onSelect: (restaurant: Restaurant) => void;
  /** Opens the Approvals page (banner "Review all" and a pending row's "Review"). */
  onReviewApprovals: () => void;
  canBlockRestaurants: boolean;
  canUnblockRestaurants: boolean;
};

export function RestaurantListView({ onSelect, onReviewApprovals, canBlockRestaurants, canUnblockRestaurants }: Props) {
  const [updateRestaurantBlocked] = useSetRestaurantBlockedMutation();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);

  const term = search.trim().toLowerCase();
  // Browsing uses the server's own pages. The API has no search, and no "blocked" status, so those two
  // load every restaurant (cached) and filter here.
  const local = term !== "" || filter === "blocked";
  const allQuery = useGetAllRestaurantsQuery(undefined, { skip: !local });
  const pageQuery = useGetRestaurantsPageQuery({ page, limit: PAGE_SIZE, status: STATUS_PARAM[filter] }, { skip: local });
  const totalAll = useGetRestaurantsTotalQuery();
  const totalActive = useGetRestaurantsTotalQuery({ status: "ACTIVE" });
  const totalInactive = useGetRestaurantsTotalQuery({ status: "INACTIVE" });
  const totalPending = useGetRestaurantsTotalQuery({ status: "PENDING" });
  const pendingCount = totalPending.data ?? 0;
  const blockedCount = (allQuery.data ?? []).filter((r) => statusOf(r) === "blocked").length;

  const everything = allQuery.data ?? [];
  const filteredLocal = everything
    .filter((r) => filter === "all" || statusOf(r) === filter)
    .filter((r) => !term || [r.id, r.name, r.type, r.ownerName, r.phone, r.email, r.status].some((v) => String(v ?? "").toLowerCase().includes(term)));
  const total = local ? filteredLocal.length : pageQuery.data?.total ?? 0;
  const totalPages = local ? Math.max(1, Math.ceil(filteredLocal.length / PAGE_SIZE)) : Math.max(1, pageQuery.data?.totalPages ?? 1);
  const current = Math.min(page, totalPages);
  const rows = local ? filteredLocal.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE) : pageQuery.data?.rows ?? [];
  const loading = local ? allQuery.isLoading : pageQuery.isLoading;
  const error = local ? allQuery.isError : pageQuery.isError;
  const errorDetail = describeQueryError(local ? allQuery.error : pageQuery.error);
  const fetching = local ? allQuery.isFetching : pageQuery.isFetching;

  const toggle = async (restaurant: Restaurant) => {
    const blocked = ["inactive", "blocked"].includes(statusOf(restaurant));
    setUpdatingId(restaurant.id);
    setStatusError(null);
    setStatusSuccess(null);
    try {
      await updateRestaurantBlocked({ id: restaurant.id, blocked: !blocked }).unwrap();
      setStatusSuccess(`Restaurant ${blocked ? "unblocked" : "blocked"} successfully.`);
    } catch (err) {
      setStatusError(describeQueryError(err) ?? "Unable to update restaurant status.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <section className="td-page">
      <SectionSearch value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by restaurant, owner, phone or ID" />

      <TransientSuccessMessage message={statusSuccess} />
      {statusError && <div className="api-state api-state--error" role="alert">{statusError}</div>}
      {error && <div className="api-state api-state--error">Unable to load restaurants. Check the API connection.{errorDetail && <> Server said: {errorDetail}</>}</div>}

      <div className="td-table-card">
        <div className="td-table-card-head">
          <h3>All Restaurants</h3>
          <StatusTabs placement="inline" label="Filter restaurants by status" value={filter} onChange={(v) => { setFilter(v as Filter); setPage(1); }}
            tabs={[
              { id: "all", label: "All", count: totalAll.data ?? 0 },
              { id: "active", label: "Active", count: totalActive.data ?? 0 },
              { id: "inactive", label: "Inactive", count: totalInactive.data ?? 0 },
              { id: "pending", label: "Pending", count: pendingCount },
              { id: "blocked", label: "Blocked", count: blockedCount },
            ]} />
        </div>

        {pendingCount > 0 && (
          <div className="td-banner" role="status">
            <span className="td-banner-icon"><Icon name="clock" size={15} /></span>
            <p><b>{pendingCount} restaurant{pendingCount === 1 ? " is" : "s are"} waiting for approval.</b> They can&apos;t take orders until you review {pendingCount === 1 ? "it" : "them"}.</p>
            <button type="button" className="td-outline-btn" onClick={onReviewApprovals}>Review all</button>
          </div>
        )}

        {loading && !error && <SkeletonTable columns={["Restaurant", "Owner", "Contact", "Rating", "Status"]} />}

        {!loading && !error && (
          <>
            <div className="td-table-scroll">
              <table className="td-table">
                <thead><tr><th>Restaurant</th><th>Owner</th><th>Contact</th><th>Rating</th><th>Status</th></tr></thead>
                <tbody>
                  {rows.map((restaurant) => {
                    const status = statusOf(restaurant);
                    const pending = status === "pending";
                    const blocked = ["inactive", "blocked"].includes(status);
                    const allowed = blocked ? canUnblockRestaurants : canBlockRestaurants;
                    const updating = updatingId === restaurant.id;
                    const unnamed = isUnnamed(restaurant);
                    const type = restaurant.type ? formatStatusLabel(restaurant.type) : "Restaurant";
                    return (
                      <tr key={restaurant.id || restaurant.name} className={`is-clickable${pending ? " is-pending" : ""}`} tabIndex={0}
                        aria-label={`Open details for ${restaurant.name || "restaurant"}`}
                        onClick={() => onSelect(restaurant)}
                        onKeyDown={(event) => { if ((event.key === "Enter" || event.key === " ") && event.target === event.currentTarget) { event.preventDefault(); onSelect(restaurant); } }}>
                        <td>
                          <div className={`td-member${unnamed ? " td-member--muted" : ""}`}>
                            {unnamed ? <span className="td-avatar td-avatar--muted" style={{ width: 36, height: 36, fontSize: 13 }}>?</span> : <InitialsAvatar name={restaurant.name} imageUrl={restaurant.logoUrl} size={36} />}
                            <span><strong>{restaurant.name}</strong><small>{unnamed ? "Details not added" : pending ? `${type} · Awaiting approval` : type}</small></span>
                          </div>
                        </td>
                        <td className={restaurant.ownerName ? undefined : "td-faint"}>{restaurant.ownerName ?? "Not added"}</td>
                        <td><div className="td-contact"><span>{restaurant.phone ?? "—"}</span><small>{restaurant.email ?? "—"}</small></div></td>
                        <td className="td-muted">{restaurant.rating != null ? `★ ${restaurant.rating.toFixed(1)}` : "No ratings yet"}</td>
                        <td>
                          {pending ? (
                            <button type="button" className="td-outline-btn" onClick={(event) => { event.stopPropagation(); onReviewApprovals(); }}>Review</button>
                          ) : (
                            <StatusSwitch checked={!blocked} onLabel="On" offLabel="Off" label={`${blocked ? "Activate" : "Block"} ${restaurant.name || "restaurant"}`}
                              disabled={!allowed || updating}
                              tooltip={!allowed ? noAccess(blocked ? "activate restaurants" : "block restaurants") : updating ? "Please wait, restaurant status is being updated" : undefined}
                              tooltipKind={!allowed ? "access" : undefined}
                              onChange={() => toggle(restaurant)} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!rows.length && <div className="api-state">{(totalAll.data ?? 0) > 0 || local ? `No ${filter === "all" ? "" : `${filter} `}restaurants${term ? ` match "${search.trim()}"` : " found"}.` : "No restaurants found."}</div>}
            </div>
            {total > 0 && <PageFooter page={current} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} shown={rows.length} noun="restaurants" onChange={setPage} disabled={fetching} />}
          </>
        )}
      </div>
    </section>
  );
}
