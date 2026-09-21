import {
  expect, fn, userEvent, waitFor, within,
} from '@storybook/test';
import { decorateButtons } from '../../scripts/scripts.js';
import { desktopStory, mobileStory } from './_shared.js';

/**
 * EDS buttons are default content, not a `button` block.
 * Authors wrap a paragraph link in strong (primary), em (secondary), or both (accent).
 * `decorateButtons` turns that markup into `a.button.{variant}`.
 */

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function authoredButtonHtml({ variant, label, href }) {
  const a = `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
  if (variant === 'accent') return `<p><strong><em>${a}</em></strong></p>`;
  if (variant === 'secondary') return `<p><em>${a}</em></p>`;
  return `<p><strong>${a}</strong></p>`;
}

const allVariantsHtml = `
  <p><strong><a href="#">Primary button</a></strong></p>
  <p><em><a href="#">Secondary button</a></em></p>
  <p><strong><em><a href="#">Accent button</a></em></strong></p>
`;

/**
 * Decorate authored button HTML and keep the Storybook iframe from navigating.
 * @param {string} html
 * @param {{ onClick?: Function, disabled?: boolean }} [args]
 * @returns {HTMLElement}
 */
function renderDecoratedButtons(html, args = {}) {
  const main = document.createElement('main');
  const section = document.createElement('div');
  section.className = 'section';
  section.dataset.sectionStatus = 'loaded';
  const wrapper = document.createElement('div');
  wrapper.className = 'default-content-wrapper';
  wrapper.innerHTML = html;
  section.append(wrapper);
  main.append(section);

  decorateButtons(main);

  main.querySelectorAll('a.button').forEach((button) => {
    if (args.disabled) button.setAttribute('aria-disabled', 'true');
    button.addEventListener('click', (event) => {
      event.preventDefault();
      button.dataset.clicked = 'true';
      args.onClick?.(event);
    });
  });

  return main;
}

export default {
  title: 'Blocks/Button',
  tags: ['autodocs'],
  args: {
    label: 'Button',
    href: '#',
    variant: 'primary',
    disabled: false,
    onClick: fn(),
  },
  argTypes: {
    label: {
      control: 'text',
      description: 'Visible button text (becomes the accessible name of the link).',
    },
    href: {
      control: 'text',
      description: 'Destination URL. Stories use # so canvas clicks do not navigate the iframe.',
    },
    variant: {
      control: 'radio',
      options: ['primary', 'secondary', 'accent'],
      description: 'Authoring: strong = primary, em = secondary, strong+em = accent.',
    },
    disabled: {
      control: 'boolean',
      description: 'Sets aria-disabled="true" on the decorated link (production CSS contract).',
    },
    onClick: {
      table: { disable: true },
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'EDS buttons are decorated default content, not a block. Wrap a paragraph link in **bold** for primary, *italic* for secondary, or both for accent. `decorateButtons` in `scripts/scripts.js` applies `a.button` plus the variant class.',
      },
    },
    a11y: {
      context: 'main',
    },
  },
  render: (args) => renderDecoratedButtons(authoredButtonHtml(args), args),
};

export const Default = {};

export const Primary = {
  args: {
    variant: 'primary',
    label: 'Primary button',
  },
};

export const Secondary = {
  args: {
    variant: 'secondary',
    label: 'Secondary button',
  },
};

export const Accent = {
  args: {
    variant: 'accent',
    label: 'Accent button',
  },
};

export const Disabled = {
  args: {
    disabled: true,
    label: 'Unavailable',
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Expose aria-disabled on the decorated link', async () => {
      const button = canvas.getByRole('link', { name: 'Unavailable' });
      await expect(button).toHaveAttribute('aria-disabled', 'true');
    });
  },
};

export const Clicked = {
  args: {
    variant: 'primary',
    label: 'Primary button',
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('link', { name: 'Primary button' });
    await step('Click the button', async () => {
      await userEvent.click(button);
    });
    await step('Verify click handler', async () => {
      await waitFor(() => expect(button).toHaveAttribute('data-clicked', 'true'));
    });
  },
};

export const Keyboard = {
  args: {
    variant: 'primary',
    label: 'Primary button',
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('link', { name: 'Primary button' });
    await step('Focus the button', async () => {
      button.focus();
      await expect(button).toHaveFocus();
    });
    await step('Activate with Enter', async () => {
      await userEvent.keyboard('{Enter}');
    });
    await step('Verify click handler', async () => {
      await waitFor(() => expect(button).toHaveAttribute('data-clicked', 'true'));
    });
  },
};

export const AllVariants = {
  render: () => renderDecoratedButtons(allVariantsHtml),
  parameters: {
    controls: { disable: true },
  },
};

export const Mobile = mobileStory(AllVariants);
export const Desktop = desktopStory(AllVariants);
