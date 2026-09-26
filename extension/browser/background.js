(function () {
  'use strict';

  var api = typeof browser !== 'undefined' ? browser : chrome;

  function getSettings() {
    var defaults = { eyexType: 'deuteranopia', eyexMode: 'auto', eyexEnabled: false };
    if (typeof browser !== 'undefined') return browser.storage.sync.get(defaults);
    return new Promise(function (resolve) { chrome.storage.sync.get(defaults, resolve); });
  }

  function setSettings(values) {
    if (typeof browser !== 'undefined') return browser.storage.sync.set(values);
    return new Promise(function (resolve) { chrome.storage.sync.set(values, resolve); });
  }

  async function activeTab() {
    var tabs = await api.tabs.query({ active: true, currentWindow: true });
    return tabs[0] || null;
  }

  async function inject(tabId) {
    if (!tabId) return;
    try {
      await api.scripting.executeScript({ target: { tabId: tabId }, files: ['content.js'] });
    } catch (error) {
      console.warn('[EyeX] No se puede aplicar en esta pestaña.', error);
    }
  }

  api.commands.onCommand.addListener(async function (command) {
    if (command !== 'toggle-eyex') return;
    var settings = await getSettings();
    await setSettings({ eyexEnabled: !settings.eyexEnabled });
    var tab = await activeTab();
    if (tab && typeof tab.id === 'number') await inject(tab.id);
  });

  api.runtime.onMessage.addListener(function (message) {
    if (!message || message.type !== 'eyex-apply-active-tab') return undefined;
    return activeTab().then(function (tab) {
      if (tab && typeof tab.id === 'number') return inject(tab.id);
      return undefined;
    });
  });
}());
