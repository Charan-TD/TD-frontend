# Train Dabba Admin Portal: Frontend Developer Guide

Audience: frontend developers joining the project.
Source: written from the code in `frontend/` (package.json, next.config.ts, `src/**`, `tests/`, `docs/`, `netlify.toml`). Nothing here was run in a browser. Anything not found in the repo is marked **To Be Confirmed (TBC)**.

---

## 1. Project Overview

### 1.1 Introduction and objectives
The Train Dabba Admin Portal is the internal Super Admin web app for the Train Dabba food-delivery-to-train-stations platform. Staff use it to:
- sign in with employee credentials and see only the sections their role permits;
- manage employees, roles and permissions;
- review customers, restaurants, delivery partners (riders), stations and orders;
- approve or reject restaurant registrations and restaurant profile-edit requests;
- manage food categories and restaurant menu-item availability;
- assign restaurants to group orders.

### 1.2 Technology stack (from `package.json`)

| Area | Library | Version |
|---|---|---|
| Framework | Next.js (App Router, `output: "export"`) | 16.3.8 |
| UI runtime | React / React DOM | 19.2.0 |
| Language | TypeScript (strict) | 5.9.2 |
| State and data | Redux Toolkit (+ RTK Query) / react-redux | 2.12.0 / 9.3.0 |
| UI kit | MUI (`@mui/material`) + Emotion | 9.5.0 |
| Maps | Leaflet | ^1.9.4 |
| Font | DM Sans (Google Fonts `@import` in `globals.css`) | n/a |

- **Package manager:** npm (a `package-lock.json` is present).
- **Node:** `engines.node >= 20.9.0`. Netlify builds with Node 22.
- **Linting:** ESLint 9 with `eslint-config-next` (flat config in `eslint.config.mjs`). Run `npm run lint`. No Prettier config exists. Existing React 19 hook findings are reported as warnings (tracked debt); errors fail CI.
- **Browser compatibility:** no `browserslist` or documented support matrix. TBC. `tsconfig` targets ES2017.

### 1.3 Backend integration overview
- REST API, JSON bodies, `Authorization: Bearer <accessToken>`.
- Base URL comes from `NEXT_PUBLIC_API_BASE_URL`. If it is unset, the code falls back to the Railway **dev** API (`https://train-dhaba-backend-dev.up.railway.app/api/v1`).
- Backend: Node/Express 5 on Railway, in the same repo under `backend/`. Swagger is served at `/api-docs`.
- Responses use the envelope `{ success, message, data }`. Lists commonly use `data.<name>` plus `data.pagination { page, limit, total, totalPages }`.

---

## 2. Development Environment Setup

### 2.1 Requirements
- Node.js 20.9 or newer (22 recommended, to match Netlify).
- npm.
- Git.

### 2.2 Install and run
```bash
cd frontend
npm install
# create frontend/.env.local by hand first (no example file exists; see 2.3)
npm run dev      # next dev, http://localhost:3000
npm run build    # next build -> static files in frontend/out
npm run start    # next start (see note below)
npm run check    # typecheck + lint + tests, the same checks CI runs
```
`npm run start` is defined, but the app uses `output: "export"`. Serve `out/` with any static server for a production-like check. Whether `next start` works with an exported build is TBC.

### 2.3 Environment variables
| Variable | Purpose | Where read |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Backend base URL, trailing slash stripped | `admin/api/baseApi.ts` |
| `NEXT_PUBLIC_GEOAPIFY_API_KEY` | Geoapify map tiles | `admin/components/LocationMap.tsx`, `stations/components/StationLocationPicker.tsx` |

- `.env*` is git-ignored. In Netlify, set both variables under Site configuration > Environment variables.
- Both are `NEXT_PUBLIC_*`, so they are embedded in the browser bundle. Treat the Geoapify key as public and restrict it by domain in the Geoapify dashboard. Whether it is restricted is TBC.
- Separate dev, staging and prod environment definitions are TBC. The repo only shows the dev API fallback and the Netlify setting.

---

## 3. Frontend Architecture

### 3.1 Pattern
Feature-folder layout. The `admin` feature follows **Model / ViewModel / View**:
- `models/`: types and pure helpers (permissions, navigation).
- `viewmodels/`: hooks holding screen state and logic (`useAdminPortalViewModel`, `useLoginViewModel`).
- `views/`: React components that render UI.
- `api/`: RTK Query endpoints.
- `components/`: reusable UI.

