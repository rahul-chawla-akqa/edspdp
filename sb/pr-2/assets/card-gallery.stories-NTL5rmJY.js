import{g as X,d as Y,m as Z,b as S}from"./_shared-g3EeG3w-.js";import{b as w}from"./delayed-Dr7sAN5U.js";import{m as B}from"./scripts-B7RO3XrP.js";import{r as b}from"./decorate-By7HU2L6.js";import{r as T,l as C,p as A,i as O}from"./markup-CsJHZbiw.js";import"./iframe-BP32KyFg.js";import"./icon-D1hao3sQ.js";import"./placeholders-oe9eS3l1.js";const q=["ratio-1-1","ratio-2-1","ratio-1-2"],L=q[0],ee=/^[a-z0-9][a-z0-9-]*$/i;function D(e){return(e==null?void 0:e.textContent.trim())||""}function Q(e){const t=e.split(",").map(r=>r.trim().toLowerCase()).filter(Boolean);return!t.length||!t.every(r=>ee.test(r))?[]:t.some(r=>q.includes(r))?t:[]}function re(e){return Q(D(e)).length>0}function ae(e){const t=[...e.children].flatMap(a=>Q(D(a))),r=[...e.classList,...t].filter(a=>q.includes(a));if(!r.length)return L;const s=r.filter(a=>a!==L),n=s.length?s:r;return n[n.length-1]}function te(e){const t=[...e.children].find(r=>!r.querySelector("picture")&&!r.querySelector("a[href]")&&!re(r));return D(t)}function k(e){const t=e.hasAttribute("data-aue-resource")||[...e.children].some(s=>s.hasAttribute("data-aue-resource")),r=[...e.children].reduce((s,n)=>{const a=n.querySelector("a[href]"),d=a==null?void 0:a.getAttribute("href");if(!d&&!t)return s;const l=te(n),V=(a==null?void 0:a.getAttribute("title"))||l,m=n.querySelector("picture"),p=m==null?void 0:m.querySelector("img"),o=document.createElement(d?"a":"div");if(o.className=`card-gallery-card ${ae(n)}`,d&&(o.href=d,o.dataset.modalTitle=V,w(o)),l&&o.setAttribute("aria-label",l),B(n,o),p){const c=X(p.src,p.alt||l,!1,[{width:"750"}]);B(p,c.querySelector("img")),o.append(c)}else m&&o.append(m);if(l){const c=document.createElement("span");c.className="card-gallery-title",c.textContent=l,o.append(c)}return s.push(o),s},[]);e.replaceChildren(...r)}function R(e){return[T(A(O.card1,"Square card"),"Square",C("/modals/sample","Open","Square"),e||"ratio-1-1"),T(A(O.card2,"Wide card"),"Wide",C("/modals/sample","Open","Wide"),"ratio-2-1"),T(A(O.card3,"Tall card"),"Tall",C("/modals/sample","Open","Tall"),"ratio-1-2")].join("")}const pe={title:"Blocks/Card Gallery",argTypes:{ratio:{name:"Lead card ratio",control:"select",options:["ratio-1-1","ratio-2-1","ratio-1-2"]}},args:{ratio:"ratio-1-1"}},i=S(({ratio:e})=>b({name:"card-gallery",html:R(e),decorate:k})),u={name:"Ratio 1:1",...S(()=>b({name:"card-gallery",html:R("ratio-1-1"),decorate:k}))},f={name:"Ratio 2:1",...S(()=>b({name:"card-gallery",html:R("ratio-2-1"),decorate:k}))},g={name:"Ratio 1:2",...S(()=>b({name:"card-gallery",html:R("ratio-1-2"),decorate:k}))},y={...i,name:"Mobile",parameters:Z},h={...i,name:"Desktop",parameters:Y};var v,E,M;i.parameters={...i.parameters,docs:{...(v=i.parameters)==null?void 0:v.docs,source:{originalSource:`blockStory(({
  ratio
}) => renderBlock({
  name: 'card-gallery',
  html: galleryHtml(ratio),
  decorate
}))`,...(M=(E=i.parameters)==null?void 0:E.docs)==null?void 0:M.source}}};var _,x,H;u.parameters={...u.parameters,docs:{...(_=u.parameters)==null?void 0:_.docs,source:{originalSource:`{
  name: 'Ratio 1:1',
  ...blockStory(() => renderBlock({
    name: 'card-gallery',
    html: galleryHtml('ratio-1-1'),
    decorate
  }))
}`,...(H=(x=u.parameters)==null?void 0:x.docs)==null?void 0:H.source}}};var P,z,I;f.parameters={...f.parameters,docs:{...(P=f.parameters)==null?void 0:P.docs,source:{originalSource:`{
  name: 'Ratio 2:1',
  ...blockStory(() => renderBlock({
    name: 'card-gallery',
    html: galleryHtml('ratio-2-1'),
    decorate
  }))
}`,...(I=(z=f.parameters)==null?void 0:z.docs)==null?void 0:I.source}}};var N,W,F;g.parameters={...g.parameters,docs:{...(N=g.parameters)==null?void 0:N.docs,source:{originalSource:`{
  name: 'Ratio 1:2',
  ...blockStory(() => renderBlock({
    name: 'card-gallery',
    html: galleryHtml('ratio-1-2'),
    decorate
  }))
}`,...(F=(W=g.parameters)==null?void 0:W.docs)==null?void 0:F.source}}};var G,$,j;y.parameters={...y.parameters,docs:{...(G=y.parameters)==null?void 0:G.docs,source:{originalSource:`{
  ...Default,
  name: 'Mobile',
  parameters: mobileParameters
}`,...(j=($=y.parameters)==null?void 0:$.docs)==null?void 0:j.source}}};var K,U,J;h.parameters={...h.parameters,docs:{...(K=h.parameters)==null?void 0:K.docs,source:{originalSource:`{
  ...Default,
  name: 'Desktop',
  parameters: desktopParameters
}`,...(J=(U=h.parameters)==null?void 0:U.docs)==null?void 0:J.source}}};const ue=["Default","Ratio11","Ratio21","Ratio12","Mobile","Desktop"];export{i as Default,h as Desktop,y as Mobile,u as Ratio11,g as Ratio12,f as Ratio21,ue as __namedExportsOrder,pe as default};
