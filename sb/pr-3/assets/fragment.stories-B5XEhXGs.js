import g from"./fragment-CuHjF3t6.js";import{r as f}from"./decorate-BO6Pl1i8.js";import{r as x,l as M}from"./markup-Eg5hHWiV.js";import{d as E,m as F,b as S}from"./_shared-CdksFyeo.js";import"./scripts-BLCKl7SW.js";import"./iframe-BEp3J7j6.js";import"./delayed-Dr7sAN5U.js";import"./placeholders-Cem7kk0_.js";const y=x(M("/modals/sample","/modals/sample")),q={title:"Blocks/Fragment"},r={render:()=>{const o=document.createElement("article");return o.style.padding="1.5rem",o.innerHTML=`
      <h2>Fragment</h2>
      <p>This block fetches <code>{path}.plain.html</code> and inlines it. Storybook stubs
      that request so the embed below is fixture HTML, not a live AEM page.</p>
    `,o}},e={name:"Fixture embed",...S(()=>f({name:"fragment",html:y,decorate:g}))},t={...e,name:"Mobile",parameters:F},a={...e,name:"Desktop",parameters:E};var s,n,m;r.parameters={...r.parameters,docs:{...(s=r.parameters)==null?void 0:s.docs,source:{originalSource:`{
  render: () => {
    const article = document.createElement('article');
    article.style.padding = '1.5rem';
    article.innerHTML = \`
      <h2>Fragment</h2>
      <p>This block fetches <code>{path}.plain.html</code> and inlines it. Storybook stubs
      that request so the embed below is fixture HTML, not a live AEM page.</p>
    \`;
    return article;
  }
}`,...(m=(n=r.parameters)==null?void 0:n.docs)==null?void 0:m.source}}};var c,i,p;e.parameters={...e.parameters,docs:{...(c=e.parameters)==null?void 0:c.docs,source:{originalSource:`{
  name: 'Fixture embed',
  ...blockStory(() => renderBlock({
    name: 'fragment',
    html,
    decorate
  }))
}`,...(p=(i=e.parameters)==null?void 0:i.docs)==null?void 0:p.source}}};var l,d,u;t.parameters={...t.parameters,docs:{...(l=t.parameters)==null?void 0:l.docs,source:{originalSource:`{
  ...FixtureEmbed,
  name: 'Mobile',
  parameters: mobileParameters
}`,...(u=(d=t.parameters)==null?void 0:d.docs)==null?void 0:u.source}}};var b,h,k;a.parameters={...a.parameters,docs:{...(b=a.parameters)==null?void 0:b.docs,source:{originalSource:`{
  ...FixtureEmbed,
  name: 'Desktop',
  parameters: desktopParameters
}`,...(k=(h=a.parameters)==null?void 0:h.docs)==null?void 0:k.source}}};const v=["Docs","FixtureEmbed","Mobile","Desktop"];export{a as Desktop,r as Docs,e as FixtureEmbed,t as Mobile,v as __namedExportsOrder,q as default};
