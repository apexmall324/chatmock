// ===============================
// ELEMENTS
// ===============================

const chat = document.getElementById("chat");
const contactInput = document.getElementById("contactInput");
const statusInput = document.getElementById("statusInput");
const themeInput = document.getElementById("themeInput");
const wallpaperInput = document.getElementById("wallpaperInput");
const typingInput = document.getElementById("typingInput");
const messageStatusInput = document.getElementById("messageStatusInput");
const messageInput = document.getElementById("messageInput");
const timeInput = document.getElementById("timeInput");
const typeInput = document.getElementById("typeInput");
const profile = document.getElementById("profile");
const profileUpload = document.getElementById("profileUpload");
const phoneTime = document.getElementById("phoneTime");
const contactName = document.getElementById("contactName");
const status = document.getElementById("status");
const typingIndicator = document.getElementById("typingIndicator");
const phonePreview = document.querySelector(".phone");
const chatPreview = document.getElementById("chat");
const emojiPicker = document.getElementById("emojiPicker");

const addMessageBtn = document.getElementById("addMessage");
const saveChatBtn = document.getElementById("saveChat");
const clearChatBtn = document.getElementById("clearChat");
const screenshotBtn = document.getElementById("downloadChat");
const exportChatBtn = document.getElementById("exportChat");
const importChatBtn = document.getElementById("importChat");
const importChatInput = document.getElementById("importChatInput");
const changeProfileBtn = document.getElementById("changeProfile");
const toast = document.getElementById("toast");
const monitorStorageKey = "chatMonitorLog";
const visitorIdKey = "chatVisitorId";
const visitorId = (() => {

    let current = localStorage.getItem(visitorIdKey);

    if (!current) {

        current = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        localStorage.setItem(visitorIdKey, current);

    }

    return current;

})();

// ===============================
// HELPERS
// ===============================

function formatTime(now = new Date()) {

    return now.toLocaleTimeString([], {

        hour: "2-digit",
        minute: "2-digit",
        hour12: false

    });

}

function showToast(message) {

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(showToast.timeoutId);

    showToast.timeoutId = setTimeout(() => {

        toast.classList.remove("show");

    }, 2000);

}

function updatePhoneTime() {

    phoneTime.textContent = formatTime();

}

function logActivity(eventName, elementName, details = {}) {

    const entry = {

        page: window.location.pathname,
        event: eventName,
        element: elementName,
        details: {

            ...details,
            visitorId,
            url: window.location.href,
            userAgent: navigator.userAgent,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            screen: `${window.screen.width}x${window.screen.height}`,
            viewport: `${window.innerWidth}x${window.innerHeight}`

        }

    };

    fetch('/api/log', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(entry)
    }).catch(() => {});

}

function captureInteraction(eventName, event) {

    const target = event.target;
    const selector = target.closest("button, input, textarea, select, a, .message, [role='button'], label, .emoji-button");
    const element = selector || target;
    const label = element && element.tagName ? element.tagName.toLowerCase() : "unknown";
    const text = element && element.textContent ? element.textContent.trim().slice(0, 80) : "";

    logActivity(eventName, label, {
        text,
        id: element?.id || "",
        className: element?.className || ""
    });

}

function getMessagesSnapshot() {

    return Array.from(chat.querySelectorAll(".message")).map(message => ({

        id: message.dataset.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: message.classList.contains("sent") ? "sent" : "received",
        status: message.dataset.status || "sent",
        html: message.innerHTML

    }));

}

function buildTextExport() {

    const lines = [];

    lines.push(`Contact: ${contactInput.value}`);
    lines.push(`Status: ${statusInput.value}`);
    lines.push(`Theme: ${themeInput.value}`);
    lines.push(`Wallpaper: ${wallpaperInput.value}`);
    lines.push(`Typing: ${typingInput.value}`);
    lines.push(`Profile: ${profile.src}`);
    lines.push("Messages:");

    getMessagesSnapshot().forEach(message => {

        const text = message.innerHTML.replace(/<[^>]*>/g, "").trim();
        const type = message.type || "received";
        const status = message.dataset.status || "sent";

        lines.push(`${type}|${status}|${text}`);

    });

    return lines.join("\n");

}

function applyImportedState(data) {

    contactInput.value = data.contact || "";
    statusInput.value = data.status || "online";
    themeInput.value = data.theme || "dark";
    wallpaperInput.value = data.wallpaper || "default";
    typingInput.value = data.typing || "off";
    messageStatusInput.value = data.messageStatus || "sent";
    contactName.textContent = contactInput.value;
    status.textContent = statusInput.value;

    applyTheme(themeInput.value);
    applyWallpaper(wallpaperInput.value);
    toggleTypingIndicator(typingInput.value === "on");

    if (data.profile) {

        profile.src = data.profile;
        localStorage.setItem("profileImage", data.profile);

    }

    chat.innerHTML = "";

    if (Array.isArray(data.messages)) {

        data.messages.forEach(message => {

            const div = document.createElement("div");
            div.className = "message " + (message.type || "received");
            div.dataset.id = message.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            div.dataset.status = message.status || "sent";
            div.innerHTML = message.html;

            addDeleteEvent(div);
            chat.appendChild(div);

        });

    }

    chat.scrollTop = chat.scrollHeight;

}