### 3.2 Folder structure
```
frontend/
├─ netlify.toml (repo root)      Netlify build config
├─ next.config.ts                reactStrictMode, output: "export"
├─ tests/                        node:test suites (*.test.cjs)
├─ docs/group-orders-api.md      Group-orders API notes
├─ design-qa.md, payments-design-qa.md, FRONTEND_*_NOTES.md   QA / change notes
├─ public/                       logo.jpg, login/*.png
└─ src/
   ├─ app/
   │  ├─ layout.tsx              <html>, MuiProvider, StoreProvider, TooltipLayer
   │  ├─ page.tsx                "/"      -> <App />
   │  ├─ login/page.tsx          "/login" -> <App />
   │  ├─ globals.css             ~10k lines, all CSS
   │  └─ providers/              MuiProvider.tsx (theme), StoreProvider.tsx
   └─ features/
      ├─ admin/                  App.tsx, store.ts, authSlice.ts, api/, components/,
      │                          models/, services/, viewmodels/, views/
      ├─ employees/              api/, components/, models/, services/, viewmodels/, views/
      ├─ orders/                 api/, components/, views/
      ├─ restaurants/            api/, views/
      ├─ riders/                 api/, views/
      └─ stations/               api/, components/, views/
```

### 3.3 Pages and layouts
- `app/layout.tsx` is the only layout. It wraps children in `MuiProvider` and `StoreProvider` and mounts the global `TooltipLayer`.
- `app/page.tsx` and `app/login/page.tsx` both render `features/admin/App`. `/login` exists only so bookmarks do not 404.
- **There is one real URL.** Every other "page" is a screen switched by state inside `App` (see section 9).
- `AppShell` (`admin/components/AppShell.tsx`) is the signed-in layout: sidebar navigation, header with title and subtitle, notice panel, and the quick action to add an employee.

### 3.4 Services, utilities and custom logic
| File | Role |
|---|---|
| `admin/services/adminPortalService.ts` | Returns the empty signed-out profile (`getAdmin()`) |
| `admin/services/rememberedEmail.ts` | "Remember me" cookie (email only, 30 days) |
| `admin/models/access.ts` | `normalizePermissionMap`, `can`, `sectionsWithRead`, `missingPermissions` |
| `admin/models/navigation.ts` | Sidebar sections, groups and sub-sections |
| `admin/models/formatStatusLabel.ts`, `disabledReason.ts` | Display helpers |
| `restaurants/api/restaurantId.ts` | Restaurant public-ID helpers |
| `employees/services/employeeService.ts` | Employee helpers |

Custom hooks are the viewmodels: `useAdminPortalViewModel`, `useLoginViewModel`, `useUsersViewModel`, `useForgotPasswordViewModel`, `employeesViewModel`, `assignRoleViewModel`, `employeeDetailsViewModel`. No separate `hooks/` folder exists.

---

## 4. Design Implementation

### 4.1 Figma
No Figma file link or export is in the repo. TBC. The only design references are `design-qa.md` and `payments-design-qa.md`. They mention a local PNG, `Train Dabba Admin Portal Login.png`, as the login reference, and state that visual comparison was not completed (no browser tool was available).

### 4.2 Design tokens
**TypeScript source: `src/app/theme/tokens.ts`.** Shared colours, radii, spacing and the breakpoint scale live here. MUI-styled components (`sx`) and the MUI theme import `colors` from it instead of hard-coding hex values. Do not add a literal hex that already has a token.

**CSS variables** (`globals.css`): there are **two `:root` blocks**. The last one wins, so the values users see are:
```css
--orange:#ee5b00; --orange-deep:#c94c00; --orange-wash:#fff0e6;   /* last :root block (~line 7650) */
--radius-1:6px; --radius-2:8px; --radius-3:12px; --radius-4:16px;
--space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px; --space-5:20px; --space-6:24px; --space-8:32px;
```
The first block still declares `--orange:#ff8a22`, `--orange-deep:#e9700d` and `--orange-wash:#fff1e3`, but they are overridden and never rendered.

`tests/design-tokens.test.cjs` compares the effective `:root` values with `tokens.ts` (so the two cannot silently drift) and rejects any `@media` width that is not in the approved scale (`sm 560`, `md 760`, `lg 900`, `xl 1100`) or the existing legacy list.

**Still inconsistent (design decision needed):** the MUI theme primary is `#ff5a0a` (rarely visible, since most MUI parts are styled by `sx`) and the list search focus border is `#ff6b21`. Both are kept in `legacyOranges` so nothing changed visually. Pick one brand orange (`#ee5b00` is what the CSS renders) and retire them.

**MUI theme** (`app/providers/MuiProvider.tsx`), values come from `tokens.ts`:
```ts
palette: {
  primary: { main: "#ff5a0a", dark: "#e84e00", light: "#fff1e8" },  // legacyOranges
  success: { main: "#16834a", light: "#eaf7ef" },
  error:   { main: "#cf4141", light: "#fff0ef" },
  text:    { primary: "#202b3d", secondary: "#647089" },
  divider: "#dfe4eb",
},
shape: { borderRadius: 10 },  // not on the radius scale; kept to avoid a visual change
typography: { fontFamily: '"DM Sans", Arial, sans-serif',
              button: { fontSize: "14px", fontWeight: 600, textTransform: "none" } }
```

