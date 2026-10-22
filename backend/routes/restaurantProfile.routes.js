
import { Router } from "express";
import multer from "multer";

import { authenticateRestaurant } from "../middleware/restaurantAuthenticate.js";
import * as controller from "../controllers/restaurantProfile.controller.js";
import { uploadRestaurantProfileFiles } from
  "../middleware/restaurantRegistrationUpload.js";
import { uploadRestaurantBankProof } from "../middleware/restaurantRegistrationUpload.js";
import {
  uploadRestaurantChangeRequestFiles
} from "../middleware/restaurantRegistrationUpload.js";

const router = Router();

router.use(authenticateRestaurant);

/**
 * @swagger
 * tags:
 *   - name: Restaurant Profile
 *     description: Restaurant profile management APIs
 */

/**
 * @swagger
 * /api/v1/restaurant/profile:
 *   get:
 *     summary: Get restaurant profile
 *     description: Fetch the authenticated restaurant's profile.
 *     tags: [Restaurant Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: >
 *           Profile retrieved successfully. Includes temporary signed URLs
 *           as logo_url and cover_url without exposing their storage IDs,
 *           plus fssai_document_url,
 *           business_proof_document_url, pan_document_url,
 *           aadhaar_document_url, gst_document_url, and bank_proof_url
 *           when those files are present.
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Restaurant not found
 */
router.get("/", controller.getProfile);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 4
  },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf"
    ];

    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only JPG, PNG, WEBP and PDF files are allowed"));
    }

    cb(null, true);
  }
});

/**
 * @swagger
 * /api/v1/restaurant/profile:
 *   patch:
 *     summary: Update restaurant profile with file uploads
 *     description: >
 *       Update directly editable restaurant details.
 *       Restaurant type is set during registration and cannot be changed.
 *       Logo and cover accept JPG, PNG, or WEBP.
 *       FSSAI and business proof accept JPG, PNG, WEBP, or PDF.
 *       Each uploaded file must be smaller than 2 MB.
 *       Files are uploaded to the restaurant-registration-documents
 *       Supabase Storage bucket.
 *     tags:
 *       - Restaurant Profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               logo:
 *                 type: string
 *                 format: binary
 *                 description: Restaurant logo (less than 2 MB)
 *               cover:
 *                 type: string
 *                 format: binary
 *                 description: Restaurant cover image (less than 2 MB)
 *               fssai:
 *                 type: string
 *                 format: binary
 *                 description: FSSAI certificate (less than 2 MB)
 *               business_proof:
 *                 type: string
 *                 format: binary
 *                 description: Business proof document (less than 2 MB)
 *               cuisines:
 *                 type: string
 *                 example: '["South Indian","Chinese"]'
 *               restaurant_contact:
 *                 type: string
 *                 example: "9876543210"
 *               food_served:
 *                 type: string
 *                 example: '["veg","non_veg"]'
 *               opening_hours:
 *                 type: string
 *                 example: '{"monday":{"open":"09:00","close":"22:00"}}'
 *     responses:
 *       200:
 *         description: Restaurant profile updated successfully
 *       400:
 *         description: Invalid input or file size exceeds limit
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server or storage error
 */
router.patch(
  "/",
  (req, res, next) => {
    uploadRestaurantProfileFiles(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "Each file must be smaller than 2 MB"
          });
        }

        return res.status(400).json({
          success: false,
          message: err.message
        });
      }

      next();
    });
  },
  controller.editProfile
);



/**
 * @swagger
 * /api/v1/restaurant/profile/bank-account:
 *   put:
 *     summary: Replace complete restaurant bank account
 *     description: >
 *       Replace all bank account details together.
 *       Bank proof must be uploaded as a JPG, PNG, WEBP or PDF
 *       smaller than 2 MB. The file is stored in the
 *       restaurant-registration-documents Supabase bucket.
 *     tags: [Restaurant Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - account_holder_name
 *               - account_number
 *               - ifsc
 *               - bank_name
 *               - bank_proof
 *             properties:
 *               account_holder_name:
 *                 type: string
 *                 example: Ravi Kumar
 *               account_number:
 *                 type: string
 *                 example: "123456789012"
 *               ifsc:
 *                 type: string
 *                 example: HDFC0001234
 *               bank_name:
 *                 type: string
 *                 example: HDFC Bank
 *               bank_proof:
 *                 type: string
 *                 format: binary
 *                 description: Bank proof file, less than 2 MB
 *     responses:
 *       200:
 *         description: Bank account replaced successfully
 *       400:
 *         description: Missing fields or invalid bank proof
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Storage or database error
 */
