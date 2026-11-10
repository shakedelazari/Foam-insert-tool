/* Shell-Case Photo Tracer: works offline after the first visit.
   It only handles the files of the phone page. The Foam Insert tool pages are not touched. */
const CACHE='sc-photo-v3'; /* V3.2: newest page always wins */
const LOCAL=['phone.html','manifest.webmanifest','icon-192.png','icon-512.png','icon-maskable-512.png','apple-touch-icon.png','models/u2netp.onnx'];
const ORT='https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';
const CDN=[ORT+'ort.wasm.min.js',ORT+'ort-wasm-simd-threaded.wasm',ORT+'ort-wasm-simd-threaded.mjs'];
self.addEventListener('install',e=>{
  e.waitUntil((async()=>{const c=await caches.open(CACHE);
    await Promise.all(LOCAL.map(u=>c.add(new Request(u,{cache:'reload'})).catch(()=>{})));
    await Promise.all(CDN.map(u=>fetch(u,{mode:'cors'}).then(r=>{if(r.ok)return c.put(u,r);}).catch(()=>{})));
    await self.skipWaiting();})());
});
self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==CACHE&&k.startsWith('sc-photo-'))await caches.delete(k);await self.clients.claim();
    /* reload any open app window so it shows the new version */
    for(const cl of await self.clients.matchAll({type:'window'})){try{cl.navigate(cl.url);}catch(e){}}})());
});
const isPhone=u=>{
  if(u.origin===self.location.origin){const p=u.pathname,base=new URL('./',self.location.href).pathname;const rel=p.startsWith(base)?p.slice(base.length):p;return /^(|index\.html|phone\.html|manifest\.webmanifest|icon-.*\.png|apple-touch-icon\.png|models\/.*|ort\/.*)$/.test(rel);}
  return u.hostname==='cdn.jsdelivr.net'&&u.pathname.includes('/onnxruntime-web@')||u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com';
};
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;const u=new URL(req.url);if(!isPhone(u))return;
  const isPage=u.origin===self.location.origin&&(/(phone|index)\.html$/.test(u.pathname)||u.pathname.endsWith('/'));
  e.respondWith((async()=>{
    const c=await caches.open(CACHE);
    if(isPage){ // the page: newest version when online, saved copy when offline
      try{const r=await fetch(u.href,{cache:'no-store'});if(r&&r.ok)c.put(new Request(u.origin+u.pathname),r.clone());return r;}catch(err){const m=await c.match(new Request(u.origin+u.pathname))||await c.match(/index\.html$|\/$/.test(u.pathname)?'index.html':'phone.html',{ignoreSearch:true});if(m)return m;throw err;}
    }
    const hit=await c.match(req,{ignoreSearch:u.origin===self.location.origin});if(hit)return hit; // model, icons, AI runtime: saved copy first
    const r=await fetch(req);if(r&&(r.ok||r.type==='opaque'))c.put(req,r.clone());return r;
  })());
});
