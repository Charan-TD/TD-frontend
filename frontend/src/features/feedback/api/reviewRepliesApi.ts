import { baseApi } from "../../admin/api/baseApi";

export type ReplyStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED";

export type ReviewReply = {
  id: string;
  restaurantId: string | null;
  restaurantName: string;
  customerName: string;
  orderNumber: string | null;
  rating: number | null;
  review: string;
  replyText: string;
  status: ReplyStatus;
  attemptNumber: number;
  submittedAt: string | null;
  rejectionReason: string | null;
  reviewedAt: string | null;
};

export type ReplyHistoryEvent = {
  attemptNumber: number;
  replyText: string;
  eventType: string;
  rejectionReason: string | null;
  adminName: string | null;
  adminEmpId: string | null;
  createdAt: string | null;
};

export type ReviewReplyDetail = ReviewReply & { history: ReplyHistoryEvent[] };

export type ReviewReplyPage = {
  rows: ReviewReply[];
  total: number;
  totalPages: number;
};

export type ReviewReplyQuery = {
  page: number;
  status?: ReplyStatus;
  search?: string;
  /** Inclusive submitted dates, YYYY-MM-DD. */
  startDate?: string;
  endDate?: string;
};

export type RestaurantRating = { restaurantId: string; restaurantName: string; rating: number | null; totalRatings: number };
export type MenuItemRating = { menuItemId: string; restaurantId: string; restaurantName: string; menuItemName: string; rating: number | null; totalRatings: number };
export type Ratings = { restaurants: RestaurantRating[]; menuItems: MenuItemRating[] };

const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);
const num = (value: unknown): number | null => {
  const parsed = typeof value === "string" && value.trim() ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null;
};
const REPLY_STATUSES: ReplyStatus[] = ["PENDING_APPROVAL", "APPROVED", "REJECTED"];

function normalizeReply(row: Record<string, unknown>): ReviewReply {
  const status = String(row.status ?? "").toUpperCase() as ReplyStatus;
  return {
    id: String(row.id ?? ""),
    restaurantId: text(row.restaurant_id),
    restaurantName: text(row.restaurant_name) ?? "Unnamed restaurant",
    customerName: text(row.customer_name) ?? "Customer",
    orderNumber: text(row.order_number),
    rating: num(row.rating),
    review: text(row.review) ?? "",
    replyText: text(row.reply_text) ?? "",
    status: REPLY_STATUSES.includes(status) ? status : "PENDING_APPROVAL",
    attemptNumber: num(row.attempt_number) ?? 1,
    submittedAt: text(row.submitted_at),
    rejectionReason: text(row.rejection_reason),
    reviewedAt: text(row.reviewed_at),
  };
}

/** A 409 means the reply was already decided, so the cached copy is stale and must reload too. */
const staleAfter = (error: { status?: unknown } | undefined, id: string) =>
  error && error.status !== 409 ? [] : [{ type: "ReviewReply" as const, id: "LIST" }, { type: "ReviewReply" as const, id }];

const rowsOf = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter((row): row is Record<string, unknown> => !!row && typeof row === "object") : [];

export const reviewRepliesApi = baseApi.injectEndpoints({
  // Hot reload runs this file again; without this the edited endpoints would be ignored.
  overrideExisting: true,
  endpoints: (builder) => ({
    /** GET /admin/review-replies: the moderation queue, 10 per page, pending replies first. */
    getReviewReplies: builder.query<ReviewReplyPage, ReviewReplyQuery>({
      query: ({ page, status, search, startDate, endDate }) => ({
        url: "/admin/review-replies",
        params: {
          page,
          limit: 10,
          ...(status ? { status } : {}),
          ...(search?.trim() ? { search: search.trim().slice(0, 200) } : {}),
          ...(startDate ? { start_date: startDate } : {}),
          ...(endDate ? { end_date: endDate } : {}),
        },
      }),
      transformResponse: (response: { data?: unknown; pagination?: { total_records?: number | string; total_pages?: number } }) => {
        const rows = rowsOf(response.data).map(normalizeReply);
        const total = num(response.pagination?.total_records) ?? rows.length;
        return { rows, total, totalPages: Math.max(1, num(response.pagination?.total_pages) ?? 1) };
      },
      providesTags: [{ type: "ReviewReply", id: "LIST" }],
    }),
    /** GET /admin/review-replies/{id}: the reply with its full moderation history. */
    getReviewReply: builder.query<ReviewReplyDetail, string>({
      query: (id) => `/admin/review-replies/${encodeURIComponent(id)}`,
      transformResponse: (response: { data?: Record<string, unknown> }) => {
        const data = response.data ?? {};
        return {
          ...normalizeReply(data),
          history: rowsOf(data.history).map((event) => ({
            attemptNumber: num(event.attempt_number) ?? 1,
            replyText: text(event.reply_text) ?? "",
            eventType: text(event.event_type) ?? "",
            rejectionReason: text(event.rejection_reason),
            adminName: text(event.admin_name),
            adminEmpId: text(event.admin_emp_id),
            createdAt: text(event.created_at),
          })),
        };
      },
      providesTags: (_result, _error, id) => [{ type: "ReviewReply", id }],
    }),
    approveReviewReply: builder.mutation<unknown, string>({
      query: (id) => ({ url: `/admin/review-replies/${encodeURIComponent(id)}/approve`, method: "PATCH" }),
      invalidatesTags: (_result, error, id) => staleAfter(error, id),
    }),
    rejectReviewReply: builder.mutation<unknown, { id: string; rejection_reason: string }>({
      query: ({ id, rejection_reason }) => ({
        url: `/admin/review-replies/${encodeURIComponent(id)}/reject`,
        method: "PATCH",
        body: { rejection_reason },
      }),
      invalidatesTags: (_result, error, { id }) => staleAfter(error, id),
    }),
    /** GET /admin/ratings: stored average rating and review count per restaurant and per menu item. */
    getAdminRatings: builder.query<Ratings, void>({
      query: () => "/admin/ratings",
      transformResponse: (response: { data?: { restaurants?: unknown; menu_items?: unknown } }) => ({
        restaurants: rowsOf(response.data?.restaurants).map((row) => ({
          restaurantId: String(row.restaurant_id ?? ""),
          restaurantName: text(row.restaurant_name) ?? "Unnamed restaurant",
          rating: num(row.rating),
          totalRatings: num(row.total_ratings) ?? 0,
        })),
        menuItems: rowsOf(response.data?.menu_items).map((row) => ({
          menuItemId: String(row.menu_item_id ?? ""),
          restaurantId: String(row.restaurant_id ?? ""),
          restaurantName: text(row.restaurant_name) ?? "Unnamed restaurant",
          menuItemName: text(row.menu_item_name) ?? "Unnamed item",
          rating: num(row.rating),
          totalRatings: num(row.total_ratings) ?? 0,
        })),
      }),
      providesTags: [{ type: "Rating", id: "LIST" }],
    }),
  }),
});

export const {
  useGetReviewRepliesQuery,
  useGetReviewReplyQuery,
  useApproveReviewReplyMutation,
  useRejectReviewReplyMutation,
  useGetAdminRatingsQuery,
} = reviewRepliesApi;
