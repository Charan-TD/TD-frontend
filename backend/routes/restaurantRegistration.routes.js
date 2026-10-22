import express from "express";

import {
  createRestaurantRegistrationController,
  updateRestaurantRegistrationSectionController,
  getRestaurantRegistrationSectionController,
  getRestaurantRegistrationProgressController,
  getRestaurantRegistrationReviewStatusController,
  submitRestaurantRegistrationController
} from "../controllers/restaurantRegistration.controller.js";

import {
  uploadRestaurantRegistrationDocuments,
  uploadRestaurantRegistrationImages
} from "../middleware/restaurantRegistrationUpload.js";

import {
  validateRestaurantDetails,
  validateRestaurantLocation,
  validateBusinessDocuments,
  validateBankAccount,
  validateOperatingHours
} from "../validators/restaurantRegistration.validator.js";

const router = express.Router();

const getRegistrationSection = (section) =>
  (req, res, next) => {
    req.params.section = section;
    getRestaurantRegistrationSectionController(
      req,
      res,
      next
    );
  };

/**
 * @swagger
/**
 * @swagger
 * /api/v1/restaurants/registration/restaurant-details:
 *   post:
 *     summary: Create restaurant registration with restaurant details
 *     description: >
 *       Creates a new restaurant registration and saves the required
 *       restaurant details in the same request. Logo and cover images
 *       are optional and are uploaded through the backend.
 *     tags:
 *       - Restaurant Registration
 *
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - restaurant_name
 *               - owner_name
 *               - mobile
 *               - restaurant_type
 *               - restaurant_email
 *               - cusines
 *               - restaurant_contact
 *               - password
 *               - food_served
 *             properties:
 *               restaurant_name:
 *                 type: string
 *                 description: Name of the restaurant.
 *                 example: ABC Restaurant
 *
 *               owner_name:
 *                 type: string
 *                 description: Name of the restaurant owner.
 *                 example: DEF
 *
 *               mobile:
 *                 type: string
 *                 description: Primary mobile number of the restaurant owner.
 *                 pattern: '^\+?[1-9][0-9]{9,14}$'
 *                 example: "+918888888888"
 *
 *               restaurant_type:
 *                 type: string
 *                 description: Must be restaurant or cloud_kitchen.
 *                 enum:
 *                   - restaurant
 *                   - cloud_kitchen
 *                 example: restaurant
 *
 *               restaurant_email:
 *                 type: string
 *                 format: email
 *                 description: Valid email address for the restaurant.
 *                 example: sample123@gmail.com
 *
 *               cusines:
 *                 type: array
 *                 description: List of cuisine IDs selected for the restaurant.
 *                 items:
 *                   type: string
 *                 example:
 *                   - C2803947234
 *                   - C2803947235
 *                   - C2803947236
 *
 *               restaurant_contact:
 *                 type: string
 *                 description: Contact number of the restaurant.
 *                 pattern: '^\+?[1-9][0-9]{9,14}$'
 *                 example: "+917777777777"
 *
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Password for the restaurant account.
 *                 example: Dhaba@123
 *
 *               logo:
 *                 type: string
 *                 format: binary
 *                 description: >
 *                   Optional restaurant logo.
 *                   Maximum size 2 MB.
 *                   Allowed formats are JPEG, PNG and WEBP.
 *
 *               cover:
 *                 type: string
 *                 format: binary
 *                 description: >
 *                   Optional restaurant cover image.
 *                   Maximum size 2 MB.
 *                   Allowed formats are JPEG, PNG and WEBP.
 *
 *               food_served:
 *                 type: array
 *                 description: One or more supported food types.
 *                 items:
 *                   type: string
 *                   enum:
 *                     - veg
 *                     - non_veg
 *                     - egg
 *                 example:
 *                   - veg
 *                   - non_veg
 *                   - egg
 *
 *     responses:
 *       201:
 *         description: Restaurant registration created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *
 *                 message:
 *                   type: string
 *                   example: Restaurant registration created successfully
 *
 *                 data:
 *                   type: object
 *                   properties:
 *                     registrationId:
 *                       type: string
 *                       format: uuid
 *                       example: 550e8400-e29b-41d4-a716-446655440000
 *
 *                     restaurant:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                           example: 550e8400-e29b-41d4-a716-446655440000
 *
 *                         name:
 *                           type: string
 *                           example: ABC Restaurant
 *
 *                         owner_name:
 *                           type: string
 *                           example: DEF
 *
 *                         owner_mobile:
 *                           type: string
 *                           example: "+918888888888"
 *
 *                         restaurant_type:
 *                           type: string
 *                           example: restaurant
 *
 *                         restaurant_email:
 *                           type: string
 *                           format: email
 *                           example: sample123@gmail.com
 *
 *                         restaurant_contact:
 *                           type: string
 *                           example: "+917777777777"
 *
 *                         logo_id:
 *                           type: string
 *                           nullable: true
 *                           example: registrations/550e8400-e29b-41d4-a716-446655440000/logo/2c7c4b4e-6c3d-4d93-9e1e-1f8d6a1e9c2a.jpg
 *
 *                         cover_id:
 *                           type: string
 *                           nullable: true
 *                           example: registrations/550e8400-e29b-41d4-a716-446655440000/cover/7a8d1b7c-5d2e-4f21-b9c3-2e4a6f8d1b55.png
 *
 *                         cuisines:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example:
 *                             - C2803947234
 *                             - C2803947235
 *
 *                         food_served:
 *                           type: array
 *                           items:
 *                             type: string
 *                             enum:
 *                               - veg
 *                               - non_veg
 *                               - egg
 *                           example:
 *                             - veg
 *                             - non_veg
 *                             - egg
 *
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Invalid restaurant details
 *
 *       409:
 *         description: Restaurant mobile number or email already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: A restaurant registration already exists for this mobile number
 *
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */
router.post(
  "/restaurant-details",
  uploadRestaurantRegistrationImages,
  validateRestaurantDetails,
  createRestaurantRegistrationController
);