### 4.3 Typography, spacing and dimensions
- Font: DM Sans (400/500/600/700), body 14px.
- No spacing scale or component dimension tokens exist. Spacing and sizes are literal values inside `globals.css`. A formal scale is TBC.
- Example of an inline dimension: the pagination items are 40x40 with a 9px radius (`ListPagination.tsx`).

### 4.4 CSS architecture
- One global stylesheet using BEM-like class names (`phone-input__code`, `payments-module .payments-metrics`). There are no CSS modules and no Tailwind.
- MUI is used selectively (Pagination, theme provider), styled through `sx`.
- Minimum page width is 320px (`html`/`body`).

### 4.5 Theme management
Light theme only. No dark mode and no theme switcher exist.

---

## 5. Page and Screen Documentation

The `Screen` type is `"login" | "dashboard" | "management" | "profile" | "edit-profile" | "employees" | "employee-details" | "assign-role" | "employee-activity"`. Everything listed here lives at `/` (or `/login` for the sign-in screen). "Route" below means the screen id.

Shared behavior unless a row says otherwise:
- API errors show an inline message.
- Lists use the shared `Skeleton` or `SkeletonTable` while loading.
- A permission failure hides the action rather than showing a 403.

### 5.1 Sign-in (`login`)
- **Purpose:** employee authentication.
- **Components:** `LoginView`, `useLoginViewModel`.
- **Fields:** email, password (show/hide toggle), "Remember me".
- **Validation:** the email is trimmed. Password rules are enforced by the backend. The code shows `error.data.message`, else `"Invalid email or password"`.
- **API:** `POST /auth/employee/login`.
- **Success:** the session is saved to Redux and localStorage, the cache is reset, and the app moves to the dashboard.
- **Session-expired state:** if the user was signed out by a 401, the form shows `Your session has expired. Please sign in again. (<METHOD url returned 401: reason>)`.
- **Related screen:** `ForgotPasswordView` calls `POST /auth/employee/forgot-password`. The response is always the same message so accounts cannot be discovered.

### 5.2 Dashboard (`dashboard`)
- **Purpose:** operational overview. Greets the employee by name.
- **Component:** `DashboardView`, `TrendChart`, `ChartRangeSelect`.
- **Data (each query is skipped unless the user has `read` on that resource):** users, employees, restaurants, pending registrations, pending profile edits, riders, all orders, stations.
- **Interactions:** cards and rows call `openSection(section, subsectionId)` to jump to the matching section.
- **Order status labels used:** All Orders, Delivered, Cancelled, Searching for food, Waiting for order, At payment stage.
- Empty and error copy per widget is TBC.

### 5.3 Management workspace (`management`)
`ManagementView` (1,092 lines) renders a workspace by `selectedManagementId` and `selectedSubsection`.

| Section (sidebar) | Sub-sections | Implemented content |
|---|---|---|
| Users | All Users, Complaints, User Activity | Users table, search, status filter, pagination and details panel (`GET/PUT /customer-users`). Complaints and activity are `ComingSoonPanel`. |
| Restaurants | All Restaurants, Performance, Approvals, Complaints | List, block/unblock, details, registration and profile-edit approvals, menu panel, Add food category. Performance and Complaints are TBC (a `ComingSoonPanel` is used in this workspace). |
| Delivery Partners | Riders, Handlers | `DeliveryPartnersView`. Riders are live (see 5.8). Handlers use hard-coded sample rows. |
| Orders | Cancelled Orders | Orders table (see 5.9). |
| Group Orders | none | `GroupOrdersView` (see 5.10). |
| Stations | All Stations, Station Performance | `StationsView` (see 5.7). |
| Payments | Transactions, Payouts, Settlements, Refunds | `PaymentsView`, **sample data only**. |
| Marketing | Offers, Coupons, Campaigns, Marketing Analytics | `ComingSoonPanel`. |
| Reports | Sales, Order, User, Operational | `ComingSoonPanel`. |

### 5.4 Employees (`employees`, `employee-details`, `employee-activity`, `assign-role`)
- **Permission gate:** all four require `employees.read`.
- **EmployeesView:** list, search, paginate, create employee in a `SidePanel`, activate/deactivate.
- **Create fields and validation** (`EmployeesView.tsx`):
  - employee ID: "Enter an employee ID"
  - name: "Enter the employee's name"
  - email: "Enter the employee's email"
  - password: "Password must be at least 8 characters"
  - role: "Select a role", or "Enter a name for the new role" when creating a new role inline
