"use strict";

const STORAGE_KEY = "chatmockData";
const LEGACY_STORAGE_KEY = "chatData";
const DEFAULT_PROFILE = "assets/profile.png";
const MAX_PROFILE_SIZE = 2 * 1024 * 1024;
const MAX_IMPORT_SIZE = 5 * 1024 * 1024;

const elements = {
    chat: document.getElementById("chat"),
    contactInput: document.getElementById("contactInput"),
    statusInput: document.getElementById("statusInput"),
    themeInput: document.getElementById("themeInput"),
    wallpaperInput: document.getElementById("wallpaperInput"),
    typingInput: document.getElementById("typingInput"),
    messageStatusInput: document.getElementById("messageStatusInput"),
    messageInput: document.getElementById("messageInput"),
    timeInput: document.getElementById("timeInput"),
    typeInput: document.getElementById("typeInput"),
    phoneTimeInput: document.getElementById("phoneTimeInput"),
    profile: document.getElementById("profile"),
    profileThumb: document.getElementById("profileThumb"),
    profileUpload: document.getElementById("profileUpload"),
    phoneTime: document.getElementById("phoneTime"),
    contactName: document.getElementById("contactName"),
    status: document.getElementById("status"),
    typingIndicator: document.getElementById("typingIndicator"),
    onlineIndicator: document.querySelector(".online-indicator"),
    phonePreview: document.getElementById("phonePreview"),
    emptyChat: document.getElementById("emptyChat"),
    messageCount: document.getElementById("messageCount"),
    messageWord: document.getElementById("messageWord"),
    emojiPicker: document.getElementById("emojiPicker"),
    addMessage: document.getElementById("addMessage"),
    saveChat: document.getElementById("saveChat"),
    clearChat: document.getElementById("clearChat"),
    downloadChat: document.getElementById("downloadChat"),
    exportChat: document.getElementById("exportChat"),
    importChat: document.getElementById("importChat"),
    importChatInput: document.getElementById("importChatInput"),
    changeProfile: document.getElementById("changeProfile"),
    toast: document.getElementById("toast"),
    autosaveLabel: document.querySelector(".autosave-label")
};

let messages = [];
let profileImage = DEFAULT_PROFILE;
let toastTimeout;
let saveTimeout;

function formatTime(date = new Date()) {
    return new Intl.DateTimeFormat([], {
        hour: "numeric",
        minute: "2-digit"
    }).format(date);
}

function formatClockTime(value) {
    const [hours, minutes] = value.split(":").map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
    const suffix = hours >= 12 ? "PM" : "AM";
    return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => elements.toast.classList.remove("show"), 2800);
}

function updateProfileSources(source) {
    elements.profile.src = source;
    elements.profileThumb.src = source;
}

function applyTheme(theme) {
    elements.phonePreview.classList.remove("light", "whatsapp");
    if (theme === "light" || theme === "whatsapp") {
        elements.phonePreview.classList.add(theme);
    }
}

function applyWallpaper(wallpaper) {
    elements.chat.classList.remove(
        "wallpaper-default",
        "wallpaper-soft",
        "wallpaper-night",
        "wallpaper-sunset"
    );
    elements.chat.classList.add(`wallpaper-${wallpaper}`);
}

function updateContactPreview() {
    elements.contactName.textContent = elements.contactInput.value.trim() || "Contact name";
}

function updatePhoneClock() {
    elements.phoneTime.textContent = formatClockTime(elements.phoneTimeInput.value || "09:41");
}

function updateStatusPreview() {
    const isTyping = elements.typingInput.value === "on";
    elements.status.textContent = elements.statusInput.value;
    elements.status.hidden = isTyping;
    elements.typingIndicator.hidden = !isTyping;
    elements.onlineIndicator.hidden = !["online", "typing..."].includes(elements.statusInput.value);
}

function getState() {
    return {
        version: 2,
        contact: elements.contactInput.value.trim(),
        status: elements.statusInput.value,
        profile: profileImage,
        phoneTime: elements.phoneTimeInput.value,
        theme: elements.themeInput.value,
        wallpaper: elements.wallpaperInput.value,
        typing: elements.typingInput.value,
        messageStatus: elements.messageStatusInput.value,
        messages
    };
}

