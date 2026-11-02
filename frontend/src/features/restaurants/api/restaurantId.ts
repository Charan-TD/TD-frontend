/** Public IDs accepted by the restaurant details API, distinct from row UUIDs. */
export function publicRestaurantId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim().toUpperCase();
  return /^[A-Z0-9]{4}-[A-Z0-9]{6}$/.test(id) ? id : null;
}

export function restaurantIdFromRequest(raw: Record<string, unknown>): string {
  const restaurant = raw.restaurant && typeof raw.restaurant === "object" && !Array.isArray(raw.restaurant)
    ? raw.restaurant as Record<string, unknown> : {};
  // A request's restaurant_id may still be a foreign-key UUID on older servers.
  // Never let that UUID override the joined restaurant's public identifier.
  for (const value of [raw.public_restaurant_id, restaurant.restaurant_id, restaurant.public_restaurant_id, raw.restaurant_id, restaurant.id]) {
    const id = publicRestaurantId(value);
    if (id) return id;
  }
  return "";
}
