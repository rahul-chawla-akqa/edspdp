import decorate from '../../blocks/form/form.js';
import { renderBlock } from '../decorate.js';
import { row } from '../markup.js';
import { blockStory, desktopParameters, mobileParameters } from './_shared.js';

function field(type, identity, rules = '', options = '') {
  return row(type, identity, rules, options);
}

const html = [
  row('/storybook/form-submit'),
  row('Thank you. Your form was submitted.'),
  row('Something went wrong. Please try again.'),
  field('text', '<p>Full name</p><p>fullName</p><p>Jane Doe</p>', '<p>Your name</p><p>required</p>'),
  field('email', '<p>Email</p><p>email</p><p>you@example.com</p>', '<p>required</p>'),
  field('select', '<p>Topic</p><p>topic</p>', '', 'support\nsales\nother'),
  field('textarea', '<p>Message</p><p>message</p><p>How can we help?</p>'),
  field('submit', 'Send'),
].join('');

async function decorateAndMaybeInvalidate(block, showInvalid) {
  decorate(block);
  if (!showInvalid) return;
  const form = block.querySelector('form');
  const email = block.querySelector('input[type="email"]');
  if (email) email.value = 'not-an-email';
  form?.requestSubmit();
}

export default {
  title: 'Blocks/Form',
};

export const Default = blockStory(() => renderBlock({ name: 'form', html, decorate }));

export const Invalid = blockStory(() => renderBlock({
  name: 'form',
  html,
  decorate: (block) => decorateAndMaybeInvalidate(block, true),
}));

export const Mobile = {
  ...Default,
  name: 'Mobile',
  parameters: mobileParameters,
};

export const Desktop = {
  ...Default,
  name: 'Desktop',
  parameters: desktopParameters,
};
