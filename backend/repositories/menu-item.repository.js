
import pool from "../config/database.js";
import { AppError } from "../utils/app-error.js";

const MENU_ITEM_COLUMNS = [
  "restaurant_id",
  "name",
  "description",
  "price",
  "tax_rate",
  "preparation_time_minutes",
  "owner_is_available",
  "category_id",
  "img_id",
  "quantity",
  "low_stock_threshold",
  "admin_is_available",
  "admin_item_inactive_reason",
  "discounted_price",
  "qty_type_id",
  "food_served",
  "addons"
];

const JSON_COLUMNS = new Set([
  "img_id",
  "admin_item_inactive_reason",
  "food_served",
  "addons"
]);

const CATEGORY_LOCK_ID = 728401;

const toDatabaseValue = (column, value) =>
  JSON_COLUMNS.has(column) && value !== null
    ? JSON.stringify(value)
    : value;

const normalizeImageIds = (item) => {
  if (!item) return item;

  if (typeof item.img_id === "string") {
    try {
      const parsed = JSON.parse(item.img_id);
      item.img_id = Array.isArray(parsed)
        ? parsed
        : [item.img_id];
    } catch {
      item.img_id = item.img_id ? [item.img_id] : [];
    }
  } else if (item.img_id === null) {
    item.img_id = [];
  }

  return item;
};

const normalizeMenuItemAddonIds = (item) => {
  if (!item || !Array.isArray(item.addons)) return item;

  item.addons = item.addons
    .map((addon) =>
      typeof addon === "string"
        ? addon
        : addon?.addon_id
    )
    .filter((addonId) => typeof addonId === "string");

  return item;
};

const selectMenuItem = `
  SELECT
    id,
    name,
    description,
    price,
    tax_rate,
    preparation_time_minutes,
    owner_is_available,
    created_at,
    category_id,
    img_id,
    quantity,
    low_stock_threshold,
    admin_is_available,
    admin_item_inactive_reason,
    discounted_price,
    (
      SELECT quantity_type.qty_type_name
      FROM public.food_qty_type quantity_type
      WHERE quantity_type.qty_type_id = restaurant_menu_items.qty_type_id
    ) AS qty_type,
    food_served,
    addons,
    restaurant_id
  FROM public.restaurant_menu_items
`;

const MENU_ITEM_RETURNING = `
  id,
  name,
  description,
  price,
  tax_rate,
  preparation_time_minutes,
  owner_is_available,
  created_at,
  category_id,
  img_id,
  quantity,
  low_stock_threshold,
  admin_is_available,
  admin_item_inactive_reason,
  discounted_price,
  qty_type_id,
  food_served,
  addons,
  restaurant_id
`;

const resolveQuantityTypeId = async (client, quantityTypeName) => {
  if (quantityTypeName === null || quantityTypeName.trim() === "") {
    return null;
  }

  const result = await client.query(
    `
    SELECT qty_type_id
    FROM public.food_qty_type
    WHERE LOWER(TRIM(qty_type_name)) = LOWER($1)
    ORDER BY qty_type_id
    LIMIT 1
    `,
    [quantityTypeName.trim()]
  );

  if (result.rows.length === 0) {
    throw new AppError(
      `Unknown quantity type: ${quantityTypeName}`,
      400
    );
  }

  return result.rows[0].qty_type_id;
};

const addQuantityTypeName = async (client, menuItem) => {
  if (!menuItem) return menuItem;

  const result =
    menuItem.qty_type_id === null ||
    menuItem.qty_type_id === undefined
    ? { rows: [] }
    : await client.query(
      `
      SELECT qty_type_name
      FROM public.food_qty_type
      WHERE qty_type_id = $1
      LIMIT 1
      `,
      [menuItem.qty_type_id]
    );

  menuItem.qty_type =
    result.rows[0]?.qty_type_name ?? null;
  delete menuItem.qty_type_id;

  return normalizeMenuItemAddonIds(
    normalizeImageIds(menuItem)
  );
};

/**
 * Must be called inside an open transaction.
 *
 * All category writers in this repository use the same
 * advisory lock to serialize ID generation.
 */