function getStatusMarkup(statusValue) {

    if (statusValue === "delivered") {

        return '<span style="color:#c8d8de;"> ✓✓</span>';

    }

    if (statusValue === "read") {

        return '<span style="color:#53bdeb;"> ✓✓</span>';

    }

    return '<span style="color:#e6f7ff;"> ✓</span>';

}

function applyTheme(theme) {

    phonePreview.classList.remove("light", "whatsapp");

    if (theme === "light") {

        phonePreview.classList.add("light");

    } else if (theme === "whatsapp") {

        phonePreview.classList.add("whatsapp");

    }

}

function applyWallpaper(wallpaper) {

    chatPreview.classList.remove("wallpaper-soft", "wallpaper-night", "wallpaper-sunset");

    if (wallpaper === "soft") {

        chatPreview.classList.add("wallpaper-soft");

    } else if (wallpaper === "night") {

        chatPreview.classList.add("wallpaper-night");

    } else if (wallpaper === "sunset") {

        chatPreview.classList.add("wallpaper-sunset");

    }

}

function toggleTypingIndicator(visible) {

    typingIndicator.hidden = !visible;

}

// ===============================
// CONTACT NAME
// ===============================

contactInput.addEventListener("input", () => {

    contactName.textContent = contactInput.value;
    saveChat();

});

themeInput.addEventListener("change", () => {

    applyTheme(themeInput.value);
    saveChat();

});

wallpaperInput.addEventListener("change", () => {

    applyWallpaper(wallpaperInput.value);
    saveChat();

});

typingInput.addEventListener("change", () => {

    toggleTypingIndicator(typingInput.value === "on");
    saveChat();

});

messageStatusInput.addEventListener("change", () => {

    saveChat();

});

// ===============================
// STATUS
// ===============================

statusInput.addEventListener("change", () => {

    status.textContent = statusInput.value;
    saveChat();

});

// ===============================
// PROFILE PICTURE
// ===============================

changeProfileBtn.addEventListener("click", () => {

    profileUpload.click();

});

profileUpload.addEventListener("change", function () {

    const file = this.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (e) {

        profile.src = e.target.result;
        localStorage.setItem("profileImage", e.target.result);
        saveChat();

    };

    reader.readAsDataURL(file);

});

// Load saved profile picture

const savedProfile = localStorage.getItem("profileImage");

if (savedProfile) {

    profile.src = savedProfile;

}

// ===============================
// ADD MESSAGE
// ===============================

addMessageBtn.addEventListener("click", () => {

    const message = messageInput.value.trim();

    if (message === "") return;

    const type = typeInput.value;
    const statusValue = messageStatusInput.value;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let time = timeInput.value.trim();

    if (time === "") {

        time = formatTime();

    }

    const div = document.createElement("div");

    div.className = "message " + type;
    div.dataset.id = id;
    div.dataset.status = statusValue;

    div.innerHTML = `
        <div>${message}</div>

        <div class="time">

            ${time}

            ${type === "sent"
                ? getStatusMarkup(statusValue)
                : ""
            }

        </div>
    `;

    addDeleteEvent(div);
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;

    messageInput.value = "";
    timeInput.value = "";

    saveChat();

});

messageInput.addEventListener("keydown", function (e) {

    if (e.key === "Enter" && !e.shiftKey) {

        e.preventDefault();
        addMessageBtn.click();

    }

});

// ===============================
// DELETE MESSAGE
// ===============================

function addDeleteEvent(message) {

    message.addEventListener("dblclick", function () {

        if (confirm("Delete this message?")) {

            this.remove();
            saveChat();

        }

    });

}

function attachDeleteEvents() {

    document.querySelectorAll(".message").forEach(message => {

        addDeleteEvent(message);

    });

}

// ===============================
// SAVE CHAT
// ===============================

async function saveChat() {

    const data = {

        contact: contactInput.value,
        status: statusInput.value,
        profile: profile.src,
        phoneTime: phoneTime.textContent,
        theme: themeInput.value,
        wallpaper: wallpaperInput.value,
        typing: typingInput.value,
        messageStatus: messageStatusInput.value,
        messages: getMessagesSnapshot()

    };

    localStorage.setItem("chatData", JSON.stringify(data));

    try {

        await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

    } catch (error) {

        console.warn("Server sync failed, using local fallback.", error);

    }

}

