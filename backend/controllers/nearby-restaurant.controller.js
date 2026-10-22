
import {
  getStationDropdownService,
  getNearbyRestaurantsService
} from "../services/nearby-restaurant.service.js";

export const getStationDropdownController = async (
  req,
  res,
  next
) => {
  try {
    const stations = await getStationDropdownService();

    return res.status(200).json({
      success: true,
      message: "Stations retrieved successfully",
      data: stations
    });
  } catch (error) {
    next(error);
  }
};

export const getNearbyRestaurantsController = async (
  req,
  res,
  next
) => {
  try {
    const result = await getNearbyRestaurantsService(
      req.query?.station_name
    );

    return res.status(200).json({
      success: true,
      message: "Nearby restaurants retrieved successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};
