import { isYouTubeWatchUrl } from "./shared/youtube.js";

const PANEL_PATH = "src/sidepanel/panel.html";
const supportsBrowserSidePanel = Boolean(chrome.sidePanel?.setOptions && chrome.sidePanel?.open);

chrome.runtime.onInstalled.addListener(() => {
  void syncExistingTabs();
});

chrome.runtime.onStartup.addListener(() => {
  void syncExistingTabs();
});

chrome.action.onClicked.addListener(async (tab) => {
  if (typeof tab.id !== "number" || typeof tab.windowId !== "number" || !tab.url) {
    return;
  }

  const enabled = await syncTab(tab.id, tab.url);

  if (!enabled) {
    return;
  }

  if (supportsBrowserSidePanel) {
    await chrome.sidePanel.open({ tabId: tab.id });
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "yt-notes:toggle-inline-panel" });
  } catch (error) {
    console.error("Failed to toggle inline YT Notes panel.", error);
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  await syncTab(tabId, tab.url);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const url = changeInfo.url ?? tab.url;

  if (!url) {
    return;
  }

  await syncTab(tabId, url);
});

chrome.webNavigation.onHistoryStateUpdated.addListener(
  async ({ frameId, tabId, url }) => {
    if (frameId !== 0) {
      return;
    }

    await syncTab(tabId, url);
  },
  {
    url: [{ hostContains: "youtube.com" }]
  }
);

async function syncExistingTabs() {
  if (!supportsBrowserSidePanel) {
    return;
  }

  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.map((tab) => syncTab(tab.id, tab.url)));
}

async function syncTab(tabId, url) {
  if (typeof tabId !== "number") {
    return false;
  }

  const enabled = isYouTubeWatchUrl(url);

  if (!supportsBrowserSidePanel) {
    return enabled;
  }

  await chrome.sidePanel.setOptions({
    tabId,
    enabled,
    path: PANEL_PATH
  });

  return enabled;
}
