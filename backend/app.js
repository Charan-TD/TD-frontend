import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import employeeRoleRoutes from "./routes/employee-role.routes.js";
import authRoutes from "./routes/auth.routes.js";
import employeeRoutes from "./routes/employee.routes.js";
import permissionRoutes from "./routes/permission.routes.js";
import customerUserRoutes from "./routes/customer-user.routes.js";
import restaurantRoutes from "./routes/restaurant.routes.js";
import stationRoutes from "./routes/station.routes.js";
import deliveryPartnerUserRoutes from "./routes/delivery-partner-user.routes.js";
import orderRoutes from "./routes/order.routes.js";
import roleRoutes from "./routes/role.routes.js";

import swaggerSpec from "./config/swagger.js";

import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Train Dhaba API is running"
  });
});

// Swagger API documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);

// API routes
app.use("/api/v1/auth", authRoutes);

app.use("/api/v1/employees", employeeRoutes);



app.use(
  "/api/v1/employee-roles",
  employeeRoleRoutes
);

app.use(
  "/api/v1/permissions",
  permissionRoutes
);

app.use("/api/v1/restaurants", restaurantRoutes);

app.use("/api/v1/customer-users", customerUserRoutes);

app.use("/api/v1/stations", stationRoutes);

app.use(
  "/api/v1/delivery-partner-users",
  deliveryPartnerUserRoutes
);

app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/roles", roleRoutes);


// Error handler must be the LAST middleware
app.use(errorHandler);

export default app;