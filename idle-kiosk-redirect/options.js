document.addEventListener("DOMContentLoaded", async function () {
    let kioskInput = document.getElementById("kioskUrl");
    let marketingInput = document.getElementById("marketingUrl");
    let idleTimeoutInput = document.getElementById("idleTimeout");
    let toggleRedirectButton = document.getElementById("toggleRedirect");
    let openKioskButton = document.getElementById("openKiosk");
    let saveButton = document.getElementById("save");

    let userData = await new Promise((resolve) =>
        chrome.storage.sync.get(["kioskUrl", "marketingUrl", "idleTimeout", "enableRedirect"], resolve)
    );

    // Load settings, defaulting to stored values or fallback defaults
    kioskInput.value = userData.kioskUrl || "https://your-kiosk-url.com";
    marketingInput.value = userData.marketingUrl || "https://your-marketing-url.com";
    idleTimeoutInput.value = userData.idleTimeout || 60;
    let isEnabled = userData.enableRedirect !== false; // Default: enabled

    // Update button appearance
    function updateButtonState() {
        if (isEnabled) {
            toggleRedirectButton.textContent = "Disable Idle Redirect";
            toggleRedirectButton.style.backgroundColor = "#dc3545"; // Red for disabled
        } else {
            toggleRedirectButton.textContent = "Enable Idle Redirect";
            toggleRedirectButton.style.backgroundColor = "#28a745"; // Green for enabled
        }
    }

    updateButtonState();

    // Toggle redirect state
    toggleRedirectButton.addEventListener("click", function () {
        isEnabled = !isEnabled;
        chrome.storage.sync.set({ enableRedirect: isEnabled }, function () {
            updateButtonState();
        });
    });

    // Open kiosk manually when clicking "Open Kiosk"
    openKioskButton.addEventListener("click", function () {
        let kioskUrl = kioskInput.value.trim();
        if (kioskUrl) {
            console.log("Opening kiosk URL:", kioskUrl);
            chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
                if (tabs.length > 0) {
                    chrome.tabs.update(tabs[0].id, { url: kioskUrl });
                } else {
                    chrome.tabs.create({ url: kioskUrl });
                }
            });
        } else {
            alert("Please enter a valid Kiosk URL.");
        }
    });

    saveButton.addEventListener("click", function () {
        let timeoutValue = parseInt(idleTimeoutInput.value, 10);
        if (isNaN(timeoutValue) || timeoutValue < 10 || timeoutValue > 600) {
            alert("Idle timeout must be between 10 and 600 seconds.");
            return;
        }

        chrome.storage.sync.set({
            kioskUrl: kioskInput.value,
            marketingUrl: marketingInput.value,
            idleTimeout: timeoutValue
        }, function () {
            alert("Settings saved!");
            chrome.runtime.sendMessage({ type: "updateTimeout", timeout: timeoutValue });
        });
    });
});
