import argon2 from "argon2";

import crypto from "crypto";

import supabase from "../config/supabase.js";

import pool from "../config/database.js";
import {
  createRegistration,
  findRegistrationById,
  updateRegistrationSection,
  updateRestaurantImages,
  getRegistrationProgress,
  markRegistrationSubmitted,
  getRestaurantRegistrationReviewStatus as findRegistrationReviewStatus,
  listAdminRegistrationRequests as findAdminRegistrationRequests,
  decideAdminRegistrationRequest as saveAdminRegistrationDecision
} from "../repositories/restaurantRegistration.repository.js";
import { AppError } from "../utils/app-error.js";

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const REQUIRED_SECTIONS = [
  "restaurant_details",
  "restaurant_location",
  "business_documents",
  "bank_account",
  "operating_hours"
];

const REVIEW_REQUEST_STATUSES = new Set([
  "pending",
  "approved",
  "rejected"
]);

const isValidUuid = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );

const ALLOWED_SECTIONS = [
  ...REQUIRED_SECTIONS,
];

/*
 * Current restaurants.admin_restaurant_status does not contain a dedicated
 * "PENDING_APPROVAL" or "DRAFT" value.
 *
 * Therefore, until we explicitly change the DB lifecycle,
 * registration is represented by the existing INACTIVE state.
 *
 * IMPORTANT:
 * INACTIVE must NOT be interpreted here as "rejected".
 * Admin approval/rejection lifecycle will be handled separately.
 */


/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const normalizeString = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  return typeof value === "string"
    ? value.trim()
    : value;
};

const normalizeUpper = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  return value.trim().toUpperCase();
};

const normalizeArray = (value) => {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((item) =>
    typeof item === "string"
      ? item.trim()
      : item
  );
};

const normalizeJsonObject = (value) => {
  if (!value || typeof value !== "object") {
    return value;
  }

  return value;
};

const BUCKET_NAME =
  "restaurant-registration-documents";

const MIME_EXTENSIONS = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
};

export const uploadRegistrationDocument = async (
  registrationId,
  documentType,
  file
) => {
  if (!file) {
    throw new AppError(
      `${documentType} document is required`,
      400
    );
  }

  const extension =
    MIME_EXTENSIONS[file.mimetype];

  if (!extension) {
    throw new AppError(
      `Unsupported file type for ${documentType}`,
      400
    );
  }

  const filePath = [
    "registrations",
    registrationId,
    documentType,
    `${crypto.randomUUID()}${extension}`
  ].join("/");

  const { error } =
    await supabase.storage
      .from(BUCKET_NAME)
      .upload(
        filePath,
        file.buffer,
        {
          contentType: file.mimetype,
          upsert: false
        }
      );

  if (error) {
    console.error(
      `Supabase Storage upload error (${documentType}):`,
      error
    );

    throw new AppError(
      `Failed to upload ${documentType} document`,
      500
    );
  }

  return filePath;
};

/* -------------------------------------------------------------------------- */
/* Registration lookup                                                        */
/* -------------------------------------------------------------------------- */

const getExistingRegistration = async (registrationId) => {
  const registration =
    await findRegistrationById(registrationId);

  if (!registration) {
    throw new AppError(
      "Restaurant registration not found",
      404
    );
  }

  return registration;
};


/* -------------------------------------------------------------------------- */
/* Cuisine validation                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Validates that every submitted cuisine ID exists
 * in the cuisines master table.
 *
 * restaurants.cuisines intentionally remains JSONB.
 * Therefore this is a logical application-level relationship,
 * not a PostgreSQL foreign key.
 */
const validateCuisineIds = async (cuisineIds) => {
  if (!Array.isArray(cuisineIds)) {
    throw new AppError(
      "cuisines must be an array",
      400
    );
  }

  if (cuisineIds.length === 0) {
    throw new AppError(
      "At least one cuisine is required",
      400
    );
  }

  const normalizedIds = [
    ...new Set(
      cuisineIds.map((id) =>
        String(id).trim()
      )
    )
  ];

  const result = await pool.query(
    `
      SELECT cuisine_id
      FROM public.cuisines
      WHERE cuisine_id = ANY($1::varchar[])
    `,
    [normalizedIds]
  );

  const existingIds = new Set(
    result.rows.map(
      (row) => row.cuisine_id
    )
  );

  const invalidIds = normalizedIds.filter(
    (id) => !existingIds.has(id)
  );

  if (invalidIds.length > 0) {
    throw new AppError(
      `Invalid cuisine ID(s): ${invalidIds.join(", ")}`,
      400
    );
  }

  return normalizedIds;
};


