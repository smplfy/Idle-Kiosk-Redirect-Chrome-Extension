console.log("Spoolstock: Content script loaded. Listening for user activity...");

// Prevent duplicate listeners
if (!window.spoolstockListenerAttached) {
    window.spoolstockListenerAttached = true;

    function sendUserActiveMessage() {
        console.log("Spoolstock: User is active. Sending message to background script...");

        chrome.runtime.sendMessage({ type: "user_active" }, (response) => {
            if (chrome.runtime.lastError) {
                console.warn("Spoolstock: Failed to send message - Extension might be reloading. Retrying...");
                setTimeout(sendUserActiveMessage, 500); // Retry after 500ms
            } else {
                console.log("Spoolstock: Message sent successfully.");
            }
        });
    }

    // Detect user interaction
    document.addEventListener("mousemove", sendUserActiveMessage);
    document.addEventListener("keydown", sendUserActiveMessage);
    document.addEventListener("touchstart", sendUserActiveMessage);
} else {
    console.log("Spoolstock: Content script already running, skipping re-injection.");
}
