# Group orders integration

Checked the deployed Swagger documentation at
https://train-dhaba-backend-dev.up.railway.app/api-docs/swagger-ui-init.js.
The local backend checkout does not yet contain these routes.

## Connected reads

- `GET /api/v1/orders/group-orders`: employee bearer authentication. The docs
  describe all group order fields except internal UUID, without a response example.
  The frontend accepts `data.group_orders` or a `data` array and reports an error
  for an unexpected envelope instead of presenting an empty list.
- `GET /api/v1/orders/group-orders/restaurants`: employee bearer authentication.
  Documented response: `{ success: true, data: { restaurants: [{ name,
  restaurant_id }] } }`. This is the list of active restaurants eligible for
  assignment; IDs are public restaurant IDs.

The customer submission docs define `contact_name`, `mobile_number`, optional
`email`, `group_size`, and `order_details`, with initial status `PENDING`.
The restaurant-facing example also contains `restaurant_id` after assignment.
The provided updated admin response includes `id` (assignment UUID) and `grp_ord_id`
(public display number, e.g. `GRP-D299KB`). The UI uses these separately.
Optional `created_at`, `restaurant_name`, and public request numbers are shown
only when available; the UI does not fabricate them.

## Assignment

The deployed Swagger (checked 2026-10-28) defines
`POST /api/v1/orders/group-orders/{grp_ord_id}/restaurant` with body
`{ restaurant_id: "SPIC-AB12CD", restaurant_menu_items_id?: [{ restaurant_menu_item_id: <uuid>, quantity: <int >= 1> }] }`.
The items array is optional but needs at least one entry when sent; IDs must belong to the selected restaurant. The path takes the public group order ID
(`grp_ord_id`, e.g. `GRP-D299KB`), not the row UUID, and `restaurant_id` is the
public restaurant ID from the eligible-restaurants list. The UI sends exactly
that and refuses to send a UUID as the order ID. `PATCH .../{grp_ord_id}/status`
uses the same identifier.

Confirming an assignment posts the selected public restaurant ID, prevents duplicate
submissions, and switches to Assigned Restaurants only after a successful response.
The order list is invalidated and refetched from the backend. Failures leave the
panel open with the server error. There are no local preview assignments.
Controls require Orders update permission and cannot be used for cancelled/completed
requests. The UI does not separately mutate order status.

Vendors retrieve persisted assignments with
`GET /api/v1/restaurant/orders/group-orders` using a restaurant token. No restaurant
ID is passed in that URL. The backend must resolve the authenticated restaurant
identity consistently with stored assignments; a public ID must not be compared
directly to a UUID database column.

Authenticated admin assignment and vendor retrieval still need integration testing
with real sessions. Public documentation was checked; unit tests mock HTTP responses.
