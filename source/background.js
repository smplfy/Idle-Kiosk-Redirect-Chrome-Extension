let kioskUrl = "https://your-kiosk-url.com";
let marketingUrl = "https://your-marketing-url.com";
let idleTimeout = 60;
let enableRedirect = true;
let isIdle = false;
let lastActiveTabId = null; // Track last active tab

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

// Track the last active tab, even if it is not currently in focus when idle triggers
chrome.tabs.onActivated.addListener((activeInfo) => {
    lastActiveTabId = activeInfo.tabId;
    console.log("Last active tab updated:", lastActiveTabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.active) {
        lastActiveTabId = tabId;
        console.log("Tab updated and active, last active tab set to:", lastActiveTabId);
    }
});

// Detect idle state change
async function initialize() {
    await loadSettings();

    console.log("Initializing idle detection with timeout:", idleTimeout, "seconds");
    chrome.idle.setDetectionInterval(idleTimeout);

    if (enableRedirect) {
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
    } else {
        console.log("Idle redirection is disabled. No action taken.");
    }
}

// Redirect the last active tab to the marketing page
function goToMarketing() {
    if (!enableRedirect) {
        console.log("Redirection is disabled. Not redirecting.");
        return;
    }

    if (lastActiveTabId === null) {
        console.log("No last active tab recorded. Unable to redirect.");
        return;
    }

    console.log("Redirecting last active tab:", lastActiveTabId, "to marketing URL:", marketingUrl);
    isIdle = true;
    chrome.tabs.update(lastActiveTabId, { url: marketingUrl });
}

// Redirect the last active tab back to the kiosk page when active again
function returnToKiosk() {
    if (!enableRedirect) {
        console.log("Redirection is disabled. Not redirecting.");
        return;
    }

    if (lastActiveTabId === null) {
        console.log("No last active tab recorded. Unable to redirect.");
        return;
    }

    console.log("Redirecting last active tab:", lastActiveTabId, "to kiosk URL:", kioskUrl);
    isIdle = false;
    chrome.tabs.update(lastActiveTabId, { url: kioskUrl });
}

// Listen for user activity and trigger return to kiosk
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Received message:", message);

    if (message.type === "user_active") {
        console.log("User activity detected. Redirecting last active tab to kiosk...");
        returnToKiosk();
        sendResponse({ status: "success" }); // Acknowledge message
        return true;
    }
});

// Listen for storage changes and update settings dynamically
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

// Function to open the Kiosk URL on ChromeOS startup
function openKioskOnStartup() {
    console.log("ChromeOS Kiosk Mode detected. Launching kiosk page...");

    // Load kiosk URL from managed storage (Admin Console) or user settings
    chrome.storage.managed.get(["kioskUrl"], (managedData) => {
        chrome.storage.sync.get(["kioskUrl"], (userData) => {
            let kioskUrl = managedData.kioskUrl || userData.kioskUrl || "https://your-kiosk-url.com";

            console.log("Opening kiosk page:", kioskUrl);

            // Check if the kiosk URL is already open to prevent duplicate tabs
            chrome.tabs.query({}, (tabs) => {
                let isKioskOpen = tabs.some(tab => tab.url && tab.url.startsWith(kioskUrl));

                if (!isKioskOpen) {
                    console.log("Kiosk URL is not open. Opening now...");
                    chrome.tabs.create({ url: kioskUrl });
                } else {
                    console.log("Kiosk page is already open. No need to open another tab.");
                }
            });
        });
    });
}

// Run this when the ChromeOS Kiosk starts
chrome.runtime.onStartup.addListener(openKioskOnStartup);
initialize();
