(function () {
  'use strict';

  var paletteKeys = ['background','surface','text','primary','secondary','error','success'];
  var commonLabels = { normal:'Sin adaptación', protanopia:'Rojo-verde', deuteranopia:'Rojo-verde', tritanopia:'Azul-amarillo', achromatopsia:'Todo en grises', low_vision:'Baja visión' };
  var active = { type:'normal', severity:'moderate', highContrast:false };
  var themeStatus = document.getElementById('theme-status');
  var modeIndicator = document.getElementById('mode-indicator');
  var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function systemMode() { return media && media.matches ? 'dark' : 'light'; }
  function humanSeverity(value) { var n=Number(value); return n < 34 ? 'Suave' : n < 67 ? 'Moderada' : n < 90 ? 'Alta' : 'Máxima'; }
  function apiSeverity(value) { var n=Number(value); return n < 34 ? 'mild' : n < 78 ? 'moderate' : 'severe'; }
  function typeForSimulation(type) { return type === 'tritanopia' ? 'tritanopia' : type === 'protanopia' ? 'protanopia' : 'deuteranopia'; }

  async function request(path, options) {
    var response = await fetch(path, Object.assign({ headers:{ Accept:'application/json' } }, options || {}));
    var payload = await response.json();
    if (!response.ok) throw new Error(payload.message || payload.error || ('HTTP ' + response.status));
    return payload;
  }

  function applyPalette(palette) { paletteKeys.forEach(function (key) { document.documentElement.style.setProperty('--eyex-' + key, palette[key]); }); }

  async function applyTheme(type, severity, highContrast) {
    active.type = type; active.severity = severity || active.severity; active.highContrast = Boolean(highContrast);
    var q = new URLSearchParams({ severity:active.severity, mode:systemMode(), high_contrast:String(active.highContrast) });
    themeStatus.textContent = 'Aplicando adaptación...';
    try {
      var data = await request('/api/v1/theme/' + encodeURIComponent(type) + '?' + q.toString());
      applyPalette(data.palette);
      document.getElementById('active-type-label').textContent = commonLabels[data.type] || data.type;
      document.getElementById('contrast-badge').textContent = data.contrast_ok ? 'Contraste AA: OK' : 'Contraste: revisar';
      themeStatus.textContent = 'Adaptación activa: ' + (commonLabels[data.type] || data.type) + ' · modo ' + (systemMode() === 'dark' ? 'oscuro' : 'claro') + '.';
      localStorage.setItem('eyex-v150-type', data.type);
      localStorage.setItem('eyex-v150-severity', active.severity);
      localStorage.setItem('eyex-v150-high-contrast', String(active.highContrast));
      void simulateLive();
    } catch (error) { themeStatus.textContent = 'No se pudo aplicar EyeX: ' + error.message; }
  }

  function openPanel(id) {
    ['auto-panel','manual-panel'].forEach(function (panelId) { document.getElementById(panelId).classList.toggle('hidden', panelId !== id); });
    document.getElementById(id).scrollIntoView({ behavior:'smooth', block:'start' });
  }

  document.getElementById('auto-choice').addEventListener('click', function () { openPanel('auto-panel'); });
  document.getElementById('manual-choice').addEventListener('click', function () { openPanel('manual-panel'); });

  document.querySelectorAll('[data-manual-type]').forEach(function (button) {
    button.addEventListener('click', function () { void applyTheme(button.dataset.manualType, apiSeverity(document.getElementById('theme-severity').value), button.dataset.manualType === 'achromatopsia'); });
  });

  var themeSeverity = document.getElementById('theme-severity');
  themeSeverity.addEventListener('input', function () {
    document.getElementById('theme-severity-label').value = humanSeverity(themeSeverity.value);
    document.getElementById('theme-severity-label').textContent = humanSeverity(themeSeverity.value);
  });
  themeSeverity.addEventListener('change', function () { void applyTheme(active.type, apiSeverity(themeSeverity.value), active.highContrast); });

  document.querySelectorAll('#visual-test input[type="radio"]').forEach(function (input) {
    input.addEventListener('change', function () {
      var difficult = Array.prototype.filter.call(document.querySelectorAll('#visual-test input[value="true"]'), function (item) { return item.checked; }).length;
      document.getElementById('test-progress').textContent = difficult + '/5 marcadas';
    });
  });

  document.getElementById('visual-test').addEventListener('submit', async function (event) {
    event.preventDefault();
    var form = event.currentTarget;
    var answers = {
      reds_look_darker:false,
      green_brown_confusion:false,
      blue_yellow_confusion:form.elements.blue_yellow_confusion.value === 'true',
      colors_look_gray:false,
      red_green_confusion:form.elements.red_green_confusion.value === 'true',
      red_black_confusion:form.elements.red_black_confusion.value === 'true',
      blue_green_confusion:form.elements.blue_green_confusion.value === 'true',
      yellow_pink_confusion:false,
      low_saturation_confusion:form.elements.low_saturation_confusion.value === 'true'
    };
    themeStatus.textContent = 'Analizando comparaciones visuales...';
    try {
      var data = await request('/api/v1/test/suggest', { method:'POST', headers:{ Accept:'application/json','Content-Type':'application/json' }, body:JSON.stringify({ answers:answers }) });
      active.type = data.suggested_type; active.severity = data.severity || 'moderate'; active.highContrast = Boolean(data.high_contrast);
      themeSeverity.value = active.severity === 'mild' ? '25' : active.severity === 'severe' ? '90' : '60';
      document.getElementById('theme-severity-label').textContent = humanSeverity(themeSeverity.value);
      document.getElementById('suggestion-title').textContent = 'Recomendación: ' + (commonLabels[active.type] || active.type);
      document.getElementById('suggestion-copy').textContent = 'EyeX aplicó la configuración recomendada. ' + data.disclaimer;
      document.getElementById('suggestion-result').classList.remove('hidden');
      await applyTheme(active.type, active.severity, active.highContrast);
    } catch (error) { themeStatus.textContent = 'No se pudo obtener la sugerencia: ' + error.message; }
  });

  document.querySelectorAll('[data-feedback]').forEach(function (button) {
    button.addEventListener('click', async function () {
      var target = document.getElementById('feedback-status'); target.textContent = 'Registrando...';
      try {
        await request('/api/v1/feedback', { method:'POST', headers:{ Accept:'application/json','Content-Type':'application/json' }, body:JSON.stringify({ suggested_type:active.type, helpful:button.dataset.feedback === 'true' }) });
        target.textContent = 'Gracias.';
      } catch (error) { target.textContent = error.message; }
    });
  });

  function colorName(hex) {
    var raw = String(hex).replace('#',''); var r=parseInt(raw.slice(0,2),16), g=parseInt(raw.slice(2,4),16), b=parseInt(raw.slice(4,6),16);
    var max=Math.max(r,g,b), min=Math.min(r,g,b), delta=max-min, light=(max+min)/2;
    if (max < 35) return 'Negro'; if (min > 225) return 'Blanco'; if (delta < 18) return light < 105 ? 'Gris oscuro' : light < 190 ? 'Gris' : 'Gris claro';
    var h=0; if (delta) { if (max===r) h=60*(((g-b)/delta)%6); else if(max===g) h=60*((b-r)/delta+2); else h=60*((r-g)/delta+4); if(h<0)h+=360; }
    if (h < 15 || h >= 345) return 'Rojo'; if (h < 42) return light < 105 ? 'Marrón' : 'Naranja'; if(h<68)return 'Amarillo'; if(h<165)return 'Verde'; if(h<195)return 'Turquesa'; if(h<255)return 'Azul'; if(h<290)return 'Violeta'; if(h<345)return 'Rosa'; return 'Color';
  }

  var simTimer = null;
  async function simulateLive() {
    var color = document.getElementById('simulation-color').value.toUpperCase();
    var severityPercent = Number(document.getElementById('simulation-severity').value);
    var severity = severityPercent / 100;
    document.getElementById('simulation-original').style.backgroundColor = color;
    document.getElementById('simulation-color-name').textContent = colorName(color);
    document.getElementById('simulation-original-name').textContent = colorName(color);
    document.getElementById('simulation-status').textContent = 'Actualizando vista previa...';
    try {
      var data = await request('/api/v1/simulate', { method:'POST', headers:{ Accept:'application/json','Content-Type':'application/json' }, body:JSON.stringify({ hex:color, type:typeForSimulation(active.type), severity:severity }) });
      document.getElementById('simulation-output').style.backgroundColor = data.simulated;
      document.getElementById('simulation-output-name').textContent = colorName(data.simulated);
      document.getElementById('simulation-status').textContent = 'Comparación actualizada en vivo.';
    } catch (error) { document.getElementById('simulation-status').textContent = 'No se pudo simular: ' + error.message; }
  }

  function scheduleSimulation() { clearTimeout(simTimer); simTimer=setTimeout(function(){ void simulateLive(); },120); }
  document.getElementById('simulation-color').addEventListener('input', scheduleSimulation);
  document.getElementById('simulation-severity').addEventListener('input', function (event) {
    var label=humanSeverity(event.currentTarget.value); document.getElementById('simulation-severity-label').value=label; document.getElementById('simulation-severity-label').textContent=label; scheduleSimulation();
  });

  async function initialize() {
    modeIndicator.textContent = 'Modo ' + (systemMode()==='dark'?'oscuro':'claro') + ' automático';
    var savedType=localStorage.getItem('eyex-v150-type') || 'normal';
    var savedSeverity=localStorage.getItem('eyex-v150-severity') || 'moderate';
    var savedHC=localStorage.getItem('eyex-v150-high-contrast') === 'true';
    await applyTheme(savedType, savedSeverity, savedHC);
  }

  if (media && media.addEventListener) media.addEventListener('change', function () { modeIndicator.textContent='Modo '+(systemMode()==='dark'?'oscuro':'claro')+' automático'; void applyTheme(active.type,active.severity,active.highContrast); });
  document.getElementById('simulation-original').style.backgroundColor='#FF0000';
  initialize();
}());
