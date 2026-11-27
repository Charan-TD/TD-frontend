"use client";

// Indian mobile numbers: fixed +91 country code, 10 digits starting with 6-9.
export const INDIA_COUNTRY_CODE = "+91";

/** Strips separators and a leading +91 / 91 / 0 so only the 10 national digits remain. */
export const normalizeIndianMobile = (value: string) => {
  const compact = value.replace(/[\s-]/g, "");
  return compact.replace(/^(\+91|91|0)(?=\d{10}$)/, "");
};

/** Returns an error message, or "" when the number is a valid Indian mobile number. */
export const validateIndianMobile = (value: string) => {
  const mobile = normalizeIndianMobile(value);
  if (!mobile) return "Enter the mobile number.";
  if (!/^[6-9]\d{9}$/.test(mobile)) return "Enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9.";
  return "";
};

type Props = {
  value: string;
  onChange: (digits: string) => void;
  invalid?: boolean;
  required?: boolean;
  placeholder?: string;
};

export function PhoneInput({ value, onChange, invalid, required, placeholder = "10-digit mobile number" }: Props) {
  return (
    <div className="phone-input">
      <span className="phone-input__code" aria-hidden="true">{INDIA_COUNTRY_CODE}</span>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={normalizeIndianMobile(value)}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 10))}
        placeholder={placeholder}
        maxLength={10}
        required={required}
        aria-label="Mobile number (India, +91)"
        aria-invalid={invalid}
      />
    </div>
  );
}
