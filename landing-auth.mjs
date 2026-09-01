import { createClient } from '@supabase/supabase-js';
import {
  AUTH_MODE,
  MIN_PASSWORD_LENGTH,
  authErrorMessage,
  authModeCopy,
  authRedirectUrl,
  isPasswordLongEnough,
  requiresNewPasswordPolicy
} from './flashday-auth.mjs';

const supabaseUrl = __FLASHDAY_SUPABASE_URL__;
const publishableKey = __FLASHDAY_SUPABASE_PUBLISHABLE_KEY__;
const supabase = supabaseUrl && publishableKey
  ? createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  })
  : null;

const $ = (id) => document.getElementById(id);
const modal = $('auth-modal');
const form = $('auth-form');
const triggers = document.querySelectorAll('.auth-trigger');
const tabs = document.querySelectorAll('.auth-tab');
const closeButtons = document.querySelectorAll('[data-close]');
let mode = AUTH_MODE.SIGN_UP;
let signedInUser = null;

function appUrl() {
  return authRedirectUrl(window.location.origin, '/app/');
}

function recoveryUrl() {
  return authRedirectUrl(window.location.origin, '/?auth=recover');
}

function openAuthenticatedApp(session) {
  if (!session?.access_token || !session.user?.id) {
    throw new Error('FlashDay chưa nhận được phiên đăng nhập.');
  }
  showStatus('Đăng nhập thành công. Đang mở FlashDay…', 'success');
  window.location.assign(appUrl());
}

function showStatus(message, tone = 'info') {
  const node = $('auth-status');
  node.textContent = message;
  node.dataset.tone = tone;
  node.classList.toggle('hidden', !message);
}

function clearStatus() {
  showStatus('');
}

function setBusy(isBusy) {
  const submit = $('auth-submit-btn');
  const provider = $('auth-google-btn');
  submit.disabled = isBusy;
  provider.disabled = isBusy;
  form.setAttribute('aria-busy', String(isBusy));
}

function setMode(nextMode) {
  mode = nextMode;
  const copy = authModeCopy(mode);
  const isRecovery = mode === AUTH_MODE.RECOVERY;
  const isPasswordUpdate = mode === AUTH_MODE.UPDATE_PASSWORD;
  const needsPassword = !isRecovery;
  const needsEmail = !isPasswordUpdate;
  const supportsProvider = mode === AUTH_MODE.SIGN_UP || mode === AUTH_MODE.SIGN_IN;
  const enforcesNewPasswordPolicy = requiresNewPasswordPolicy(mode);

  $('auth-title').textContent = copy.title;
  $('auth-submit-btn').textContent = copy.submit;
  $('password').autocomplete = copy.passwordAutocomplete || 'off';
  $('password').required = needsPassword;
  $('password').minLength = enforcesNewPasswordPolicy ? MIN_PASSWORD_LENGTH : 0;
  $('password').placeholder = enforcesNewPasswordPolicy ? `Ít nhất ${MIN_PASSWORD_LENGTH} ký tự` : 'Mật khẩu của bạn';
  $('email').required = needsEmail;
  $('email-field').classList.toggle('hidden', !needsEmail);
  $('password-field').classList.toggle('hidden', !needsPassword);
  $('password-confirm-field').classList.toggle('hidden', !isPasswordUpdate);
  $('password-confirm').required = isPasswordUpdate;
  $('auth-providers').classList.toggle('hidden', !supportsProvider);
  $('auth-divider').classList.toggle('hidden', !supportsProvider);
  $('forgot-password').classList.toggle('hidden', mode !== AUTH_MODE.SIGN_IN);
  $('return-to-signin').classList.toggle('hidden', !isRecovery);
  $('auth-tabs').classList.toggle('hidden', isRecovery || isPasswordUpdate);
  $('auth-sub').textContent = isPasswordUpdate
    ? 'Chọn một mật khẩu mới cho tài khoản của bạn.'
    : 'Đồng bộ tiến độ học của bạn trên mọi thiết bị.';

  tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === mode));
  clearStatus();
}