router.put(
  "/bank-account",
  (req, res, next) => {
    uploadRestaurantBankProof(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message:
            err.code === "LIMIT_FILE_SIZE"
              ? "Bank proof must be smaller than 2 MB"
              : err.message
        });
      }

      next();
    });
  },
  controller.replaceBank
);




/**
 * @swagger
 * /api/v1/restaurant/profile/change-requests:
 *   post:
 *     summary: Request restaurant profile changes
 *     description: >
 *       Submit restricted restaurant profile changes for admin approval.
 *       Supports restaurant location, GST, PAN and Aadhaar changes with
 *       document uploads.
 *       Changes are applied only after admin approval.
 *     tags: [Restaurant Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               rest_name:
 *                 type: string
 *                 example: Train Dhaba Express
 *               owner_name:
 *                 type: string
 *                 example: Ravi Kumar
 *               restaurant_type:
 *                 type: string
 *                 enum: [restaurant, cloud_kitchen]
 *                 example: restaurant
 *               lat:
 *                 type: number
 *                 minimum: -90
 *                 maximum: 90
 *                 example: 16.5062
 *               lon:
 *                 type: number
 *                 minimum: -180
 *                 maximum: 180
 *                 example: 80.648
 *               city:
 *                 type: string
 *                 example: Vijayawada
 *               state:
 *                 type: string
 *                 example: Andhra Pradesh
 *               pincode:
 *                 type: string
 *                 pattern: '^[1-9][0-9]{5}$'
 *                 example: "520001"
 *               landmark:
 *                 type: string
 *                 example: Near railway station
 *               house_no:
 *                 type: string
 *                 example: 5_67
 *               gst:
 *                 type: string
 *                 example: 29ABCDE1234F1Z5
 *               gst_document:
 *                 type: string
 *                 format: binary
 *                 description: GST certificate, smaller than 2 MB
 *               pan_number:
 *                 type: string
 *                 example: ABCDE1234F
 *               pan_card:
 *                 type: string
 *                 format: binary
 *                 description: PAN document, smaller than 2 MB
 *               aadhaar_number:
 *                 type: string
 *                 example: "123456789012"
 *               adhaar_card:
 *                 type: string
 *                 format: binary
 *                 description: Aadhaar document, smaller than 2 MB
 *     responses:
 *       201:
 *         description: Change request submitted successfully
 *       400:
 *         description: Invalid request fields or uploaded documents
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Pending change request already exists
 */
router.post(
  "/change-requests",
  (req, res, next) => {
    uploadRestaurantChangeRequestFiles(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message:
            err.code === "LIMIT_FILE_SIZE"
              ? "Each file must be smaller than 2 MB"
              : err.message
        });
      }

      next();
    });
  },
  controller.createRequest
);


/**
 * @swagger
 * /api/v1/restaurant/profile/change-requests:
 *   get:
 *     summary: Get own restaurant profile change requests
 *     tags: [Restaurant Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Change requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       requested_changes:
 *                         type: object
 *                         description: Fields submitted for admin approval.
 *                         properties:
 *                           lat:
 *                             type: number
 *                             example: 16.5062
 *                           lon:
 *                             type: number
 *                             example: 80.648
 *                           city:
 *                             type: string
 *                             example: Vijayawada
 *                           state:
 *                             type: string
 *                             example: Andhra Pradesh
 *                           pincode:
 *                             type: string
 *                             example: "520001"
 *                           landmark:
 *                             type: string
 *                             example: Near railway station
 *                           house_no:
 *                             type: string
 *                             example: 5_67
 *       401:
 *         description: Unauthorized
 */
router.get("/change-requests", controller.listOwn);

export default router;
