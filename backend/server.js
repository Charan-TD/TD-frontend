import { readFile } from "node:fs/promises";
import app from "./app.js";
import pool from "./config/database.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await pool.query("SELECT NOW()");

    const registrationRequestsMigration = await readFile(
      new URL(
        "./migrations/20261015_restore_restaurant_registration_requests.sql",
        import.meta.url
      ),
      "utf8"
    );
    await pool.query(registrationRequestsMigration);

    const categoryMigration = await readFile(
      new URL(
        "./migrations/20261015_scope_food_categories_by_restaurant.sql",
        import.meta.url
      ),
      "utf8"
    );
    await pool.query(categoryMigration);

    console.log("Database connected successfully");

    app.listen(PORT, () => {
      console.log(`Train Dhaba server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
};

startServer();