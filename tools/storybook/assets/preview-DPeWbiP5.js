import{p as d,a as u}from"./product-CXzCv_GK.js";import{v as p}from"./_shared-C0pD2J8I.js";import{bindModalTriggers as m}from"./modal-D15b4UrP.js";import"./iframe-Xmg-mMe-.js";import"./delayed-Dr7sAN5U.js";const f=`
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
`,h=`
<div>
  <p><a href="/">EDS Shop</a></p>
  <ul>
    <li><a href="/about">About</a></li>
    <li><a href="/privacy">Privacy</a></li>
    <li><a href="/contact">Contact</a></li>
  </ul>
  <p>© Storybook fixture footer</p>
</div>
`,b=`
<div>
  <h2>Fixture fragment</h2>
  <p>This content is served by the Storybook fetch stub instead of AEM.</p>
  <p><strong><a href="/products">Continue</a></strong></p>
</div>
`;function s(e,t=200){return new Response(JSON.stringify(e),{status:t,headers:{"content-type":"application/json"}})}function l(e,t=200){return new Response(e,{status:t,headers:{"content-type":"text/html"}})}function v(e){try{return new URL(e,window.location.origin).pathname}catch{return e}}function w(){if(window.edsStorybookFetchStubbed)return;window.edsStorybookFetchStubbed=!0;const e=window.fetch.bind(window);window.fetch=async(t,o={})=>{const r=typeof t=="string"?t:t.url,i=(o.method||typeof t!="string"&&t.method||"GET").toUpperCase(),a=v(r);if(/dummyjson\.com\/products\//.test(r)||/\/product-data\/[\w-]+\.json$/.test(a))return s(d);if(/jsonplaceholder\.typicode\.com\/posts\//.test(r))return s(u);if(a.endsWith(".plain.html")){const n=a.replace(/\.plain\.html$/,"");return n==="/nav"||n.endsWith("/nav")?l(f):n==="/footer"||n.endsWith("/footer")?l(h):l(b)}return i==="POST"&&(a==="/storybook/form-submit"||a.startsWith("/form"))?s({ok:!0}):e(t,o)}}w();m();document.body.classList.add("appear");const c=["default","corporate","retail"];function y(e){c.forEach(o=>document.body.classList.remove(o));const t=c.includes(e)?e:"default";document.body.classList.add(t,"appear")}const E={globalTypes:{theme:{name:"Theme",description:"Brand theme (body class, same as EDS page metadata)",defaultValue:"default",toolbar:{icon:"paintbrush",items:[{value:"default",title:"Default"},{value:"corporate",title:"Corporate"},{value:"retail",title:"Retail"}],dynamicTitle:!0}},viewportMode:{name:"Viewport",description:"EDS breakpoint: mobile max 600px, desktop greater than 600px",defaultValue:"mobile",toolbar:{icon:"mobile",items:[{value:"mobile",title:"Mobile (≤600px)"},{value:"desktop",title:"Desktop (>600px)"}],dynamicTitle:!0}}},parameters:{layout:"fullscreen",actions:{argTypesRegex:"^on[A-Z].*"},controls:{matchers:{color:/(background|color)$/i}},viewport:{viewports:p,defaultViewport:"mobile"},backgrounds:{disable:!0},a11y:{context:"#storybook-root"}},decorators:[(e,t)=>{var i;y(t.globals.theme);const r=((i=t.parameters.viewport)==null?void 0:i.defaultViewport)||t.globals.viewportMode||"mobile";return t.parameters.viewport={...t.parameters.viewport||{},viewports:p,defaultViewport:r},e()}]};export{E as default};
