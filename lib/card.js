"use strict";

/**
 * lib/card.js
 *
 * Helper tipis untuk membangun pesan Components V2 (discord.js 14.19+).
 * Semua command handler memakai satu bahasa visual ini supaya konsisten
 * dengan panel AutoPost yang sudah V2.
 *
 * Catatan V2:
 * - Pesan V2 TIDAK boleh punya `content` atau `embeds`, hanya `components`.
 * - Wajib `flags: MessageFlags.IsComponentsV2` (+ Ephemeral bila perlu).
 */

const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags
} = require("discord.js");

const COLORS = Object.freeze({
    primary: 0x5865f2, // biru — info / proses
    success: 0x57f287, // hijau — selesai
    warning: 0xfee75c, // kuning — perhatian
    danger: 0xed4245,  // merah — gagal / kehilangan
    muted: 0x4e5058    // abu — netral / kosong
});

/** Separator tipis standar. */
function sep(large = false) {
    return new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(large ? SeparatorSpacingSize.Large : SeparatorSpacingSize.Small);
}

/** Baris key-value rata: `**Label** — nilai`. */
function kv(label, value) {
    return `**${label}** — ${value}`;
}

/** Teks kecil (subtext) ala footer embed. */
function small(text) {
    return `-# ${text}`;
}

/** Timestamp relatif Discord: "3 menit lalu". */
function ago(ms = Date.now()) {
    return `<t:${Math.floor(ms / 1000)}:R>`;
}

/**
 * Susun satu Container V2.
 *
 * @param {object} opts
 * @param {string[]} [opts.lines] teks per blok (dipisah separator)
 * @param {string} [opts.heading] heading markdown, contoh "## ✅ Selesai"
 * @param {string|null} [opts.thumbnail] URL thumbnail di accessory Section heading
 * @param {{url: string, spoiler?: boolean}[]} [opts.images] gambar MediaGallery
 * @param {{label:string, value:string}[]} [opts.fields] pasangan label/nilai
 * @param {string} [opts.footer] teks subtext paling bawah
 * @param {number} [opts.color] accent color
 * @param {boolean} [opts.ephemeral]
 * @param {import('discord.js').ActionRowBuilder[]} [opts.rows] baris tombol/select
 * @returns {{components: ContainerBuilder[], flags: number}}
 */
function card(opts = {}) {
    const {
        lines = [],
        heading,
        thumbnail,
        images = [],
        fields = [],
        footer,
        color = COLORS.primary,
        ephemeral = false,
        rows = []
    } = opts;

    const container = new ContainerBuilder().setAccentColor(color);

    // Heading + thumbnail (Section = teks kiri, gambar kanan).
    if (heading) {
        const display = new TextDisplayBuilder().setContent(heading);
        if (thumbnail) {
            container.addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(display)
                    .setThumbnailAccessory(
                        new ThumbnailBuilder({ media: { url: thumbnail } })
                    )
            );
        } else {
            container.addTextDisplayComponents(display);
        }
    }

    // Teks bebas: satu TextDisplay per baris, dipisah separator.
    for (const line of lines) {
        if (!line) continue;
        if (container.components.length > 0) container.addSeparatorComponents(sep());
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(line));
    }

    // Blok key-value digabung jadi satu TextDisplay (hemat komponen).
    if (fields.length > 0) {
        if (container.components.length > 0) container.addSeparatorComponents(sep());
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                fields.map(f => kv(f.label, f.value)).join("\n")
            )
        );
    }

    // MediaGallery: satu gambar penuh, atau grid bila lebih.
    if (images.length > 0) {
        if (container.components.length > 0) container.addSeparatorComponents(sep());
        const gallery = new MediaGalleryBuilder().addItems(
            ...images.slice(0, 10).map(img =>
                new MediaGalleryItemBuilder()
                    .setURL(img.url)
                    .setSpoiler(Boolean(img.spoiler))
            )
        );
        container.addMediaGalleryComponents(gallery);
    }

    // Tombol/select di dalam container.
    for (const row of rows) container.addActionRowComponents(row);

    // Footer subtext.
    if (footer) {
        container.addSeparatorComponents(sep(true));
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(small(footer))
        );
    }

    const flags = MessageFlags.IsComponentsV2 | (ephemeral ? MessageFlags.Ephemeral : 0);
    return { components: [container], flags };
}

module.exports = { card, sep, kv, small, ago, COLORS };
