document.addEventListener("DOMContentLoaded", async function () {
    let kioskInput = document.getElementById("kioskUrl");
    let marketingInput = document.getElementById("marketingUrl");
    let idleTimeoutInput = document.getElementById("idleTimeout");
    let toggleRedirectButton = document.getElementById("toggleRedirect");
    let openKioskButton = document.getElementById("openKiosk");
    let saveButton = document.getElementById("save");

    // ✅ Get Managed Storage (Admin Console Policies)
    let managedData = await new Promise((resolve) =>
        chrome.storage.managed.get(["kioskUrl", "marketingUrl", "idleTimeout", "enableRedirect"], resolve)
    );
    console.log("📢 Managed Storage Data (Options Page):", managedData);

    // ✅ Get User Storage (Options Page Settings)
    let userData = await new Promise((resolve) =>
        chrome.storage.sync.get(["kioskUrl", "marketingUrl", "idleTimeout", "enableRedirect"], resolve)
    );
    console.log("📢 User Storage Data (Options Page):", userData);

    // ✅ Load settings with priority: Admin Console > User Settings > Defaults
    let kioskUrl = managedData.kioskUrl ?? userData.kioskUrl ?? "https://your-kiosk-url.com";
    let marketingUrl = managedData.marketingUrl ?? userData.marketingUrl ?? "https://your-marketing-url.com";
    let idleTimeout = managedData.idleTimeout ?? userData.idleTimeout ?? 60;
    let isEnabled = managedData.enableRedirect ?? userData.enableRedirect ?? true;

    // ✅ Set input values
    kioskInput.value = kioskUrl;
    marketingInput.value = marketingUrl;
    idleTimeoutInput.value = idleTimeout;

    // 🚨 If values are set by Admin Console, disable inputs to prevent user changes
    if (managedData.kioskUrl) kioskInput.disabled = true;
    if (managedData.marketingUrl) marketingInput.disabled = true;
    if (managedData.idleTimeout) idleTimeoutInput.disabled = true;
    if (managedData.enableRedirect !== undefined) toggleRedirectButton.disabled = true;

    // ✅ Update Button Appearance
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

    // ✅ Toggle redirect state
    toggleRedirectButton.addEventListener("click", function () {
        isEnabled = !isEnabled;
        chrome.storage.sync.set({ enableRedirect: isEnabled }, function () {
            updateButtonState();
        });
    });

    // ✅ Open kiosk manually when clicking "Open Kiosk"
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

    // ✅ Save Button (Only Works If No Admin Policies Are Applied)
    saveButton.addEventListener("click", function () {
        if (kioskInput.disabled || marketingInput.disabled || idleTimeoutInput.disabled) {
            alert("These settings are enforced by the administrator and cannot be changed.");
            return;
        }

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
