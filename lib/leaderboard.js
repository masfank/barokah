"use strict";

/**
 * lib/leaderboard.js
 *
 * Satu sumber pembangun leaderboard untuk /ranking dan updateLeaderboardEmbed()
 * (sebelumnya logika ini terduplikasi di dua tempat).
 */

const { card, COLORS } = require("./card");

const MAX_ENTRIES = 25; // TextDisplay dibatasi 4000 char; top-N menjaga payload aman
const MEDALS = ["🥇", "🥈", "🥉"];

/**
 * Bangun payload Components V2 leaderboard.
 * @param {Record<string, {totalDone?: number}>} handlers
 * @param {{ephemeral?: boolean}} [opts]
 * @returns {{components: import('discord.js').ContainerBuilder[], flags: number}}
 */
function buildLeaderboard(handlers, opts = {}) {
    const sorted = Object.entries(handlers || {})
        .sort((a, b) => (b[1].totalDone || 0) - (a[1].totalDone || 0));

    const shown = sorted.slice(0, MAX_ENTRIES);
    const rest = sorted.length - shown.length;

    if (shown.length === 0) {
        return card({
            heading: "## 🏆 LeaderBoard Handler",
            lines: ["Belum ada handler terdaftar."],
            footer: "Barokah • leaderboard",
            color: COLORS.muted,
            ephemeral: Boolean(opts.ephemeral)
        });
    }

    const lines = shown.map(([userId, data], i) => {
        const rank = MEDALS[i] || `\`#${i + 1}\``;
        return `${rank} <@${userId}>\n> 📊 **Total Job** — ${data.totalDone || 0}`;
    });

    if (rest > 0) lines.push(`-# dan ${rest} handler lainnya`);

    return card({
        heading: "## 🏆 LeaderBoard Handler",
        lines,
        footer: "Barokah • ranking berdasarkan total job",
        color: COLORS.primary,
        ephemeral: Boolean(opts.ephemeral)
    });
}

module.exports = { buildLeaderboard, MAX_ENTRIES };
