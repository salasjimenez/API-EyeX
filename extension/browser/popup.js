(function () {
  'use strict';
  var enabled = document.getElementById('enabled');
  var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-type]'));
  var selected = 'deuteranopia';
  var api = typeof browser !== 'undefined' ? browser : chrome;

  function storageGet(defaults, callback) {
    if (typeof browser !== 'undefined') browser.storage.sync.get(defaults).then(callback);
    else chrome.storage.sync.get(defaults, callback);
  }

  function storageSet(values) {
    if (typeof browser !== 'undefined') return browser.storage.sync.set(values);
    return new Promise(function (resolve) { chrome.storage.sync.set(values, resolve); });
  }

  function renderSelection() {
    buttons.forEach(function (button) { button.setAttribute('aria-pressed', button.dataset.type === selected ? 'true' : 'false'); });
  }

  buttons.forEach(function (button) {
    button.addEventListener('click', function () { selected = button.dataset.type; renderSelection(); });
  });

  storageGet({ eyexType: 'deuteranopia', eyexEnabled: false }, function (data) {
    selected = ['deuteranopia','tritanopia','achromatopsia'].indexOf(data.eyexType) >= 0 ? data.eyexType : 'deuteranopia';
    enabled.checked = data.eyexEnabled;
    renderSelection();
  });

  document.getElementById('save').addEventListener('click', async function () {
    await storageSet({ eyexType: selected, eyexMode: 'auto', eyexEnabled: enabled.checked });
    try { await api.runtime.sendMessage({ type: 'eyex-apply-active-tab' }); } catch (_) { /* no-op */ }
    window.close();
  });
}());
