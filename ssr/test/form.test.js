import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import {
  compilePattern,
  looksLikePattern,
  parseIdentityParts,
  parseOptions,
  parseRulesParts,
  validateField,
} from '../../blocks/form/form-utils.js';

function installDom(html, { fetchImpl } = {}) {
  const dom = new JSDOM(html, { url: 'https://example.com/contact-us' });
  const previous = {};
  const globals = {
    window: dom.window,
    document: dom.window.document,
    Element: dom.window.Element,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    DocumentFragment: dom.window.DocumentFragment,
    fetch: fetchImpl || (async () => ({ ok: true })),
  };
  Object.entries(globals).forEach(([key, value]) => {
    previous[key] = globalThis[key];
    globalThis[key] = value;
  });
  return {
    window: dom.window,
    document: dom.window.document,
    restore: () => Object.entries(previous).forEach(([key, value]) => {
      globalThis[key] = value;
    }),
  };
}

async function decorateForm(html, options) {
  const env = installDom(`<main>${html}</main>`, options);
  const { default: decorate } = await import(`../../blocks/form/form.js?t=${Date.now()}-${Math.random()}`);
  const block = env.document.querySelector('.form');
  decorate(block);
  return { ...env, block };
}

function fieldError(block, name) {
  const control = block.querySelector(`[name="${name}"]`);
  const wrapper = control.closest('.form-field');
  const error = wrapper.querySelector('.form-field-error');
  return {
    wrapper,
    control,
    required: Boolean(control.required),
    help: wrapper.querySelector('.form-field-help')?.textContent || '',
    error: error.hidden ? '' : error.textContent,
    invalid: wrapper.classList.contains('is-invalid'),
  };
}

async function submit(block, window) {
  const form = block.querySelector('form');
  form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
  return form;
}

test('parseRulesParts keeps validation message out of pattern when regex is omitted', () => {
  assert.deepEqual(
    parseRulesParts(['Enter Email', 'true', 'Enter valid email']),
    {
      helpText: 'Enter Email',
      required: true,
      pattern: '',
      validationMessage: 'Enter valid email',
    },
  );
  assert.equal(looksLikePattern('Enter valid email'), false);
  assert.equal(looksLikePattern('/^[A-Za-z]+$/'), true);
});

test('parseRulesParts supports omitted required, pattern, help, and message', () => {
  assert.deepEqual(parseRulesParts(['Enter Name', '/^[A-Za-z ]+$/']), {
    helpText: 'Enter Name',
    required: false,
    pattern: '/^[A-Za-z ]+$/',
    validationMessage: '',
  });
  assert.deepEqual(parseRulesParts(['Enter Country', 'Enter country']), {
    helpText: 'Enter Country',
    required: false,
    pattern: '',
    validationMessage: 'Enter country',
  });
  assert.deepEqual(parseRulesParts(['Terms and Conditions', 'true']), {
    helpText: 'Terms and Conditions',
    required: true,
    pattern: '',
    validationMessage: '',
  });
  assert.deepEqual(parseRulesParts(['Use letters', 'false', '/^[A-Z]+$/']), {
    helpText: 'Use letters',
    required: false,
    pattern: '/^[A-Z]+$/',
    validationMessage: '',
  });
  assert.deepEqual(parseRulesParts(['true']), {
    helpText: '',
    required: true,
    pattern: '',
    validationMessage: '',
  });
  assert.deepEqual(parseRulesParts([]), {
    helpText: '',
    required: false,
    pattern: '',
    validationMessage: '',
  });
});

test('parseIdentityParts does not treat a human placeholder as the field name', () => {
  assert.deepEqual(parseIdentityParts(['Email', 'email', 'you@example.com']), {
    label: 'Email',
    name: 'email',
    placeholder: 'you@example.com',
  });
  assert.deepEqual(parseIdentityParts(['Email Address', 'you@example.com']), {
    label: 'Email Address',
    name: '',
    placeholder: 'you@example.com',
  });
  assert.deepEqual(parseIdentityParts(['Name']), {
    label: 'Name',
    name: '',
    placeholder: '',
  });
});

