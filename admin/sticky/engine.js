"use strict";

const stickyStore = require("../../Data/stickyStore");
const { ago } = require("../../lib/card");

const DEBOUNCE_MS = 3000;
const MIN_INTERVAL_MS = 5000;

const pending = new Set();
const inflight = new Set();
const timers = new Map();
const lastPush = new Map();

function buildSticky(sticky) {
    return {
        content: [
            sticky.content,
            "",
            `-# 📌 Sticky Note · diperbarui ${ago(sticky.updatedAt)}`
        ].join("\n"),
        allowedMentions: { parse: [] }
    };
}

async function deleteOld(channel, messageId) {
    if (!messageId) return;
    const old = await channel.messages.fetch(messageId).catch(() => null);
    if (old) await old.delete().catch(() => null);
}

async function pushSticky(channel, channelId, opts = {}) {
    if (inflight.has(channelId)) {
        pending.add(channelId);
        return;
    }

    if (!opts.force) {
        const since = Date.now() - (lastPush.get(channelId) || 0);
        if (since < MIN_INTERVAL_MS) {
            schedule(channel, channelId, MIN_INTERVAL_MS - since);
            return;
        }
    }

    inflight.add(channelId);
    lastPush.set(channelId, Date.now());

    try {
        do {
            pending.delete(channelId);

            const sticky = stickyStore.getSticky(channelId);
            if (!sticky) break;

            await deleteOld(channel, sticky.messageId);

            const msg = await channel.send(buildSticky(sticky))
                .catch(err => {
                    console.error(`[Sticky:${channelId}] gagal kirim:`, err.message);
                    return null;
                });

            if (!msg) break;
            stickyStore.setStickyMessage(channelId, msg.id);
        } while (pending.has(channelId));
    } finally {
        inflight.delete(channelId);
    }
}

function schedule(channel, channelId, delayMs) {
    if (timers.has(channelId)) return;

    const t = setTimeout(() => {
        timers.delete(channelId);
        pushSticky(channel, channelId, { force: true }).catch(err => {
            console.error(`[Sticky:${channelId}] error:`, err);
        });
    }, Math.max(0, delayMs));

    if (typeof t.unref === "function") t.unref();
    timers.set(channelId, t);
}

function register(client) {
    client.on("messageCreate", (message) => {
        if (!message.guild || message.author?.bot || message.system) return;

        const channelId = message.channelId;
        if (!stickyStore.getSticky(channelId)) return;

        schedule(message.channel, channelId, DEBOUNCE_MS);
    });

    console.log("📌 Sticky engine aktif.");
}

function clearChannel(channelId) {
    const t = timers.get(channelId);
    if (t) clearTimeout(t);
    timers.delete(channelId);
    pending.delete(channelId);
    lastPush.delete(channelId);
}

module.exports = { register, pushSticky, buildSticky, clearChannel, DEBOUNCE_MS, MIN_INTERVAL_MS };
