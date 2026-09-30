import{h as P,d as W,m as N,b as C}from"./_shared-BB2990wA.js";import{b as O}from"./delayed-Dr7sAN5U.js";import{r as E}from"./decorate-j21SmLM1.js";import{r as _,l as I}from"./markup-Eg5hHWiV.js";import"./iframe-bSJNgU4J.js";function i(r,e){const a=document.createElement("span");a.className=`search-button-${e==="search"?"search":"go"}`,a.setAttribute("aria-hidden","true");const s=document.createElement("span");return s.className=`icon icon-${e}`,a.append(s),r.append(a),a}function M(r){const e=r.querySelector("a[href]"),a=(e==null?void 0:e.getAttribute("href"))||"",s=((e==null?void 0:e.textContent)||r.textContent||"").trim(),A=(e==null?void 0:e.getAttribute("title"))||s,D=r.classList.contains("wide"),t=document.createElement(a?"a":"div");t.className="search-button-control",a&&(t.href=a,t.dataset.modalTitle=A,D&&(t.dataset.modalClass="modal-wide"),O(t)),s&&t.setAttribute("aria-label",s),i(t,"search");const d=document.createElement("span");d.className="search-button-label",d.textContent=s,t.append(d),i(t,"arrow"),r.replaceChildren(t),P(r)}const y=_(I("/modals/search","Search the catalog","Search")),j={title:"Blocks/Search Button"},o=C(()=>E({name:"search-button",html:y,decorate:M})),n=C(()=>E({name:"search-button",html:y,classes:["wide"],decorate:M})),c={...o,name:"Mobile",parameters:N},m={...o,name:"Desktop",parameters:W};var l,p,u;o.parameters={...o.parameters,docs:{...(l=o.parameters)==null?void 0:l.docs,source:{originalSource:`blockStory(() => renderBlock({
  name: 'search-button',
  html,
  decorate
}))`,...(u=(p=o.parameters)==null?void 0:p.docs)==null?void 0:u.source}}};var h,b,S;n.parameters={...n.parameters,docs:{...(h=n.parameters)==null?void 0:h.docs,source:{originalSource:`blockStory(() => renderBlock({
  name: 'search-button',
  html,
  classes: ['wide'],
  decorate
}))`,...(S=(b=n.parameters)==null?void 0:b.docs)==null?void 0:S.source}}};var f,g,w;c.parameters={...c.parameters,docs:{...(f=c.parameters)==null?void 0:f.docs,source:{originalSource:`{
  ...Standard,
  name: 'Mobile',
  parameters: mobileParameters
}`,...(w=(g=c.parameters)==null?void 0:g.docs)==null?void 0:w.source}}};var k,x,B;m.parameters={...m.parameters,docs:{...(k=m.parameters)==null?void 0:k.docs,source:{originalSource:`{
  ...Standard,
  name: 'Desktop',
  parameters: desktopParameters
}`,...(B=(x=m.parameters)==null?void 0:x.docs)==null?void 0:B.source}}};const z=["Standard","Wide","Mobile","Desktop"];export{m as Desktop,c as Mobile,o as Standard,n as Wide,z as __namedExportsOrder,j as default};
