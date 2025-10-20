// src/utils/validatePassword.ts
export function validatePasswordStrength(password: string): string | null {
  if (!password || typeof password !== "string") {
    return "Password is required.";
  }

  // Longitud mínima
  if (password.length < 8) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }

  // Lista de contraseñas débiles comunes (puedes ampliarla)
  const weakPasswords = [
    "123456", "password", "qwerty", "abc123",
    "12345678", "123456789", "111111", "password1",
    "123123", "contraseña"
  ];
  if (weakPasswords.includes(password.toLowerCase())) {
    return "La contraseña es demasiado común. Elige otra.";
  }

  // Requerir al menos una mayúscula, un número y un símbolo
  const strongRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-={}[\]|;:"<>,.?/~`]).+$/;
  if (!strongRegex.test(password)) {
    return "La contraseña debe incluir al menos una mayúscula, un número y un símbolo.";
  }

  return null; // contraseña válida
}
