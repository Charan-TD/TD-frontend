/**
 * Total number of rows behind a paginated list response
 * (`{ data: { pagination: { total } } }`).
 *
 * Counts must come from the server's `pagination.total`, not from the length of
 * the page that happened to be fetched: a page is capped (100 rows), so a
 * length would stop growing once the list passes the cap.
 *
 * Throws when the response has no usable total, so a caller shows an error
 * state instead of a wrong number.
 */
export function listTotal(response: unknown): number {
  const raw = (response as { data?: { pagination?: { total?: unknown } } } | undefined)?.data?.pagination?.total;
  const total = typeof raw === "string" && raw.trim() ? Number(raw) : raw;
  if (typeof total !== "number" || !Number.isFinite(total) || total < 0) {
    throw new Error("The list response did not include a total count.");
  }
  return total;
}
