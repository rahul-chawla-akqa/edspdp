import {
  normalizeType,
  parseIdentityParts,
  parseOptions,
  parseRulesParts,
  slugify,
  validateField,
} from './form-utils.js';

const SETTING_KEYS = ['action', 'successMessage', 'errorMessage'];
const DEFAULT_SUCCESS = 'Thank you. Your form was submitted.';
const DEFAULT_ERROR = 'Something went wrong. Please try again.';

function moveInstrumentation(from, to) {
  [...from.attributes]
    .map(({ nodeName }) => nodeName)
    .filter((attr) => attr.startsWith('data-aue-') || attr.startsWith('data-richtext-'))
    .forEach((attr) => {
      const value = from.getAttribute(attr);
      if (value) {
        to.setAttribute(attr, value);
        from.removeAttribute(attr);
      }
    });
}

function cellText(cell) {
  if (!cell) return '';
  const link = cell.querySelector('a[href]');
  if (link && !cell.querySelector('p')) {
    return link.getAttribute('href') || link.textContent.trim();
  }
  return (cell.innerText || cell.textContent).trim();
}

function cellParts(cell) {
  if (!cell) return [];
  const children = [...cell.children];
  if (children.length) {
    return children.map((el) => (el.innerText || el.textContent).trim()).filter(Boolean);
  }
  const text = cellText(cell);
  return text ? [text] : [];
}

function parseBlock(block) {
  const settings = {
    action: '',
    successMessage: '',
    errorMessage: '',
  };
  const fieldRows = [];
  let settingIndex = 0;

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const isSettingRow = cells.length <= 1 && settingIndex < SETTING_KEYS.length;
    if (isSettingRow) {
      settings[SETTING_KEYS[settingIndex]] = cellText(cells[0]);
      settingIndex += 1;
      return;
    }
    fieldRows.push(row);
  });

  return { settings, fieldRows };
}

function parseField(row, index) {
  const cells = [...row.children];
  const fieldType = normalizeType(cellText(cells[0]) || '');
  if (fieldType === 'submit') {
    return {
      fieldType,
      label: cellText(cells[1]) || 'Submit',
      row,
      index,
    };
  }

  const identity = parseIdentityParts(cellParts(cells[1]));
  const rules = parseRulesParts(cellParts(cells[2]));
  const label = identity.label || '';
  const name = identity.name || slugify(label) || `field-${index}`;
  return {
    fieldType,
    label,
    name,
    placeholder: identity.placeholder || '',
    helpText: rules.helpText,
    required: rules.required,
    pattern: rules.pattern,
    validationMessage: rules.validationMessage,
    options: parseOptions(cellText(cells[3]) || ''),
    row,
    index,
  };
}

function describeIds(index) {
  const base = `form-field-${index}`;
  return {
    input: base,
    help: `${base}-help`,
    error: `${base}-error`,
  };
}

function describedBy(ids, helpText) {
  return [helpText ? ids.help : '', ids.error].filter(Boolean).join(' ');
}

function appendHelpAndError(wrapper, config, ids) {
  if (config.helpText) {
    const help = document.createElement('p');
    help.className = 'form-field-help';
    help.id = ids.help;
    help.textContent = config.helpText;
    wrapper.append(help);
  }

  const error = document.createElement('p');
  error.className = 'form-field-error';
  error.id = ids.error;
  error.hidden = true;
  wrapper.append(error);
  return error;
}

function createLabel(config, htmlFor) {
  const label = document.createElement('label');
  label.className = 'form-field-label';
  if (htmlFor) label.htmlFor = htmlFor;
  label.textContent = config.label;
  if (config.required) {
    const required = document.createElement('span');
    required.className = 'form-field-required';
    required.setAttribute('aria-hidden', 'true');
    required.textContent = ' *';
    label.append(required);
  }
  return label;
}

function createTextControl(config, ids) {
  const control = document.createElement(config.fieldType === 'textarea' ? 'textarea' : 'input');
  if (config.fieldType !== 'textarea') {
    control.type = config.fieldType === 'tel' ? 'tel' : config.fieldType;
  }
  control.id = ids.input;
  control.name = config.name;
  control.className = 'form-field-control';
  if (config.placeholder) control.placeholder = config.placeholder;
  if (config.required) control.required = true;
  const described = describedBy(ids, config.helpText);
  if (described) control.setAttribute('aria-describedby', described);
  return control;
}