/**
 * @swagger
 * /api/v1/restaurants/registration/{registrationId}/restaurant-details:
 *   get:
 *     summary: Get saved restaurant details
 *     description: Returns saved restaurant details and image references. Passwords and password hashes are never returned.
 *     tags:
 *       - Restaurant Registration
 *     parameters:
 *       - in: path
 *         name: registrationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Restaurant details fetched successfully
 *       404:
 *         description: Restaurant registration not found
 */
router.get(
  "/:registrationId/restaurant-details",
  getRegistrationSection("restaurant_details")
);

/**
 * @swagger
 * /api/v1/restaurants/registration/{registrationId}/location:
 *   get:
 *     summary: Get saved restaurant location
 *     tags:
 *       - Restaurant Registration
 *     parameters:
 *       - in: path
 *         name: registrationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Restaurant location fetched successfully
 *       404:
 *         description: Restaurant registration not found
 *   put:
 *     summary: Save restaurant location
 *     description: Saves the restaurant's geographical and address information.
 *     tags:
 *       - Restaurant Registration
 *     parameters:
 *       - in: path
 *         name: registrationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Restaurant registration ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lat
 *               - lon
 *               - city
 *               - state
 *               - pincode
 *               - house_no
 *             properties:
 *               lat:
 *                 type: number
 *                 example: 89.82934792843
 *               lon:
 *                 type: number
 *                 example: 15.92384792843
 *               city:
 *                 type: string
 *                 example: vijayawada
 *               state:
 *                 type: string
 *                 example: Andhra Pradesh
 *               pincode:
 *                 type: string
 *                 example: "023482"
 *               landmark:
 *                 type: string
 *                 example: Near neem tree
 *               house_no:
 *                 type: string
 *                 example: 5_67
 *     responses:
 *       200:
 *         description: Restaurant location saved successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Restaurant registration not found
 *       500:
 *         description: Internal server error
 */