// ===============================
// LOAD CHAT
// ===============================

async function loadChat() {

    try {

        const response = await fetch("/api/chat");

        if (response.ok) {

            const data = await response.json();

            if (data) {

                applyImportedState(data);
                return;

            }

        }

    } catch (error) {

        console.warn("Server load failed, using local fallback.", error);

    }

    const saved = localStorage.getItem("chatData");

    if (!saved) return;

    const data = JSON.parse(saved);
    applyImportedState(data);

}

loadChat();
applyTheme(themeInput.value);
applyWallpaper(wallpaperInput.value);
toggleTypingIndicator(typingInput.value === "on");
updatePhoneTime();
setInterval(updatePhoneTime, 60000);
logActivity("page_load", "generator");

document.addEventListener("click", (event) => {
    captureInteraction("click", event);
}, true);

window.addEventListener("keydown", (event) => {

    if (["Enter", "Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        captureInteraction("key", event);
    }

}, true);

// ===============================
// SAVE BUTTON
// ===============================

saveChatBtn.addEventListener("click", () => {

    saveChat();
    showToast("✔ Chat Saved Successfully");

});

// ===============================
// CLEAR CHAT
// ===============================

clearChatBtn.addEventListener("click", () => {

    if (!confirm("Clear all messages?")) return;

    chat.innerHTML = "";
    saveChat();

});

// ===============================
// EXPORT / IMPORT CHAT
// ===============================

exportChatBtn.addEventListener("click", () => {

    const exportText = buildTextExport();
    const blob = new Blob([exportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "chat.txt";
    link.click();

    URL.revokeObjectURL(url);
    showToast("✔ Chat exported successfully");

});

importChatBtn.addEventListener("click", () => {

    importChatInput.click();

});

importChatInput.addEventListener("change", function () {

    const file = this.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (e) {

        try {

            const text = e.target.result;
            const fileName = file.name.toLowerCase();

            if (fileName.endsWith(".txt") || fileName.endsWith(".chat")) {

                const lines = text.split(/\r?\n/).filter(Boolean);
                const data = {
                    contact: "",
                    status: "online",
                    theme: "dark",
                    wallpaper: "default",
                    typing: "off",
                    messageStatus: "sent",
                    messages: []
                };

                let inMessages = false;

                lines.forEach(line => {

                    if (line.startsWith("Contact:")) {

                        data.contact = line.replace("Contact:", "").trim();

                    } else if (line.startsWith("Status:")) {

                        data.status = line.replace("Status:", "").trim();

                    } else if (line.startsWith("Theme:")) {

                        data.theme = line.replace("Theme:", "").trim();

                    } else if (line.startsWith("Wallpaper:")) {

                        data.wallpaper = line.replace("Wallpaper:", "").trim();

                    } else if (line.startsWith("Typing:")) {

                        data.typing = line.replace("Typing:", "").trim();

                    } else if (line.startsWith("Profile:")) {

                        data.profile = line.replace("Profile:", "").trim();

                    } else if (line === "Messages:") {

                        inMessages = true;

                    } else if (inMessages) {

                        const [type, status, ...messageParts] = line.split("|");
                        const messageText = messageParts.join("|").trim();

                        data.messages.push({
                            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                            type: type || "received",
                            status: status || "sent",
                            html: `
        <div>${messageText}</div>

        <div class="time">

            ${formatTime()}

            ${type === "sent" ? getStatusMarkup(status || "sent") : ""}

        </div>
    `
                        });

                    }

                });

                applyImportedState(data);

            } else {

                const data = JSON.parse(text);
                applyImportedState(data);

            }

            saveChat();
            showToast("✔ Chat imported successfully");

        } catch (error) {

            showToast("❌ Invalid chat file");

        }

    };

    reader.readAsText(file);

});

emojiPicker.addEventListener("click", function (event) {

    const button = event.target.closest("button[data-emoji]");

    if (!button) return;

    const emoji = button.dataset.emoji;
    const start = messageInput.selectionStart;
    const end = messageInput.selectionEnd;
    const text = messageInput.value;

    messageInput.value = text.slice(0, start) + emoji + text.slice(end);
    messageInput.focus();
    const cursor = start + emoji.length;
    messageInput.setSelectionRange(cursor, cursor);

});

// ===============================
// SCREENSHOT
// ===============================

screenshotBtn.addEventListener("click", () => {

    html2canvas(document.querySelector(".phone"), {

        scale: 3,
        useCORS: true,
        backgroundColor: null

    }).then(canvas => {

        const link = document.createElement("a");

        link.download = "whatsapp-chat.png";

        link.href = canvas.toDataURL("image/png");

        link.click();

    });

});


