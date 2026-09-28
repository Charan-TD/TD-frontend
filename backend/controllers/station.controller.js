import {
  listStations,
  getStation,
  createStationService,
  updateStationService,
  removeStation
} from "../services/station.service.js";

// GET /api/v1/stations
export const getStations = async (
  req,
  res,
  next
) => {
  try {
    const {
      page = 1,
      limit = 20
    } = req.query;

    const result = await listStations({
      page: Number(page),
      limit: Number(limit)
    });

    return res.status(200).json({
      success: true,
      message: "Stations retrieved successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/stations/:id
export const getStationById = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    const station = await getStation(id);

    return res.status(200).json({
      success: true,
      message: "Station retrieved successfully",
      data: station
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/stations
export const createStation = async (
  req,
  res,
  next
) => {
  try {
    const station =
      await createStationService(req.body);

    return res.status(201).json({
      success: true,
      message: "Station created successfully",
      data: station
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/stations/:id
export const updateStation = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    const station =
      await updateStationService(
        id,
        req.body
      );

    return res.status(200).json({
      success: true,
      message: "Station updated successfully",
      data: station
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/stations/:id
export const deleteStation = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    const station =
      await removeStation(id);

    return res.status(200).json({
      success: true,
      message: "Station deleted successfully",
      data: station
    });
  } catch (error) {
    next(error);
  }
};