- **EmployeeDetailsView:** profile, status and role assignment, with remove/restore role.
- **AssignRoleView ("Role Privileges"):** create, edit and delete roles with `PermissionMatrixEditor`.
- **EmployeeActivityView:** 25 lines, a thin placeholder. Real data is TBC.
- **Conditional loading:** `/roles` needs `roles.read`; `/permissions` needs `permissions.read`; `/employee-roles` metadata needs both `employee_roles.read` and `roles.read` (see `FRONTEND_UPDATE_NOTES.md`).

### 5.5 Restaurant approvals
- **RegistrationApprovalsPanel:** `GET /admin/restaurant-registration-requests?status=` with `StatusTabs`. A review modal (`ReviewModal`) shows full details from `useGetRestaurantReviewQuery`. A decision calls `PATCH /admin/restaurant-registration-requests/:requestId`.
- **ProfileEditApprovalsPanel:** `GET /admin/restaurant-profile-requests`, then `PATCH .../:id/approve` or `PATCH .../:id/reject` with `{ rejection_reason }`.
- **RestaurantApprovalsView:** summary of pending counts for both queues.

### 5.6 Add food category (`AddCategoryPanel`)
- **Fields:** category name (required), image (required on create; optional replacement on rename).
- **Validation:** "Category name is required"; "Category image is required"; "Image must be a JPG, PNG or WEBP file"; "Image must be smaller than 2 MB".
- **API:** `GET/POST /admin/categories`, `PATCH /admin/categories/:id` (multipart: `category_name`, `cat_img_id`).
- **Permission:** `restaurants.insert`.
- **States:** loading, error with retry (`refetch`), saving and renaming flags.

### 5.7 Stations (`StationsView`)
- **Sub-sections:** All Stations (list, create, edit, activate/deactivate) and Station Performance (one selected station, metrics from all orders).
- **Fields:** name, code, city, state, latitude/longitude (picked on a Leaflet map via `StationLocationPicker`), status.
- **API:** `GET /stations` (paged, fetched fully by `getAllStations`), `POST /stations`, `PATCH /stations/:id`. Delete is intentionally not offered.
- **Permission:** `stations.insert`, `stations.update`.
- **Errors:** "The station could not be saved. Try again." / "The station status could not be changed."

### 5.8 Delivery Partners (`DeliveryPartnersView`)
- **Fields and validation** (from the source):
  - name: letters, 2 to 100 characters
  - mobile: `^[6-9]\d{9}$`
  - licence: `^[A-Z]{2}\d{2}(19|20)\d{2}\d{7}$`
  - station: required when applicable
- **API:** `GET/POST /delivery-partner-users`.
- **Handlers tab:** local hard-coded rows, no API.

### 5.9 Orders
- **API:** `GET /orders` (paged), `getAllOrders` loops pages of 100.
- Columns include order number, restaurant ID and name, delivery station, total, and status (`OrderStatus` badge).

### 5.10 Group Orders (`GroupOrdersView`)
- **API:** `GET /orders/group-orders`, `GET /orders/group-orders/restaurants`, `POST /orders/group-orders/:grpOrdId/restaurant` with `{ restaurant_id, items? }`.
- **Permission:** `orders.update` to assign.
- Details and the response contract are in `docs/group-orders-api.md`. These routes were not in the local backend when that note was written.

### 5.11 Profile (`profile`, `edit-profile`)
- Shows name, email, role and access. Edit fields are name, email, phone (`PhoneInput`, Indian mobile) and location.
- **Saving only updates local state** (`"Profile changes saved locally"`). No API call is made.

---

## 6. Component Documentation

All in `src/features/admin/components/` unless noted. Props below are taken from source. Only the main ones are listed; check the file for the full type.

| Component | Purpose | Key props (type, default) |
|---|---|---|
| `AppShell` | Signed-in layout: sidebar, header, notice | `title`, `subtitle`, `screen`, `admin`, `noticeOpen`, `selectedManagementId`, `selectedSubsection`, `managementOpen`, `onNavigate`, `onSelectManagement`, `onToggleManagement`, `onToggleNotice`, `onQuickAddEmployee`, `children` |
| `SidePanel` | Slide-over form panel | `open: boolean`, `onClose`, `eyebrow?`, `title: string`, `description?`, `children`, `footer?`, `elevated?` (stack above another panel) |
| `ReviewModal` | Review dialog | `title`, `subtitle?`, `status?`, `statusBadge?`, `compact?`, `closeOnAnyClick?`, `onClose`, `children`, `footer` |
| `ConfirmDialog` | Confirmation, closes on Escape unless busy | `open`, `title`, `message: ReactNode`, `confirmLabel="Confirm"`, `cancelLabel="Cancel"`, `busyLabel?`, `busy=false`, `tone="default"\|"danger"`, `confirmButtonTone="default"\|"soft-green"`, `onConfirm`, `onCancel` |
| `ListPagination` | MUI pagination, returns null when `count < 1` | `page`, `count`, `onChange(page)`, `disabled=false` |
| `ListToolbar` | Search box and refresh | `value`, `onChange`, `placeholder`, `label`, `refreshing=false`, `onRefresh` |
| `StatusTabs` | Status filter tabs | see file |
| `Skeleton` / `SkeletonTable` | Loading placeholders | `width="100%"`, `height=12`, `style` / `columns: string[]`, `rows=6` |
| `PhoneInput` | +91 fixed prefix, 10 digits | `value`, `onChange(digits)`, `invalid?`, `required?`, `placeholder="10-digit mobile number"` |
| `TransientSuccessMessage`, `ComingSoonPanel`, `RefreshButton`, `PrimaryActionButton`, `SoftGreenButton`, `ManagementActionButton`, `ManagementStatus`, `SectionActions`, `RequiredFieldMark`, `ChartRangeSelect`, `UserAvatar`, `Brand`, `Icon`, `TooltipLayer`, `LocationMap` | Small shared UI | props TBC; open the file |
| `employees/components/PermissionMatrixEditor`, `RoleSearchSelect` | Role and permission editing | props TBC |
| `stations/components/StationLocationPicker` | Leaflet map picker (Geoapify tiles) | props TBC |
| `orders/components/OrderStatus` | Order status badge | props TBC |