const lockFoodCategories = async (client) => {
  await client.query(
    "SELECT pg_advisory_xact_lock($1)",
    [CATEGORY_LOCK_ID]
  );
};

/**
 * Generate a unique category_id.
 *
 * Example:
 * CAT002, CAT003, ...
 * SUB002, SUB003, ...
 *
 * Root IDs CAT001 and SUB001 are preserved.
 */
const generateFoodCategoryCode = async (
  client,
  prefix
) => {
  const result = await client.query(
    `
    SELECT category_id
    FROM public.food_categories
    WHERE category_id ~ $1
    `,
    [`^${prefix}[0-9]+$`]
  );

  let maxNumber = 0n;

  for (const row of result.rows) {
    const numericPart = row.category_id.slice(
      prefix.length
    );

    const currentNumber = BigInt(numericPart);

    if (currentNumber > maxNumber) {
      maxNumber = currentNumber;
    }
  }

  return (
    prefix +
    (maxNumber + 1n).toString().padStart(3, "0")
  );
};

/**
 * Find an existing category by name under the correct parent,
 * or insert a new category at the requested level.
 *
 * Call this only after acquiring the category lock.
 */
const findOrCreateFoodCategory = async (
  client,
  categoryName,
  parentId = "CAT001",
  level = 1,
  restaurantId = null
) => {
  if (
    typeof categoryName !== "string" ||
    !categoryName.trim()
  ) {
    return null;
  }

  const name = categoryName.trim();

  const prefix = level === 1 ? "CAT" : "SUB";

  const existingByName = await client.query(
    `
    SELECT
      id,
      category_id,
      category_name,
      parent_id,
      level,
      is_active,
      restaurant_id
    FROM public.food_categories
    WHERE LOWER(TRIM(category_name)) = LOWER($1)
      AND parent_id = $2
      AND level = $3
      AND restaurant_id IS NOT DISTINCT FROM $4
    ORDER BY id ASC
    LIMIT 1
    `,
    [name, parentId, level, restaurantId]
  );

  if (existingByName.rows.length > 0) {
    return existingByName.rows[0];
  }

  const parentResult = await client.query(
    `
    SELECT category_id
    FROM public.food_categories
    WHERE category_id = $1
      AND level = $2
      AND (
        ($2 = 0 AND parent_id IS NULL)
        OR ($2 = 1 AND parent_id = 'CAT001')
      )
    LIMIT 1
    `,
    [parentId, level - 1]
  );

  if (parentResult.rows.length === 0) {
    throw new Error(
      `Food category parent ${parentId} does not exist at level ${level - 1}`
    );
  }

  const generatedCategoryId =
    await generateFoodCategoryCode(client, prefix);

  const inserted = await client.query(
    `
    INSERT INTO public.food_categories (
      category_id,
      category_name,
      parent_id,
      level,
      is_active,
      restaurant_id
    )
    VALUES ($1, $2, $3, $4, TRUE, $5)
    RETURNING
      id,
      category_id,
      category_name,
      parent_id,
      level,
      is_active,
      restaurant_id
    `,
    [
      generatedCategoryId,
      name,
      parentId,
      level,
      restaurantId
    ]
  );

  return inserted.rows[0];
};

/**
 * CREATE MENU ITEM
 *
 * Categories are saved at level 1 under CAT001. Subcategories are saved
 * at level 2 under their category. The most specific ID is stored as the
 * menu item's category_id.
 */
