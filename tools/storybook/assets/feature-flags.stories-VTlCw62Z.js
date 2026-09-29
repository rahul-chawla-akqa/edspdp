import{r as s}from"./decorate-B0_64l5j.js";import{r as c}from"./markup-Dj5iHxod.js";import{b as i}from"./_shared-C0pD2J8I.js";import"./iframe-Xmg-mMe-.js";const u={title:"Blocks/Feature Flags"},e={name:"Docs",...i(async()=>{const r=await s({name:"feature-flags",html:c("true")}),o=document.createElement("div");return o.style.padding="1.5rem",o.innerHTML=`
      <h2>Feature flags</h2>
      <p>This is not a visitor-facing UI block. Authors toggle values on a config page;
      the SSR composer reads them when composing product pages. There is no
      <code>decorate()</code> function. The illustration below is authored markup only.</p>
    `,r.prepend(o),r})};var t,n,a;e.parameters={...e.parameters,docs:{...(t=e.parameters)==null?void 0:t.docs,source:{originalSource:`{
  name: 'Docs',
  ...blockStory(async () => {
    const root = await renderBlock({
      name: 'feature-flags',
      html: row('true')
    });
    const note = document.createElement('div');
    note.style.padding = '1.5rem';
    note.innerHTML = \`
      <h2>Feature flags</h2>
      <p>This is not a visitor-facing UI block. Authors toggle values on a config page;
      the SSR composer reads them when composing product pages. There is no
      <code>decorate()</code> function. The illustration below is authored markup only.</p>
    \`;
    root.prepend(note);
    return root;
  })
}`,...(a=(n=e.parameters)==null?void 0:n.docs)==null?void 0:a.source}}};const g=["Docs"];export{e as Docs,g as __namedExportsOrder,u as default};