function saveChat({ notify = false } = {}) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            ...getState(),
            savedAt: new Date().toISOString()
        }));
        elements.autosaveLabel.innerHTML = '<span class="autosave-dot"></span> Auto-saved';
        if (notify) showToast("Chat saved on this device.");
        return true;
    } catch (error) {
        elements.autosaveLabel.textContent = "Save unavailable";
        showToast("Could not save this chat. Your browser storage may be full or disabled.");
        console.error("ChatMock could not save the chat locally.", error);
        return false;
    }
}

function scheduleSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => saveChat(), 180);
}

function getMessageStatusMarkup(status) {
    return status === "sent" ? "✓" : "✓✓";
}

function renderMessages() {
    elements.chat.querySelectorAll(".message").forEach(message => message.remove());
    elements.emptyChat.hidden = messages.length > 0;

    messages.forEach(message => {
        const bubble = document.createElement("article");
        bubble.className = `message ${message.type}`;
        bubble.dataset.id = message.id;

        const content = document.createElement("span");
        content.className = "message-content";
        content.textContent = message.text;
        bubble.append(content);

        const time = document.createElement("span");
        time.className = "message-time";
        time.textContent = message.time;
        if (message.type === "sent") {
            const checks = document.createElement("span");
            checks.className = `message-checks${message.status === "read" ? " read" : ""}`;
            checks.textContent = getMessageStatusMarkup(message.status);
            time.append(checks);
        }
        bubble.append(time);

        const removeButton = document.createElement("button");
        removeButton.className = "message-delete";
        removeButton.type = "button";
        removeButton.setAttribute("aria-label", "Remove message");
        removeButton.textContent = "×";
        removeButton.addEventListener("click", () => {
            messages = messages.filter(item => item.id !== message.id);
            renderMessages();
            saveChat();
        });
        bubble.append(removeButton);
        elements.chat.append(bubble);
    });

    elements.messageCount.textContent = String(messages.length);
    elements.messageWord.textContent = messages.length === 1 ? "message" : "messages";
    elements.chat.scrollTop = elements.chat.scrollHeight;
}

