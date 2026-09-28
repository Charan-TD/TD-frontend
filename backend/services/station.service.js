import {
  getStations,
  findStationById,
  findStationByCode,
  createStation,
  updateStation,
  deleteStation
} from "../repositories/station.repository.js";

import { AppError } from "../utils/app-error.js";

// List stations
export const listStations = async ({
  page = 1,
  limit = 20
}) => {
  const result = await getStations({
    page,
    limit
  });

  return {
    stations: result.rows,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: result.total,
      totalPages: Math.ceil(
        result.total / Number(limit)
      )
    }
  };
};

// Get station by ID
export const getStation = async (id) => {
  const station = await findStationById(id);

  if (!station) {
    throw new AppError(
      "Station not found",
      404
    );
  }

  return station;
};

// Create station
export const createStationService = async (
  data
) => {
  const {
    name,
    code,
    city,
    state
  } = data;

  if (
    !name ||
    name.trim().length === 0
  ) {
    throw new AppError(
      "Station name is required",
      400
    );
  }

  if (
    !code ||
    code.trim().length === 0
  ) {
    throw new AppError(
      "Station code is required",
      400
    );
  }

  if (
    !city ||
    city.trim().length === 0
  ) {
    throw new AppError(
      "City is required",
      400
    );
  }

  if (
    !state ||
    state.trim().length === 0
  ) {
    throw new AppError(
      "State is required",
      400
    );
  }

  const existingStation =
    await findStationByCode(code);

  if (existingStation) {
    throw new AppError(
      "Station with this code already exists",
      409
    );
  }

  return await createStation(data);
};

// Update station
export const updateStationService = async (
  id,
  data
) => {
  const existingStation =
    await findStationById(id);

  if (!existingStation) {
    throw new AppError(
      "Station not found",
      404
    );
  }

  if (
    data.name !== undefined &&
    (!data.name ||
      data.name.trim().length === 0)
  ) {
    throw new AppError(
      "Station name cannot be empty",
      400
    );
  }

  if (
    data.code !== undefined &&
    (!data.code ||
      data.code.trim().length === 0)
  ) {
    throw new AppError(
      "Station code cannot be empty",
      400
    );
  }

  if (
    data.city !== undefined &&
    (!data.city ||
      data.city.trim().length === 0)
  ) {
    throw new AppError(
      "City cannot be empty",
      400
    );
  }

  if (
    data.state !== undefined &&
    (!data.state ||
      data.state.trim().length === 0)
  ) {
    throw new AppError(
      "State cannot be empty",
      400
    );
  }

  // Check duplicate station code
  if (
    data.code &&
    data.code.toUpperCase() !==
      existingStation.code.toUpperCase()
  ) {
    const existingByCode =
      await findStationByCode(data.code);

    if (
      existingByCode &&
      existingByCode.id !== id
    ) {
      throw new AppError(
        "Station with this code already exists",
        409
      );
    }
  }

  return await updateStation(
    id,
    data
  );
};

// Delete station
export const removeStation = async (id) => {
  const existingStation =
    await findStationById(id);

  if (!existingStation) {
    throw new AppError(
      "Station not found",
      404
    );
  }

  return await deleteStation(id);
};