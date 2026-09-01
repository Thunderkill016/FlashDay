export const MIN_PASSWORD_LENGTH = 8;

export const AUTH_MODE = Object.freeze({
  SIGN_UP: 'signup',
  SIGN_IN: 'signin',
  RECOVERY: 'recovery',
  UPDATE_PASSWORD: 'update-password'
});

export function authRedirectUrl(origin, path = '/app/') {
  return new URL(path, origin).toString();
}

export function isPasswordLongEnough(password) {
  return String(password || '').length >= MIN_PASSWORD_LENGTH;
}

export function authErrorMessage(error) {
  const message = String(error?.message || error || '').toLowerCase();
  if (message.includes('invalid login credentials')) return 'Email hoặc mật khẩu không đúng.';
  if (message.includes('email not confirmed')) return 'Hãy xác nhận email trước khi đăng nhập.';
  if (message.includes('password should be at least')) return `Mật khẩu cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`;
  if (message.includes('email rate limit exceeded') || message.includes('too many requests')) {
    return 'Bạn đã thử quá nhiều lần. Hãy đợi ít phút rồi thử lại.';
  }
  if (message.includes('provider is not enabled')) return 'Đăng nhập Google chưa được cấu hình cho FlashDay.';
  return 'Không thể xác thực lúc này. Hãy thử lại sau.';
}

export function authModeCopy(mode) {
  switch (mode) {
    case AUTH_MODE.SIGN_IN:
      return {
        title: 'Đăng nhập',
        submit: 'Đăng nhập',
        passwordAutocomplete: 'current-password'
      };
    case AUTH_MODE.RECOVERY:
      return {
        title: 'Đặt lại mật khẩu',
        submit: 'Gửi email đặt lại',
        passwordAutocomplete: null
      };
    case AUTH_MODE.UPDATE_PASSWORD:
      return {
        title: 'Tạo mật khẩu mới',
        submit: 'Lưu mật khẩu mới',
        passwordAutocomplete: 'new-password'
      };
    default:
      return {
        title: 'Tạo tài khoản',
        submit: 'Tạo tài khoản',
        passwordAutocomplete: 'new-password'
      };
  }
}