Usage example (`ConfirmDialog`):
```tsx
<ConfirmDialog
  open={confirmOpen}
  title="Block restaurant?"
  message="The restaurant will stop receiving orders."
  tone="danger"
  busy={isLoading}
  onConfirm={handleBlock}
  onCancel={() => setConfirmOpen(false)}
/>
```
This example is illustrative. The title and message text are not copied from a real call site.

Phone helpers exported from `PhoneInput.tsx`: `INDIA_COUNTRY_CODE`, `normalizeIndianMobile`, `validateIndianMobile`.

Component variants, per-component responsive behavior and a Storybook-style catalogue: TBC (no Storybook is configured).

---

## 7. API Integration

### 7.1 Base query (`admin/api/baseApi.ts`)
```ts
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "https://train-dhaba-backend-dev.up.railway.app/api/v1";

prepareHeaders: (headers) => {
  headers.set("Content-Type", "application/json");
  const accessToken = localStorage.getItem("train_dabba_access_token");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  return headers;
}
```
The wrapper `baseQueryWithSessionCheck` turns any 401 (except from `/auth/employee/login`) into a `train-dabba:session-expired` window event. It also stores a description of the failing request in `sessionStorage["train_dabba_last_401"]`. A 403 is passed through unchanged.

### 7.2 Adding an endpoint
Endpoints are injected per feature:
```ts
export const stationsApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    updateStation: builder.mutation<Station, { id: string; changes: Partial<StationInput> }>({
      query: ({ id, changes }) => ({ url: `/stations/${id}`, method: "PATCH", body: changes }),
      transformResponse: (response: StationResponse) => response.data,
      invalidatesTags: (_r, _e, { id }) => [{ type: "Station", id }, { type: "Station", id: "LIST" }],
    }),
  }),
});
export const { useUpdateStationMutation } = stationsApi;
```
New cache tag names must be added to `tagTypes` in `baseApi.ts`. Current tags: User, AdminUser, AdminAccess, Restaurant, AdminCategory, MenuItem, RegistrationRequest, ProfileEditRequest, Order, Rider, Station, Employee, Role, Permission.

### 7.3 Endpoints used by the frontend

| Area | Method and path |
|---|---|
| Auth | `POST /auth/employee/login`, `GET /auth/employee/me`, `POST /auth/employee/forgot-password` |
| Customers | `GET /customer-users`, `PUT /customer-users/:id` |
| Employees | `GET/POST /employees`, `PATCH /employees/:id`, `GET/POST /employee-roles`, `PATCH/DELETE /employee-roles/:id` |
| Roles / permissions | `GET/POST /roles`, `PUT/DELETE /roles/:id`, `GET/POST /permissions` |
| Restaurants | `GET /restaurants`, `PUT/DELETE /restaurants/:id` (unblock = PUT `{status:"ACTIVE"}`, block = DELETE) |
| Registration review | `GET /admin/restaurant-registration-requests`, `PATCH .../:requestId` |
| Profile edits | `GET /admin/restaurant-profile-requests`, `PATCH .../:id/approve`, `PATCH .../:id/reject` |
| Menu | `GET /admin/menu-items`, `PATCH /admin/menu-items/:itemId/status` |
| Categories | `GET/POST /admin/categories`, `PATCH /admin/categories/:id` |
| Cuisines | `GET /cuisines` |
| Riders | `GET/POST /delivery-partner-users` |
| Stations | `GET/POST /stations`, `PATCH /stations/:id` |
| Orders | `GET /orders` |
| Group orders | `GET /orders/group-orders`, `GET /orders/group-orders/restaurants`, `POST /orders/group-orders/:id/restaurant` |

