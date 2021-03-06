'use strict';

function getAMPCacheURL(ampURL) {
  if (!ampURL.startsWith('http')) {
    throw new Error('Invalid AMP URL: it does not start with HTTP(S)');
  }
  let cacheURLPrefix = 'https://cdn.ampproject.org/c/';
  if (ampURL.startsWith(cacheURLPrefix)) {
    return ampURL;
  }
  // for HTTPS AMP pages, the prefix has additional `s/`
  cacheURLPrefix += ampURL.startsWith('https:') ? 's/' : '';
  return ampURL.replace(/https?:\/\//, cacheURLPrefix);
}

function updateBrowserAction({ tabId, enabled = false, title = '' }) {
  const method = enabled ? 'enable' : 'disable';
  const iconPath = getIconPath(enabled);
  
  chrome.browserAction[method](tabId);
  chrome.browserAction.setIcon({ tabId, path: iconPath });
  chrome.browserAction.setTitle({ tabId, title });
}

function getIconPath(enabled = false) {
  return enabled
    ? { '19': 'icons/19.png', '38': 'icons/38.png' }
    : { '19': 'icons/19-disabled.png', '38': 'icons/38-disabled.png' };
}

function getBrowserActionTitle(ampInfo) {
  let browserActionTitle = 'AMP not found 😫';
  if (ampInfo) {
    switch (ampInfo.pageType) {
      case 'hasamp':
        browserActionTitle = 'AMP found ⚡';
        break;
      case 'isamp':
        browserActionTitle = 'This is an AMP ⚡';
        break;
    }
  }
  return browserActionTitle;
}

function updateContextMenu(ampInfo) {
  chrome.contextMenus.removeAll();
  if (ampInfo) {
    let contextMenuObject = {};
    switch (ampInfo.pageType) {
      case 'hasamp':
        contextMenuObject = {
          id: 'scirpus-hasamp',
          title: 'Go to AMP page',
          enabled: true,
        };
        break;
      case 'isamp':
        contextMenuObject = {
          id: 'scirpus-isamp',
          title: 'Go to regular (non-AMP) page',
          enabled: true,
        };
        break;
    }
    chrome.contextMenus.create(contextMenuObject);
  }
}

chrome.browserAction.onClicked.addListener(tab => {
  console.log('browser action clicked', tab);
  const tabId = tab.id;
  chrome.tabs.sendMessage(tabId, { name: 'get-amp-info' }, response => {
    const ampInfo = response.data;
    let updateURL = '';
    switch (ampInfo.pageType) {
      case 'hasamp':
        updateURL = getAMPCacheURL(ampInfo.ampURL);
        break;
      case 'isamp':
        updateURL = ampInfo.canonicalURL;
        break;
    }
    !!updateURL && chrome.tabs.update(tabId, { url: updateURL });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log('context menu clicked', tab, info);
  const tabId = tab.id;
  chrome.tabs.sendMessage(tabId, { name: 'get-amp-info' }, response => {
    const ampInfo = response.data;
    let updateURL = '';
    switch (info.menuItemId) {
      case 'scirpus-hasamp':
        updateURL = getAMPCacheURL(ampInfo.ampURL);
        break;
      case 'scirpus-isamp':
        updateURL = ampInfo.canonicalURL;
        break;
    }
    !!updateURL && chrome.tabs.update(tabId, { url: updateURL });
  });
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  console.log('tab activated', tabId);
  console.log('asking AMP information...');
  chrome.tabs.sendMessage(tabId, { name: 'get-amp-info' }, response => {
    console.log('got a response from', tabId);
    reflectPageInfo({ tabId, response });
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log('tab updated', tabId);

  // remove out-of-date context menus for pages that take time to load
  chrome.contextMenus.removeAll();

  if (changeInfo.status === 'complete') {
    console.log('tab', tabId, 'is ready.');
    console.log('asking AMP information...');
    chrome.tabs.sendMessage(tabId, { name: 'get-amp-info' }, response => {
      console.log('got a response from', tabId);
      reflectPageInfo({ tabId, response });
    });
  }
});

function reflectPageInfo({ tabId, response }) {
  console.log('reflecting AMP information from', tabId, response);
  const ampInfo = response?.data;
  const browserActionTitle = getBrowserActionTitle(ampInfo);
  updateBrowserAction({
    tabId,
    enabled: !!ampInfo?.pageType,
    title: browserActionTitle,
  });
  updateContextMenu(ampInfo);
}