/* -------------------------------------------------------------------------- */
/* Restaurant details                                                         */
/* -------------------------------------------------------------------------- */
export const uploadRegistrationImage = async (
  registrationId,
  imageType,
  file
) => {
  if (!file) {
    return null;
  }

  const MIME_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp"
  };

  const extension =
    MIME_EXTENSIONS[file.mimetype];

  if (!extension) {
    throw new AppError(
      `Unsupported image type for ${imageType}`,
      400
    );
  }

  const filePath = [
    "registrations",
    registrationId,
    imageType,
    `${crypto.randomUUID()}${extension}`
  ].join("/");

  const { error } =
    await supabase.storage
      .from(BUCKET_NAME)
      .upload(
        filePath,
        file.buffer,
        {
          contentType: file.mimetype,
          upsert: false
        }
      );

  if (error) {
    console.error(
      `${imageType} upload failed:`,
      error
    );

    throw new AppError(
      `Failed to upload restaurant ${imageType}`,
      500
    );
  }

  return filePath;
};

export const createRestaurantRegistration = async (
  data,
  files
) => {
  const {
  restaurant_name,
  owner_name,
  mobile,
  restaurant_type,
  restaurant_email,
  cusines,
  restaurant_contact,
  password,
  food_served
} = data;

  /*
   * Prevent duplicate owner registration by mobile.
   */
  const mobileResult = await pool.query(
    `
      SELECT id
      FROM public.restaurants
      WHERE owner_mobile = $1
      LIMIT 1
    `,
    [mobile.trim()]
  );

  if (mobileResult.rows.length > 0) {
    throw new AppError(
      "A restaurant registration already exists for this mobile number",
      409
    );
  }

  /*
   * Prevent duplicate restaurant registration by email.
   */
  const emailResult = await pool.query(
    `
      SELECT id
      FROM public.restaurants
      WHERE LOWER(restaurant_email) = LOWER($1)
      LIMIT 1
    `,
    [restaurant_email.trim()]
  );

  if (emailResult.rows.length > 0) {
    throw new AppError(
      "A restaurant registration already exists for this email",
      409
    );
  }

  /*
   * Validate cuisine IDs.
   */
  const cuisines =
    await validateCuisineIds(cusines);

  /*
   * Hash restaurant password.
   */
  const passwordHash =
    await argon2.hash(password);

  /*
   * Create restaurant first so we get
   * the registration ID.
   *
   * Logo and cover are optional.
   */
  const restaurant = await createRegistration({
    name: restaurant_name.trim(),
    owner_name: owner_name.trim(),
    owner_mobile: mobile.trim(),
    restaurant_type: restaurant_type.trim(),
    restaurant_email:
      restaurant_email.trim().toLowerCase(),
    restaurant_contact:
      restaurant_contact.trim(),
    password_hash: passwordHash,
    logo_id: null,
    cover_id: null,
    cuisines,
    food_served:
      normalizeArray(food_served)
  });

  if (!restaurant) {
    throw new AppError(
      "Unable to create restaurant registration",
      500
    );
  }

  /*
   * Upload logo if provided.
   */
  let logoId = null;

if (files?.logo?.[0]) {
  logoId = await uploadRegistrationImage(
    restaurant.id,
    "logo",
    files.logo[0]
  );
}

let coverId = null;

if (files?.cover?.[0]) {
  coverId = await uploadRegistrationImage(
    restaurant.id,
    "cover",
    files.cover[0]
  );
}

if (logoId || coverId) {
  await updateRestaurantImages(
    restaurant.id,
    logoId,
    coverId
  );
 }

  return {
    registrationId: restaurant.id,
    restaurant: {
      ...restaurant,
      logo_id: logoId,
      cover_id: coverId
    }
  };
};


/* -------------------------------------------------------------------------- */
/* Section update                                                             */
/* -------------------------------------------------------------------------- */

