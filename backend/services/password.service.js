import argon2 from "argon2";

export const hashPassword = async (password) => {
  return await argon2.hash(password);
};

export const verifyPassword = async (password, passwordHash) => {
  return await argon2.verify(passwordHash, password);
};