router.put(
  "/:registrationId/location",
  validateRestaurantLocation,
  (req, res, next) => {
    req.params.section = "restaurant_location";

    updateRestaurantRegistrationSectionController(
      req,
      res,
      next
    );
  }
);
router.get(
  "/:registrationId/location",
  getRegistrationSection("restaurant_location")
);


/**
 * @swagger
 * /api/v1/restaurants/registration/{registrationId}/business-documents:
 *   get:
 *     summary: Get saved business document details
 *     description: Returns saved document numbers and storage references; file contents are not included.
 *     tags:
 *       - Restaurant Registration
 *     parameters:
 *       - in: path
 *         name: registrationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Business document details fetched successfully
 *       404:
 *         description: Restaurant registration not found
 *   put:
 *     summary: Save business documents
 *     description: Saves business registration details and uploads the required documents to restaurant-registration-documents storage.
 *     tags:
 *       - Restaurant Registration
 *     parameters:
 *       - in: path
 *         name: registrationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Restaurant registration ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - fssai_number
 *               - fssai_expiry_date
 *               - fssai_document
 *               - pan_number
 *               - pan_document
 *               - gst_number
 *               - gst_document
 *               - business_proof_document_number
 *               - business_proof_document
 *               - aadhaar_number
 *               - aadhaar_document
 *             properties:
 *               fssai_number:
 *                 type: string
 *                 example: "11223344556677"
 *               fssai_expiry_date:
 *                 type: string
 *                 format: date
 *                 example: "2027-08-31"
 *               fssai_document:
 *                 type: string
 *                 format: binary
 *                 description: FSSAI registration document
 *               pan_number:
 *                 type: string
 *                 example: "ABCDE1234F"
 *               pan_document:
 *                 type: string
 *                 format: binary
 *                 description: PAN document
 *               gst_number:
 *                 type: string
 *                 example: "37ABCDE1234F1Z5"
 *               gst_document:
 *                 type: string
 *                 format: binary
 *                 description: GST registration document
 *               business_proof_document_number:
 *                 type: string
 *                 example: "TRAD123456789"
 *                 description: Business proof document number
 *               business_proof_document:
 *                 type: string
 *                 format: binary
 *                 description: Business proof document
 *               aadhaar_number:
 *                 type: string
 *                 example: "123456789012"
 *               aadhaar_document:
 *                 type: string
 *                 format: binary
 *                 description: Aadhaar document
 *     responses:
 *       200:
 *         description: Business documents saved successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Restaurant registration not found
 *       500:
 *         description: Internal server error
 */
router.put(
  "/:registrationId/business-documents",
  uploadRestaurantRegistrationDocuments,
  validateBusinessDocuments,
  (req, res, next) => {
    req.params.section = "business_documents";

    updateRestaurantRegistrationSectionController(
      req,
      res,
      next
    );
  }
);
router.get(
  "/:registrationId/business-documents",
  getRegistrationSection("business_documents")
);


/**
 * @swagger
 * /api/v1/restaurants/registration/{registrationId}/bank-account:
 *   get:
 *     summary: Get saved bank account details
 *     description: Returns the saved bank account information and bank proof storage reference.
 *     tags:
 *       - Restaurant Registration
 *     parameters:
 *       - in: path
 *         name: registrationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Bank account details fetched successfully
 *       404:
 *         description: Restaurant registration not found
 *   put:
 *     summary: Save bank account details
 *     description: Saves restaurant bank account information and uploads the bank proof document to Supabase Storage.
 *     tags:
 *       - Restaurant Registration
 *     parameters:
 *       - in: path
 *         name: registrationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - account_holder_name
 *               - account_number
 *               - IFSC
 *               - Bank_name
 *               - bank_proof
 *             properties:
 *               account_holder_name:
 *                 type: string
 *                 example: Sample 123
 *               account_number:
 *                 type: string
 *                 example: "1278512"
 *               IFSC:
 *                 type: string
 *                 example: SBIN0001234
 *               Bank_name:
 *                 type: string
 *                 example: SBI
 *               bank_proof:
 *                 type: string
 *                 format: binary
 *                 description: Bank proof document. Maximum 2 MB. PDF.
 *     responses:
 *       200:
 *         description: Bank account details saved successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Restaurant registration not found
 *       500:
 *         description: Internal server error
 */
