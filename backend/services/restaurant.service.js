import {
  getRestaurants,
  findRestaurantById,
  findRestaurantReviewDetailsById,
  findRestaurantByPan,
  findRestaurantByGstin,
  createRestaurant,
  updateRestaurant,
  deactivateRestaurant,
  decideRestaurantRegistration
} from "../repositories/restaurant.repository.js";

import { AppError } from "../utils/app-error.js";
import { getRestaurantOnlineStatus } from "../utils/restaurant-online-status.js";
import {
  generateSignedUrl,
  StorageObjectNotFoundError
} from "./storage.service.js";

const ALLOWED_STATUSES = [
  "ACTIVE",
  "ACCEPTED",
  "INACTIVE",
  "PENDING",
  "REJECTED"
];

const DOCUMENT_URL_FIELDS = {
  logo_id: "logo_url",
  cover_id: "cover_url",
  pan_document_id: "pan_document_url",
  gst_document_id: "gst_document_url",
  fssai_document_id: "fssai_document_url",
  business_proof_document_id: "business_proof_document_url",
  aadhaar_document_id: "aadhaar_document_url",
  bank_proof_id: "bank_proof_url"
};

const DOCUMENT_BUCKET = "restaurant-registration-documents";
const SAMPLE_RESTAURANT_RATING = 4.5;

// List restaurants
export const listRestaurants = async ({
  page = 1,
  limit = 20,
  status
}) => {
  if (status && !ALLOWED_STATUSES.includes(status.toUpperCase())) {
    throw new AppError("Invalid restaurant status", 400);
  }

  const result = await getRestaurants({
    page,
    limit,
    status
  });

  return {
    restaurants: result.rows.map(({
      operating_hours: operatingHours,
      ...restaurant
    }) => ({
      ...restaurant,
      online_status: getRestaurantOnlineStatus(operatingHours),
      rating: SAMPLE_RESTAURANT_RATING
    })),
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

// Get restaurant by ID
export const getRestaurant = async (id) => {
  const restaurant =
    await findRestaurantReviewDetailsById(id);

  if (!restaurant) {
    throw new AppError(
      "Restaurant not found",
      404
    );
  }

  await Promise.all(
    Object.entries(DOCUMENT_URL_FIELDS).map(
      async ([documentIdField, urlField]) => {
        const documentId = restaurant[documentIdField];
        if (!documentId) {
          restaurant[urlField] = null;
          return;
        }

        try {
          restaurant[urlField] = await generateSignedUrl(
            DOCUMENT_BUCKET,
            documentId
          );
        } catch (error) {
          if (!(error instanceof StorageObjectNotFoundError)) {
            throw error;
          }

          console.warn(
            `Restaurant review document not found in storage: ${documentIdField}`,
            { restaurantId: id }
          );
          restaurant[urlField] = null;
        }
      }
    )
  );

  return {
    ...restaurant,
    online_status: getRestaurantOnlineStatus(
      restaurant.operating_hours
    ),
    rating: SAMPLE_RESTAURANT_RATING
  };
};

// Create restaurant
export const createRestaurantService = async (
  data
) => {
  const {
    name,
    restaurant_type,
    pan,
    gstin
  } = data;

  if (!name || name.trim().length === 0) {
    throw new AppError(
      "Restaurant name is required",
      400
    );
  }

  if (
    !restaurant_type ||
    restaurant_type.trim().length === 0
  ) {
    throw new AppError(
      "Restaurant type is required",
      400
    );
  }

  // Check duplicate PAN
  if (pan) {
    const existingPan =
      await findRestaurantByPan(pan);

    if (existingPan) {
      throw new AppError(
        "Restaurant with this PAN already exists",
        409
      );
    }
  }

  // Check duplicate GSTIN
  if (gstin) {
    const existingGstin =
      await findRestaurantByGstin(gstin);

    if (existingGstin) {
      throw new AppError(
        "Restaurant with this GSTIN already exists",
        409
      );
    }
  }

  return await createRestaurant(data);
};

// Update restaurant
export const updateRestaurantService = async (
  id,
  data
) => {
  if (data.restaurant_type !== undefined) {
    throw new AppError(
      "Restaurant type cannot be modified after registration",
      400
    );
  }

  const existingRestaurant =
    await findRestaurantById(id);

  if (!existingRestaurant) {
    throw new AppError(
      "Restaurant not found",
      404
    );
  }

  if (
    data.name !== undefined &&
    (!data.name ||
      data.name.trim().length === 0)
  ) {
    throw new AppError(
      "Restaurant name cannot be empty",
      400
    );
  }

  // Check duplicate PAN
  if (
    data.pan &&
    data.pan !== existingRestaurant.pan
  ) {
    const existingPan =
      await findRestaurantByPan(data.pan);

    if (
      existingPan &&
      existingPan.id !== id
    ) {
      throw new AppError(
        "Restaurant with this PAN already exists",
        409
      );
    }
  }

  // Check duplicate GSTIN
  if (
    data.gstin &&
    data.gstin !== existingRestaurant.gstin
  ) {
    const existingGstin =
      await findRestaurantByGstin(data.gstin);

    if (
      existingGstin &&
      existingGstin.id !== id
    ) {
      throw new AppError(
        "Restaurant with this GSTIN already exists",
        409
      );
    }
  }

  return await updateRestaurant(
    id,
    data
  );
};

// Deactivate restaurant
export const deleteRestaurant = async (
  id
) => {
  const existingRestaurant =
    await findRestaurantById(id);

  if (!existingRestaurant) {
    throw new AppError(
      "Restaurant not found",
      404
    );
  }

  if (
    existingRestaurant.status === "INACTIVE"
  ) {
    throw new AppError(
      "Restaurant is already inactive",
      409
    );
  }

  return await deactivateRestaurant(id);
};

export const reviewRestaurantRegistration = async (
  id,
  decision,
  rejectionReason,
  adminId
) => {
  if (
    decision === "reject" &&
    (
      typeof rejectionReason !== "string" ||
      !rejectionReason.trim()
    )
  ) {
    throw new AppError(
      "Rejection reason is required",
      400
    );
  }

  const result = await decideRestaurantRegistration(
    id,
    decision,
    decision === "reject" ? rejectionReason.trim() : null,
    adminId
  );

  if (!result) {
    throw new AppError("Restaurant not found", 404);
  }

  if (result.conflict) {
    throw new AppError(
      `Restaurant registration has already been processed (current status: ${result.status})`,
      409
    );
  }

  return result;
};