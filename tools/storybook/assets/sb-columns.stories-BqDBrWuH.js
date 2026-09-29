import{r as T}from"./sb-decorate-CPMmfnDB.js";import{r as g,p as E,i as M}from"./sb-markup-Dj5iHxod.js";import{d as P,m as L,b as w}from"./sb-_shared-Bg8NyEyp.js";import"./iframe-4aNAoT4L.js";function b(a){const y=[...a.firstElementChild.children];a.classList.add(`columns-${y.length}-cols`),[...a.children].forEach(B=>{[...B.children].forEach(D=>{const c=D.querySelector("picture");if(c){const n=c.closest("div");n&&n.children.length===1&&n.classList.add("columns-img-col")}})})}const _=g("<h2>Left column</h2><p>Two-column layout. JS adds <code>columns-2-cols</code>.</p>",`${E(M.card1,"Column image")}`),x=g("<h3>One</h3><p>First column.</p>","<h3>Two</h3><p>Second column.</p>","<h3>Three</h3><p>Third column.</p>"),F={title:"Blocks/Columns"},e={name:"2 columns",...w(()=>T({name:"columns",html:_,decorate:b}))},o={name:"3 columns",...w(()=>T({name:"columns",html:x,decorate:b}))},r={...e,name:"Mobile",parameters:L},s={...e,name:"Desktop",parameters:P};var m,t,l;e.parameters={...e.parameters,docs:{...(m=e.parameters)==null?void 0:m.docs,source:{originalSource:`{
  name: '2 columns',
  ...blockStory(() => renderBlock({
    name: 'columns',
    html: twoCol,
    decorate
  }))
}`,...(l=(t=e.parameters)==null?void 0:t.docs)==null?void 0:l.source}}};var p,u,i;o.parameters={...o.parameters,docs:{...(p=o.parameters)==null?void 0:p.docs,source:{originalSource:`{
  name: '3 columns',
  ...blockStory(() => renderBlock({
    name: 'columns',
    html: threeCol,
    decorate
  }))
}`,...(i=(u=o.parameters)==null?void 0:u.docs)==null?void 0:i.source}}};var d,h,C;r.parameters={...r.parameters,docs:{...(d=r.parameters)==null?void 0:d.docs,source:{originalSource:`{
  ...TwoColumns,
  name: 'Mobile',
  parameters: mobileParameters
}`,...(C=(h=r.parameters)==null?void 0:h.docs)==null?void 0:C.source}}};var f,k,S;s.parameters={...s.parameters,docs:{...(f=s.parameters)==null?void 0:f.docs,source:{originalSource:`{
  ...TwoColumns,
  name: 'Desktop',
  parameters: desktopParameters
}`,...(S=(k=s.parameters)==null?void 0:k.docs)==null?void 0:S.source}}};const J=["TwoColumns","ThreeColumns","Mobile","Desktop"];export{s as Desktop,r as Mobile,o as ThreeColumns,e as TwoColumns,J as __namedExportsOrder,F as default};
