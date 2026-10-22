import supabase from "../config/supabase.js";

export class StorageObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "StorageObjectNotFoundError";
  }
}

export const generateSignedUrl = async (
  bucketName,
  filePath,
  expiresIn = 3600
) => {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    if (error.message === "Object not found") {
      throw new StorageObjectNotFoundError();
    }

    throw new Error(
      `Failed to generate signed URL: ${error.message}`
    );
  }

  return data.signedUrl;
};