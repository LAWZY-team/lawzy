export interface PasswordValidationResult {
  valid: boolean;
  message?: string;
}

export function validatePassword(password: string): PasswordValidationResult {
  if (!password) {
    return {
      valid: false,
      message: 'Mật khẩu không được để trống',
    };
  }

  if (password.length < 8) {
    return {
      valid: false,
      message: 'Mật khẩu phải có ít nhất 8 ký tự',
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: 'Mật khẩu phải có ít nhất 1 chữ in hoa',
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: 'Mật khẩu phải có ít nhất 1 số',
    };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return {
      valid: false,
      message: 'Mật khẩu phải có ít nhất 1 ký tự đặc biệt',
    };
  }

  return { valid: true };
}
