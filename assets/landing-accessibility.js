(() => {
  const root = document.documentElement;
  const preference = matchMedia('(prefers-color-scheme: light)');
  let saved;
  try { saved = localStorage.getItem('brainsait-landing-theme'); } catch {}
  root.dataset.theme = saved === 'light' || saved === 'dark' ? saved : preference.matches ? 'light' : 'dark';
  const toggle = document.querySelector('.theme-toggle');
  const update = () => {
    const light = root.dataset.theme === 'light';
    toggle?.setAttribute('aria-pressed', String(light));
    if (toggle) toggle.textContent = light ? '☾' : '☀';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#f7f8ee' : '#090a08');
  };
  toggle?.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('brainsait-landing-theme', root.dataset.theme); } catch {}
    update();
  });
  update();
  const buttons = [...document.querySelectorAll('.has-dropdown > button')];
  const sync = () => buttons.forEach(button => button.setAttribute('aria-expanded', String(button.closest('.nav-item').classList.contains('open'))));
  buttons.forEach((button, index) => {
    const panel = button.nextElementSibling;
    panel.id = `nav-panel-${index}`;
    button.setAttribute('aria-controls', panel.id);
  });
  new MutationObserver(sync).observe(document.getElementById('navMenu'), {subtree:true, attributes:true, attributeFilter:['class']});
  sync();
  const menu = document.getElementById('mobileMenu');
  const hamburger = document.getElementById('navHamburger');
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { if(menu.classList.contains('open')) toggleMobile(); }));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      const active = buttons.find(button => button.closest('.nav-item').classList.contains('open'));
      buttons.forEach(button => button.closest('.nav-item').classList.remove('open'));
      active?.focus();
      if (menu.classList.contains('open')) toggleMobile();
    }
    if (event.key === 'Tab' && menu.classList.contains('open')) {
      const items = [hamburger, ...menu.querySelectorAll('a')];
      const first = items[0], last = items.at(-1);
      if(event.shiftKey && document.activeElement === first){event.preventDefault();last.focus();}
      else if(!event.shiftKey && document.activeElement === last){event.preventDefault();first.focus();}
    }
  });
})();
