import { createModal } from '../../blocks/modal/modal.js';
import { blockStory, desktopParameters, mobileParameters } from './_shared.js';

function fixtureNodes() {
  const section = document.createElement('div');
  section.innerHTML = '<h3>Modal fixture</h3><p>Opened from Storybook without a live fragment fetch.</p>';
  return [...section.childNodes];
}

function renderModal({ classes = [] } = {}) {
  const main = document.createElement('main');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button primary';
  button.textContent = 'Open modal';
  button.addEventListener('click', async () => {
    const api = await createModal(fixtureNodes(), 'Fixture modal', classes);
    api.showModal();
  });
  const wrap = document.createElement('div');
  wrap.className = 'section';
  wrap.style.padding = '2rem';
  wrap.append(button);
  main.append(wrap);
  return main;
}

export default {
  title: 'Blocks/Modal',
};

export const Standard = blockStory(() => renderModal());

export const Wide = blockStory(() => renderModal({ classes: ['modal-wide'] }));

export const Mobile = {
  ...Standard,
  name: 'Mobile',
  parameters: mobileParameters,
};

export const Desktop = {
  ...Wide,
  name: 'Desktop',
  parameters: desktopParameters,
};