function cleanMessage(value, index = 0) {
    if (!value || typeof value !== "object") return null;
    const type = value.type === "sent" ? "sent" : "received";
    const status = ["sent", "delivered", "read"].includes(value.status) ? value.status : "sent";
    let text = typeof value.text === "string" ? value.text : "";
    let time = typeof value.time === "string" ? value.time : "";

    if (!text && typeof value.html === "string") {
        const parsed = new DOMParser().parseFromString(value.html, "text/html");
        const timeElement = parsed.querySelector(".time, .message-time");
        if (timeElement) {
            const timeText = timeElement.textContent.replace(/[✓✔]/g, "").trim();
            if (/^\d{1,2}:\d{2}(?:\s?[AP]M)?$/i.test(timeText)) time = timeText;
            timeElement.remove();
        }
        text = parsed.body.textContent.trim();
    }

    text = text.slice(0, 1200);
    if (!text) return null;
    if (!/^\d{1,2}:\d{2}(?:\s?[AP]M)?$/i.test(time)) time = formatTime();

    return {
        id: typeof value.id === "string" && value.id ? value.id : `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
        type,
        status,
        text,
        time
    };
}

function normalizeImportedState(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error("The file does not contain a chat.");
    }
    if (!Array.isArray(data.messages)) {
        throw new Error("The chat file has no valid messages list.");
    }

    return {
        contact: typeof data.contact === "string" ? data.contact.slice(0, 40) : "Alex Morgan",
        status: ["online", "typing...", "last seen today at 8:00 PM", "last seen recently"].includes(data.status) ? data.status : "online",
        profile: typeof data.profile === "string" && /^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(data.profile) && data.profile.length <= 3_000_000
            ? data.profile
            : DEFAULT_PROFILE,
        phoneTime: /^\d{2}:\d{2}$/.test(data.phoneTime) ? data.phoneTime : "09:41",
        theme: ["dark", "light", "whatsapp"].includes(data.theme) ? data.theme : "dark",
        wallpaper: ["default", "soft", "night", "sunset"].includes(data.wallpaper) ? data.wallpaper : "default",
        typing: data.typing === "on" ? "on" : "off",
        messageStatus: ["sent", "delivered", "read"].includes(data.messageStatus) ? data.messageStatus : "sent",
        messages: data.messages.map(cleanMessage).filter(Boolean).slice(0, 500)
    };
}

function applyState(data) {
    const state = normalizeImportedState(data);
    elements.contactInput.value = state.contact;
    elements.statusInput.value = state.status;
    elements.themeInput.value = state.theme;
    elements.wallpaperInput.value = state.wallpaper;
    elements.typingInput.value = state.typing;
    elements.messageStatusInput.value = state.messageStatus;
    elements.phoneTimeInput.value = state.phoneTime;
    profileImage = state.profile;
    updateProfileSources(profileImage);
    updateContactPreview();
    updatePhoneClock();
    updateStatusPreview();
    applyTheme(elements.themeInput.value);
    applyWallpaper(elements.wallpaperInput.value);
    messages = state.messages;
    renderMessages();
}

function loadSavedChat() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
        if (!saved) return;
        applyState(JSON.parse(saved));
    } catch (error) {
        showToast("The saved chat could not be opened. Start a new conversation or import a backup.");
        console.error("ChatMock could not load the saved chat.", error);
    }
}

function addMessage() {
    const text = elements.messageInput.value.trim();
    if (!text) {
        elements.messageInput.focus();
        showToast("Write a message before adding it.");
        return;
    }

    messages.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: elements.typeInput.value === "sent" ? "sent" : "received",
        status: elements.messageStatusInput.value,
        text: text.slice(0, 1200),
        time: elements.timeInput.value ? formatClockTime(elements.timeInput.value) : formatTime()
    });
    messages = messages.slice(-500);
    elements.messageInput.value = "";
    elements.timeInput.value = "";
    renderMessages();
    saveChat();
    elements.messageInput.focus();
}

function parseTextImport(text) {
    if (!text.includes("Messages:")) {
        throw new Error("This file is not a ChatMock chat export.");
    }

    const data = {
        contact: "Alex Morgan",
        status: "online",
        theme: "dark",
        wallpaper: "default",
        typing: "off",
        messageStatus: "sent",
        messages: []
    };
    let inMessages = false;

    text.split(/\r?\n/).forEach(line => {
        if (!inMessages && line === "Messages:") {
            inMessages = true;
            return;
        }
        if (!inMessages) {
            const separator = line.indexOf(":");
            if (separator < 0) return;
            const key = line.slice(0, separator).trim().toLowerCase();
            const value = line.slice(separator + 1).trim();
            if (key === "contact") data.contact = value;
            if (key === "status") data.status = value;
            if (key === "theme") data.theme = value;
            if (key === "wallpaper") data.wallpaper = value;
            if (key === "typing") data.typing = value;
            if (key === "profile" && /^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(value)) data.profile = value;
            return;
        }

        const first = line.indexOf("|");
        const second = first < 0 ? -1 : line.indexOf("|", first + 1);
        if (first < 0 || second < 0) return;
        const type = line.slice(0, first);
        const status = line.slice(first + 1, second);
        const message = line.slice(second + 1);
        if (message.trim()) {
            data.messages.push({ type, status, text: message, time: formatTime() });
        }
    });

    return data;
}

function downloadFile(contents, type, fileName) {
    const url = URL.createObjectURL(new Blob([contents], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

elements.contactInput.addEventListener("input", () => {
    updateContactPreview();
    scheduleSave();
});

elements.statusInput.addEventListener("change", () => {
    updateStatusPreview();
    scheduleSave();
});

elements.themeInput.addEventListener("change", () => {
    applyTheme(elements.themeInput.value);
    scheduleSave();
});

elements.wallpaperInput.addEventListener("change", () => {
    applyWallpaper(elements.wallpaperInput.value);
    scheduleSave();
});

elements.typingInput.addEventListener("change", () => {
    updateStatusPreview();
    scheduleSave();
});

elements.messageStatusInput.addEventListener("change", scheduleSave);
elements.phoneTimeInput.addEventListener("input", () => {
    updatePhoneClock();
    scheduleSave();
});

elements.changeProfile.addEventListener("click", () => elements.profileUpload.click());
elements.profileUpload.addEventListener("change", () => {
    const file = elements.profileUpload.files[0];
    elements.profileUpload.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) {
        showToast("Choose a PNG, JPEG, WebP, or GIF image for the profile photo.");
        return;
    }
    if (file.size > MAX_PROFILE_SIZE) {
        showToast("Choose an image smaller than 2 MB.");
        return;
    }

    const reader = new FileReader();
    reader.onerror = () => showToast("That image could not be read. Please try another.");
    reader.onload = () => {
        if (typeof reader.result !== "string" || !reader.result.startsWith("data:image/")) {
            showToast("That image could not be loaded.");
            return;
        }
        profileImage = reader.result;
        updateProfileSources(profileImage);
        saveChat();
    };
    reader.readAsDataURL(file);
});

elements.addMessage.addEventListener("click", addMessage);
elements.messageInput.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        addMessage();
    }
});

elements.emojiPicker.addEventListener("click", event => {
    const button = event.target.closest("button[data-emoji]");
    if (!button) return;
    const input = elements.messageInput;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    input.setRangeText(button.dataset.emoji, start, end, "end");
    input.focus();
});

elements.saveChat.addEventListener("click", () => saveChat({ notify: true }));
elements.clearChat.addEventListener("click", () => {
    if (!messages.length) {
        showToast("There are no messages to clear.");
        return;
    }
    if (!window.confirm("Clear all messages from this conversation?")) return;
    messages = [];
    renderMessages();
    saveChat();
    showToast("Conversation cleared.");
});

elements.exportChat.addEventListener("click", () => {
    downloadFile(JSON.stringify(getState(), null, 2), "application/json", "chatmock-chat.json");
    showToast("Chat data exported.");
});

elements.importChat.addEventListener("click", () => elements.importChatInput.click());
elements.importChatInput.addEventListener("change", () => {
    const file = elements.importChatInput.files[0];
    elements.importChatInput.value = "";
    if (!file) return;
    if (file.size > MAX_IMPORT_SIZE) {
        showToast("Choose a chat file smaller than 5 MB.");
        return;
    }

    const reader = new FileReader();
    reader.onerror = () => showToast("That file could not be read.");
    reader.onload = () => {
        try {
            const content = String(reader.result || "");
            let imported;
            try {
                imported = JSON.parse(content);
            } catch {
                imported = parseTextImport(content);
            }
            applyState(imported);
            if (!saveChat()) return;
            showToast("Chat imported successfully.");
        } catch (error) {
            showToast(error instanceof Error ? error.message : "This chat file is invalid.");
        }
    };
    reader.readAsText(file);
});

elements.downloadChat.addEventListener("click", async () => {
    if (typeof window.html2canvas !== "function") {
        showToast("Image export could not load. Check your connection and try again.");
        return;
    }

    elements.phonePreview.classList.add("exporting");
    elements.downloadChat.disabled = true;
    try {
        const canvas = await window.html2canvas(elements.phonePreview, {
            scale: 3,
            useCORS: true,
            backgroundColor: null
        });
        const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
        if (!blob) throw new Error("The screenshot image could not be created.");
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "chatmock-conversation.png";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showToast("Your chat image is ready.");
    } catch (error) {
        showToast("Image export failed. Please try again.");
        console.error("ChatMock could not export the preview image.", error);
    } finally {
        elements.phonePreview.classList.remove("exporting");
        elements.downloadChat.disabled = false;
    }
});

loadSavedChat();
updateContactPreview();
updatePhoneClock();
updateStatusPreview();
applyTheme(elements.themeInput.value);
applyWallpaper(elements.wallpaperInput.value);
renderMessages();
