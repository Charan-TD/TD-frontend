import {
  getAllCuisines
} from "../repositories/cuisine.repository.js";

export const getAllCuisinesController = async (
  req,
  res,
  next
) => {
  try {
    const cuisines = await getAllCuisines();

    return res.status(200).json({
      success: true,
      data: cuisines
    });
  } catch (error) {
    next(error);
  }
};