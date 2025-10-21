/**
 * Validates the strength of a given password based on multiple criteria.
 *
 * @param {string} password - The password string to be validated.
 * @returns {string | null} Returns an error message string if the password is weak or invalid, or `null` if the password is valid.
 *
 * @description
 * This function checks the following conditions:
 * 1. The password must be a valid string and not empty.
 * 2. It must contain at least 8 characters.
 * 3. It must not be a common weak password (e.g., "123456", "password").
 * 4. It must include at least:
 *    - one uppercase letter,
 *    - one number,
 *    - and one special character (symbol).
 */
export function validatePasswordStrength(password: string): string | null {
  if (!password || typeof password !== "string") {
    return "Password is required.";
  }

  // Minimum length
  if (password.length < 8) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }

  // Common weak passwords list (can be expanded)
  const weakPasswords = [
    "123456", "password", "qwerty", "abc123",
    "12345678", "123456789", "111111", "password1",
    "123123", "contraseña"
  ];
  if (weakPasswords.includes(password.toLowerCase())) {
    return "La contraseña es demasiado común. Elige otra.";
  }

  // Require at least one uppercase letter, one number, and one symbol
  const strongRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-={}[\]|;:"<>,.?/~`]).+$/;
  if (!strongRegex.test(password)) {
    return "La contraseña debe incluir al menos una mayúscula, un número y un símbolo.";
  }

  return null; // Valid password
}
