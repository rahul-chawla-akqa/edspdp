export const edsViewports = {
  mobile: {
    name: 'Mobile (≤600px)',
    styles: { width: '390px', height: '844px' },
    type: 'mobile',
  },
  desktop: {
    name: 'Desktop (>600px)',
    styles: { width: '1280px', height: '800px' },
    type: 'desktop',
  },
};

export const mobileParameters = {
  viewport: {
    defaultViewport: 'mobile',
  },
};

export const desktopParameters = {
  viewport: {
    defaultViewport: 'desktop',
  },
};

/**
 * Await decorate() (and fragment/product work) before the canvas mounts.
 * @param {Function} factory (args, context) => Promise<HTMLElement>|HTMLElement
 */
export function blockStory(factory) {
  return {
    loaders: [
      async (context) => ({
        root: await factory(context.args, context),
      }),
    ],
    render: (args, { loaded }) => loaded.root || document.createElement('div'),
  };
}

/**
 * Attach Mobile / Desktop viewport stories. CSF must export each story by name.
 * @param {object} base
 */
export function mobileStory(base) {
  return {
    ...base,
    name: 'Mobile',
    parameters: { ...(base.parameters || {}), ...mobileParameters },
  };
}

/**
 * @param {object} base
 */
export function desktopStory(base) {
  return {
    ...base,
    name: 'Desktop',
    parameters: { ...(base.parameters || {}), ...desktopParameters },
  };
}