test('parseOptions accepts newline and single-line value|Label groups', () => {
  assert.deepEqual(parseOptions('in|India\nus|USA'), [
    { value: 'in', label: 'India' },
    { value: 'us', label: 'USA' },
  ]);
  assert.deepEqual(parseOptions('in|India us|USA hk|Hongkong'), [
    { value: 'in', label: 'India' },
    { value: 'us', label: 'USA' },
    { value: 'hk', label: 'Hongkong' },
  ]);
});

test('validateField skips required and regex when they were not authored', () => {
  const optional = {
    fieldType: 'text',
    label: 'Name',
    required: false,
    pattern: '',
    validationMessage: '',
  };
  assert.equal(validateField(optional, ''), '');
  assert.equal(validateField(optional, 'Ada'), '');

  const requiredNoPattern = {
    fieldType: 'email',
    label: 'Email',
    required: true,
    pattern: '',
    validationMessage: 'Enter valid email',
  };
  assert.equal(validateField(requiredNoPattern, ''), 'Enter valid email');
  assert.equal(validateField(requiredNoPattern, 'not-an-email'), 'Enter valid email');
  assert.equal(validateField(requiredNoPattern, 'ada@example.com'), '');

  const withPattern = {
    fieldType: 'text',
    label: 'Name',
    required: false,
    pattern: '/^[A-Za-z]+$/',
    validationMessage: '',
  };
  assert.equal(validateField(withPattern, ''), '');
  assert.equal(validateField(withPattern, 'Ada'), '');
  assert.equal(validateField(withPattern, 'Ada 2'), 'Please match the requested format.');
});

test('invalid authored regex is ignored instead of breaking validation', () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    assert.equal(compilePattern('/(/'), null);
    const config = {
      fieldType: 'text',
      label: 'Code',
      required: false,
      pattern: '/(/',
      validationMessage: 'bad',
    };
    assert.equal(validateField(config, 'anything'), '');
  } finally {
    console.error = originalError;
  }
});

const CONTACT_US_FORM = `
  <div class="form">
    <div><div></div></div>
    <div><div>Success M</div></div>
    <div><div>Error M</div></div>
    <div>
      <div>text</div>
      <div><p>Name</p><p>Name</p><p>Name</p></div>
      <div>
        <p>Enter Name</p>
        <p><a href="/%5E%5BA-Za-z%5D%2B$/">/^[A-Za-z]+$/</a></p>
      </div>
    </div>
    <div>
      <div>email</div>
      <div><p>Email</p><p>Email</p><p>Email</p></div>
      <div>
        <p>Enter Email</p>
        <p>true</p>
        <p>Enter valid email</p>
      </div>
    </div>
    <div>
      <div>select</div>
      <div><p>Country</p><p>Country</p><p>Country</p></div>
      <div>
        <p>Enter Country</p>
        <p>Enter country</p>
      </div>
      <div>in|India us|USA hk|Hongkong</div>
    </div>
    <div>
      <div>checkbox</div>
      <div><p>Terms and Conditions</p><p>tnc</p><p>Terms and Conditions</p></div>
      <div>
        <p>Terms and Conditions</p>
        <p>true</p>
      </div>
      <div></div>
    </div>
  </div>
`;

test('contact-us authoring: omitted required/pattern do not shift later rule fields', async () => {
  const env = await decorateForm(CONTACT_US_FORM);
  try {
    const name = fieldError(env.block, 'Name');
    assert.equal(name.required, false);
    assert.equal(name.help, 'Enter Name');
    assert.equal(name.control.placeholder, 'Name');

    const email = fieldError(env.block, 'Email');
    assert.equal(email.required, true);
    assert.equal(email.help, 'Enter Email');

    const country = env.block.querySelector('[name="Country"]');
    assert.equal(country.required, false);
    assert.deepEqual(
      [...country.querySelectorAll('option')].map((option) => option.value).filter(Boolean),
      ['in', 'us', 'hk'],
    );

    const tnc = env.block.querySelector('[name="tnc"]');
    assert.equal(tnc.required, true);
  } finally {
    env.restore();
  }
});

