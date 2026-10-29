"use strict";

/**
 * Data/stickyStore.js
 *
 * Sticky note per channel: pesan yang "menempel" di dasar channel.
 * Setiap kali ada pesan baru, bot menghapus sticky lama lalu mengirim ulang
 * sticky di bawah pesan terbaru.
 *
 * Shape Data/sticky.json:
 * {
 *   channels: {
 *     [channelId]: {
 *       content: string,      // isi catatan (markdown)
 *       messageId: string,    // id pesan sticky terakhir yang dikirim bot
 *       ownerId: string,      // siapa yang memasang
 *       updatedAt: number     // ms epoch
 *     }
 *   }
 * }
 */

const fs = require("fs");
const path = require("path");

const DATA_FILE_NAME = "sticky.json";
const dataDir = process.env.DATA_DIR && process.env.DATA_DIR.trim() !== ""
    ? process.env.DATA_DIR
    : __dirname;
const STORE_PATH = path.join(dataDir, DATA_FILE_NAME);

const MAX_CONTENT_LENGTH = 2000;
const MAX_CHANNELS = 50; // ponytail: cap sederhana; naikkan kalau perlu banyak channel

let channels = {};

// Pastikan folder data ada (fresh deploy / volume DATA_DIR baru).
function ensureDataDir() {
    try {
        fs.mkdirSync(dataDir, { recursive: true });
    } catch (err) {
        if (err.code !== "EEXIST") console.error("ENSURE DATA DIR ERROR:", err);
    }
    return fs.existsSync(dataDir);
}

function loadSticky() {
    try {
        if (!ensureDataDir()) return;

        if (!fs.existsSync(STORE_PATH)) {
            fs.writeFileSync(STORE_PATH, JSON.stringify({ channels: {} }, null, 2));
            channels = {};
            return;
        }

        const raw = fs.readFileSync(STORE_PATH, "utf-8");
        const obj = raw ? JSON.parse(raw) : {};
        channels = {};

        if (obj.channels && typeof obj.channels === "object") {
            for (const [id, value] of Object.entries(obj.channels)) {
                if (!/^\d{5,25}$/.test(id)) continue;
                const content = typeof value?.content === "string" ? value.content.trim() : "";
                if (!content) continue;

                channels[id] = {
                    content: content.slice(0, MAX_CONTENT_LENGTH),
                    messageId: value.messageId ? String(value.messageId) : null,
                    ownerId: value.ownerId ? String(value.ownerId) : null,
                    updatedAt: Number(value.updatedAt) || Date.now()
                };
            }
        }
    } catch (err) {
        console.error("LOAD STICKY ERROR:", err);
        channels = {};
    }
}

function saveSticky() {
    try {
        ensureDataDir();
        fs.writeFileSync(STORE_PATH, JSON.stringify({ channels }, null, 2));
    } catch (err) {
        console.error("SAVE STICKY ERROR:", err);
    }
}

/** Ambil sticky satu channel, atau null. */
function getSticky(channelId) {
    return channels[channelId] || null;
}

/** Semua sticky (untuk daftar di /sticky list). */
function getAllSticky() {
    return { ...channels };
}

/**
 * Pasang / perbarui sticky pada channel.
 * @throws {Error} bila isi kosong atau batas channel tercapai
 */
function setSticky(channelId, content, ownerId) {
    if (!/^\d{5,25}$/.test(String(channelId))) throw new Error("Channel ID tidak valid.");

    const text = String(content || "").trim();
    if (!text) throw new Error("Isi catatan tidak boleh kosong.");
    if (text.length > MAX_CONTENT_LENGTH) {
        throw new Error(`Isi catatan maksimal ${MAX_CONTENT_LENGTH} karakter.`);
    }
    if (!channels[channelId] && Object.keys(channels).length >= MAX_CHANNELS) {
        throw new Error(`Maksimal ${MAX_CHANNELS} channel sticky. Hapus salah satu dulu.`);
    }

    const existing = channels[channelId];
    channels[channelId] = {
        content: text,
        messageId: existing ? existing.messageId : null,
        ownerId: String(ownerId || existing?.ownerId || ""),
        updatedAt: Date.now()
    };

    saveSticky();
    return channels[channelId];
}

/** Simpan id pesan sticky terakhir (dipakai engine untuk hapus saat geser). */
function setStickyMessage(channelId, messageId) {
    if (!channels[channelId]) return false;
    channels[channelId].messageId = messageId ? String(messageId) : null;
    saveSticky();
    return true;
}

/** Hapus sticky satu channel. */
function removeSticky(channelId) {
    if (!channels[channelId]) return false;
    delete channels[channelId];
    saveSticky();
    return true;
}

loadSticky();

module.exports = {
    MAX_CONTENT_LENGTH,
    MAX_CHANNELS,
    loadSticky,
    saveSticky,
    getSticky,
    getAllSticky,
    setSticky,
    setStickyMessage,
    removeSticky
};