export const updateRestaurantRegistrationSection =
  async (
    registrationId,
    section,
    data,
    files
  ) => {
    if (!ALLOWED_SECTIONS.includes(section)) {
      throw new AppError(
        `Unsupported registration section: ${section}`,
        400
      );
    }

    const registration =
      await getExistingRegistration(
        registrationId
      );

    if (
      registration.submitted_time ||
      ["PENDING", "ACTIVE", "ACCEPTED"].includes(
        String(registration.status || "").toUpperCase()
      )
    ) {
      throw new AppError(
        "Submitted restaurant profiles cannot be changed through registration endpoints; use the restaurant profile edit APIs",
        409
      );
    }

    let updateData = {
      ...data
    };

    /* ---------------------------------------------------------------------- */
    /* Restaurant details                                                     */
    /* ---------------------------------------------------------------------- */

    if (section === "restaurant_details") {
      if (updateData.restaurant_name !== undefined) {
        updateData.name =
          normalizeString(
            updateData.restaurant_name
          );

        delete updateData.restaurant_name;
      }

      if (updateData.mobile !== undefined) {
        updateData.owner_mobile =
          normalizeString(
            updateData.mobile
          );

        delete updateData.mobile;
      }

      if (updateData.cusines !== undefined) {
        updateData.cuisines =
          await validateCuisineIds(
            updateData.cusines
          );

        delete updateData.cusines;
      }

      if (updateData.restaurant_email !== undefined) {
        updateData.restaurant_email =
          normalizeString(
            updateData.restaurant_email
          )?.toLowerCase();
      }

      if (updateData.owner_name !== undefined) {
        updateData.owner_name =
          normalizeString(
            updateData.owner_name
          );
      }

      if (updateData.restaurant_type !== undefined) {
        updateData.restaurant_type =
          normalizeString(
            updateData.restaurant_type
          );
      }

      if (updateData.restaurant_contact !== undefined) {
        updateData.restaurant_contact =
          normalizeString(
            updateData.restaurant_contact
          );
      }

      /*
       * Password is only accepted from the request as
       * plaintext during registration/update.
       *
       * DB receives only Argon2 hash.
       */
      if (updateData.password !== undefined) {
        updateData.password_hash =
          await argon2.hash(
            updateData.password
          );

        delete updateData.password;
      }

      /*
       * The frontend names these logo_url and add_cover,
       * while DB columns are logo_id and cover_id.
       *
       * These remain independent of the registration
       * document bucket.
       */
      if (updateData.logo_url !== undefined) {
        updateData.logo_id =
          normalizeString(
            updateData.logo_url
          );

        delete updateData.logo_url;
      }

      if (updateData.add_cover !== undefined) {
        updateData.cover_id =
          normalizeString(
            updateData.add_cover
          );

        delete updateData.add_cover;
      }

      if (updateData.food_served !== undefined) {
        updateData.food_served =
          normalizeArray(
            updateData.food_served
          );
      }
    }


    /* ---------------------------------------------------------------------- */
    /* Location                                                               */
    /* ---------------------------------------------------------------------- */

    if (section === "restaurant_location") {
      if (updateData.lat !== undefined) {
        updateData.latitude =
          updateData.lat;

        delete updateData.lat;
      }

      if (updateData.lon !== undefined) {
        updateData.longitude =
          updateData.lon;

        delete updateData.lon;
      }

      if (updateData.city !== undefined) {
        updateData.city =
          normalizeString(
            updateData.city
          );
      }

      if (updateData.state !== undefined) {
        updateData.state =
          normalizeString(
            updateData.state
          );
      }

      if (updateData.pincode !== undefined) {
        updateData.pincode =
          normalizeString(
            updateData.pincode
          );
      }

      if (updateData.landmark !== undefined) {
        updateData.landmark =
          normalizeString(
            updateData.landmark
          );
      }

      if (updateData.house_no !== undefined) {
        updateData.house_no =
          normalizeString(
            updateData.house_no
          );
      }
    }


    /* ---------------------------------------------------------------------- */
    /* Business documents                                                     */
    /* ---------------------------------------------------------------------- */

     if (section === "business_documents") {
  const {
    fssai_number,
    fssai_expiry_date,
    pan_number,
    gst_number,
    business_proof_document_number,
    aadhaar_number
  } = updateData;

  // Upload all 5 required documents
  const fssaiDocumentId =
    await uploadRegistrationDocument(
      registrationId,
      "fssai",
      files?.fssai_document?.[0]
    );

  const panDocumentId =
    await uploadRegistrationDocument(
      registrationId,
      "pan",
      files?.pan_document?.[0]
    );

  const gstDocumentId =
    await uploadRegistrationDocument(
      registrationId,
      "gst",
      files?.gst_document?.[0]
    );

  const businessProofDocumentId =
    await uploadRegistrationDocument(
      registrationId,
      "business_proof",
      files?.business_proof_document?.[0]
    );

  const aadhaarDocumentId =
    await uploadRegistrationDocument(
      registrationId,
      "aadhaar",
      files?.aadhaar_document?.[0]
    );

  updateData.fssai_number =
    normalizeUpper(fssai_number);

  updateData.fssai_valid_until =
    fssai_expiry_date;

  updateData.fssai_document_id =
    fssaiDocumentId;

  updateData.pan =
    normalizeUpper(pan_number);

  updateData.pan_document_id =
    panDocumentId;

  updateData.gstin =
    normalizeUpper(gst_number);

  updateData.gst_document_id =
    gstDocumentId;

  updateData.business_proof_document_number =
    business_proof_document_number;

  updateData.business_proof_document_id =
    businessProofDocumentId;

  updateData.aadhaar_number =
    aadhaar_number;

  updateData.aadhaar_document_id =
    aadhaarDocumentId;

  // Remove frontend-only field names
  delete updateData.fssai_expiry_date;
  delete updateData.pan_number;
  delete updateData.gst_number;

  }


    /* ---------------------------------------------------------------------- */
    /* Bank account                                                           */
    /* ---------------------------------------------------------------------- */

    if (section === "bank_account") {
  if (
    updateData.account_holder_name !==
    undefined
  ) {
    updateData.account_holder_name =
      normalizeString(
        updateData.account_holder_name
      );
  }

  if (
    updateData.account_number !==
    undefined
  ) {
    updateData.account_number =
      normalizeString(
        updateData.account_number
      );
  }

  if (updateData.IFSC !== undefined) {
    updateData.ifsc =
      normalizeUpper(
        updateData.IFSC
      );

    delete updateData.IFSC;
  }

  if (
    updateData.Bank_name !==
    undefined
  ) {
    updateData.bank_name =
      normalizeString(
        updateData.Bank_name
      );

    delete updateData.Bank_name;
  }

  const bankProofDocumentId =
    await uploadRegistrationDocument(
      registrationId,
      "bank_proof",
      files?.bank_proof?.[0]
    );

  updateData.bank_proof_id =
    bankProofDocumentId;

  delete updateData.Bank_proof;
}


    /* ---------------------------------------------------------------------- */
    /* Operating hours                                                        */
    /* ---------------------------------------------------------------------- */

    if (section === "operating_hours") {  
  updateData.operating_hours =
    normalizeJsonObject({
      ...updateData
    });

  /*
   * The validator receives the entire request body
   * as the operating-hours object.
   *
   * Store a separate copy of the body so
   * operating_hours does not reference updateData itself.
   */
   }


    /* ---------------------------------------------------------------------- */
    /* Menu setup                                                             */
    /* ---------------------------------------------------------------------- */



    /* ---------------------------------------------------------------------- */
    /* Remove frontend-only fields                                            */
    /* ---------------------------------------------------------------------- */

    delete updateData.restaurant_name;
    delete updateData.mobile;
    delete updateData.cusines;


    /* ---------------------------------------------------------------------- */
    /* Prevent unknown fields from reaching repository                        */
    /* ---------------------------------------------------------------------- */

    const allowedFieldsBySection = {
      restaurant_details: [
        "name",
        "owner_name",
        "owner_mobile",
        "restaurant_type",
        "restaurant_email",
        "restaurant_contact",
        "password_hash",
        "logo_id",
        "cover_id",
        "cuisines",
        "food_served"
      ],

      restaurant_location: [
        "latitude",
        "longitude",
        "city",
        "state",
        "pincode",
        "landmark",
        "house_no"
      ],

      business_documents: [
        "fssai_number",
        "fssai_valid_until",
        "fssai_document_id",
        "pan",
        "pan_document_id",
        "gstin",
        "gst_document_id",
        "business_proof_document_number",
        "business_proof_document_id",
        "aadhaar_number",
        "aadhaar_document_id"
      ],

      bank_account: [
        "account_holder_name",
        "account_number",
        "ifsc",
        "bank_name",
        "bank_proof_id"
      ],

      operating_hours: [
        "operating_hours"
      ]
    };

    const allowedFields =
      allowedFieldsBySection[section];

    const filteredData = {};

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredData[field] =
          updateData[field];
      }
    }


    /* ---------------------------------------------------------------------- */
    /* Duplicate identity checks                                              */
    /* ---------------------------------------------------------------------- */

    if (
      section === "restaurant_details"
    ) {
      if (
        filteredData.owner_mobile &&
        filteredData.owner_mobile !==
          registration.owner_mobile
      ) {
        const result =
          await pool.query(
            `
              SELECT id
              FROM public.restaurants
              WHERE owner_mobile = $1
                AND id <> $2
              LIMIT 1
            `,
            [
              filteredData.owner_mobile,
              registrationId
            ]
          );

        if (result.rows.length > 0) {
          throw new AppError(
            "This owner mobile number is already registered",
            409
          );
        }
      }

      if (
        filteredData.restaurant_email &&
        filteredData.restaurant_email.toLowerCase() !==
          registration.restaurant_email?.toLowerCase()
      ) {
        const result =
          await pool.query(
            `
              SELECT id
              FROM public.restaurants
              WHERE LOWER(restaurant_email) = LOWER($1)
                AND id <> $2
              LIMIT 1
            `,
            [
              filteredData.restaurant_email,
              registrationId
            ]
          );

        if (result.rows.length > 0) {
          throw new AppError(
            "This restaurant email is already registered",
            409
          );
        }
      }
    }


    /* ---------------------------------------------------------------------- */
    /* Save section                                                           */
    /* ---------------------------------------------------------------------- */

    const updated =
      await updateRegistrationSection(
        registrationId,
        section,
        filteredData
      );

    if (!updated) {
      throw new AppError(
        "Unable to save registration section",
        500
      );
    }

    const progress =
      await getRegistrationProgress(
        registrationId
      );

    return {
      registrationId,
      section,
      saved: true,
      progress
    };
  };