The frontend does not call `PUT /riders/:id`, `PATCH /delivery-partner-users/:id/status` or any station DELETE, although the backend has some of them.

Confirming that every `/admin/*` and group-order route exists in the backend you point at: TBC. They were not visible in the backend route files in the local checkout.

### 7.4 Pagination
Three patterns:
1. Page-by-page (server-side): `getUsers` (customers) sends `page`, `limit`, `search` and `status` to the server and renders one page at a time.
2. Fetch-everything: `getAll*` endpoints (orders, restaurants, riders, stations, employees) use `queryFn` to loop pages of 100 until `pagination.totalPages` (or a short page) and merge. Lists then search, filter and paginate client-side with `ListPagination`.
3. Counts: `getRestaurantsTotal` and `getStationsTotal` fetch one row and read `pagination.total` through `listTotal()` (`admin/api/listTotal.ts`). Use these for dashboard counts. Pending riders are still counted client-side over the first 100 riders, because the deployed API rejects `GET /delivery-partner-users?status=PENDING` with 400 "Invalid delivery partner status" (the repo validator accepts it, so the deployed backend differs; confirm the real status values before using a rider status filter). **Never use `data.length` of a page as a count:** a page is capped at 100 rows, so the number stops growing once the list passes the cap (this was a bug on the dashboard).

**Why the fetch-everything lists have not been converted yet:** the backend only filters by one exact `status` (orders, riders, restaurants) and only the customers list has a `search` parameter. Orders also needs the "Active" tab (everything except cancelled and delivered) and per-status tab counts. Moving those lists to server paging from the frontend alone would make search cover only the current page and break the Active tab. The backend needs search and a multi-status or group filter first.

### 7.5 File uploads
Category create and update send `FormData` (`category_name`, `cat_img_id`). Upload limits are enforced in the UI (JPG/PNG/WEBP, under 2 MB).

**Needs verification:** `prepareHeaders` always sets `Content-Type: application/json`. For a `FormData` body the browser normally sets `multipart/form-data` with a boundary itself, and a forced JSON header can break that. Check the category upload against the live API; if it fails, skip the header when `body instanceof FormData` (the request body is not visible in `prepareHeaders`, so this may need a custom `fetchFn` or a per-endpoint `headers` override).

### 7.6 Error handling
- Each form shows `error.data.message` (or a fixed fallback).
- A 401 ends the session, a 403 does not.
- Permission-gated queries use `skip` so restricted users do not trigger avoidable 403 responses.

---

## 8. State Management

| Concern | Mechanism |
|---|---|
| Server data and caching | RTK Query (`baseApi`), tag-based invalidation |
| Auth state | Redux slice `auth` (`employee`, `role`, `permissions`, `accessToken`, `refreshToken`, `isAuthenticated`), set via `setAuthSession` and cleared via `clearAuthSession` |
| Screen and navigation state | Local `useState` in `useAdminPortalViewModel` |
| Form state | Local `useState` in each view |
| Context | None apart from the Redux and MUI providers |
| Zustand | Not used |

**Persistence** (localStorage keys): `train_dabba_access_token`, `train_dabba_refresh_token`, `train_dabba_employee`, `train_dabba_role`, `train_dabba_permissions`. `sessionStorage` holds `train_dabba_session_expired` and `train_dabba_last_401`. A cookie `train_dabba_remembered_email` holds the email when "Remember me" is ticked.

**Session lifecycle:**
1. Login stores the session, then `startSession` builds the profile from the response.
2. On page load, a stored token is read from localStorage. Then `GET /auth/employee/me` refreshes the profile and permissions. `currentData` (not `data`) is used so one employee's cached profile cannot leak to the next.
3. Logout clears the five storage keys, `clearAuthSession()` and `baseApi.util.resetApiState()`.
4. There is **no automatic token refresh**. A refresh token is stored but not used; the session ends when the backend rejects the token.

**Permission model:** the backend returns `{ resource: ["read","insert","update","delete"] }`. The frontend normalizes it and checks with `can(map, "stations", "update")`. A legacy array of resource names is read as `read` only.

---

## 9. Routing and Navigation

**There is no URL-based routing.** Only `/` and `/login` exist, and both mount the same component. Navigation is the `screen` state, with sub-section state for the management workspace.

Consequences developers must know:
- The URL does not change when navigating; the browser Back button leaves the app; screens cannot be bookmarked or deep-linked.
- A page refresh always lands on `dashboard` (when a token exists) or `login`.
- No 404 page exists, and no dynamic routes exist. Selected IDs (e.g. `selectedEmployeeId`) live in state.

