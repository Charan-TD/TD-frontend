import multer from "multer";
import { AppError } from "../utils/app-error.js";

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const MIME_EXTENSIONS = new Map([
  ["image/jpeg", new Set([".jpg", ".jpeg"])],
  ["image/webp", new Set([".webp"])]
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE,
    files: 2
  },
  fileFilter: (req, file, callback) => {
    if (
      file.fieldname === "addons" &&
      file.mimetype === "application/json"
    ) {
      return callback(null, true);
    }

    if (file.fieldname !== "img_id") {
      return callback(
        new AppError(
          "Only img_id images and JSON addons uploads are allowed",
          400
        )
      );
    }

    const extensions = MIME_EXTENSIONS.get(file.mimetype);
    const extension = file.originalname
      .slice(file.originalname.lastIndexOf("."))
      .toLowerCase();

    if (!extensions || !extensions.has(extension)) {
      return callback(
        new AppError(
          "Unsupported image type. Only JPG, JPEG and WEBP files are allowed.",
          400
        )
      );
    }

    callback(null, true);
  }
});

export const uploadMenuItemImages = (req, res, next) => {
  upload.any()(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      const statusCode =
        error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "Each image must not exceed 2 MB"
          : error.code === "LIMIT_UNEXPECTED_FILE"
            ? "Upload one image at a time using the img_id field"
            : error.message;

      return next(new AppError(message, statusCode));
    }

    if (error) {
      return next(error);
    }

    const files = req.files || [];
    const imageFiles = files.filter(
      (file) => file.fieldname === "img_id"
    );
    const addonsFiles = files.filter(
      (file) => file.fieldname === "addons"
    );

    if (imageFiles.length > 1) {
      return next(
        new AppError(
          "Upload one image at a time using the img_id field",
          400
        )
      );
    }

    if (addonsFiles.length > 1) {
      return next(
        new AppError(
          "Upload addons as a single JSON array",
          400
        )
      );
    }

    if (addonsFiles.length === 1) {
      try {
        req.body.addons = JSON.parse(
          addonsFiles[0].buffer.toString("utf8")
        );
      } catch {
        return next(
          new AppError("addons must be a valid JSON array", 400)
        );
      }

      if (!Array.isArray(req.body.addons)) {
        return next(
          new AppError("addons must be a JSON array", 400)
        );
      }
    }

    for (const file of imageFiles) {
      const isJpeg =
        file.mimetype === "image/jpeg" &&
        file.buffer[0] === 0xff &&
        file.buffer[1] === 0xd8 &&
        file.buffer[2] === 0xff;
      const isWebp =
        file.mimetype === "image/webp" &&
        file.buffer.toString("ascii", 0, 4) === "RIFF" &&
        file.buffer.toString("ascii", 8, 12) === "WEBP";

      if (!isJpeg && !isWebp) {
        return next(
          new AppError(
            "Image content does not match its JPG, JPEG, or WEBP file type",
            400
          )
        );
      }
    }

    req.files = imageFiles;
    next();
  });
};

const NUMERIC_FIELDS = [
  "price",
  "tax_rate",
  "preparation_time_minutes",
  "quantity",
  "low_stock_threshold",
  "discounted_price"
];

const BOOLEAN_FIELDS = [
  "owner_is_available",
  "admin_is_available"
];

export const normalizeMenuItemMultipart = (req, res, next) => {
  if (!req.is("multipart/form-data")) {
    return next();
  }

  if (req.body.addons !== undefined) {
    if (typeof req.body.addons === "string") {
      try {
        req.body.addons = JSON.parse(req.body.addons);
      } catch {
        return next(
          new AppError("addons must be a valid JSON array", 400)
        );
      }
    }

    if (!Array.isArray(req.body.addons)) {
      return next(
        new AppError("addons must be a JSON array", 400)
      );
    }
  }

  for (const field of NUMERIC_FIELDS) {
    if (req.body[field] === undefined) continue;

    const value = req.body[field];
    if (
      typeof value !== "string" ||
      value.trim() === "" ||
      !Number.isFinite(Number(value))
    ) {
      return next(
        new AppError(`${field} must be a valid number`, 400)
      );
    }

    req.body[field] = Number(value);
  }

  for (const field of BOOLEAN_FIELDS) {
    if (req.body[field] === undefined) continue;

    if (req.body[field] === "true") {
      req.body[field] = true;
    } else if (req.body[field] === "false") {
      req.body[field] = false;
    } else if (req.body[field] === "null" && field === "admin_is_available") {
      req.body[field] = null;
    } else {
      return next(
        new AppError(`${field} must be true or false`, 400)
      );
    }
  }

  next();
};