router.put(
  "/:registrationId/bank-account",
  uploadRestaurantRegistrationDocuments,
  validateBankAccount,
  (req, res, next) => {
    req.params.section = "bank_account";

    updateRestaurantRegistrationSectionController(
      req,
      res,
      next
    );
  }
);
router.get(
  "/:registrationId/bank-account",
  getRegistrationSection("bank_account")
);

/**
 * @swagger
 * /api/v1/restaurants/registration/{registrationId}/operating-hours:
 *   get:
 *     summary: Get saved restaurant operating hours
 *     tags:
 *       - Restaurant Registration
 *     parameters:
 *       - in: path
 *         name: registrationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Operating hours fetched successfully
 *       404:
 *         description: Restaurant registration not found
 *   put:
 *     summary: Save restaurant operating hours
 *     description: Saves the weekly operating schedule of the restaurant in JSONB format.
 *     tags:
 *       - Restaurant Registration
 *     parameters:
 *       - in: path
 *         name: registrationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Restaurant registration ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             properties:
 *               mon:
 *                 $ref: '#/components/schemas/OperatingDay'
 *               tue:
 *                 $ref: '#/components/schemas/OperatingDay'
 *               wed:
 *                 $ref: '#/components/schemas/OperatingDay'
 *               thu:
 *                 $ref: '#/components/schemas/OperatingDay'
 *               fri:
 *                 $ref: '#/components/schemas/OperatingDay'
 *               sat:
 *                 $ref: '#/components/schemas/OperatingDay'
 *               sun:
 *                 $ref: '#/components/schemas/OperatingDay'
 *           example:
 *             mon:
 *               is_open: true
 *               is_24_hours: false
 *               slots:
 *                 - opening_time: "09:00"
 *                   closing_time: "13:00"
 *                 - opening_time: "14:00"
 *                   closing_time: "17:00"
 *             tue:
 *               is_open: true
 *               is_24_hours: true
 *               slots: []
 *             wed:
 *               is_open: false
 *               is_24_hours: false
 *               slots: []
 *             thu:
 *               is_open: true
 *               is_24_hours: false
 *               slots:
 *                 - opening_time: "10:00"
 *                   closing_time: "14:00"
 *             fri:
 *               is_open: true
 *               is_24_hours: false
 *               slots:
 *                 - opening_time: "09:00"
 *                   closing_time: "13:00"
 *                 - opening_time: "14:00"
 *                   closing_time: "18:00"
 *             sat:
 *               is_open: true
 *               is_24_hours: true
 *               slots: []
 *             sun:
 *               is_open: false
 *               is_24_hours: false
 *               slots: []
 *     responses:
 *       200:
 *         description: Operating hours saved successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Restaurant registration not found
 *       500:
 *         description: Internal server error
 */
router.put(
  "/:registrationId/operating-hours",
  validateOperatingHours,
  (req, res, next) => {
    req.params.section = "operating_hours";

    updateRestaurantRegistrationSectionController(
      req,
      res,
      next
    );
  }
);
router.get(
  "/:registrationId/operating-hours",
  getRegistrationSection("operating_hours")
);


/**
 * @swagger
 * /api/v1/restaurants/registration/{registrationId}/progress:
 *   get:
 *     summary: Get restaurant registration progress
 *     description: >
 *       Returns the completion status of each restaurant registration section.
 *       The response also indicates how many required sections are completed
 *       and whether the registration is ready for final submission.
 *     tags:
 *       - Restaurant Registration
 *
 *     parameters:
 *       - in: path
 *         name: registrationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Restaurant registration ID
 *         example: 550e8400-e29b-41d4-a716-446655440000
 *
 *     responses:
 *       200:
 *         description: Registration progress retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     registrationId:
 *                       type: string
 *                       format: uuid
 *                       example: 550e8400-e29b-41d4-a716-446655440000
 *                     sections:
 *                       type: object
 *                       properties:
 *                         restaurant_details:
 *                           type: boolean
 *                           example: true
 *                         restaurant_location:
 *                           type: boolean
 *                           example: true
 *                         business_documents:
 *                           type: boolean
 *                           example: false
 *                         bank_account:
 *                           type: boolean
 *                           example: false
 *                         operating_hours:
 *                           type: boolean
 *                           example: false
 *                         menu_setup:
 *                           type: boolean
 *                           example: false
 *                     completedSections:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example:
 *                         - restaurant_details
 *                         - restaurant_location
 *                     requiredCompleted:
 *                       type: integer
 *                       example: 2
 *                     requiredTotal:
 *                       type: integer
 *                       example: 5
 *                     canSubmit:
 *                       type: boolean
 *                       example: false
 *
 *       404:
 *         description: Restaurant registration not found
 *
 *       500:
 *         description: Internal server error
 */