**Guards:**
- Public: `login` (and forgot password). Everything else renders only when a session exists (`screen !== "login"` is driven by token and profile).
- Employee screens require `employees.read` via `screenRequirement` in `useAdminPortalViewModel`. `navigate()` silently ignores a disallowed target.
- Sidebar items are filtered by the sections the user has `read` on (`sectionsWithRead`).
- Action buttons are gated per component (for example `canAssignGroupOrders`, `canAddRestaurantCategory`).
- Sign-out (`navigate("login")`) wipes the session.

Migrating to real routes (e.g. App Router segments) is TBC. With `output: "export"`, dynamic segments would need `generateStaticParams` or query-string routing.

---

## 10. Form Handling

Patterns used across forms:
- Local `useState` per field. `showErrors` flips to true on the first submit attempt so errors appear only then (`StationsView`, `DeliveryPartnersView`).
- Validation functions return an error map (for example the rider form), or an array of `[condition, message]` pairs checked in order (`EmployeesView`).
- Required fields are marked with `RequiredFieldMark`. Mobile numbers use `PhoneInput`.
- Submit disables while `isLoading`/`isSubmitting`. Failure shows a form-level message. Success shows `TransientSuccessMessage` and closes the panel.
- Image upload (category): type and size checks run before the request, with a drop zone, preview, and change/remove.
- Reset: panels clear their fields when closed or after a successful save (exact reset timing per form: TBC).

Validation rules found in the code:

| Field | Rule |
|---|---|
| Employee password | at least 8 characters |
| Mobile (rider, `PhoneInput`) | `^[6-9]\d{9}$`, the `+91`, `91` or `0` prefix is stripped |
| Rider name | letters, spaces and `.'-`, 2 to 100 characters |
| Rider licence | `^[A-Z]{2}\d{2}(19|20)\d{2}\d{7}$` (example `TS0920190012345`) |
| Category image | JPG/PNG/WEBP, under 2 MB, required on create |
| Category name | required |

---

## 11. Responsive Design

- Desktop-first. The minimum supported width is 320px (`min-width: 320px` on `html` and `body`).
- `globals.css` uses many `@media (max-width: …)` rules, at 480, 560, 600, 620, 640, 720, 760, 820, 900, 980, 1000, 1100, 1180, 1200, 1240, 1300, 1400 and 1700px, plus one `min-width: 821px` and `max-width: 1100px` tablet band. The approved scale for new rules is `sm 560`, `md 760`, `lg 900`, `xl 1100` (`tokens.ts`). The other values are legacy; `tests/design-tokens.test.cjs` fails if a new one is added.
- A commit titled "Fix mobile navigation" indicates the sidebar collapses on small screens; the exact breakpoint is TBC.
- Typical changes: metric grids drop from 4 to 2 to 1 columns (`.payments-metrics`), and `.order-details` becomes a single column at 560px.
- Browser support matrix and device testing results: TBC.

---

## 12. Performance

What exists:
- Static export (no server rendering at runtime) served from Netlify's CDN.
- Leaflet is loaded on demand with `import("leaflet")` inside effects, which keeps it out of the initial bundle.
- RTK Query caching and tag invalidation, plus `skip` on unauthorized queries.
- `getAll*` endpoints fetch every page up front, which is fine for current data volumes but will not scale. Server-side pagination would be needed for large lists.

Not found: `next/image` usage, route-level code splitting (single page; large views such as `ManagementView` at 1,092 lines are imported statically), bundle analysis, memoization audits, or a performance budget. All TBC.

Risks: the 10k-line global CSS and the Google Fonts `@import` are render-blocking.

---

## 13. Testing

**Current state:** `npm test` runs `node --test`, with no test framework dependency. Two suites exist in `tests/`, written with Node's built-in `node:test` and `node:assert`, transpiling TypeScript on the fly with the `typescript` package:
- `tests/group-order-assignment.test.cjs`: checks that the group-order response is normalized (display number `GRP-D299KB` kept separate from the UUID) and that the assignment posts to `/orders/group-orders/GRP-D299KB/restaurant`.
- `tests/restaurant-approval-ids.test.cjs`: restaurant ID handling for approvals.

Run:
```bash
cd frontend
npm test             # node --test (finds tests/*.test.cjs)
npm run typecheck    # tsc --noEmit
npm run lint         # eslint .
npm run check        # all three
```
Do not pass the folder (`node --test tests/`): current Node versions treat it as a file path and fail. Last local run: all 19 tests pass (group orders, approval IDs, design tokens, list totals), `tsc` clean, ESLint 0 errors (41 warnings).

Not present: component tests, integration tests, E2E (Playwright/Cypress) and coverage tooling. A suggested manual regression checklist for the areas most likely to break:

| Case | Steps | Expected |
|---|---|---|
| Wrong password | Sign in with bad credentials | Inline error, stays on sign-in, no "session expired" text |
| Expired token | Delete or alter token in localStorage, trigger any call | Returned to sign-in with the session-expired message |
| Restricted role | Sign in as an employee with only `orders.read` | Only the Orders-related sections visible; no employee screens |
| Category upload | Add a category with a 3 MB PNG | "Image must be smaller than 2 MB" |
| Category upload | Add a valid image | Category appears in the list (also confirms the multipart concern in 7.5) |
| Station edit | Deactivate a station | Status changes without signing the user out |
| Logout then login as another employee | Sign out, sign in as a different user | No data from the first user is visible |

