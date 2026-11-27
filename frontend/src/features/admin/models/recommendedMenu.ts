export type { FoodType } from "../../restaurants/api/recommendedMenuApi";
import type { FoodType } from "../../restaurants/api/recommendedMenuApi";

/** A category as the menu view uses it (mapped from the admin categories API). */
export type MenuCategory = {
  id: string;
  name: string;
  /** Category image URL from the server. */
  iconUrl?: string;
};

/** An item as the menu view uses it, with its category matched to an admin category. */
export type MenuItem = {
  id: string;
  name: string;
  /** `category_id` of an admin category. */
  categoryId: string;
  foodType: FoodType;
  imageUrl?: string;
  prepTime: number | null;
};

export const foodTypeLabel: Record<FoodType, string> = { veg: "Veg", non_veg: "Non-veg", egg: "Egg" };
