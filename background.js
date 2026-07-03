chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXECUTE_GESTURE') {
    const gestureStr = message.gesture;
    const imageUrl = message.imageUrl;
    const tab = sender.tab;
    
    chrome.storage.local.get({ gestures: {} }, async (data) => {
      const action = data.gestures[gestureStr];
      if (!action) return;

      switch (action) {
        case 'History':
          chrome.tabs.create({ url: 'chrome://history/' });
          break;
        case 'Add bookmark':
          if (tab) await toggleBookmark(tab);
          break;
        case 'Close right tabs':
          if (tab) await closeTabsRight(tab);
          break;
        case 'Copy tab':
          if (tab && tab.id) {
            chrome.tabs.duplicate(tab.id);
          }
          break;
        case 'DL image':
          if (imageUrl) {
            await downloadImage(imageUrl);
          }
          break;
        case 'UP':
          if (tab && tab.id) {
            chrome.tabs.sendMessage(tab.id, { type: 'SCROLL_UP' }).catch(() => {});
          }
          break;
        case 'DOWN':
          if (tab && tab.id) {
            chrome.tabs.sendMessage(tab.id, { type: 'SCROLL_DOWN' }).catch(() => {});
          }
          break;
      }
    });
  }
});

async function toggleBookmark(tab) {
  if (!tab || !tab.url) return;
  try {
    const bookmarks = await chrome.bookmarks.search({ url: tab.url });
    if (bookmarks.length > 0) {
      for (const bm of bookmarks) {
        await chrome.bookmarks.remove(bm.id);
      }
    } else {
      await chrome.bookmarks.create({
        parentId: '2', // Other Bookmarks
        title: tab.title,
        url: tab.url
      });
    }
  } catch (err) {
    console.error('Bookmark toggle error:', err);
  }
}

async function closeTabsRight(activeTab) {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const activeIndex = activeTab.index;
    const ids = tabs.filter(t => t.index > activeIndex && !t.pinned).map(t => t.id);
    if (ids.length > 0) {
      await chrome.tabs.remove(ids);
    }
  } catch (err) {
    console.error('Close right tabs error:', err);
  }
}

async function downloadImage(url) {
  try {
    await chrome.downloads.download({ url: url });
  } catch (err) {
    console.error('Image download error:', err);
  }
}