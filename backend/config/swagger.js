import swaggerJsdoc from "swagger-jsdoc";
import pool from "./database.js";
const options = {
  definition: {
    openapi: "3.0.3",

    info: {
      title: "Train Dhaba API",
      version: "1.0.0",
      description: "Train Dhaba backend API documentation"
    },

    servers: [
  {
    url: "http://localhost:5000",
    description: "Local development server"
  },
  {
    url: "https://train-dhaba-backend-dev.up.railway.app",
    description: "Deployed server (Railway)"
  }
 ],
     
    tags: [
  {
  name: "Employee Authentication",
  description:
    "Employee login, password recovery, password reset, password change, token refresh, and authenticated employee operations"
  },
  {
    name: "Employee Roles",
    description: "Employee role assignments"
  },
  {
    name: "Permissions",
    description: "Permission management"
  },
  {
    name: "Delivery Partner Users",
    description: "Delivery partner management"
  },
  {
  name: "Orders",
  description: "Order management"
  },
  {
    name: "admin_restaurant_registration_request",
    description: "Admin review of restaurant registration requests"
  }
],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      },
      schemas: {
        MenuItem: {
          type: "object",
          example: {
            id: "550e8400-e29b-41d4-a716-446655440000",
            restaurant_id: "650e8400-e29b-41d4-a716-446655440000",
            name: "Hyderabadi Chicken Dum Biryani",
            description: "Slow-cooked chicken biryani",
            price: 250,
            tax_rate: 0,
            preparation_time_minutes: 26,
            owner_is_available: true,
            created_at: "2026-10-10T07:38:17.328Z",
            category_id: "SUB002",
            img_id: ["menu-items/9f5d6e38-3d88-4f0a-8f71-26adcb286b45.jpg"],
            img_urls: ["https://example.com/signed-menu-item-image"],
            quantity: 20,
            low_stock_threshold: 5,
            admin_is_available: null,
            admin_item_inactive_reason: null,
            discounted_price: null,
            qty_type: null,
            food_served: "non_veg",
            addons: [
              "750e8400-e29b-41d4-a716-446655440000",
              "850e8400-e29b-41d4-a716-446655440000"
            ]
          },
          properties: {
            id: { type: "string", format: "uuid" },
            restaurant_id: { type: "string", format: "uuid" },
            name: { type: "string" },
            description: { type: "string", nullable: true },
            price: { type: "integer" },
            tax_rate: { type: "number" },
            preparation_time_minutes: { type: "integer" },
            owner_is_available: { type: "boolean" },
            created_at: { type: "string", format: "date-time" },
            category_id: { type: "string", nullable: true },
            img_id: {
              type: "array",
              description: "Supabase Storage object paths in menu_item_images",
              items: { type: "string" }
            },
            img_urls: {
              type: "array",
              description: "Temporary signed URLs for the menu item's images, valid for one hour",
              items: { type: "string", nullable: true }
            },
            quantity: { type: "integer" },
            low_stock_threshold: { type: "integer" },
            admin_is_available: {
              type: "boolean",
              nullable: true,
              enum: [true, false],
              description: "Administrative status: true = active, false = inactive."
            },
            admin_item_inactive_reason: {
              type: "string",
              nullable: true,
              description: "Optional text reason for making the item inactive."
            },
            discounted_price: { type: "integer", nullable: true },
            qty_type: {
              type: "string",
              nullable: true,
              description: "Choose a quantity name returned by GET /api/v1/menu-items/qty-types."
            },
            food_served: {
              type: "string",
              nullable: true,
              enum: ["veg", "non_veg", "egg"],
              description: "Select one food type."
            },
            addons: {
              type: "array",
              description: "Add-on IDs returned by GET /api/v1/addons.",
              items: { type: "string", format: "uuid" }
            },
          }
        },
        MenuItemCreate: {
          type: "object",
          required: ["name", "price", "preparation_time_minutes"],
          example: {
            name: "Hyderabadi Chicken Dum Biryani",
            description: "Slow-cooked chicken biryani",
            price: 250,
            tax_rate: 0,
            preparation_time_minutes: 26,
            owner_is_available: true,
            category: "Biryani",
            sub_category: "Chicken Biryani",
            quantity: 20,
            low_stock_threshold: 5,
            food_served: "non_veg",
            addons: [
              "750e8400-e29b-41d4-a716-446655440000",
              "850e8400-e29b-41d4-a716-446655440000"
            ]
          },
          properties: {
            name: { type: "string", minLength: 1, maxLength: 255 },
            description: { type: "string", nullable: true },
            price: { type: "integer", minimum: 0 },
            tax_rate: { type: "number", minimum: 0, default: 0 },
            preparation_time_minutes: {
              type: "integer",
              minimum: 1,
              description: "Preparation time in minutes; must be at least 1."
            },
            owner_is_available: {
              type: "boolean",
              default: true
            },
            category: {
              type: "string",
              maxLength: 255,
              nullable: true,
              description: "Saved to food_categories as a level-1 category under CAT001."
            },
            sub_category: {
              type: "string",
              maxLength: 255,
              nullable: true,
              description: "Saved to food_categories as a level-2 subcategory under the selected category. When provided, its generated SUB-prefixed ID is stored in restaurant_menu_items.category_id."
            },
            quantity: { type: "integer", minimum: 0, default: 0 },
            low_stock_threshold: {
              type: "integer",
              minimum: 0,
              default: 0
            },
            admin_is_available: {
              type: "boolean",
              nullable: true,
              enum: [true, false],
              description: "Administrative status: true = active, false = inactive."
            },
            admin_item_inactive_reason: {
              type: "string",
              nullable: true,
              description: "Optional text reason for making the item inactive."
            },
            discounted_price: {
              type: "integer",
              minimum: 0,
              nullable: true
            },
            qty_type: {
              type: "string",
              nullable: true,
              description: "Choose a quantity name returned by GET /api/v1/menu-items/qty-types."
            },
            food_served: {
              type: "string",
              nullable: true,
              enum: ["veg", "non_veg", "egg"],
              description: "Select one food type."
            },
            addons: {
              type: "array",
              description: "Add-on IDs returned by GET /api/v1/addons.",
              items: { type: "string", format: "uuid" }
            },
          }
        },
        MenuItemCreateMultipart: {
          allOf: [
            { $ref: "#/components/schemas/MenuItemCreate" },
            {
              type: "object",
              properties: {
                img_id: {
                  type: "array",
                  description: "Optional JPG, JPEG, or WEBP image; upload one image per request, maximum 2 MB. Select one food_served value.",
                  maxItems: 1,
                  items: { type: "string", format: "binary" }
                }
              }
            }
          ]
        },
        MenuItemPatch: {
          type: "object",
          minProperties: 1,
          example: {
            price: 275,
            quantity: 18,
            addons: ["750e8400-e29b-41d4-a716-446655440000"]
          },
          properties: {
            name: { type: "string", minLength: 1, maxLength: 255 },
            description: { type: "string", nullable: true },
            price: { type: "integer", minimum: 0 },
            tax_rate: { type: "number", minimum: 0 },
            preparation_time_minutes: {
              type: "integer",
              minimum: 1,
              description: "Preparation time in minutes; must be at least 1."
            },
            owner_is_available: { type: "boolean" },
            category: {
              type: "string",
              maxLength: 255,
              nullable: true,
              description: "Saved to food_categories as a level-1 category under CAT001."
            },
            sub_category: {
              type: "string",
              maxLength: 255,
              nullable: true,
              description: "Saved to food_categories as a level-2 subcategory under the selected category. When provided, its generated SUB-prefixed ID is stored in restaurant_menu_items.category_id."
            },
            quantity: { type: "integer", minimum: 0 },
            low_stock_threshold: { type: "integer", minimum: 0 },
            admin_is_available: {
              type: "boolean",
              nullable: true,
              enum: [true, false],
              description: "Administrative status: true = active, false = inactive."
            },
            admin_item_inactive_reason: {
              type: "string",
              nullable: true,
              description: "Optional text reason for making the item inactive."
            },
            discounted_price: {
              type: "integer",
              minimum: 0,
              nullable: true
            },
            qty_type: {
              type: "string",
              nullable: true,
              description: "Choose a quantity name returned by GET /api/v1/menu-items/qty-types."
            },
            food_served: {
              type: "string",
              nullable: true,
              enum: ["veg", "non_veg", "egg"],
              description: "Select one food type."
            },
            addons: {
              type: "array",
              description: "Add-on IDs returned by GET /api/v1/addons.",
              items: { type: "string", format: "uuid" }
            },
          }
        },
        MenuItemPatchMultipart: {
          allOf: [
            { $ref: "#/components/schemas/MenuItemPatch" },
            {
              type: "object",
              properties: {
                img_id: {
                  type: "array",
                  description: "Optional JPG, JPEG, or WEBP image; upload one image per request, maximum 2 MB. Supplying an image replaces the existing image set. Select one food_served value.",
                  maxItems: 1,
                  items: { type: "string", format: "binary" }
                }
              }
            }
          ]
        },
        MenuItemSuccessResponse: {
          type: "object",
          required: ["success", "message", "data"],
          example: {
            success: true,
            message: "Menu item retrieved successfully",
            data: {
              id: "550e8400-e29b-41d4-a716-446655440000",
              name: "Hyderabadi Chicken Dum Biryani",
              description: "Slow-cooked chicken biryani",
              price: 250,
              tax_rate: 0,
              preparation_time_minutes: 26,
              owner_is_available: true,
              created_at: "2026-10-10T07:38:17.328Z",
              category_id: "SUB002",
              img_id: ["menu-items/9f5d6e38-3d88-4f0a-8f71-26adcb286b45.jpg"],
              quantity: 20,
              low_stock_threshold: 5,
              admin_is_available: null,
              admin_item_inactive_reason: null,
              discounted_price: null,
              qty_type: null,
              food_served: "non_veg",
              addons: [
                "750e8400-e29b-41d4-a716-446655440000",
                "850e8400-e29b-41d4-a716-446655440000"
              ]
            }
          },
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string" },
            data: { $ref: "#/components/schemas/MenuItem" }
          }
        },
        MenuItemErrorResponse: {
          type: "object",
          required: ["success", "message"],
          example: {
            success: false,
            message: "Validation error"
          },
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Validation error" }
          }
        }
      }
    }
  },

  apis: [
    "./routes/*.js"
  ]
};

