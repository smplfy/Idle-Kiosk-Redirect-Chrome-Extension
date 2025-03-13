let kioskUrl = "https://your-kiosk-url.com";
let marketingUrl = "https://your-marketing-url.com";
let idleTimeout = 60;
let enableRedirect = true;
let isIdle = false;

// Load settings from storage and log values
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

// Detect idle state and log status changes
async function initialize() {
    await loadSettings();

    console.log("Initializing idle detection with timeout:", idleTimeout, "seconds");
    chrome.idle.setDetectionInterval(idleTimeout);

    if (enableRedirect) {
        chrome.idle.onStateChanged.addListener((newState) => {
            console.log("Idle state changed:", newState);

            if (newState === "idle" || newState === "locked") {
                console.log("System is idle/locked. Redirecting to marketing page...");
                goToMarketing();
            }
        });
    } else {
        console.log("Idle redirection is disabled. No action taken.");
    }
}

// Redirect to marketing content and log actions
async function goToMarketing() {
    if (!enableRedirect) {
        console.log("Redirection is disabled. Not redirecting.");
        return;
    }

    console.log("Checking active tab for redirection...");

    // 🔹 Fetch the latest URLs from storage
    let data = await new Promise((resolve) =>
        chrome.storage.sync.get(["marketingUrl"], resolve)
    );
    let latestMarketingUrl = data.marketingUrl || marketingUrl;

    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
        if (!tabs.length) {
            console.log("No active tab found.");
            return;
        }

        if (tabs[0].url === latestMarketingUrl) {
            console.log("Already on the marketing page. No need to redirect.");
            return;
        }

        console.log("Redirecting to latest marketing URL:", latestMarketingUrl);
        isIdle = true;
        chrome.tabs.update(tabs[0].id, { url: latestMarketingUrl });
    });
}


// Detect user activity and log when returning to kiosk
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Received message:", message);

    if (message.type === "user_active") {
        console.log("Spoolstock: User activity detected. Redirecting to kiosk...");

        // Fetch the latest kiosk URL from storage
        chrome.storage.sync.get(["kioskUrl"], (data) => {
            let latestKioskUrl = data.kioskUrl || "https://your-kiosk-url.com";

            chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
                if (tabs.length && tabs[0].url !== latestKioskUrl) {
                    console.log("Navigating back to kiosk URL:", latestKioskUrl);
                    chrome.tabs.update(tabs[0].id, { url: latestKioskUrl });
                } else {
                    console.log("Already on the kiosk page. No action taken.");
                }
            });
        });

        sendResponse({ status: "success" }); // Acknowledge message
        return true; // Keeps the service worker alive
    }
});




chrome.storage.onChanged.addListener((changes, namespace) => {
    console.log("Storage updated:", changes);

    if (namespace === "sync") {
        if (changes.kioskUrl) {
            kioskUrl = changes.kioskUrl.newValue;
            console.log("Updated kiosk URL to:", kioskUrl);
        }
        if (changes.marketingUrl) {
            marketingUrl = changes.marketingUrl.newValue;
            console.log("Updated marketing URL to:", marketingUrl);
        }
        if (changes.idleTimeout) {
            idleTimeout = changes.idleTimeout.newValue;
            chrome.idle.setDetectionInterval(idleTimeout);
            console.log("Updated idle timeout to:", idleTimeout, "seconds");
        }
    }
});

// Inject content script dynamically based on stored marketing URL
function injectContentScript(tabId, url) {
    console.log("Checking if content script should be injected into:", url);

    chrome.storage.sync.get(["marketingUrl"], (data) => {
        let latestMarketingUrl = data.marketingUrl || "https://your-marketing-url.com";

        if (url.startsWith(latestMarketingUrl)) {
            console.log("Injecting content script into marketing page:", url);
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ["content.js"]
            }, () => {
                if (chrome.runtime.lastError) {
                    console.warn("Error injecting content script:", chrome.runtime.lastError.message);
                } else {
                    console.log("Content script successfully injected.");
                }
            });
        } else {
            console.log("Not a marketing page. Skipping content script injection.");
        }
    });
}

// Listen for tab updates and inject content script if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url) {
        injectContentScript(tabId, tab.url);
    }
});

// Inject content script immediately if already on the marketing page
chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    if (tabs.length > 0) {
        let activeTab = tabs[0];
        injectContentScript(activeTab.id, activeTab.url);
    }
});



initialize();
