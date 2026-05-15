export interface PasswordValidationResult {
  valid: boolean;
  message?: string;
}

export function validatePassword(password: string): PasswordValidationResult {
  if (!password) {
    return {
      valid: false,
      message: 'auth_error_password_empty',
    };
  }

  if (password.length < 8) {
    return {
      valid: false,
      message: 'auth_error_password_min_length',
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: 'auth_error_password_uppercase',
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: 'auth_error_password_number',
    };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return {
      valid: false,
      message: 'auth_error_password_special',
    };
  }

  return { valid: true };
}
