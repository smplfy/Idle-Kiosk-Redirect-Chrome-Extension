let kioskUrl = "https://your-kiosk-url.com";
let marketingUrl = "https://your-marketing-url.com";
let idleTimeout = 60;
let enableRedirect = true;
let isIdle = false;
let lastActiveTabId = null; // Track last active tab

// Load settings from storage
async function loadSettings() {
    console.log("Loading settings from storage...");

    let data = await new Promise((resolve) =>
        chrome.storage.sync.get(["kioskUrl", "marketingUrl", "idleTimeout", "enableRedirect"], resolve)
    );

    kioskUrl = data.kioskUrl || kioskUrl;
    marketingUrl = data.marketingUrl || marketingUrl;
    idleTimeout = data.idleTimeout || idleTimeout;
    enableRedirect = data.enableRedirect !== false;

    console.log("Settings loaded:");
    console.log(" - Kiosk URL:", kioskUrl);
    console.log(" - Marketing URL:", marketingUrl);
    console.log(" - Idle Timeout:", idleTimeout, "seconds");
    console.log(" - Idle Redirect Enabled:", enableRedirect);

    chrome.idle.setDetectionInterval(idleTimeout);
}

// Track last active tab
chrome.tabs.onActivated.addListener((activeInfo) => {
    lastActiveTabId = activeInfo.tabId;
    console.log("Last active tab updated:", lastActiveTabId);
});

async function initialize() {
    await loadSettings();

    console.log("Initializing idle detection with timeout:", idleTimeout, "seconds");

    // ✅ Ensure idle detection is always set, no conditions
    chrome.idle.setDetectionInterval(idleTimeout);

    // ✅ Always register the listener, even if enableRedirect is false initially
    chrome.idle.onStateChanged.addListener((newState) => {
        console.log("Idle state changed:", newState);

        if ((newState === "idle" || newState === "locked") && !isIdle) {
            console.log("System went idle. Redirecting last active tab to marketing...");
            goToMarketing();
        } else if (newState === "active" && isIdle) {
            console.log("System became active. Redirecting last active tab back to kiosk...");
            returnToKiosk();
        }
    });
}


// Redirect last active tab
function goToMarketing() {
    if (!enableRedirect || lastActiveTabId === null) return;

    console.log("Redirecting last active tab:", lastActiveTabId, "to marketing URL:", marketingUrl);
    isIdle = true;
    chrome.tabs.update(lastActiveTabId, { url: marketingUrl });
}

function returnToKiosk() {
    if (!enableRedirect || lastActiveTabId === null) return;

    console.log("Redirecting last active tab:", lastActiveTabId, "to kiosk URL:", kioskUrl);
    isIdle = false;
    chrome.tabs.update(lastActiveTabId, { url: kioskUrl });
}

// Initialize extension
chrome.runtime.onStartup.addListener(() => {
    console.log("Kiosk extension started.");
    initialize(); // Ensures settings are loaded on startup
});

// Ensure background script stays alive by periodically logging activity
setInterval(() => {
    console.log("Keeping background service worker alive...");
}, 60000);

// Always listen for user activity
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Received message:", message);

    if (message.type === "user_active") {
        console.log("User activity detected. Redirecting to kiosk...");

        chrome.storage.sync.get(["kioskUrl"], (data) => {
            let latestKioskUrl = data.kioskUrl || "https://your-kiosk-url.com";

            chrome.tabs.query({}, (tabs) => {
                let lastTab = tabs.find(tab => tab.active) || tabs[0];

                if (lastTab && lastTab.url !== latestKioskUrl) {
                    console.log("Navigating back to kiosk URL:", latestKioskUrl);
                    chrome.tabs.update(lastTab.id, { url: latestKioskUrl });
                }
            });
        });

        sendResponse({ status: "success" });
        return true;
    }
});

initialize();
