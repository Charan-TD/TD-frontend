
import multer from "multer";

// ==========================================
// COMMON CONFIGURATION
// ==========================================

// Strictly smaller than 2 MiB per file.
// 2 MiB = 2 * 1024 * 1024 bytes.
const MAX_FILE_SIZE = 2 * 1024 * 1024 - 1;

const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp"
]);

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp"
]);

const storage = multer.memoryStorage();

// ==========================================
// VALIDATION HELPERS
// ==========================================

const documentFileFilter = (req, file, cb) => {
  if (!ALLOWED_DOCUMENT_MIME_TYPES.has(file.mimetype)) {
    return cb(
      new Error(
        "Unsupported file type. Only PDF, JPEG, PNG and WEBP files are allowed."
      )
    );
  }

  cb(null, true);
};

const imageFileFilter = (req, file, cb) => {
  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
    return cb(
      new Error(
        "Unsupported image type. Only JPEG, PNG and WEBP images are allowed."
      )
    );
  }

  cb(null, true);
};

// ==========================================
// 1. RESTAURANT REGISTRATION DOCUMENTS
// ==========================================

const registrationDocumentUpload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 6
  },
  fileFilter: documentFileFilter
});

export const uploadRestaurantRegistrationDocuments =
  registrationDocumentUpload.fields([
    {
      name: "fssai_document",
      maxCount: 1
    },
    {
      name: "pan_document",
      maxCount: 1
    },
    {
      name: "gst_document",
      maxCount: 1
    },
    {
      name: "business_proof_document",
      maxCount: 1
    },
    {
      name: "aadhaar_document",
      maxCount: 1
    },
    {
      name: "bank_proof",
      maxCount: 1
    }
  ]);

// ==========================================
// 2. RESTAURANT REGISTRATION IMAGES
// ==========================================

const registrationImageUpload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 2
  },
  fileFilter: imageFileFilter
});

export const uploadRestaurantRegistrationImages =
  registrationImageUpload.fields([
    {
      name: "logo",
      maxCount: 1
    },
    {
      name: "cover",
      maxCount: 1
    }
  ]);

// ==========================================
// 3. RESTAURANT PROFILE UPDATE FILES
// ==========================================

const profileFileFilter = (req, file, cb) => {
  const imageFields = ["logo", "cover"];

  const documentFields = [
    "fssai",
    "business_proof"
  ];

  if (imageFields.includes(file.fieldname)) {
    return imageFileFilter(req, file, cb);
  }

  if (documentFields.includes(file.fieldname)) {
    return documentFileFilter(req, file, cb);
  }

  return cb(
    new Error(`Unexpected upload field: ${file.fieldname}`)
  );
};

const profileUpload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 4
  },
  fileFilter: profileFileFilter
});

export const uploadRestaurantProfileFiles =
  profileUpload.fields([
    {
      name: "logo",
      maxCount: 1
    },
    {
      name: "cover",
      maxCount: 1
    },
    {
      name: "fssai",
      maxCount: 1
    },
    {
      name: "business_proof",
      maxCount: 1
    }
  ]);

// ==========================================
// 4. RESTAURANT BANK PROOF UPDATE
// ==========================================

const bankProofUpload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  },
  fileFilter: documentFileFilter
});

export const uploadRestaurantBankProof =
  bankProofUpload.single("bank_proof");

export const uploadRestaurantChangeRequestFiles = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 3
  },
  fileFilter: (req, file, cb) => {
    const allowedFields = [
      "pan_card",
      "adhaar_card",
      "gst_document"
    ];

    if (!allowedFields.includes(file.fieldname)) {
      return cb(
        new Error(`Unexpected file field: ${file.fieldname}`)
      );
    }

    documentFileFilter(req, file, cb);
  }
}).fields([
  { name: "pan_card", maxCount: 1 },
  { name: "adhaar_card", maxCount: 1 },
  { name: "gst_document", maxCount: 1 }
]);