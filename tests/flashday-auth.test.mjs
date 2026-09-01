import assert from 'node:assert/strict';
import {
  AUTH_MODE,
  MIN_PASSWORD_LENGTH,
  authErrorMessage,
  authModeCopy,
  authRedirectUrl,
  isPasswordLongEnough
} from '../flashday-auth.mjs';

assert.equal(authRedirectUrl('https://flashdayvn.vercel.app', '/app/'), 'https://flashdayvn.vercel.app/app/');
assert.equal(authRedirectUrl('http://localhost:5173/', '/?auth=recover'), 'http://localhost:5173/?auth=recover');
assert.equal(isPasswordLongEnough('x'.repeat(MIN_PASSWORD_LENGTH)), true);
assert.equal(isPasswordLongEnough('x'.repeat(MIN_PASSWORD_LENGTH - 1)), false);
assert.equal(authErrorMessage({ message: 'Invalid login credentials' }), 'Email hoặc mật khẩu không đúng.');
assert.equal(authErrorMessage({ message: 'Email not confirmed' }), 'Hãy xác nhận email trước khi đăng nhập.');
assert.equal(authModeCopy(AUTH_MODE.UPDATE_PASSWORD).passwordAutocomplete, 'new-password');
assert.equal(authModeCopy(AUTH_MODE.RECOVERY).passwordAutocomplete, null);

console.log('FlashDay auth contract: 8 checks passed');
