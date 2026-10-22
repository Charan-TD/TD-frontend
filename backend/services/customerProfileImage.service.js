import { randomUUID } from "node:crypto";
import supabase from "../config/supabase.js";

const BUCKET = "customer-profile-images";

const extensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

export const uploadCustomerProfileImageToStorage = async (
  customerId,
  file
) => {
  if (!file) {
    throw new Error("Profile image is required");
  }

  const extension = extensions[file.mimetype];

  if (!extension) {
    throw new Error("Unsupported image format");
  }

  const filePath =
    `${customerId}/${randomUUID()}.${extension}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (error) {
    throw new Error(error.message);
  }

  return {
    bucket: BUCKET,
    filePath: data.path
  };
};

export const getCustomerProfileImageSignedUrl = async (
  filePath
) => {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 3600);

  if (error) {
    throw new Error(error.message);
  }

  return data.signedUrl;
};