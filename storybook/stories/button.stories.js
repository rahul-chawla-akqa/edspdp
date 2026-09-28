import {
  expect, fn, userEvent, waitFor, within,
} from '@storybook/test';
import { decorateButtons } from '../../scripts/scripts.js';
import { createButton } from '../../scripts/ui/button.js';
import { blockStory, desktopStory, mobileStory } from './_shared.js';

/**
 * EDS buttons are default content, not a `button` block.
 * Authors wrap a paragraph link in strong (primary) or em (secondary).
 * `decorateButtons` turns that markup into `a.button.{variant}`.
 */

/**
 * Convert a token's hex value into the `rgb()` form getComputedStyle reports.
 * @param {string} hex
 * @returns {string}
 */
function toRgb(hex) {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? [...value].map((c) => c + c).join('') : value;
  const int = parseInt(full, 16);
  // eslint-disable-next-line no-bitwise
  return `rgb(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255})`;
}

function expectedBrandRadius() {
  return document.body.classList.contains('vredestein') ? '4px' : '36px';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function authoredButtonHtml({ variant, label, href }) {
  const a = `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
  if (variant === 'text') {
    return `<p><a href="${escapeHtml(href)}" data-aue-prop="link">${escapeHtml(label)}</a></p>`;
  }
  if (variant === 'secondary') return `<p><em>${a}</em></p>`;
  return `<p><strong>${a}</strong></p>`;
}

const allVariantsHtml = `
  <p><strong><a href="#">Primary button</a></strong></p>
  <p><em><a href="#">Secondary button</a></em></p>
`;

const textLinkSizesHtml = `
  <p><a href="#" data-aue-prop="link">Large text link</a></p>
  <p><a href="#" data-aue-prop="link">Medium text link</a></p>
  <p><a href="#" data-aue-prop="link">Small text link</a></p>
  <p><a href="#" data-aue-prop="link">Extra small text link</a></p>
`;

/** Icons available under /icons — keep in sync with story controls. */
const ICON_OPTIONS = ['arrow', 'search', 'external-link'];

const iconStoryArgTypes = {
  icon: {
    control: 'select',
    options: ICON_OPTIONS,
    description: 'Icon token resolved from `/icons/{name}.svg`.',
  },
  iconPosition: {
    control: 'radio',
    options: ['start', 'end'],
    description: 'Icon placement relative to the label.',
  },
  iconOnly: { table: { disable: true } },
  ariaLabel: {
    control: 'text',
    description: 'Required accessible name when the button is icon-only.',
  },
  asLink: { control: 'boolean' },
};

/**
 * Decorate authored button HTML and keep the Storybook iframe from navigating.
 * @param {string} html
 * @param {{ onClick?: Function, disabled?: boolean, sectionStyle?: string,
 *   size?: string }} [args]
 * @returns {Promise<HTMLElement>}
 */
async function renderDecoratedButtons(html, args = {}) {
  const main = document.createElement('main');
  const section = document.createElement('div');
  section.className = args.sectionStyle ? `section ${args.sectionStyle}` : 'section';
  section.dataset.sectionStatus = 'loaded';
  const wrapper = document.createElement('div');
  wrapper.className = 'default-content-wrapper';
  wrapper.innerHTML = html;
  section.append(wrapper);
  main.append(section);

  await decorateButtons(main);

  main.querySelectorAll('a.button').forEach((button) => {
    if (args.disabled) button.setAttribute('aria-disabled', 'true');
    if (args.size && args.size !== 'default') button.classList.add(`size-${args.size}`);
    button.addEventListener('click', (event) => {
      event.preventDefault();
      button.dataset.clicked = 'true';
      args.onClick?.(event);
    });
  });

  return main;
}

/**
 * Renders programmatic buttons from the shared createButton helper.
 * @param {object} args
 * @returns {Promise<HTMLElement>}
 */
async function renderProgrammaticButton(args) {
  const main = document.createElement('main');
  const section = document.createElement('div');
  section.className = 'section';
  section.dataset.sectionStatus = 'loaded';
  const wrapper = document.createElement('div');
  wrapper.className = 'default-content-wrapper';

  const button = await createButton({
    label: args.iconOnly ? undefined : args.label,
    href: args.asLink ? args.href : undefined,
    variant: args.variant,
    size: args.size && args.size !== 'default' ? args.size : undefined,
    disabled: args.disabled,
    icon: args.icon,
    iconPosition: args.iconPosition,
    iconOnly: args.iconOnly,
    ariaLabel: args.iconOnly ? args.ariaLabel : undefined,
  });

  if (button) {
    button.addEventListener('click', (event) => {
      if (button.tagName === 'A') event.preventDefault();
      button.dataset.clicked = 'true';
      args.onClick?.(event);
    });
    wrapper.append(button);
  }

  section.append(wrapper);
  main.append(section);
  return main;
}

/** Await decorateButtons before the canvas mounts (icons need async fetch). */
const decoratedStory = blockStory((args) => renderDecoratedButtons(
  authoredButtonHtml(args),
  args,
));

export default {
  title: 'Blocks/Button',
  tags: ['autodocs'],
  ...decoratedStory,
  args: {
    label: 'Button',
    href: '#',
    variant: 'primary',
    size: 'default',
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
      options: ['primary', 'secondary', 'text'],
      description: 'Authoring: strong = primary, em = secondary, UE text type = text link.',
    },
    size: {
      control: 'radio',
      options: ['default', 'md', 'sm', 'xs'],
      description: 'Compact sizes are normally applied by the containing block, not chosen by the author.',
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
          'EDS buttons are decorated default content, not a block. Wrap a paragraph link in **bold** for primary, *italic* for secondary, or choose **Text** in Universal Editor for `a.button.text` with a trailing external-link icon.',
      },
    },
    a11y: {
      context: 'main',
    },
  },
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

export const TextLink = {
  name: 'Text link',
  args: {
    variant: 'text',
    label: 'Label',
    href: '#',
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Text link uses the text variant with a trailing icon', async () => {
      const link = canvas.getByRole('link', { name: 'Label' });
      await expect(link.classList.contains('text')).toBe(true);
      await expect(canvasElement.querySelector('.button.text .icon-external-link')).toBeTruthy();
    });
    await step('Text link has no pill chrome', async () => {
      const link = canvas.getByRole('link', { name: 'Label' });
      const styles = getComputedStyle(link);
      await expect(styles.paddingTop).toBe('0px');
      await expect(styles.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    });
  },
};

export const TextLinkOnDark = {
  name: 'Text link on dark',
  ...blockStory((args) => renderDecoratedButtons(authoredButtonHtml(args), {
    ...args,
    sectionStyle: 'dark',
  })),
  args: {
    variant: 'text',
    label: 'Label',
    href: '#',
  },
  parameters: {
    controls: { disable: true },
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Text link adopts on-dark tokens', async () => {
      const link = canvas.getByRole('link', { name: 'Label' });
      const onDark = getComputedStyle(link).color;
      const neutralText = getComputedStyle(document.body)
        .getPropertyValue('--neutral-text').trim();
      await expect(onDark).toBe(toRgb(neutralText));
    });
  },
};

export const TextLinkSizes = {
  name: 'Text link sizes',
  ...blockStory(async () => {
    const main = await renderDecoratedButtons(textLinkSizesHtml);
    const links = main.querySelectorAll('a.button.text');
    const sizes = ['lg', 'md', 'sm', 'xs'];
    links.forEach((link, index) => {
      if (sizes[index] !== 'lg') link.classList.add(`size-${sizes[index]}`);
    });
    return main;
  }),
  parameters: {
    controls: { disable: true },
  },
};

export const TextLinkBrandTokens = {
  name: 'Text link brand tokens',
  ...blockStory((args) => renderProgrammaticButton({
    ...args,
    variant: 'text',
    asLink: true,
    href: '#',
    label: 'Label',
  })),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story: 'Switch brands with the Theme toolbar. Text links resolve from `--color-text-link` tokens, not button accent fills.',
      },
    },
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const linkColor = getComputedStyle(document.body).getPropertyValue('--color-text-link').trim();
    await step('Text link color follows the active brand text-link token', async () => {
      const link = canvas.getByRole('link', { name: 'Label' });
      await expect(getComputedStyle(link).color).toBe(toRgb(linkColor));
    });
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
  ...blockStory(() => renderDecoratedButtons(allVariantsHtml)),
  parameters: {
    controls: { disable: true },
  },
};

export const Compact = {
  name: 'Compact size',
  ...blockStory(() => renderDecoratedButtons(allVariantsHtml, { size: 'sm' })),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Both variants at compact size. Use the **Size** control on interactive stories to toggle `size-sm`.',
      },
    },
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Compact buttons retain the active brand radius', async () => {
      canvas.getAllByRole('link').forEach((button) => {
        expect(getComputedStyle(button).borderRadius).toBe(expectedBrandRadius());
      });
    });
  },
};

export const OnDark = {
  name: 'On dark section',
  ...blockStory(() => renderDecoratedButtons(allVariantsHtml, { sectionStyle: 'dark' })),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'A section styled `dark` re-points the secondary tokens at their on-dark treatment. No author or block change is needed.',
      },
    },
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Secondary button adopts the on-dark outline', async () => {
      const secondary = canvas.getByRole('link', { name: 'Secondary button' });
      const onDark = getComputedStyle(secondary).borderTopColor;
      const neutralText = getComputedStyle(document.body)
        .getPropertyValue('--neutral-text').trim();
      await expect(onDark).toBe(toRgb(neutralText));
    });
  },
};

export const BrandTokens = {
  name: 'Brand token wiring',
  ...blockStory(() => renderDecoratedButtons(allVariantsHtml)),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Switch brands with the Theme toolbar. Primary fill and secondary outline both resolve from the active brand accent ramp.',
      },
    },
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const accent = getComputedStyle(document.body).getPropertyValue('--brand-accent').trim();

    await step('Primary fill uses the brand accent', async () => {
      const primary = canvas.getByRole('link', { name: 'Primary button' });
      await expect(getComputedStyle(primary).backgroundColor).toBe(toRgb(accent));
    });

    await step('Secondary outline uses the same accent with no fill', async () => {
      const secondary = canvas.getByRole('link', { name: 'Secondary button' });
      const styles = getComputedStyle(secondary);
      await expect(styles.borderTopColor).toBe(toRgb(accent));
      await expect(styles.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    });

    await step('Default, hover and active are three distinct steps', async () => {
      const ramp = ['--brand-accent', '--brand-accent-hover', '--brand-accent-active']
        .map((token) => getComputedStyle(document.body).getPropertyValue(token).trim());
      await expect(new Set(ramp).size).toBe(3);
    });

    await step('All variants use the active brand radius', async () => {
      canvas.getAllByRole('link').forEach((button) => {
        expect(getComputedStyle(button).borderRadius).toBe(expectedBrandRadius());
      });
    });
  },
};

export const Mobile = mobileStory(AllVariants);
export const Desktop = desktopStory(AllVariants);

export const ActionButton = {
  name: 'Native action button',
  ...blockStory((args) => renderProgrammaticButton(args)),
  args: {
    label: 'Submit',
    variant: 'primary',
    asLink: false,
  },
  argTypes: {
    asLink: { table: { disable: true } },
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Submit' });
    await step('Click the native button', async () => {
      await userEvent.click(button);
    });
    await step('Verify click handler', async () => {
      await waitFor(() => expect(button).toHaveAttribute('data-clicked', 'true'));
    });
  },
};

export const WithLeadingIcon = {
  name: 'Icon with text',
  ...blockStory((args) => renderProgrammaticButton(args)),
  args: {
    label: 'Continue',
    variant: 'primary',
    icon: 'arrow',
    iconPosition: 'end',
    asLink: true,
    href: '#',
  },
  argTypes: iconStoryArgTypes,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Icon is presentational', async () => {
      const icon = canvasElement.querySelector('.icon');
      await expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
    await step('Accessible name comes from the label', async () => {
      await expect(canvas.getByRole('link', { name: 'Continue' })).toBeInTheDocument();
    });
    await step('Icon inherits the button text color', async () => {
      const button = canvas.getByRole('link', { name: 'Continue' });
      const iconPath = canvasElement.querySelector('.button .icon svg path');
      const buttonColor = getComputedStyle(button).color;
      await expect(getComputedStyle(iconPath).fill).toBe(buttonColor);
    });
  },
};

export const IconOnly = {
  name: 'Icon only',
  ...blockStory((args) => renderProgrammaticButton(args)),
  args: {
    iconOnly: true,
    icon: 'search',
    ariaLabel: 'Search',
    variant: 'secondary',
    asLink: false,
  },
  argTypes: {
    ...iconStoryArgTypes,
    iconPosition: { table: { disable: true } },
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Icon-only button exposes an accessible name', async () => {
      const button = canvas.getByRole('button', { name: 'Search' });
      await expect(button.classList.contains('icon-only')).toBe(true);
    });
    await step('Icon is hidden from assistive technology', async () => {
      const icon = canvasElement.querySelector('.icon');
      await expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
    await step('Icon inherits the button text color', async () => {
      const button = canvas.getByRole('button', { name: 'Search' });
      const iconPath = canvasElement.querySelector('.button .icon svg path');
      const buttonColor = getComputedStyle(button).color;
      await expect(getComputedStyle(iconPath).fill).toBe(buttonColor);
    });
  },
};
