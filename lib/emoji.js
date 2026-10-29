"use strict";

const UNICODE = Object.freeze({
    online: "🟢",
    processing: "🟡",
    offline: "🔴",
    done: "✅",
    error: "❌",
    warning: "⚠️",
    user: "👤",
    bot: "🤖",
    service: "📦",
    clock: "⏱️",
    world: "🌍",
    status: "⏳",
    note: "📋",
    target: "🎯",
    tools: "🛠️"
});

const CUSTOM = Object.freeze({
    online: { animated: true, name: "ahonline", id: "1393419380506759218" },
    processing: { animated: true, name: "processing", id: "1160993485936144394" },
    offline: { animated: true, name: "offline", id: "1432956599307210752" },
    clock: { animated: true, name: "clock", id: "1561517326208077855" },
    world: { animated: true, name: "world", id: "1561517258407149659" },
    status: { animated: true, name: "warns", id: "1402335858379456826" },
    service: { animated: true, name: "manuteno", id: "1437118842898747495" },
    user: { animated: false, name: "Member", id: "1437123582000894174" },
    bot: { animated: false, name: "admin", id: "1526335065829933147" },
    note: { animated: false, name: "note", id: "1561518283243659334" },
    done: { animated: false, name: "bluetick", id: "1452929436201517137" }
});

let guild = null;

function setGuild(g) {
    guild = g;
}

function isAvailable(emoji) {
    if (!guild) return false;
    const found = guild.emojis?.cache?.get(emoji.id);
    return Boolean(found && found.available !== false);
}

function emoji(key) {
    const custom = CUSTOM[key];
    if (!custom) return UNICODE[key] || "";
    if (!isAvailable(custom)) return UNICODE[key] || "";
    const prefix = custom.animated ? "a" : "";
    return `<${prefix}:${custom.name}:${custom.id}>`;
}

module.exports = { emoji, setGuild, UNICODE, CUSTOM };