function createSelectControl(config, ids) {
  const select = document.createElement('select');
  select.id = ids.input;
  select.name = config.name;
  select.className = 'form-field-control';
  if (config.required) select.required = true;
  const described = describedBy(ids, config.helpText);
  if (described) select.setAttribute('aria-describedby', described);

  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = config.placeholder || 'Select';
  select.append(empty);

  config.options.forEach((option) => {
    const el = document.createElement('option');
    el.value = option.value;
    el.textContent = option.label;
    select.append(el);
  });
  return select;
}

function createChoiceGroup(config, ids, type) {
  const group = document.createElement('div');
  group.className = 'form-field-options';
  group.setAttribute('role', type === 'radio' ? 'radiogroup' : 'group');
  group.setAttribute('aria-labelledby', `${ids.input}-legend`);
  const described = describedBy(ids, config.helpText);
  if (described) group.setAttribute('aria-describedby', described);

  const options = config.options.length
    ? config.options
    : [{ value: 'true', label: config.label || config.name }];

  options.forEach((option, optionIndex) => {
    const optionId = `${ids.input}-${optionIndex}`;
    const item = document.createElement('label');
    item.className = 'form-field-option';
    item.htmlFor = optionId;

    const input = document.createElement('input');
    input.type = type;
    input.id = optionId;
    input.name = config.name;
    input.value = option.value;
    if (config.required && type === 'radio' && optionIndex === 0) {
      input.required = true;
    }
    if (config.required && type === 'checkbox' && !config.options.length) {
      input.required = true;
    }

    const text = document.createElement('span');
    text.textContent = option.label;
    item.append(input, text);
    group.append(item);
  });

  return { group, isSingleCheckbox: type === 'checkbox' && !config.options.length };
}

function setFieldError(wrapper, errorEl, control, message) {
  const invalid = Boolean(message);
  wrapper.classList.toggle('is-invalid', invalid);
  errorEl.hidden = !invalid;
  errorEl.textContent = message;
  if (control) {
    control.setAttribute('aria-invalid', invalid ? 'true' : 'false');
  }
}

function getFieldValue(config, wrapper) {
  if (config.fieldType === 'radio') {
    const checked = wrapper.querySelector('input[type="radio"]:checked');
    return checked ? checked.value : '';
  }
  if (config.fieldType === 'checkbox') {
    const checked = [...wrapper.querySelectorAll('input[type="checkbox"]:checked')]
      .map((input) => input.value);
    if (!config.options.length) return checked.length ? checked[0] : '';
    return checked;
  }
  const control = wrapper.querySelector('.form-field-control');
  return control ? control.value.trim() : '';
}

function focusField(wrapper) {
  const target = wrapper.querySelector('input, select, textarea, button');
  if (target && typeof target.focus === 'function') target.focus();
}

function collectPayload(fields) {
  const data = {};
  fields.forEach((field) => {
    if (field.config.fieldType === 'submit') return;
    const value = getFieldValue(field.config, field.wrapper);
    if (field.config.fieldType === 'checkbox' && !field.config.options.length) {
      if (value) data[field.config.name] = value;
      return;
    }
    data[field.config.name] = value;
  });
  return data;
}

