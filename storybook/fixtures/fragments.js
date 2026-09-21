/** Nav fragment HTML (what `/nav.plain.html` returns). */
export const navPlainHtml = `
<div>
  <p class="button-container"><a class="button" href="/">EDS Shop</a></p>
</div>
<div>
  <ul>
    <li>Shop
      <ul>
        <li><a href="/products">Products</a></li>
        <li><a href="/sale">Sale</a></li>
      </ul>
    </li>
    <li><a href="/about">About</a></li>
    <li><a href="/contact">Contact</a></li>
  </ul>
</div>
<div>
  <p><a href="/search">Search</a></p>
</div>
`;

/** Footer fragment HTML (what `/footer.plain.html` returns). */
export const footerPlainHtml = `
<div>
  <p><a href="/">EDS Shop</a></p>
  <ul>
    <li><a href="/about">About</a></li>
    <li><a href="/privacy">Privacy</a></li>
    <li><a href="/contact">Contact</a></li>
  </ul>
  <p>© Storybook fixture footer</p>
</div>
`;

/** Generic modal / fragment body. */
export const fragmentPlainHtml = `
<div>
  <h2>Fixture fragment</h2>
  <p>This content is served by the Storybook fetch stub instead of AEM.</p>
  <p><strong><a href="/products">Continue</a></strong></p>
</div>
`;