export const getRestaurantRegistrationSection = async (
  registrationId,
  section
) => {
  if (!ALLOWED_SECTIONS.includes(section)) {
    throw new AppError(
      `Unsupported registration section: ${section}`,
      400
    );
  }

  const registration =
    await getExistingRegistration(registrationId);

  const sectionData = {
    restaurant_details: {
      restaurant_name: registration.name,
      owner_name: registration.owner_name,
      mobile: registration.owner_mobile,
      restaurant_type: registration.restaurant_type,
      restaurant_email: registration.restaurant_email,
      cusines: registration.cuisines,
      restaurant_contact: registration.restaurant_contact,
      food_served: registration.food_served,
      logo_id: registration.logo_id,
      cover_id: registration.cover_id
    },
    restaurant_location: {
      lat: registration.latitude,
      lon: registration.longitude,
      city: registration.city,
      state: registration.state,
      pincode: registration.pincode,
      landmark: registration.landmark,
      house_no: registration.house_no
    },
    business_documents: {
      fssai_number: registration.fssai_number,
      fssai_expiry_date: registration.fssai_valid_until,
      fssai_document_id: registration.fssai_document_id,
      pan_number: registration.pan,
      pan_document_id: registration.pan_document_id,
      gst_number: registration.gstin,
      gst_document_id: registration.gst_document_id,
      business_proof_document_number:
        registration.business_proof_document_number,
      business_proof_document_id:
        registration.business_proof_document_id,
      aadhaar_number: registration.aadhaar_number,
      aadhaar_document_id: registration.aadhaar_document_id
    },
    bank_account: {
      account_holder_name: registration.account_holder_name,
      account_number: registration.account_number,
      IFSC: registration.ifsc,
      Bank_name: registration.bank_name,
      bank_proof_id: registration.bank_proof_id
    },
    operating_hours: registration.operating_hours
  };

  return {
    registrationId: registration.id,
    ...sectionData[section]
  };
};


