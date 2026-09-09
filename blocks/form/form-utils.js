/* eslint-disable import/prefer-default-export */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEL_RE = /^[+]?[\d\s().-]{7,}$/;
const TYPE_ALIASES = {
  text: 'text',
  email: 'email',
  telephone: 'tel',
  tel: 'tel',
  textarea: 'textarea',
  select: 'select',
  radio: 'radio',
  checkbox: 'checkbox',
  submit: 'submit',
};
const BOOLEAN_TOKENS = new Set(['true', 'false', 'yes', 'no', 'on', 'off']);

export function isTruthy(value) {
  return ['true', 'yes', '1', 'on', 'required'].includes(String(value || '').toLowerCase());
}

export function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeType(raw) {
  const key = String(raw || '').trim().toLowerCase();
  return TYPE_ALIASES[key] || key;
}

function decodeMaybe(value) {
  if (!/%[0-9A-Fa-f]{2}/.test(value)) return value;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function looksLikePattern(value) {
  const trimmed = decodeMaybe(String(value || '').trim());
  if (!trimmed) return false;
  if (trimmed.startsWith('/') && trimmed.lastIndexOf('/') > 0) return true;
  return /[\^$[\]{}|\\]/.test(trimmed);
}

export function looksLikeFieldName(value) {
  return /^[A-Za-z][\w.-]*$/.test(String(value || '').trim());
}

export function compilePattern(pattern) {
  if (!pattern) return null;
  let source = decodeMaybe(String(pattern).trim());
  let flags = '';
  if (source.startsWith('/') && source.lastIndexOf('/') > 0) {
    const last = source.lastIndexOf('/');
    flags = source.slice(last + 1);
    source = source.slice(1, last);
  }
  try {
    return new RegExp(source, flags);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Invalid form field pattern', pattern, error);
    return null;
  }
}

/**
 * Reconstructs identity fields when AEM omits empty values (name/placeholder).
 * Authored order: label, name, placeholder.
 */
export function parseIdentityParts(parts) {
  const values = (parts || []).map((part) => String(part || '').trim()).filter(Boolean);
  const label = values[0] || '';
  const rest = values.slice(1);
  let name = '';
  let placeholder = '';
  if (rest.length >= 2) {
    [name, placeholder] = rest;
  } else if (rest.length === 1) {
    const [only] = rest;
    if (looksLikeFieldName(only)) name = only;
    else placeholder = only;
  }
  return { label, name, placeholder };
}

/**
 * Reconstructs validation rules when AEM omits empty values.
 * Authored order: help, required, pattern, validation message.
 * Required is a boolean token; pattern is regex-like. Remaining text keeps order:
 * text before a required/pattern token is help, text after is the validation message.
 * Two plain texts with neither token are help + message.
 */
export function parseRulesParts(parts) {
  const values = (parts || []).map((part) => String(part || '').trim()).filter(Boolean);
  let helpText = '';
  let required = false;
  let pattern = '';
  let validationMessage = '';
  let seenRuleToken = false;

  values.forEach((part) => {
    const token = part.toLowerCase();
    if (!seenRuleToken && BOOLEAN_TOKENS.has(token) && !looksLikePattern(part)) {
      required = isTruthy(part);
      seenRuleToken = true;
      return;
    }
    if (!pattern && looksLikePattern(part)) {
      pattern = decodeMaybe(part);
      seenRuleToken = true;
      return;
    }
    if (!seenRuleToken && !helpText) {
      helpText = part;
      return;
    }
    validationMessage = part;
  });

  return {
    helpText, required, pattern, validationMessage,
  };
}

export function parseOptions(raw) {
  const text = String(raw || '').trim();
  if (!text) return [];
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const tokens = lines.length > 1
    ? lines
    : text.split(/\s+(?=[^\s|]+\|)/).map((line) => line.trim()).filter(Boolean);

  return tokens
    .map((line) => {
      const pipe = line.indexOf('|');
      if (pipe === -1) {
        return { value: slugify(line) || line, label: line };
      }
      const value = line.slice(0, pipe).trim();
      const label = line.slice(pipe + 1).trim() || value;
      return { value, label };
    })
    .filter((option) => option.value);
}

export function isEmptyValue(config, value) {
  if (Array.isArray(value)) return value.length === 0;
  return !String(value || '').trim();
}

export function validateField(config, value) {
  if (isEmptyValue(config, value)) {
    if (config.required) {
      return config.validationMessage || `${config.label || 'This field'} is required.`;
    }
    return '';
  }

  const stringValue = Array.isArray(value) ? value.join(',') : String(value);

  if (config.fieldType === 'email' && !EMAIL_RE.test(stringValue)) {
    return config.validationMessage || 'Please enter a valid email address.';
  }
  if (config.fieldType === 'tel' && !TEL_RE.test(stringValue)) {
    return config.validationMessage || 'Please enter a valid phone number.';
  }

  const pattern = compilePattern(config.pattern);
  if (pattern && !pattern.test(stringValue)) {
    return config.validationMessage || 'Please match the requested format.';
  }
  return '';
}

export {
  EMAIL_RE,
  TEL_RE,
};
