import { AppError } from "../utils/app-error.js";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const isValidEmail = (email) => {
  if (email.length > 254) {
    return false;
  }

  const parts = email.split("@");

  if (parts.length !== 2) {
    return false;
  }

  const [localPart, domain] = parts;

  if (
    localPart.length === 0 ||
    localPart.length > 64 ||
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    localPart.includes("..") ||
    !/^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(localPart)
  ) {
    return false;
  }

  const domainLabels = domain.split(".");

  return (
    domainLabels.length >= 2 &&
    domainLabels.every((label) =>
      label.length <= 63 &&
      /^[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?$/i.test(label)
    ) &&
    /^[A-Z]{2,63}$/i.test(domainLabels.at(-1))
  );
};

const isValidPhone = (phone) =>
  /^\+?[1-9]\d{9,14}$/.test(phone);

const RESTAURANT_TYPES = new Set([
  "restaurant",
  "cloud_kitchen"
]);

const FOOD_TYPES = new Set([
  "veg",
  "non_veg",
  "egg"
]);

const isValidPincode = (pincode) =>
  /^\d{6}$/.test(pincode);

const isValidPan = (pan) =>
  /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan);

const isValidGstin = (gstin) =>
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(
    gstin
  );

const isValidAadhaar = (aadhaar) =>
  /^\d{12}$/.test(aadhaar);

const isValidIfsc = (ifsc) =>
  /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc);

const isValidDate = (value) => {
  if (typeof value !== "string") return false;

  const date = new Date(value);

  return !Number.isNaN(date.getTime());
};

const isValidTime = (value) =>
  /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);


/* -------------------------------------------------------------------------- */
/* Generic request body validation                                             */
/* -------------------------------------------------------------------------- */

const requireObjectBody = (body) => {
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    throw new AppError(
      "Request body must be a valid JSON object",
      400
    );
  }
};


/* -------------------------------------------------------------------------- */
/* Restaurant Details                                                         */
/* -------------------------------------------------------------------------- */

export const validateRestaurantDetails = (
  req,
  res,
  next
) => {
  try {
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
    } = req.body;

    /*
     * multipart/form-data sends array fields as strings.
     *
     * Example:
     * '["C2803947234","C2803947235"]'
     *
     * Convert them back into arrays before validation.
     */
    const parseArrayField = (value, fieldName) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    throw new AppError(
      `${fieldName} must be an array`,
      400
    );
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new AppError(
      `${fieldName} cannot be empty`,
      400
    );
  }

  // JSON array format:
  // ["C2803947234","C2803947235"]
  if (
    trimmedValue.startsWith("[") &&
    trimmedValue.endsWith("]")
  ) {
    try {
      const parsed = JSON.parse(trimmedValue);

      if (!Array.isArray(parsed)) {
        throw new Error();
      }

      return parsed;
    } catch {
      throw new AppError(
        `${fieldName} must be a valid JSON array`,
        400
      );
    }
  }

  // Swagger multipart format:
  // C2803947234,C2803947235
  return trimmedValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

    const parsedCuisines =
      parseArrayField(cusines, "cusines");

    const parsedFoodServed =
      parseArrayField(food_served, "food_served");

    if (
      typeof restaurant_name !== "string" ||
      !restaurant_name.trim()
    ) {
      throw new AppError(
        "restaurant_name is required",
        400
      );
    }

    if (
      typeof owner_name !== "string" ||
      !owner_name.trim()
    ) {
      throw new AppError(
        "owner_name is required",
        400
      );
    }

    if (
      typeof mobile !== "string" ||
      !mobile.trim()
    ) {
      throw new AppError(
        "mobile is required",
        400
      );
    }

    if (!isValidPhone(mobile.trim())) {
      throw new AppError(
        "mobile must be a valid phone number with 10 to 15 digits and an optional leading +",
        400
      );
    }

    if (
      typeof restaurant_type !== "string" ||
      !restaurant_type.trim()
    ) {
      throw new AppError(
        "restaurant_type is required",
        400
      );
    }

    const normalizedRestaurantType =
      restaurant_type.trim().toLowerCase();

    if (!RESTAURANT_TYPES.has(normalizedRestaurantType)) {
      throw new AppError(
        "restaurant_type must be either restaurant or cloud_kitchen",
        400
      );
    }

    if (
      typeof restaurant_email !== "string" ||
      !restaurant_email.trim()
    ) {
      throw new AppError(
        "restaurant_email is required",
        400
      );
    }

    if (!isValidEmail(restaurant_email.trim())) {
      throw new AppError(
        "restaurant_email must be a valid email address",
        400
      );
    }

    if (
      typeof restaurant_contact !== "string" ||
      !restaurant_contact.trim()
    ) {
      throw new AppError(
        "restaurant_contact is required",
        400
      );
    }

    if (!isValidPhone(restaurant_contact.trim())) {
      throw new AppError(
        "restaurant_contact must be a valid phone number with 10 to 15 digits and an optional leading +",
        400
      );
    }

    if (
      typeof password !== "string" ||
      !password
    ) {
      throw new AppError(
        "password is required",
        400
      );
    }

    if (parsedCuisines.length === 0) {
      throw new AppError(
        "At least one cuisine is required",
        400
      );
    }

    if (parsedFoodServed.length === 0) {
      throw new AppError(
        "At least one food type is required",
        400
      );
    }

    const normalizedFoodServed = parsedFoodServed.map(
      (foodType) => {
        if (typeof foodType !== "string") {
          throw new AppError(
            "Each food_served value must be a string",
            400
          );
        }

        const normalizedFoodType = foodType
          .trim()
          .toLowerCase()
          .replace(/[\s-]+/g, "_");

        if (!FOOD_TYPES.has(normalizedFoodType)) {
          throw new AppError(
            "food_served values must be veg, non_veg, or egg",
            400
          );
        }

        return normalizedFoodType;
      }
    );

    /*
     * Put parsed arrays back into req.body.
     *
     * This is important because the service receives
     * req.body after this validator.
     */
    req.body.cusines = parsedCuisines;
    req.body.restaurant_type = normalizedRestaurantType;
    req.body.restaurant_email =
      restaurant_email.trim().toLowerCase();
    req.body.mobile = mobile.trim();
    req.body.restaurant_contact =
      restaurant_contact.trim();
    req.body.food_served = normalizedFoodServed;

    next();
  } catch (error) {
    next(error);
  }
};


