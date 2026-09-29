import swaggerJsdoc from "swagger-jsdoc";

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
  }
],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    }
  },

  apis: [
    "./routes/*.js"
  ]
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;