/* -------------------------------------------------------------------------- */
/* Registration progress                                                      */
/* -------------------------------------------------------------------------- */

export const getRestaurantRegistrationProgress =
  async (registrationId) => {
    await getExistingRegistration(
      registrationId
    );

    const progress =
      await getRegistrationProgress(
        registrationId
      );

    if (!progress) {
      throw new AppError(
        "Unable to determine registration progress",
        500
      );
    }

    const completedSections = [];

    if (
      progress.restaurant_details_completed
    ) {
      completedSections.push(
        "restaurant_details"
      );
    }

    if (
      progress.restaurant_location_completed
    ) {
      completedSections.push(
        "restaurant_location"
      );
    }

    if (
      progress.business_documents_completed
    ) {
      completedSections.push(
        "business_documents"
      );
    }

    if (
      progress.bank_account_completed
    ) {
      completedSections.push(
        "bank_account"
      );
    }

    if (
      progress.operating_hours_completed
    ) {
      completedSections.push(
        "operating_hours"
      );
    }

    return {
      registrationId,
      sections: {
        restaurant_details:
          progress.restaurant_details_completed,

        restaurant_location:
          progress.restaurant_location_completed,

        business_documents:
          progress.business_documents_completed,

        bank_account:
          progress.bank_account_completed,

        operating_hours:
          progress.operating_hours_completed,

      },
      completedSections,
      requiredCompleted:
        completedSections.length,
      requiredTotal:
        REQUIRED_SECTIONS.length,
      canSubmit:
        REQUIRED_SECTIONS.every(
          (section) =>
            completedSections.includes(
              section
            )
        )
    };
  };