/* -------------------------------------------------------------------------- */
/* Restaurant Location                                                        */
/* -------------------------------------------------------------------------- */

export const validateRestaurantLocation = (
  req,
  res,
  next
) => {
  try {
    requireObjectBody(req.body);

    const {
      lat,
      lon,
      city,
      state,
      pincode,
      landmark,
      house_no
    } = req.body;

    if (
      typeof lat !== "number" ||
      !Number.isFinite(lat) ||
      lat < -90 ||
      lat > 90
    ) {
      throw new AppError(
        "lat must be a valid latitude between -90 and 90",
        400
      );
    }

    if (
      typeof lon !== "number" ||
      !Number.isFinite(lon) ||
      lon < -180 ||
      lon > 180
    ) {
      throw new AppError(
        "lon must be a valid longitude between -180 and 180",
        400
      );
    }

    if (!isNonEmptyString(city)) {
      throw new AppError(
        "city is required",
        400
      );
    }

    if (!isNonEmptyString(state)) {
      throw new AppError(
        "state is required",
        400
      );
    }

    if (!isNonEmptyString(pincode)) {
      throw new AppError(
        "pincode is required",
        400
      );
    }

    if (!isValidPincode(pincode.trim())) {
      throw new AppError(
        "pincode must be a valid 6-digit Indian pincode",
        400
      );
    }

    if (!isNonEmptyString(house_no)) {
      throw new AppError(
        "house_no is required",
        400
      );
    }

    if (
      landmark !== undefined &&
      landmark !== null &&
      !isNonEmptyString(landmark)
    ) {
      throw new AppError(
        "landmark must be a non-empty string when provided",
        400
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};


/* -------------------------------------------------------------------------- */
/* Business Documents                                                         */
/* -------------------------------------------------------------------------- */

export const validateBusinessDocuments = (req, res, next) => {
  try {
    const {
      fssai_number,
      fssai_expiry_date,
      pan_number,
      gst_number,
      business_proof_document_number,
      aadhaar_number
    } = req.body;

    if (!fssai_number) {
      throw new AppError(
        "FSSAI number is required",
        400
      );
    }

    if (!fssai_expiry_date) {
      throw new AppError(
        "FSSAI expiry date is required",
        400
      );
    }

    if (!pan_number) {
      throw new AppError(
        "PAN number is required",
        400
      );
    }

    if (!gst_number) {
      throw new AppError(
        "GST number is required",
        400
      );
    }

    if (!business_proof_document_number) {
      throw new AppError(
        "Business proof document number is required",
        400
      );
    }

    if (!aadhaar_number) {
      throw new AppError(
        "Aadhaar number is required",
        400
      );
    }

    if (!/^[0-9]{12}$/.test(aadhaar_number)) {
      throw new AppError(
        "Aadhaar number must contain exactly 12 digits",
        400
      );
    }

    if (
      !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(
        pan_number.toUpperCase()
      )
    ) {
      throw new AppError(
        "Invalid PAN number",
        400
      );
    }

    if (
      !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9][A-Z][A-Z0-9]$/.test(
        gst_number.toUpperCase()
      )
    ) {
      throw new AppError(
        "Invalid GSTIN",
        400
      );
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        fssai_expiry_date
      )
    ) {
      throw new AppError(
        "FSSAI expiry date must be in YYYY-MM-DD format",
        400
      );
    }

    const files = req.files || {};

    const requiredFiles = [
      ["fssai_document", "FSSAI document"],
      ["pan_document", "PAN document"],
      ["gst_document", "GST document"],
      [
        "business_proof_document",
        "Business proof document"
      ],
      ["aadhaar_document", "Aadhaar document"]
    ];

    for (const [field, label] of requiredFiles) {
      if (!files[field]?.[0]) {
        throw new AppError(
          `${label} is required`,
          400
        );
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};


/* -------------------------------------------------------------------------- */
/* Bank Account                                                               */
/* -------------------------------------------------------------------------- */

export const validateBankAccount = (req, res, next) => {
  try {
    const {
      account_holder_name,
      account_number,
      IFSC,
      Bank_name
    } = req.body;

    if (!account_holder_name?.trim()) {
      throw new AppError(
        "Account holder name is required",
        400
      );
    }

    if (!account_number?.trim()) {
      throw new AppError(
        "Account number is required",
        400
      );
    }

    if (!IFSC?.trim()) {
      throw new AppError(
        "IFSC is required",
        400
      );
    }

    if (!Bank_name?.trim()) {
      throw new AppError(
        "Bank name is required",
        400
      );
    }

    if (!req.files?.bank_proof?.[0]) {
      throw new AppError(
        "Bank proof document is required",
        400
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};


/* -------------------------------------------------------------------------- */
/* Operating Hours                                                            */
/* -------------------------------------------------------------------------- */

const DAYS = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun"
];

const validateDaySchedule = (day, schedule) => {
  if (
    !schedule ||
    typeof schedule !== "object" ||
    Array.isArray(schedule)
  ) {
    throw new AppError(
      `${day} must be an object`,
      400
    );
  }

  const {
    is_open,
    is_24_hours,
    slots
  } = schedule;

  if (typeof is_open !== "boolean") {
    throw new AppError(
      `${day}.is_open must be boolean`,
      400
    );
  }

  if (typeof is_24_hours !== "boolean") {
    throw new AppError(
      `${day}.is_24_hours must be boolean`,
      400
    );
  }

  if (!Array.isArray(slots)) {
    throw new AppError(
      `${day}.slots must be an array`,
      400
    );
  }

  if (!is_open) {
    if (is_24_hours) {
      throw new AppError(
        `${day} cannot be 24 hours when it is closed`,
        400
      );
    }

    if (slots.length > 0) {
      throw new AppError(
        `${day}.slots must be empty when the day is closed`,
        400
      );
    }

    return;
  }

  if (is_24_hours) {
    if (slots.length > 0) {
      throw new AppError(
        `${day}.slots must be empty when the restaurant is open 24 hours`,
        400
      );
    }

    return;
  }

  if (slots.length === 0) {
    throw new AppError(
      `${day}.slots must contain at least one time slot`,
      400
    );
  }

  for (const [index, slot] of slots.entries()) {
    if (
      !slot ||
      typeof slot !== "object" ||
      Array.isArray(slot)
    ) {
      throw new AppError(
        `${day}.slots[${index}] must be an object`,
        400
      );
    }

    if (!isValidTime(slot.opening_time)) {
      throw new AppError(
        `${day}.slots[${index}].opening_time is invalid`,
        400
      );
    }

    if (!isValidTime(slot.closing_time)) {
      throw new AppError(
        `${day}.slots[${index}].closing_time is invalid`,
        400
      );
    }

    if (
      slot.opening_time === slot.closing_time
    ) {
      throw new AppError(
        `${day}.slots[${index}] opening and closing time cannot be the same`,
        400
      );
    }
  }
};

export const validateOperatingHours = (req, res, next) => {
  try {
    const operatingHours = req.body;

    if (
      !operatingHours ||
      typeof operatingHours !== "object" ||
      Array.isArray(operatingHours)
    ) {
      throw new AppError(
        "Operating hours must be a JSON object",
        400
      );
    }

    const allowedDays = [
      "mon",
      "tue",
      "wed",
      "thu",
      "fri",
      "sat",
      "sun"
    ];

    const submittedDays = Object.keys(operatingHours);

    // Reject unknown day names
    for (const day of submittedDays) {
      if (!allowedDays.includes(day)) {
        throw new AppError(
          `Invalid day: ${day}`,
          400
        );
      }
    }

    // At least one day must be provided
    if (submittedDays.length === 0) {
      throw new AppError(
        "At least one day must be provided",
        400
      );
    }

    // HH:mm — 24-hour format
    const timeRegex =
      /^([01]\d|2[0-3]):([0-5]\d)$/;

    const timeToMinutes = (time) => {
      const [hours, minutes] =
        time.split(":").map(Number);

      return hours * 60 + minutes;
    };

    for (const day of submittedDays) {
      const dayData = operatingHours[day];

      if (
        !dayData ||
        typeof dayData !== "object" ||
        Array.isArray(dayData)
      ) {
        throw new AppError(
          `${day} must be an object`,
          400
        );
      }

      const {
        is_open,
        is_24_hours,
        slots
      } = dayData;

      // is_open validation
      if (typeof is_open !== "boolean") {
        throw new AppError(
          `${day}.is_open must be a boolean`,
          400
        );
      }

      // is_24_hours validation
      if (typeof is_24_hours !== "boolean") {
        throw new AppError(
          `${day}.is_24_hours must be a boolean`,
          400
        );
      }

      // slots validation
      if (!Array.isArray(slots)) {
        throw new AppError(
          `${day}.slots must be an array`,
          400
        );
      }

      // Closed day
      if (!is_open) {
        if (is_24_hours) {
          throw new AppError(
            `${day}: closed day cannot be 24 hours`,
            400
          );
        }

        if (slots.length > 0) {
          throw new AppError(
            `${day}: closed day cannot contain time slots`,
            400
          );
        }

        continue;
      }

      // 24-hour day
      if (is_24_hours) {
        if (slots.length > 0) {
          throw new AppError(
            `${day}: 24-hour day must have empty slots`,
            400
          );
        }

        continue;
      }

      // Open but not 24 hours
      if (slots.length === 0) {
        throw new AppError(
          `${day}: at least one time slot is required`,
          400
        );
      }

      let previousClosingTime = null;

      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];

        if (
          !slot ||
          typeof slot !== "object" ||
          Array.isArray(slot)
        ) {
          throw new AppError(
            `${day}.slots[${i}] must be an object`,
            400
          );
        }

        const {
          opening_time,
          closing_time
        } = slot;

        // Validate opening time
        if (
          typeof opening_time !== "string" ||
          !timeRegex.test(opening_time)
        ) {
          throw new AppError(
            `${day}.slots[${i}].opening_time must use HH:mm 24-hour format`,
            400
          );
        }

        // Validate closing time
        if (
          typeof closing_time !== "string" ||
          !timeRegex.test(closing_time)
        ) {
          throw new AppError(
            `${day}.slots[${i}].closing_time must use HH:mm 24-hour format`,
            400
          );
        }

        const openingMinutes =
          timeToMinutes(opening_time);

        const closingMinutes =
          timeToMinutes(closing_time);

        // Closing must be after opening
        if (closingMinutes <= openingMinutes) {
          throw new AppError(
            `${day}.slots[${i}]: closing time must be after opening time`,
            400
          );
        }

        // Prevent overlapping / unsorted shifts
        if (
          previousClosingTime !== null &&
          openingMinutes < previousClosingTime
        ) {
          throw new AppError(
            `${day}.slots[${i}]: time slots cannot overlap and must be in chronological order`,
            400
          );
        }

        previousClosingTime = closingMinutes;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};


/* -------------------------------------------------------------------------- */
/* Section validator                                                          */
/* -------------------------------------------------------------------------- */

export const validateRegistrationSection = (
  req,
  res,
  next
) => {
  const section = req.params.section;

  const validators = {
    restaurant_details: validateRestaurantDetails,
    restaurant_location: validateRestaurantLocation,
    business_documents: validateBusinessDocuments,
    bank_account: validateBankAccount,
    operating_hours: validateOperatingHours
  };

  const validator = validators[section];

  if (!validator) {
    return next(
      new AppError(
        `Unsupported registration section: ${section}`,
        400
      )
    );
  }

  return validator(req, res, next);
};