import{p as d,a as u}from"./product-CkqgpR3R.js";import{s as p}from"./_shared-j-h4hYmf.js";import{bindModalTriggers as m}from"./modal-CucoMArg.js";import"./iframe-BBHNPl0w.js";import"./delayed-Dr7sAN5U.js";const h=`
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
`,f=`
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
`;function n(t,e=200){return new Response(JSON.stringify(t),{status:e,headers:{"content-type":"application/json"}})}function l(t,e=200){return new Response(t,{status:e,headers:{"content-type":"text/html"}})}function v(t){try{return new URL(t,window.location.origin).pathname}catch{return t}}function w(){if(window.edsStorybookFetchStubbed)return;window.edsStorybookFetchStubbed=!0;const t=window.fetch.bind(window);window.fetch=async(e,o={})=>{const r=typeof e=="string"?e:e.url,i=(o.method||typeof e!="string"&&e.method||"GET").toUpperCase(),a=v(r);if(/dummyjson\.com\/products\//.test(r)||/\/product-data\/[\w-]+\.json$/.test(a))return n(d);if(/jsonplaceholder\.typicode\.com\/posts\//.test(r))return n(u);if(a.endsWith(".plain.html")){const s=a.replace(/\.plain\.html$/,"");return s==="/nav"||s.endsWith("/nav")?l(h):s==="/footer"||s.endsWith("/footer")?l(f):l(b)}return i==="POST"&&(a==="/storybook/form-submit"||a.startsWith("/form"))?n({ok:!0}):t(e,o)}}w();m();document.body.classList.add("appear");const c=["apollo","vredestein","corporate"];function y(t){c.forEach(o=>document.body.classList.remove(o));const e=c.includes(t)?t:"apollo";document.body.classList.add(e,"appear")}const E={globalTypes:{theme:{name:"Theme",description:"Brand theme (body class, same as EDS page metadata)",defaultValue:"apollo",toolbar:{icon:"paintbrush",items:[{value:"apollo",title:"Apollo Tyres"},{value:"vredestein",title:"Vredestein"},{value:"corporate",title:"Corporate"}],dynamicTitle:!0}},viewportMode:{name:"Viewport",description:"EDS breakpoint: mobile max 600px, desktop greater than 600px",defaultValue:"mobile",toolbar:{icon:"mobile",items:[{value:"mobile",title:"Mobile (≤600px)"},{value:"desktop",title:"Desktop (>600px)"}],dynamicTitle:!0}}},parameters:{layout:"fullscreen",actions:{argTypesRegex:"^on[A-Z].*"},controls:{matchers:{color:/(background|color)$/i}},viewport:{viewports:p,defaultViewport:"mobile"},backgrounds:{disable:!0},a11y:{context:"#storybook-root"}},decorators:[(t,e)=>{var i;y(e.globals.theme);const r=((i=e.parameters.viewport)==null?void 0:i.defaultViewport)||e.globals.viewportMode||"mobile";return e.parameters.viewport={...e.parameters.viewport||{},viewports:p,defaultViewport:r},t()}]};export{E as default};
