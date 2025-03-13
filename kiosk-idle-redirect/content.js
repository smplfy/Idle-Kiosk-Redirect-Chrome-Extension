console.log("Content script loaded. Listening for user activity...");

if (!window.kioskRedirectListenerAttached) {
    window.kioskRedirectListenerAttached = true;

    function sendUserActiveMessage() {
        console.log("User is active. Sending message to background script...");

        chrome.runtime.sendMessage({ type: "user_active" }, (response) => {
            if (chrome.runtime.lastError) {
                console.warn("Failed to send message. Retrying...");
                setTimeout(sendUserActiveMessage, 500);
            } else {
                console.log("Message sent successfully.");
            }
        });
    }

    document.addEventListener("mousemove", sendUserActiveMessage);
    document.addEventListener("keydown", sendUserActiveMessage);
    document.addEventListener("touchstart", sendUserActiveMessage);
} else {
    console.log("Content script already running, skipping re-injection.");
}