---

## 14. Deployment

- **Hosting:** Netlify (static). The repo root `netlify.toml` sets `base = "frontend"`, `command = "npm run build"`, `publish = "out"`, `NODE_VERSION = "22"`.
- **CI/CD:** Netlify auto-deploys on push to `main`. `.github/workflows/ci.yml` runs type-check, lint, tests and the static build (frontend) plus a syntax check (backend) on every pull request and push to `main`. It only blocks deploys once it is set as a **required status check** in GitHub branch protection (a repo setting, not code). Until then Netlify and Railway still deploy on push regardless of the result.
- **Backend:** Railway, auto-deploys on push to `main`.
- **Environment:** set `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_GEOAPIFY_API_KEY` in Netlify. If you forget the API URL, the production site silently talks to the **dev** backend.
- **Release process:** pushing to `main` deploys. Preview and staging flow, approvals and release tagging: TBC.
- **Rollback:** not documented in the repo. Netlify's "Publish deploy" on a previous deploy restores an earlier build (platform feature; confirm the team's procedure). TBC.

---

## 15. Developer Handover

### 15.1 Completed modules (functional)
Sign-in and forgot password; session handling; role and permission-aware navigation; employees, roles and permission matrix; users list/details/status; restaurants list, details, block/unblock; registration and profile-edit approvals; restaurant menu view and item status; food category create/rename with image; stations create/edit/status and a performance view; delivery partner list/create; orders list; group-order assignment; dashboard with live counts.

### 15.2 Pending or placeholder
- Payments (all four tabs): sample data only.
- Marketing, Reports, user Complaints and Activity, restaurant Performance and Complaints: `ComingSoonPanel`.
- Delivery partner Handlers: hard-coded rows. Rider edit and status change are not wired in the UI.
- Employee Activity: stub.
- Profile edit: local only, no API.
- Trains section: paused in role permissions.

### 15.3 API dependencies to confirm
`/admin/categories`, `/admin/menu-items`, `/admin/restaurant-*` and the `/orders/group-orders*` routes. `docs/group-orders-api.md` says the group-order routes came from the deployed Swagger, not the local backend.

### 15.4 Known issues and risks
1. **No URL routing** (see section 9).
2. **Several oranges remain:** CSS renders `#ee5b00`; the MUI theme primary is `#ff5a0a` and the search focus border is `#ff6b21` (see 4.2). Values are now centralized in `tokens.ts`, but one brand orange still has to be chosen.
3. **Multipart header risk** on category upload (section 7.5).
4. **Tokens in localStorage** are readable by any script on the page. The refresh token is stored but unused.
5. **Dev API fallback** in production if the env var is missing.
6. **Profile edit not persisted.**
7. **Fetch-all list loading** (orders, restaurants, riders, stations, employees) will degrade with data growth. It needs backend search and group filters first (see 7.4).
8. **No component or end-to-end tests.** CI and ESLint now exist, but 41 lint warnings remain, mostly `react-hooks/set-state-in-effect` and `exhaustive-deps` (see `eslint.config.mjs`).
9. **Single 10k-line CSS file** makes style conflicts likely.
10. A stray untracked `backend/backend/` folder exists in the repo (backend side).

### 15.5 Technical limitations
Static export means no server components with runtime data, no Next.js API routes and no middleware. Auth gating is entirely client-side, so the backend must enforce all permissions (it does via `authorize`).

### 15.6 Troubleshooting
| Symptom | Likely cause and check |
|---|---|
| Suddenly signed out | A 401 from any request. Read the message on the sign-in screen or `sessionStorage.train_dabba_last_401` |
| Section missing from sidebar | Role lacks `read` on that resource; check `localStorage.train_dabba_permissions` |
| Map is blank | `NEXT_PUBLIC_GEOAPIFY_API_KEY` missing or restricted |
| Data from wrong environment | `NEXT_PUBLIC_API_BASE_URL` unset, so the dev fallback is used |
| Stale list after a change | Mutation missing the right `invalidatesTags`, or tag absent from `tagTypes` |
| Next.js behaves unexpectedly | `AGENTS.md` warns this Next.js version has breaking changes; read `node_modules/next/dist/docs/` before changing framework-level code |

### 15.7 Suggested improvements
Add real routes; unify design tokens and split the CSS; clear the remaining lint warnings, then promote them to errors; add component tests and E2E; make the CI check required in branch protection; wire Payments, Reports and Marketing to APIs; replace fetch-all with server-side pagination; document the rollback procedure.