test('contact-us negative: valid email is not rejected by the validation message as a regex', async () => {
  const env = await decorateForm(CONTACT_US_FORM);
  try {
    env.block.querySelector('[name="Name"]').value = 'Ada';
    env.block.querySelector('[name="Email"]').value = 'ada@example.com';
    env.block.querySelector('[name="Country"]').value = 'in';
    env.block.querySelector('[name="tnc"]').checked = true;
    await submit(env.block, env.window);

    assert.equal(fieldError(env.block, 'Email').error, '');
    assert.equal(fieldError(env.block, 'Name').error, '');
    const status = env.block.querySelector('.form-status');
    assert.equal(status.hidden, false);
    assert.match(status.textContent, /Error M/);
  } finally {
    env.restore();
  }
});

test('contact-us negative: custom email message is used when the value is invalid', async () => {
  const env = await decorateForm(CONTACT_US_FORM);
  try {
    env.block.querySelector('[name="Email"]').value = 'not-an-email';
    env.block.querySelector('[name="tnc"]').checked = true;
    await submit(env.block, env.window);
    assert.equal(fieldError(env.block, 'Email').error, 'Enter valid email');
    assert.equal(fieldError(env.block, 'Name').error, '');
  } finally {
    env.restore();
  }
});

test('optional fields without required can be empty; required checkbox still blocks submit', async () => {
  const env = await decorateForm(CONTACT_US_FORM);
  try {
    await submit(env.block, env.window);
    assert.equal(fieldError(env.block, 'Name').error, '');
    assert.equal(fieldError(env.block, 'Email').error, 'Enter valid email');
    assert.ok(env.block.querySelector('[name="tnc"]').closest('.form-field').classList.contains('is-invalid'));
    assert.equal(env.block.querySelector('[name="Country"]').closest('.form-field').classList.contains('is-invalid'), false);
  } finally {
    env.restore();
  }
});

test('name regex from a linked pattern still validates, and empty optional name is allowed', async () => {
  const env = await decorateForm(CONTACT_US_FORM);
  try {
    env.block.querySelector('[name="Name"]').value = 'Ada2';
    env.block.querySelector('[name="Email"]').value = 'ada@example.com';
    env.block.querySelector('[name="tnc"]').checked = true;
    await submit(env.block, env.window);
    assert.equal(fieldError(env.block, 'Name').error, 'Please match the requested format.');
  } finally {
    env.restore();
  }
});

test('fully authored rules still map help, required, pattern, and message in order', async () => {
  const html = `
    <div class="form">
      <div><div>https://example.com/form</div></div>
      <div><div>Thanks</div></div>
      <div><div>Nope</div></div>
      <div>
        <div>text</div>
        <div><p>Code</p><p>code</p></div>
        <div>
          <p>Use letters</p>
          <p>true</p>
          <p>/^[A-Z]+$/</p>
          <p>Letters only</p>
        </div>
      </div>
    </div>
  `;
  const env = await decorateForm(html, { fetchImpl: async () => ({ ok: true }) });
  try {
    const code = env.block.querySelector('[name="code"]');
    assert.equal(code.required, true);
    assert.equal(fieldError(env.block, 'code').help, 'Use letters');

    code.value = 'abc';
    await submit(env.block, env.window);
    assert.equal(fieldError(env.block, 'code').error, 'Letters only');

    code.value = 'ABC';
    await submit(env.block, env.window);
    assert.equal(fieldError(env.block, 'code').error, '');
    assert.equal(env.block.querySelector('.form-status').textContent, 'Thanks');
  } finally {
    env.restore();
  }
});

test('form without required or regex accepts any filled or empty text when action succeeds', async () => {
  const html = `
    <div class="form">
      <div><div>https://example.com/form</div></div>
      <div><div></div></div>
      <div><div></div></div>
      <div>
        <div>text</div>
        <div><p>Notes</p></div>
        <div><p>Anything goes</p></div>
      </div>
    </div>
  `;
  const env = await decorateForm(html, { fetchImpl: async () => ({ ok: true }) });
  try {
    const notes = env.block.querySelector('[name="notes"]');
    assert.equal(notes.required, false);
    await submit(env.block, env.window);
    assert.equal(fieldError(env.block, 'notes').error, '');
    assert.match(env.block.querySelector('.form-status').textContent, /Thank you/);
  } finally {
    env.restore();
  }
});