router.get(
  "/:registrationId/progress",
  getRestaurantRegistrationProgressController
);

/**
 * @swagger
 * /api/v1/restaurants/registration/{registrationId}/review-status:
 *   get:
 *     summary: Get restaurant registration review status
 *     description: Returns the current pending, rejected, or accepted screen data.
 *     tags:
 *       - Restaurant Registration
 *     parameters:
 *       - in: path
 *         name: registrationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Review status fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Registration review status fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [pending, rejected, accepted]
 *                     restaurant_name:
 *                       type: string
 *                       example: ABC kitchen
 *                     submitted_time:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     reasons:
 *                       type: array
 *                       description: Included for rejected registrations only.
 *                       items:
 *                         type: string
 *             examples:
 *               pending:
 *                 value:
 *                   success: true
 *                   message: Registration review status fetched successfully
 *                   data:
 *                     status: pending
 *                     restaurant_name: ABC kitchen
 *                     submitted_time: "2026-10-09T10:25:00.000Z"
 *               rejected:
 *                 value:
 *                   success: true
 *                   message: Registration review status fetched successfully
 *                   data:
 *                     status: rejected
 *                     restaurant_name: ABC kitchen
 *                     submitted_time: "2026-10-09T10:25:00.000Z"
 *                     reasons:
 *                       - Bank id is invalid
 *                       - Restaurant location is out of reach
 *               accepted:
 *                 value:
 *                   success: true
 *                   message: Registration review status fetched successfully
 *                   data:
 *                     status: accepted
 *                     restaurant_name: ABC kitchen
 *                     submitted_time: "2026-10-09T10:25:00.000Z"
 *       404:
 *         description: Restaurant registration not found
 *       409:
 *         description: Registration has not been submitted for review
 */
router.get(
  "/:registrationId/review-status",
  getRestaurantRegistrationReviewStatusController
);


/**
 * @swagger
 * /api/v1/restaurants/registration/{registrationId}/submit:
 *   post:
 *     summary: Submit restaurant registration
 *     description: >
 *       Submits the restaurant registration after performing the final
 *       server-side completeness check. All five required registration
 *       sections must be completed before submission.
 *     tags:
 *       - Restaurant Registration
 *
 *     parameters:
 *       - in: path
 *         name: registrationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Restaurant registration ID
 *         example: 550e8400-e29b-41d4-a716-446655440000
 *
 *     responses:
 *       200:
 *         description: Restaurant registration submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Restaurant registration submitted successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     registrationId:
 *                       type: string
 *                       format: uuid
 *                       example: 550e8400-e29b-41d4-a716-446655440000
 *                     submitted:
 *                       type: boolean
 *                       example: true
 *                     status:
 *                       type: string
 *                       example: INACTIVE
 *                     submittedTime:
 *                       type: string
 *                       format: date-time
 *                       example: 2026-10-08T18:30:00.000Z
 *
 *       400:
 *         description: Registration is incomplete
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Registration is incomplete. Complete: business_documents, bank_account, operating_hours"
 *
 *       404:
 *         description: Restaurant registration not found
 *
 *       500:
 *         description: Internal server error
 */
router.post(
  "/:registrationId/submit",
  submitRestaurantRegistrationController
);

export default router;