/* -------------------------------------------------------------------------- */
/* Final submission                                                           */
/* -------------------------------------------------------------------------- */

export const submitRestaurantRegistration =
  async (registrationId) => {
    const registration = await getExistingRegistration(
      registrationId
    );

    if (
      ["ACTIVE", "ACCEPTED"].includes(
        registration.status?.toUpperCase()
      )
    ) {
      throw new AppError(
        "Restaurant registration has already been accepted",
        409
      );
    }

    if (registration.status?.toUpperCase() === "PENDING") {
      throw new AppError(
        "Restaurant registration is already pending review",
        409
      );
    }

    const progress =
      await getRestaurantRegistrationProgress(
        registrationId
      );

    /*
     * This is the authoritative server-side check.
     *
     * Frontend "done" indicators are never trusted.
     */
    if (!progress.canSubmit) {
      const incompleteSections =
        REQUIRED_SECTIONS.filter(
          (section) =>
            !progress.completedSections.includes(
              section
            )
        );

      throw new AppError(
        `Registration is incomplete. Complete: ${incompleteSections.join(", ")}`,
        400
      );
    }

    /*
     * At this point all five required sections
     * are complete.
     *
     * We intentionally do NOT set ACTIVE here.
     * Submission means "submitted for processing",
     * not "approved".
     *
     * Approval remains separate from submission and is
     * recorded as ACCEPTED by the admin review endpoint.
     */
    const result =
      await markRegistrationSubmitted(
        registrationId
      );

    return {
      registrationId,
      submitted: true,
      status: "PENDING",
      submittedTime: result.submitted_time
    };
  };

export const listAdminRegistrationRequests = async (status = "pending") => {
  const normalizedStatus = String(status).toLowerCase();
  if (!REVIEW_REQUEST_STATUSES.has(normalizedStatus)) {
    throw new AppError(
      "Status must be pending, approved, or rejected",
      400
    );
  }

  return findAdminRegistrationRequests(normalizedStatus);
};

export const decideAdminRegistrationRequest = async (
  requestId,
  adminId,
  decision,
  rejectionReason
) => {
  if (!isValidUuid(requestId)) {
    throw new AppError("Invalid registration request ID", 400);
  }

  if (!adminId) {
    throw new AppError("Admin ID missing", 401);
  }

  if (!["ACCEPTED", "REJECTED"].includes(decision)) {
    throw new AppError(
      "Decision must be ACCEPTED or REJECTED",
      400
    );
  }

  if (decision === "REJECTED") {
    if (
      typeof rejectionReason !== "string" ||
      !rejectionReason.trim()
    ) {
      throw new AppError(
        "Rejection reason is required when rejecting a registration",
        400
      );
    }
  } else if (rejectionReason !== undefined) {
    throw new AppError(
      "Rejection reason is only allowed when decision is REJECTED",
      400
    );
  }

  return saveAdminRegistrationDecision(
    requestId,
    adminId,
    decision,
    decision === "REJECTED" ? rejectionReason.trim() : null
  );
};

export const getRestaurantRegistrationReviewStatus = async (
  registrationId
) => {
  const result = await findRegistrationReviewStatus(
    registrationId
  );

  if (!result) {
    throw new AppError(
      "Restaurant registration not found",
      404
    );
  }

  if (result.review_status === "draft") {
    throw new AppError(
      "Restaurant registration has not been submitted for review",
      409
    );
  }

  const response = {
    status: result.review_status,
    restaurant_name: result.restaurant_name,
    submitted_time: result.submitted_time
  };

  if (result.review_status === "rejected") {
    response.reasons = result.rejection_reasons;
  }

  return response;
};