const schemas = options.definition.components.schemas;
const menuItemReadSchema = {
  ...schemas.MenuItem,
  example: { ...schemas.MenuItem.example },
  properties: Object.fromEntries(
    Object.entries(schemas.MenuItem.properties)
      .filter(([property]) => property !== "img_id")
  )
};
delete menuItemReadSchema.example.img_id;
schemas.MenuItemRead = menuItemReadSchema;
schemas.MenuItemReadSuccessResponse = {
  ...schemas.MenuItemSuccessResponse,
  example: {
    ...schemas.MenuItemSuccessResponse.example,
    data: menuItemReadSchema.example
  },
  properties: {
    ...schemas.MenuItemSuccessResponse.properties,
    data: { $ref: "#/components/schemas/MenuItemRead" }
  }
};

const swaggerSpec = swaggerJsdoc(options);

export const loadStationDropdownIntoSwagger = async () => {
  const result = await pool.query(`
    SELECT DISTINCT name
    FROM public.stations
    WHERE name IS NOT NULL
      AND TRIM(name) <> ''
    ORDER BY name ASC
  `);

  const stationNames = result.rows.map((row) => row.name);
  const quantityTypesResult = await pool.query(`
    SELECT DISTINCT qty_type_name
    FROM public.food_qty_type
    WHERE qty_type_name IS NOT NULL
      AND TRIM(qty_type_name) <> ''
    ORDER BY qty_type_name ASC
  `);
  const quantityTypeNames = quantityTypesResult.rows.map(
    (row) => row.qty_type_name
  );

  for (const schemaName of ["MenuItemCreate", "MenuItemPatch"]) {
    const quantityTypeSchema =
      swaggerSpec.components.schemas[schemaName]
        ?.properties?.qty_type;

    if (!quantityTypeSchema) {
      throw new Error(
        `Swagger schema ${schemaName}.qty_type not found`
      );
    }

    quantityTypeSchema.enum = quantityTypeNames;
  }

  const endpoint =
    swaggerSpec.paths?.["/api/v1/restaurants/near-station"]
      ?.get;

  if (!endpoint) {
    throw new Error(
      "Swagger endpoint /api/v1/restaurants/near-station not found. " +
      "Check the route annotation and Swagger apis paths."
    );
  }


endpoint.parameters ??= [];

let stationParameter = endpoint.parameters.find(
  (parameter) =>
    parameter.in === "query" &&
    parameter.name === "station_name"
);

if (!stationParameter) {
  stationParameter = {
    name: "station_name",
    in: "query",
    required: true,
    description: "Select a station",
    schema: {
      type: "string"
    }
  };

  endpoint.parameters.push(stationParameter);
}

stationParameter.schema = {
  type: "string",
  enum: stationNames
};


  stationParameter.schema = {
    type: "string",
    enum: stationNames,
  };

  return swaggerSpec;
};

export default swaggerSpec;