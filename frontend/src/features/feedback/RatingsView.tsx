"use client";

import { useState } from "react";

import { PageFooter } from "../admin/components/PageFooter";
import { SectionSearch } from "../admin/components/SectionActions";
import { SkeletonTable } from "../admin/components/Skeleton";
import { StatusTabs } from "../admin/components/StatusTabs";
import { errorMessage } from "../admin/views/approvalShared";
import { useGetAdminRatingsQuery } from "./api/reviewRepliesApi";
import { Stars } from "./ReplyModerationView";

const PAGE_SIZE = 10;

/** Stored average rating and number of customer reviews, per restaurant and per menu item. */
export function RatingsView() {
  const ratings = useGetAdminRatingsQuery();
  const [tab, setTab] = useState<"restaurants" | "items">("restaurants");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const term = search.trim().toLowerCase();
  const restaurants = (ratings.data?.restaurants ?? []).filter((row) => !term || [row.restaurantName, row.restaurantId].some((value) => value.toLowerCase().includes(term)));
  const items = (ratings.data?.menuItems ?? []).filter((row) => !term || [row.menuItemName, row.restaurantName, row.restaurantId].some((value) => value.toLowerCase().includes(term)));
  const count = tab === "restaurants" ? restaurants.length : items.length;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const slice = <T,>(list: T[]) => list.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const restaurantRows = slice(restaurants);
  const itemRows = slice(items);
  const score = (value: number | null) => (value == null ? "—" : value.toFixed(1));

  return (
    <section className="td-page">
      <SectionSearch value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search restaurant or menu item" />
      {ratings.isError && <div className="api-state api-state--error" role="alert">Unable to load ratings. {errorMessage(ratings.error)}</div>}

      <div className="td-table-card">
        <div className="td-table-card-head">
          <h3>Ratings</h3>
          <StatusTabs placement="inline" label="Rate by" value={tab} onChange={(value) => { setTab(value as typeof tab); setPage(1); }}
            tabs={[
              { id: "restaurants", label: "Restaurants", count: ratings.data?.restaurants.length },
              { id: "items", label: "Menu items", count: ratings.data?.menuItems.length },
            ]} />
        </div>

        {ratings.isLoading && <SkeletonTable columns={["Restaurant", "Rating", "Reviews"]} />}

        {!ratings.isLoading && !ratings.isError && (
          <>
            <div className="td-table-scroll">
              <table className="td-table">
                {tab === "restaurants" ? (
                  <>
                    <thead><tr><th>Restaurant</th><th>Rating</th><th>Reviews</th></tr></thead>
                    <tbody>
                      {restaurantRows.map((row) => (
                        <tr key={row.restaurantId}>
                          <td><div className="td-contact"><span>{row.restaurantName}</span><small>{row.restaurantId}</small></div></td>
                          <td><span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><Stars value={row.rating} /><strong>{score(row.rating)}</strong></span></td>
                          <td className="td-muted">{row.totalRatings.toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                ) : (
                  <>
                    <thead><tr><th>Menu item</th><th>Restaurant</th><th>Rating</th><th>Reviews</th></tr></thead>
                    <tbody>
                      {itemRows.map((row) => (
                        <tr key={row.menuItemId}>
                          <td><strong>{row.menuItemName}</strong></td>
                          <td><div className="td-contact"><span>{row.restaurantName}</span><small>{row.restaurantId}</small></div></td>
                          <td><span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><Stars value={row.rating} /><strong>{score(row.rating)}</strong></span></td>
                          <td className="td-muted">{row.totalRatings.toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}
              </table>
              {count === 0 && <div className="api-state">{term ? "Nothing matches your search." : "No ratings yet."}</div>}
            </div>
            {count > 0 && <PageFooter page={current} totalPages={totalPages} total={count} pageSize={PAGE_SIZE} shown={tab === "restaurants" ? restaurantRows.length : itemRows.length} noun={tab === "restaurants" ? "restaurants" : "menu items"} onChange={setPage} />}
          </>
        )}
      </div>
    </section>
  );
}