export const createMenuItem = async (data) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const insertData = { ...data };
    const categoryName = insertData.category;
    const subCategoryName = insertData.sub_category;
    const quantityTypeName = insertData.qty_type;
    delete insertData.category;
    delete insertData.sub_category;
    delete insertData.qty_type;

    if (quantityTypeName !== undefined) {
      insertData.qty_type_id = await resolveQuantityTypeId(
        client,
        quantityTypeName
      );
    }

    if (
      (typeof categoryName === "string" && categoryName.trim()) ||
      (typeof subCategoryName === "string" && subCategoryName.trim())
    ) {
      await lockFoodCategories(client);

      const category = await findOrCreateFoodCategory(
        client,
        categoryName,
        "CAT001",
        1,
        insertData.restaurant_id
      );
      if (subCategoryName && !category) {
        throw new AppError(
          "Category is required when a subcategory is provided",
          400
        );
      }

      const subCategory = subCategoryName
        ? await findOrCreateFoodCategory(
          client,
          subCategoryName,
          category.category_id,
          2,
          insertData.restaurant_id
        )
        : null;

      insertData.category_id =
        subCategory?.category_id ??
        category?.category_id ??
        null;
    } else if (
      categoryName !== undefined ||
      subCategoryName !== undefined
    ) {
      insertData.category_id = null;
    }

    // Validate addon IDs before inserting the menu item
    if (insertData.addons !== undefined) {
      insertData.addons = await validateMenuItemAddons(
        client,
        insertData.restaurant_id,
        insertData.category_id,
        insertData.addons
      );
    }

    const columns = MENU_ITEM_COLUMNS.filter(
      (column) => insertData[column] !== undefined
    );

    const values = columns.map((column) =>
      toDatabaseValue(column, insertData[column])
    );

    const placeholders = columns.map(
      (column, index) =>
        JSON_COLUMNS.has(column)
          ? `$${index + 1}::jsonb`
          : `$${index + 1}`
    );

    const result = await client.query(
      `
      INSERT INTO public.restaurant_menu_items (
        ${columns.join(", ")}
      )
      VALUES (
        ${placeholders.join(", ")}
      )
      RETURNING
        ${MENU_ITEM_RETURNING}
      `,
      values
    );

    const menuItem = await addQuantityTypeName(
      client,
      result.rows[0]
    );

    await client.query("COMMIT");

    return menuItem;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/**
 * GET SINGLE MENU ITEM
 */
export const findMenuItemById = async (
  id,
  restaurantId
) => {
  const result = await pool.query(
    `
    ${selectMenuItem}
    WHERE id = $1
      AND restaurant_id = $2
    LIMIT 1
    `,
    [id, restaurantId]
  );

  return normalizeMenuItemAddonIds(
    normalizeImageIds(result.rows[0] || null)
  );
};

/**
 * GET ALL MENU ITEMS FOR RESTAURANT
 */
export const findMenuItemsByRestaurantId = async (
  restaurantId
) => {
  const result = await pool.query(
    `
    ${selectMenuItem}
    WHERE restaurant_id = $1
    ORDER BY created_at DESC
    `,
    [restaurantId]
  );

  return result.rows.map((menuItem) =>
    normalizeMenuItemAddonIds(normalizeImageIds(menuItem))
  );
};

/**
 * GET FOOD CATEGORIES ASSIGNED TO A RESTAURANT
 */
export const getFoodCategories = async (restaurantId) => {
  const result = await pool.query(
    `
    WITH RECURSIVE assigned_categories AS (
      SELECT category_id
      FROM public.food_categories
      WHERE restaurant_id = $1

      UNION

      SELECT menu_item.category_id
      FROM public.restaurant_menu_items menu_item
      WHERE menu_item.restaurant_id = $1
        AND menu_item.category_id IS NOT NULL
    ),
    restaurant_category_tree AS (
      SELECT
        category.category_id,
        category.parent_id,
        category.level
      FROM public.food_categories category
      JOIN assigned_categories assigned
        ON assigned.category_id = category.category_id

      UNION

      SELECT
        parent.category_id,
        parent.parent_id,
        parent.level
      FROM public.food_categories parent
      JOIN restaurant_category_tree child
        ON child.parent_id = parent.category_id
    )
    SELECT DISTINCT category.*
    FROM public.food_categories category
    JOIN restaurant_category_tree restaurant_category
      ON restaurant_category.category_id = category.category_id
    WHERE category.level > 0
    ORDER BY
      category.level ASC,
      category.parent_id NULLS FIRST,
      category.category_name ASC,
      category.id ASC
    `,
    [restaurantId]
  );

  return result.rows;
};

/**
 * GET DISTINCT ADDONS USED BY MENU ITEMS IN A CATEGORY TREE
 */
