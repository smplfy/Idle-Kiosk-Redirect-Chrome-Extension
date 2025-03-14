let kioskUrl = "https://your-kiosk-url.com";
let marketingUrl = "https://your-marketing-url.com";
let idleTimeout = 60;
let enableRedirect = true;
let isIdle = false;
let lastActiveTabId = null; // Track last active tab

// ✅ Load Settings from Storage (Admin Console & User Settings)
async function loadSettings() {
    console.log("🔄 Loading settings from storage...");

    let managedSettings = await new Promise((resolve) =>
        chrome.storage.managed.get(["kioskUrl", "marketingUrl", "idleTimeout", "enableRedirect"], resolve)
    );

    let userSettings = await new Promise((resolve) =>
        chrome.storage.sync.get(["kioskUrl", "marketingUrl", "idleTimeout", "enableRedirect"], resolve)
    );

    // ✅ Apply settings with priority: Admin Console > User Settings > Defaults
    kioskUrl = managedSettings.kioskUrl ?? userSettings.kioskUrl ?? kioskUrl;
    marketingUrl = managedSettings.marketingUrl ?? userSettings.marketingUrl ?? marketingUrl;
    idleTimeout = managedSettings.idleTimeout ?? userSettings.idleTimeout ?? idleTimeout;
    enableRedirect = managedSettings.enableRedirect ?? userSettings.enableRedirect ?? enableRedirect;

    console.log("✅ Settings Applied:");
    console.log(" - Kiosk URL:", kioskUrl);
    console.log(" - Marketing URL:", marketingUrl);
    console.log(" - Idle Timeout:", idleTimeout, "seconds");
    console.log(" - Idle Redirect Enabled:", enableRedirect);

    chrome.idle.setDetectionInterval(idleTimeout);
}

// ✅ Dynamically Inject Content Script When Tab Updates
async function injectContentScript(tabId, url) {
    let settings = await new Promise((resolve) =>
        chrome.storage.managed.get(["kioskUrl", "marketingUrl"], resolve)
    );

    let kioskUrl = settings.kioskUrl || "https://your-kiosk-url.com";
    let marketingUrl = settings.marketingUrl || "https://your-marketing-url.com";

    if (url.startsWith(kioskUrl) || url.startsWith(marketingUrl)) {
        console.log("✅ Injecting content script into:", url);
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ["content.js"]
        }).catch(error => {
            console.warn("⚠️ Failed to inject content script:", error);
        });
    }
}

// ✅ Listen for Tab Updates and Inject Script
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url) {
        injectContentScript(tabId, tab.url);
    }
});

// ✅ Track Last Active Tab (Ensures Correct Redirection)
chrome.tabs.onActivated.addListener((activeInfo) => {
    lastActiveTabId = activeInfo.tabId;
    console.log("🖥 Last active tab updated:", lastActiveTabId);
});

// ✅ Handle Idle State Changes and Redirect
chrome.idle.onStateChanged.addListener((newState) => {
    console.log("🔥 Idle state changed:", newState);

    if ((newState === "idle" || newState === "locked") && !isIdle) {
        console.log("🚀 System went idle. Redirecting last active tab to marketing...");
        goToMarketing();
    } else if (newState === "active" && isIdle) {
        console.log("💡 System became active. Redirecting last active tab back to kiosk...");
        returnToKiosk();
    }
});

// ✅ Redirect to Marketing Page When Idle
function goToMarketing() {
    if (!enableRedirect || lastActiveTabId === null) return;

    console.log("🔄 Redirecting last active tab:", lastActiveTabId, "to marketing URL:", marketingUrl);
    isIdle = true;
    chrome.tabs.update(lastActiveTabId, { url: marketingUrl });
}

// ✅ Redirect Back to Kiosk Page When Active
function returnToKiosk() {
    if (!enableRedirect || lastActiveTabId === null) return;

    console.log("🔄 Redirecting last active tab:", lastActiveTabId, "to kiosk URL:", kioskUrl);
    isIdle = false;
    chrome.tabs.update(lastActiveTabId, { url: kioskUrl });
}

// ✅ Listen for User Activity and Return to Kiosk
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "user_active") {
        console.log("💡 User activity detected. Returning to kiosk...");

        chrome.tabs.query({}, (tabs) => {
            let lastTab = tabs.find(tab => tab.active) || tabs[0];

            if (lastTab && lastTab.url !== kioskUrl) {
                console.log("🏠 Navigating back to kiosk URL:", kioskUrl);
                chrome.tabs.update(lastTab.id, { url: kioskUrl });
            }
        });

        sendResponse({ status: "success" });
        return true;
    }
});

// ✅ Monitor Storage Changes and Apply Settings in Real-Time
chrome.storage.onChanged.addListener((changes, namespace) => {
    console.log("🔄 Storage settings updated:", changes);

    if (namespace === "sync" || namespace === "managed") {
        if (changes.kioskUrl) kioskUrl = changes.kioskUrl.newValue;
        if (changes.marketingUrl) marketingUrl = changes.marketingUrl.newValue;
        if (changes.idleTimeout) {
            idleTimeout = changes.idleTimeout.newValue;
            chrome.idle.setDetectionInterval(idleTimeout);
        }
        if (changes.enableRedirect) enableRedirect = changes.enableRedirect.newValue !== false;

        console.log("✅ Updated Settings Applied:", { kioskUrl, marketingUrl, idleTimeout, enableRedirect });
    }
});

// ✅ Periodically Check Idle State (Debugging Only)
setInterval(() => {
    chrome.idle.queryState(idleTimeout, (state) => {
        console.log("🕒 Periodic Idle State Check:", state);
    });
}, 10000);

// ✅ Keep Service Worker Alive (Prevents Unexpected Unloading)
setInterval(() => {
    console.log("⏳ Keeping background service worker alive...");
}, 60000);

// ✅ Initialize Extension on Startup
chrome.runtime.onStartup.addListener(() => {
    console.log("🔄 Kiosk extension restarted. Running initialization...");
    initialize();
});

// ✅ Force Initialize on Load
async function initialize() {
    await loadSettings();
    console.log("🚀 Initializing idle detection with timeout:", idleTimeout, "seconds");
    chrome.idle.setDetectionInterval(idleTimeout);
}

initialize();
