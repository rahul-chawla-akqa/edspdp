import { getMetadata, loadScript } from './aem.js';

/** Public Google reCAPTCHA v3 site key for the website. Override per page with metadata. */
export const RECAPTCHA_SITE_KEY = '6Lc4ecotAAAAAIb_-T40wb_sFFqD-1ZjSLfyQSZK';

const RECAPTCHA_ACTION = 'form_submit';
const RECAPTCHA_READY_TIMEOUT_MS = 10000;

let loadState = { key: '', promise: null };

/**
 * Google's api.js exposes grecaptcha.ready before execute exists.
 * @returns {Promise<void>}
 */
function whenRecaptchaReady() {
  if (typeof window.grecaptcha?.execute === 'function') return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error('reCAPTCHA failed to load'));
    }, RECAPTCHA_READY_TIMEOUT_MS);

    const finish = () => {
      window.clearTimeout(timeoutId);
      if (typeof window.grecaptcha?.execute !== 'function') {
        reject(new Error('reCAPTCHA failed to load'));
        return;
      }
      resolve();
    };

    if (typeof window.grecaptcha?.ready === 'function') {
      window.grecaptcha.ready(finish);
      return;
    }
    finish();
  });
}

/**
 * Resolves the public site key: page metadata first, then the site constant.
 * @returns {string}
 */
export function getRecaptchaSiteKey() {
  const pageKey = getMetadata('recaptcha-site-key').trim();
  return pageKey || String(RECAPTCHA_SITE_KEY || '').trim();
}

/**
 * True when this form should protect submit with reCAPTCHA.
 * A page metadata key or the site key is enough.
 * @param {Element} block the form block
 * @returns {boolean}
 */
export function isFormRecaptchaEnabled(block) {
  return Boolean(block?.classList.contains('recaptcha') && getRecaptchaSiteKey());
}

/**
 * Loads the Google reCAPTCHA v3 script once per page and site key.
 * @returns {Promise<string>} the resolved site key
 */
export async function loadRecaptcha() {
  const siteKey = getRecaptchaSiteKey();
  if (!siteKey) {
    throw new Error('reCAPTCHA site key is missing');
  }
  if (window.grecaptcha?.execute) return siteKey;
  if (loadState.promise && loadState.key === siteKey) return loadState.promise;

  const promise = loadScript(`https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`)
    .then(async () => {
      await whenRecaptchaReady();
      return siteKey;
    })
    .catch((error) => {
      if (loadState.promise === promise) {
        loadState = { key: '', promise: null };
      }
      throw error;
    });

  loadState = { key: siteKey, promise };
  return promise;
}

/**
 * Executes reCAPTCHA v3 and returns a token.
 * @param {string} [action]
 * @returns {Promise<string>}
 */
export async function executeRecaptcha(action = RECAPTCHA_ACTION) {
  const siteKey = getRecaptchaSiteKey();
  if (!siteKey) {
    throw new Error('reCAPTCHA site key is missing');
  }
  await loadRecaptcha();
  const { grecaptcha } = window;
  if (!grecaptcha?.execute) {
    throw new Error('reCAPTCHA is unavailable');
  }

  const token = await new Promise((resolve, reject) => {
    const run = () => {
      Promise.resolve(grecaptcha.execute(siteKey, { action }))
        .then(resolve)
        .catch(reject);
    };
    if (typeof grecaptcha.ready === 'function') {
      grecaptcha.ready(run);
    } else {
      run();
    }
  });

  if (!token) {
    throw new Error('reCAPTCHA token was empty');
  }
  return token;
}