export const getMenuItemAddonsByCategory = async (
  categoryId,
  restaurantId
) => {
  const result = await pool.query(
    `
    WITH RECURSIVE selected_category AS (
      SELECT category_id, category_name
      FROM public.food_categories
      WHERE category_id = $1
        AND parent_id = 'CAT001'
        AND level = 1
    ),
    category_tree (category_id) AS (
      SELECT category_id
      FROM selected_category

      UNION

      SELECT child.category_id
      FROM public.food_categories child
      JOIN category_tree parent
        ON child.parent_id = parent.category_id
    ),
    distinct_addons AS (
      SELECT DISTINCT addon.value
      FROM category_tree category
      JOIN public.restaurant_menu_items menu_item
        ON menu_item.category_id = category.category_id
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(menu_item.addons) = 'array'
            THEN menu_item.addons
          ELSE '[]'::jsonb
        END
      ) AS addon(value)
      WHERE menu_item.restaurant_id = $2
    )
    SELECT
      category.category_id,
      category.category_name,
      COALESCE(
        (
          SELECT jsonb_agg(addon.value ORDER BY addon.value)
          FROM distinct_addons addon
        ),
        '[]'::jsonb
      ) AS addons
    FROM selected_category category
    `,
    [categoryId, restaurantId]
  );

  if (result.rowCount === 0) {
    throw new AppError("Category not found", 404);
  }

  return result.rows[0];
};

/**
 * GET FOOD QUANTITY TYPES
 */
export const getFoodQuantityTypes = async () => {
  const result = await pool.query(`
    SELECT
      qty_type_id,
      qty_type_name,
      status
    FROM public.food_qty_type
    ORDER BY qty_type_name ASC
  `);

  return result.rows;
};

/**
 * UPDATE MENU ITEM
 *
 * Categories are saved at level 1 under CAT001. Subcategories are saved
 * at level 2 under their category. The most specific ID is stored as the
 * menu item's category_id.
 */
