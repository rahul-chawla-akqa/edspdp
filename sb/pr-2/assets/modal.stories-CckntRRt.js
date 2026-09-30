import{createModal as w}from"./modal-CLMVu5zB.js";import{d as x,m as E,b as g}from"./_shared-g3EeG3w-.js";import"./iframe-BP32KyFg.js";import"./delayed-Dr7sAN5U.js";function v(){const t=document.createElement("div");return t.innerHTML="<h3>Modal fixture</h3><p>Opened from Storybook without a live fragment fetch.</p>",[...t.childNodes]}function h({classes:t=[]}={}){const c=document.createElement("main"),e=document.createElement("button");e.type="button",e.className="button primary",e.textContent="Open modal",e.addEventListener("click",async()=>{(await w(v(),"Fixture modal",t)).showModal()});const o=document.createElement("div");return o.className="section",o.style.padding="2rem",o.append(e),c.append(o),c}const _={title:"Blocks/Modal"},r=g(()=>h()),a=g(()=>h({classes:["modal-wide"]})),s={...r,name:"Mobile",parameters:E},n={...a,name:"Desktop",parameters:x};var d,m,i;r.parameters={...r.parameters,docs:{...(d=r.parameters)==null?void 0:d.docs,source:{originalSource:"blockStory(() => renderModal())",...(i=(m=r.parameters)==null?void 0:m.docs)==null?void 0:i.source}}};var p,l,u;a.parameters={...a.parameters,docs:{...(p=a.parameters)==null?void 0:p.docs,source:{originalSource:`blockStory(() => renderModal({
  classes: ['modal-wide']
}))`,...(u=(l=a.parameters)==null?void 0:l.docs)==null?void 0:u.source}}};var b,k,M;s.parameters={...s.parameters,docs:{...(b=s.parameters)==null?void 0:b.docs,source:{originalSource:`{
  ...Standard,
  name: 'Mobile',
  parameters: mobileParameters
}`,...(M=(k=s.parameters)==null?void 0:k.docs)==null?void 0:M.source}}};var S,f,y;n.parameters={...n.parameters,docs:{...(S=n.parameters)==null?void 0:S.docs,source:{originalSource:`{
  ...Wide,
  name: 'Desktop',
  parameters: desktopParameters
}`,...(y=(f=n.parameters)==null?void 0:f.docs)==null?void 0:y.source}}};const L=["Standard","Wide","Mobile","Desktop"];export{n as Desktop,s as Mobile,r as Standard,a as Wide,L as __namedExportsOrder,_ as default};
