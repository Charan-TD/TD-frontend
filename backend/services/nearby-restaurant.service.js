
import {
  getStationDropdown,
  findStationByName,
  findNearbyRestaurantsWithMenuItems
} from "../repositories/nearby-restaurant.repository.js";

import {
  generateSignedUrl,
  StorageObjectNotFoundError
} from "./storage.service.js";

import { AppError } from "../utils/app-error.js";
import { getRestaurantOnlineStatus } from "../utils/restaurant-online-status.js";

const MENU_ITEM_IMAGE_BUCKET = "menu_item_images";
const SAMPLE_RESTAURANT_RATING = 4.5;

const getImageIds = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch {
      return [value];
    }
  }

  return [];
};

const attachMenuItemImages = async (menuItem) => {
  const { img_id, ...item } = menuItem;

  const imageIds = getImageIds(img_id);

  const img_urls = await Promise.all(
    imageIds.map(async (imageId) => {
      try {
        return await generateSignedUrl(
          MENU_ITEM_IMAGE_BUCKET,
          imageId
        );
      } catch (error) {
        if (error instanceof StorageObjectNotFoundError) {
          return null;
        }

        throw error;
      }
    })
  );

  return {
    ...item,
    img_urls
  };
};

export const getStationDropdownService = async () => {
  return getStationDropdown();
};

export const getNearbyRestaurantsService = async (
  stationName
) => {
  if (
    typeof stationName !== "string" ||
    !stationName.trim()
  ) {
    throw new AppError("station_name is required", 400);
  }

  const station = await findStationByName(
    stationName.trim()
  );

  if (!station) {
    throw new AppError("Station not found", 404);
  }

  const restaurants =
    await findNearbyRestaurantsWithMenuItems(station.id);

  const restaurantsWithImages = await Promise.all(
    restaurants.map(async (restaurant) => ({
      ...restaurant,
      online_status: getRestaurantOnlineStatus(
        restaurant.operating_hours
      ),
      rating: SAMPLE_RESTAURANT_RATING,
      menu_items: await Promise.all(
        restaurant.menu_items.map(attachMenuItemImages)
      )
    }))
  );

  return {
    station: {
      station_id: station.id,
      name: station.name,
      code: station.code,
      city: station.city,
      state: station.state
    },
    radius_km: 2,
    total_restaurants: restaurantsWithImages.length,
    restaurants: restaurantsWithImages
  };
};