export const updateMenuItem = async (
  id,
  restaurantId,
  data
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const updateData = { ...data };
    const categoryName = updateData.category;
    const subCategoryName = updateData.sub_category;
    const quantityTypeName = updateData.qty_type;
    delete updateData.category;
    delete updateData.sub_category;
    delete updateData.qty_type;

    if (quantityTypeName !== undefined) {
      updateData.qty_type_id = await resolveQuantityTypeId(
        client,
        quantityTypeName
      );
    }

    if (
      (typeof categoryName === "string" && categoryName.trim()) ||
      (typeof subCategoryName === "string" && subCategoryName.trim())
    ) {
      await lockFoodCategories(client);

      let category;
      if (typeof categoryName === "string" && categoryName.trim()) {
        category = await findOrCreateFoodCategory(
          client,
          categoryName,
          "CAT001",
          1,
          restaurantId
        );
      } else if (
        subCategoryName &&
        categoryName === undefined
      ) {
        const currentCategoryResult = await client.query(
          `
          SELECT
            current_category.category_id,
            current_category.parent_id,
            current_category.level,
            parent_category.category_id AS parent_category_id,
            parent_category.parent_id AS parent_category_parent_id,
            parent_category.level AS parent_category_level
          FROM public.restaurant_menu_items menu_item
          LEFT JOIN public.food_categories current_category
            ON current_category.category_id = menu_item.category_id
          LEFT JOIN public.food_categories parent_category
            ON parent_category.category_id = current_category.parent_id
          WHERE menu_item.id = $1
            AND menu_item.restaurant_id = $2
          FOR UPDATE OF menu_item
          `,
          [id, restaurantId]
        );
        if (currentCategoryResult.rowCount === 0) {
          throw new AppError("Menu item not found", 404);
        }

        const currentCategory = currentCategoryResult.rows[0];

        if (
          currentCategory?.level === 1 &&
          currentCategory.parent_id === "CAT001"
        ) {
          category = currentCategory;
        } else if (
          currentCategory?.level === 2 &&
          currentCategory.parent_category_level === 1 &&
          currentCategory.parent_category_parent_id === "CAT001"
        ) {
          category = {
            category_id: currentCategory.parent_category_id
          };
        }
      }

      if (subCategoryName && !category) {
        throw new AppError(
          "A category is required when setting a subcategory",
          400
        );
      }

      const subCategory = subCategoryName
        ? await findOrCreateFoodCategory(
          client,
          subCategoryName,
          category.category_id,
          2,
          restaurantId
        )
        : null;

      updateData.category_id =
        subCategory?.category_id ??
        category?.category_id ??
        null;
    } else if (
      categoryName !== undefined ||
      subCategoryName !== undefined
    ) {
      updateData.category_id = null;
    }

    if (updateData.addons !== undefined) {
      let categoryId = updateData.category_id;

      if (categoryId === undefined) {
        const currentCategoryResult = await client.query(
          `
          SELECT category_id
          FROM public.restaurant_menu_items
          WHERE id = $1
            AND restaurant_id = $2
          FOR UPDATE
          `,
          [id, restaurantId]
        );

        if (currentCategoryResult.rowCount === 0) {
          throw new AppError("Menu item not found", 404);
        }

        categoryId = currentCategoryResult.rows[0].category_id;
      }

      updateData.addons = await validateMenuItemAddons(
        client,
        restaurantId,
        categoryId,
        updateData.addons
      );
    }

    const columns = MENU_ITEM_COLUMNS.filter(
      (column) =>
        column !== "restaurant_id" &&
        updateData[column] !== undefined
    );

    if (columns.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    const values = columns.map((column) =>
      toDatabaseValue(column, updateData[column])
    );

    const assignments = columns.map(
      (column, index) =>
        JSON_COLUMNS.has(column)
          ? `${column} = $${index + 1}::jsonb`
          : `${column} = $${index + 1}`
    );

    values.push(id);
    values.push(restaurantId);

    const result = await client.query(
      `
      UPDATE public.restaurant_menu_items
      SET ${assignments.join(", ")}
      WHERE id = $${values.length - 1}
        AND restaurant_id = $${values.length}
      RETURNING
        ${MENU_ITEM_RETURNING}
      `,
      values
    );

    const menuItem = await addQuantityTypeName(
      client,
      result.rows[0] || null
    );

    await client.query("COMMIT");

    return menuItem;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/**
 * DELETE MENU ITEM
 */
export const deleteMenuItem = async (
  id,
  restaurantId
) => {
  const result = await pool.query(
    `
    DELETE FROM public.restaurant_menu_items
    WHERE id = $1
      AND restaurant_id = $2
    RETURNING
      ${MENU_ITEM_RETURNING}
    `,
    [id, restaurantId]
  );

  return addQuantityTypeName(
    pool,
    result.rows[0] || null
  );
};

/**
 * SAVE CATEGORY AND SUBCATEGORY TEXT VALUES
 *
 * category:
 *   parent_id = CAT001
 *   level = 1
 *
 * subcategory:
 *   parent_id = the category's category_id
 *   level = 2
 *
 * Existing values are reused.
 */
export const saveFoodCategories = async ({
  restaurantId,
  categories
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await lockFoodCategories(client);

    const savedCategories = [];
    for (const categoryInput of categories) {
      const savedCategory = await findOrCreateFoodCategory(
        client,
        categoryInput.category,
        "CAT001",
        1,
        restaurantId
      );

      const savedSubcategories = [];
      for (const subcategoryName of categoryInput.subcategories) {
        const subcategory = await findOrCreateFoodCategory(
          client,
          subcategoryName,
          savedCategory.category_id,
          2,
          restaurantId
        );
        savedSubcategories.push(subcategory);
      }

      savedCategories.push({
        category: savedCategory,
        subcategories: savedSubcategories
      });
    }

    await client.query("COMMIT");

    return savedCategories;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};


export const getCategoryRelatedAddons = async (
  restaurantId,
  categoryId
) => {
  const result = await pool.query(
    `
    WITH RECURSIVE related_categories AS (
      -- Selected category
      SELECT
        category_id,
        parent_id,
        level
      FROM public.food_categories
      WHERE category_id = $2

      UNION

      -- Descendant subcategories
      SELECT
        fc.category_id,
        fc.parent_id,
        fc.level
      FROM public.food_categories fc
      INNER JOIN related_categories rc
        ON fc.parent_id = rc.category_id
    ),
    selected_parent AS (
      SELECT parent_id
      FROM public.food_categories
      WHERE category_id = $2
        AND level = 2
    ),
    eligible_categories AS (
      SELECT category_id
      FROM related_categories

      UNION

      -- Include the direct parent when a
      -- subcategory is selected.
      SELECT parent_id
      FROM selected_parent
      WHERE parent_id IS NOT NULL
    )
    SELECT
      addon.value AS addon
    FROM public.restaurant_menu_items mi
    CROSS JOIN LATERAL
      jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(mi.addons) = 'array'
            THEN mi.addons
          ELSE '[]'::jsonb
        END
      ) AS addon(value)
    WHERE mi.restaurant_id = $1
      AND mi.category_id IN (
        SELECT category_id
        FROM eligible_categories
      )
      AND mi.owner_is_available = TRUE
    `,
    [restaurantId, categoryId]
  );

  // Deduplicate by normalized name and price.
  const uniqueAddons = new Map();

  for (const row of result.rows) {
    const addon = row.addon;

    if (
      !addon ||
      typeof addon !== "object" ||
      Array.isArray(addon) ||
      typeof addon.name !== "string"
    ) {
      continue;
    }

    const key = [
      addon.name.trim().toLowerCase(),
      String(addon.price ?? "")
    ].join("|");

    if (!uniqueAddons.has(key)) {
      uniqueAddons.set(key, addon);
    }
  }

  return [...uniqueAddons.values()].sort(
    (a, b) => a.name.localeCompare(b.name)
  );
};

const validateMenuItemAddons = async (
  client,
  restaurantId,
  categoryId,
  addons
) => {
  if (!Array.isArray(addons)) {
    throw new AppError(
      "addons must be a JSON array",
      400
    );
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const ids = addons.map((addon) => {
    const addonId =
      typeof addon === "string"
        ? addon
        : addon && typeof addon === "object" && !Array.isArray(addon)
          ? addon.addon_id
          : null;

    if (!uuidRegex.test(addonId ?? "")) {
      throw new AppError(
        "Each addon must be a valid add-on ID",
        400
      );
    }

    return addonId.toLowerCase();
  });

  if (new Set(ids).size !== ids.length) {
    throw new AppError(
      "Duplicate addon IDs are not allowed",
      400
    );
  }

  if (ids.length === 0) {
    return [];
  }

  const result = await client.query(
    `
    WITH RECURSIVE
    descendants AS (
      SELECT category_id, parent_id, level
      FROM public.food_categories
      WHERE category_id = $3
        AND is_active = TRUE

      UNION

      SELECT fc.category_id, fc.parent_id, fc.level
      FROM public.food_categories fc
      JOIN descendants d
        ON fc.parent_id = d.category_id
      WHERE fc.is_active = TRUE
    ),
    ancestors AS (
      SELECT category_id, parent_id, level
      FROM public.food_categories
      WHERE category_id = $3
        AND is_active = TRUE

      UNION

      SELECT fc.category_id, fc.parent_id, fc.level
      FROM public.food_categories fc
      JOIN ancestors a
        ON fc.category_id = a.parent_id
      WHERE fc.is_active = TRUE
        AND fc.level >= 1
    ),
    eligible_categories AS (
      SELECT category_id
      FROM descendants
      WHERE level >= 1

      UNION

      SELECT category_id
      FROM ancestors
      WHERE level >= 1
    )
    SELECT addon_id
    FROM public.restaurant_addons
    WHERE restaurant_id = $1
      AND addon_id = ANY($2::uuid[])
      AND is_available = TRUE
      AND category_id IN (
        SELECT category_id
        FROM eligible_categories
      )
    `,
    [restaurantId, ids, categoryId]
  );

  if (result.rows.length !== ids.length) {
    throw new AppError(
      "One or more addons are invalid, unavailable, or not eligible for this restaurant and category",
      400
    );
  }

  return ids;
};
