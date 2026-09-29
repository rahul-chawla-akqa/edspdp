import{c as P}from"./icon-D1hao3sQ.js";import{b as W}from"./delayed-Dr7sAN5U.js";import{r as C}from"./decorate-DFPLQzPJ.js";import{r as N,l as O}from"./markup-CsJHZbiw.js";import{d as _,m as I,b as M}from"./_shared-j-h4hYmf.js";import"./iframe-BBHNPl0w.js";async function p(r,e,o){const a=document.createElement("span");a.className=o,a.setAttribute("aria-hidden","true");const n=await P(e);n&&a.append(n),r.append(a)}async function A(r){const e=r.querySelector("a[href]"),o=(e==null?void 0:e.getAttribute("href"))||"",a=((e==null?void 0:e.textContent)||r.textContent||"").trim(),n=(e==null?void 0:e.getAttribute("title"))||a,E=r.classList.contains("wide"),t=document.createElement(o?"a":"div");t.className="search-button-control",o&&(t.href=o,t.dataset.modalTitle=n,E&&(t.dataset.modalClass="modal-wide"),W(t)),a&&t.setAttribute("aria-label",a),await p(t,"search","search-button-search");const i=document.createElement("span");i.className="search-button-label",i.textContent=a,t.append(i),await p(t,"arrow","search-button-go"),r.replaceChildren(t)}const D=N(O("/modals/search","Search the catalog","Search")),F={title:"Blocks/Search Button"},s=M(()=>C({name:"search-button",html:D,decorate:A})),c=M(()=>C({name:"search-button",html:D,classes:["wide"],decorate:A})),m={...s,name:"Mobile",parameters:I},d={...s,name:"Desktop",parameters:_};var l,u,h;s.parameters={...s.parameters,docs:{...(l=s.parameters)==null?void 0:l.docs,source:{originalSource:`blockStory(() => renderBlock({
  name: 'search-button',
  html,
  decorate
}))`,...(h=(u=s.parameters)==null?void 0:u.docs)==null?void 0:h.source}}};var b,f,S;c.parameters={...c.parameters,docs:{...(b=c.parameters)==null?void 0:b.docs,source:{originalSource:`blockStory(() => renderBlock({
  name: 'search-button',
  html,
  classes: ['wide'],
  decorate
}))`,...(S=(f=c.parameters)==null?void 0:f.docs)==null?void 0:S.source}}};var g,w,k;m.parameters={...m.parameters,docs:{...(g=m.parameters)==null?void 0:g.docs,source:{originalSource:`{
  ...Standard,
  name: 'Mobile',
  parameters: mobileParameters
}`,...(k=(w=m.parameters)==null?void 0:w.docs)==null?void 0:k.source}}};var x,y,B;d.parameters={...d.parameters,docs:{...(x=d.parameters)==null?void 0:x.docs,source:{originalSource:`{
  ...Standard,
  name: 'Desktop',
  parameters: desktopParameters
}`,...(B=(y=d.parameters)==null?void 0:y.docs)==null?void 0:B.source}}};const G=["Standard","Wide","Mobile","Desktop"];export{d as Desktop,m as Mobile,s as Standard,c as Wide,G as __namedExportsOrder,F as default};