function openModal(nextMode) {
  if (signedInUser && nextMode !== AUTH_MODE.UPDATE_PASSWORD) {
    window.location.assign(appUrl());
    return;
  }
  setMode(nextMode);
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  window.setTimeout(() => (nextMode === AUTH_MODE.UPDATE_PASSWORD ? $('password') : $('email')).focus(), 0);
}

function closeModal() {
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  form.reset();
  clearStatus();
}

async function submitEmailPassword() {
  const email = $('email').value.trim();
  const password = $('password').value;

  if (mode === AUTH_MODE.RECOVERY) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: recoveryUrl() });
    if (error) throw error;
    showStatus('Nếu địa chỉ này có tài khoản, FlashDay đã gửi email đặt lại mật khẩu.', 'success');
    return;
  }

  if (requiresNewPasswordPolicy(mode) && !isPasswordLongEnough(password)) {
    showStatus(`Mật khẩu cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`, 'error');
    return;
  }

  if (mode === AUTH_MODE.UPDATE_PASSWORD) {
    if (password !== $('password-confirm').value) {
      showStatus('Hai mật khẩu mới chưa trùng nhau.', 'error');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    showStatus('Đã đổi mật khẩu. Đang vào FlashDay…', 'success');
    window.setTimeout(() => window.location.assign(appUrl()), 550);
    return;
  }

  if (mode === AUTH_MODE.SIGN_UP) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: appUrl() }
    });
    if (error) throw error;
    if (data.session) {
      openAuthenticatedApp(data.session);
      return;
    }
    setMode(AUTH_MODE.SIGN_IN);
    $('email').value = email;
    showStatus('Hãy kiểm tra inbox để xác nhận email, rồi đăng nhập.', 'success');
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  openAuthenticatedApp(data.session);
}

function validateSubmission() {
  const email = $('email');
  const password = $('password');

  if (mode !== AUTH_MODE.UPDATE_PASSWORD && !email.validity.valid) {
    showStatus('Nhập một địa chỉ email hợp lệ.', 'error');
    email.focus();
    return false;
  }
  if (mode !== AUTH_MODE.RECOVERY && !password.value) {
    showStatus('Nhập mật khẩu để tiếp tục.', 'error');
    password.focus();
    return false;
  }
  return true;
}

async function submitGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: appUrl() }
  });
  if (error) throw error;
}

triggers.forEach((trigger) => {
  trigger.addEventListener('click', (event) => {
    event.preventDefault();
    openModal(trigger.dataset.auth === 'login' ? AUTH_MODE.SIGN_IN : AUTH_MODE.SIGN_UP);
  });
});

closeButtons.forEach((button) => button.addEventListener('click', closeModal));

tabs.forEach((tab) => tab.addEventListener('click', () => setMode(tab.dataset.tab)));

$('forgot-password').addEventListener('click', () => setMode(AUTH_MODE.RECOVERY));
$('return-to-signin').addEventListener('click', () => setMode(AUTH_MODE.SIGN_IN));

$('auth-google-btn').addEventListener('click', async () => {
  if (!supabase) {
    showStatus('Đăng nhập chưa được cấu hình. Hãy thử lại sau.', 'error');
    return;
  }
  setBusy(true);
  try {
    await submitGoogle();
  } catch (error) {
    showStatus(authErrorMessage(error), 'error');
    setBusy(false);
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!supabase) {
    showStatus('Đăng nhập chưa được cấu hình. Hãy thử lại sau.', 'error');
    return;
  }
  if (!validateSubmission()) return;
  setBusy(true);
  try {
    await submitEmailPassword();
  } catch (error) {
    showStatus(authErrorMessage(error), 'error');
  } finally {
    setBusy(false);
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
});

setMode(AUTH_MODE.SIGN_UP);

if (!supabase) {
  showStatus('Đăng nhập đang được cấu hình. Hãy thử lại sau.', 'error');
} else {
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      showStatus(authErrorMessage(error), 'error');
      return;
    }
    signedInUser = data.session?.user || null;
  });

  supabase.auth.onAuthStateChange((event, session) => {
    signedInUser = session?.user || null;
    if (event === 'PASSWORD_RECOVERY') openModal(AUTH_MODE.UPDATE_PASSWORD);
  });
}
