export type UserType = "customer" | "restaurant" | "delivery_partner";

export type CustomerUser = {
  id: string;
  phone: string | null;
  email: string | null;
  full_name: string | null;
  profile_image_url: string | null;
  date_of_birth: string | null;
  gender: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  user_type: UserType;
};