function buildField(config) {
  const ids = describeIds(config.index);
  const wrapper = document.createElement('div');
  wrapper.className = `form-field form-field-${config.fieldType}`;
  moveInstrumentation(config.row, wrapper);

  if (config.fieldType === 'submit') {
    const button = document.createElement('button');
    button.type = 'submit';
    button.className = 'button primary';
    button.textContent = config.label;
    wrapper.append(button);
    return { wrapper, config, button };
  }

  const isChoice = config.fieldType === 'radio' || config.fieldType === 'checkbox';
  if (isChoice) {
    const { group, isSingleCheckbox } = createChoiceGroup(config, ids, config.fieldType);
    if (!isSingleCheckbox) {
      const legend = document.createElement('div');
      legend.className = 'form-field-label';
      legend.id = `${ids.input}-legend`;
      legend.textContent = config.label;
      if (config.required) {
        const required = document.createElement('span');
        required.className = 'form-field-required';
        required.setAttribute('aria-hidden', 'true');
        required.textContent = ' *';
        legend.append(required);
      }
      wrapper.append(legend);
    } else {
      group.removeAttribute('aria-labelledby');
      group.removeAttribute('role');
      const optionLabel = group.querySelector('.form-field-option');
      if (config.required && optionLabel) {
        const required = document.createElement('span');
        required.className = 'form-field-required';
        required.setAttribute('aria-hidden', 'true');
        required.textContent = ' *';
        optionLabel.append(required);
      }
    }
    wrapper.append(group);
    const errorEl = appendHelpAndError(wrapper, config, ids);
    return {
      wrapper, config, errorEl, control: group.querySelector('input'),
    };
  }

  wrapper.append(createLabel(config, ids.input));
  const control = config.fieldType === 'select'
    ? createSelectControl(config, ids)
    : createTextControl(config, ids);
  wrapper.append(control);
  const errorEl = appendHelpAndError(wrapper, config, ids);
  return {
    wrapper, config, control, errorEl,
  };
}

function createHoneypot() {
  const wrap = document.createElement('div');
  wrap.className = 'form-honeypot';
  wrap.setAttribute('aria-hidden', 'true');

  const label = document.createElement('label');
  label.textContent = 'Website';
  const input = document.createElement('input');
  input.type = 'text';
  input.name = 'website';
  input.tabIndex = -1;
  input.autocomplete = 'off';
  label.append(input);
  wrap.append(label);
  return { wrap, input };
}

function setStatus(statusEl, type, message) {
  statusEl.hidden = !message;
  statusEl.textContent = message;
  statusEl.className = `form-status${type ? ` form-status-${type}` : ''}`;
}

/**
 * Decorates the form block into a native HTML form with validation and JSON submit.
 * @param {Element} block the form block
 */
export default function decorate(block) {
  const { settings, fieldRows } = parseBlock(block);
  const form = document.createElement('form');
  form.className = 'form-element';
  form.noValidate = true;
  form.action = settings.action || '#';
  form.method = 'post';

  const fields = [];
  let submitButton;

  fieldRows.forEach((row, index) => {
    const config = parseField(row, index);
    if (!config.fieldType) return;
    const field = buildField(config);
    fields.push(field);
    form.append(field.wrapper);
    if (field.button) submitButton = field.button;
  });

  if (!submitButton) {
    const fallback = buildField({
      fieldType: 'submit',
      label: 'Submit',
      row: document.createElement('div'),
      index: fields.length,
    });
    fields.push(fallback);
    form.append(fallback.wrapper);
    submitButton = fallback.button;
  }

  const honeypot = createHoneypot();
  form.append(honeypot.wrap);

  const statusEl = document.createElement('p');
  statusEl.className = 'form-status';
  statusEl.setAttribute('aria-live', 'polite');
  statusEl.hidden = true;
  form.append(statusEl);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus(statusEl, '', '');

    let firstInvalid;
    const validatable = fields.filter((field) => field.config.fieldType !== 'submit');
    validatable.forEach((field) => {
      const value = getFieldValue(field.config, field.wrapper);
      const message = validateField(field.config, value);
      setFieldError(field.wrapper, field.errorEl, field.control, message);
      if (message && !firstInvalid) firstInvalid = field.wrapper;
    });

    if (firstInvalid) {
      focusField(firstInvalid);
      return;
    }

    const successMessage = settings.successMessage || DEFAULT_SUCCESS;
    if (honeypot.input.value) {
      setStatus(statusEl, 'success', successMessage);
      form.reset();
      return;
    }

    if (!settings.action) {
      setStatus(statusEl, 'error', settings.errorMessage || DEFAULT_ERROR);
      return;
    }

    submitButton.disabled = true;
    try {
      const response = await fetch(settings.action, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(collectPayload(fields)),
      });
      if (!response.ok) throw new Error(`Form submit failed: ${response.status}`);
      setStatus(statusEl, 'success', successMessage);
      form.reset();
      validatable.forEach((field) => setFieldError(field.wrapper, field.errorEl, field.control, ''));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      setStatus(statusEl, 'error', settings.errorMessage || DEFAULT_ERROR);
    } finally {
      submitButton.disabled = false;
    }
  });

  block.replaceChildren(form);
}
