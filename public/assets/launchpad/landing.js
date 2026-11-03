(() => {
  'use strict';
  const ar=document.documentElement.lang==='ar';
  const text=(en,a)=>ar?a:en;
  const root=document.documentElement;
  const storage={get(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}},set(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}};
  document.body.classList.add('has-js');
  const themeToggle=document.getElementById('theme-toggle');
  // Shared with the app, with migration for the previous landing preference.
  let preferred;try{preferred=localStorage.getItem('bs-theme')||localStorage.getItem('brainsait-landing-theme');}catch{}
  const systemTheme=matchMedia('(prefers-color-scheme: light)');
  const applyTheme=theme=>{root.dataset.theme=theme;themeToggle.setAttribute('aria-pressed',String(theme==='light'));themeToggle.textContent=theme==='light'?'☾':'☀';document.querySelector('meta[name="theme-color"]').content=theme==='light'?'#f6f5ed':'#10130f';};
  applyTheme(['light','dark'].includes(preferred)?preferred:systemTheme.matches?'light':'dark');themeToggle.hidden=false;
  themeToggle.addEventListener('click',()=>{preferred=root.dataset.theme==='dark'?'light':'dark';applyTheme(preferred);try{localStorage.setItem('bs-theme',preferred);}catch{}});
  systemTheme.addEventListener('change',()=>{if(!preferred)applyTheme(systemTheme.matches?'light':'dark');});
  const menuButton=document.getElementById('menu-toggle'),nav=document.getElementById('main-nav');
  const closeMenu=()=>{nav.dataset.open='false';menuButton.setAttribute('aria-expanded','false');};
  menuButton.hidden=false;menuButton.addEventListener('click',()=>{const open=nav.dataset.open!=='true';nav.dataset.open=String(open);menuButton.setAttribute('aria-expanded',String(open));});
  nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&nav.dataset.open==='true'){closeMenu();menuButton.focus();}});

  const cards=[...document.querySelectorAll('[data-tool]')],input=document.getElementById('tool-search'),result=document.getElementById('search-result'),empty=document.getElementById('empty-state'),spidLink=document.getElementById('spid-result');
  const validIds=new Set(cards.map(card=>card.dataset.tool));
  const stored=storage.get('brainsait-saved-tools',[]);
  let saved=new Set(Array.isArray(stored)?stored.filter(id=>validIds.has(id)):[]),filter='all';
  const norm=s=>s.toLowerCase().normalize('NFKD').replace(/[\u064b-\u065f\u0670]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي');
  function update(){
    const query=norm(input.value.trim());let visible=0;
    for(const card of cards){const show=(!query||norm(card.dataset.search).includes(query))&&(filter==='all'||(filter==='saved'?saved.has(card.dataset.tool):card.dataset.category===filter));card.hidden=!show;if(show)visible++;}
    result.textContent=text(`${visible} of ${cards.length} tools · Save a tool with ☆ to keep it on this device.`,`${visible} من ${cards.length} أدوات · احفظ أداة عبر ☆ لتبقى على هذا الجهاز.`);
    empty.hidden=visible!==0;
    const spid=input.value.trim().toUpperCase();spidLink.hidden=!/^SA-[A-Z]{2,4}-\d{6}$/.test(spid);
    if(!spidLink.hidden){spidLink.href=(ar?'/ar':'')+'/bpr/verify/?spid='+encodeURIComponent(spid);spidLink.textContent=text(`Verify provider ${spid} →`,`تحقق من مقدم الرعاية ${spid} ←`);}
  }
  document.getElementById('finder').hidden=false;
  document.querySelectorAll('[data-save]').forEach(button=>{button.hidden=false;const sync=()=>{const on=saved.has(button.dataset.save);button.setAttribute('aria-pressed',String(on));button.textContent=on?'★':'☆';};sync();button.addEventListener('click',()=>{const id=button.dataset.save;saved.has(id)?saved.delete(id):saved.add(id);storage.set('brainsait-saved-tools',[...saved]);sync();update();});});
  document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));update();}));
  input.addEventListener('input',update);
  document.getElementById('reset-search').addEventListener('click',()=>{input.value='';document.querySelector('[data-filter="all"]').click();input.focus();});
  const focusSearch=()=>{document.getElementById('tools').scrollIntoView({block:'start'});input.focus({preventScroll:true});};
  document.getElementById('search-shortcut').addEventListener('click',focusSearch);
  document.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();focusSearch();}if(event.key==='Escape'&&document.activeElement===input){input.value='';update();}});
  update();

  // Keep source and monitor time visible. A reachable endpoint is not a passing health check.
  const summary=document.getElementById('signal-summary'),dot=document.getElementById('signal-dot');let statusRequest;
  async function loadSignal(){
    if(statusRequest||document.hidden)return;
    statusRequest=true;let data,source='live';
    summary.textContent=text('Checking registry monitoring…','جارٍ فحص مراقبة السجل…');
    try{const response=await fetch('https://registry.brainsait.de/api/status',{cache:'no-store',signal:AbortSignal.timeout(6000)});if(!response.ok)throw Error();data=await response.json();}
    catch{source='snapshot';try{const response=await fetch('/assets/bpr-data/status.json',{cache:'no-store',signal:AbortSignal.timeout(3000)});if(!response.ok)throw Error();data=await response.json();}catch{}}
    try{
      if(!data||!data.operations||!data.operations.checks)throw Error();
      const checks=Object.values(data.operations.checks),ok=checks.filter(v=>v==='ok'||v==='pass').length;
      const at=new Date(data.operations.checked_at||data.checked_at),valid=!Number.isNaN(at.getTime());
      const stale=!valid||Date.now()-at.getTime()>15*60*1000;
      const stamp=valid?at.toLocaleString(ar?'ar-SA-u-ca-gregory-nu-latn':'en-GB',{dateStyle:'short',timeStyle:'short',timeZone:'Asia/Riyadh'}):text('time unavailable','الوقت غير متاح');
      const verdict=data.operations.verdict;
      const pass=source==='live'&&!stale&&(verdict==='ok'||verdict==='passing');
      dot.dataset.state=pass?'ok':'warn';
      const origin=source==='snapshot'?text('Saved snapshot','لقطة محفوظة'):stale?text('Registry report · stale','تقرير السجل · قديم'):text('Registry report','تقرير السجل');
      summary.textContent=text(`${origin} · ${ok}/${checks.length} checks passing · ${stamp} Riyadh`,`${origin} · ${ok}/${checks.length} فحوص ناجحة · ${stamp} الرياض`);
      summary.dataset.source=source;
    }catch{dot.dataset.state='unknown';summary.dataset.source='unavailable';summary.textContent=text('Monitoring unavailable. Verification is a separate check.','المراقبة غير متاحة. التحقق من الاعتماد فحص مستقل.');}
    finally{statusRequest=false;}
  }
  loadSignal();setInterval(loadSignal,60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadSignal();});window.addEventListener('online',loadSignal);
  if('serviceWorker' in navigator&&window.isSecureContext)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
})();
