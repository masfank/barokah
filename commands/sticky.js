const {
    MessageFlags,
    PermissionFlagsBits
} = require("discord.js");

const stickyStore = require("../Data/stickyStore");
const stickyEngine = require("../admin/sticky/engine");
const { ago } = require("../lib/card");

function canManage(interaction) {
    if (interaction.guild.ownerId === interaction.user.id) return true;
    return Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages));
}

async function resolveChannel(interaction) {
    const picked = interaction.options.getChannel("channel");
    if (picked) {
        if (!picked.isTextBased() || picked.isVoiceBased?.()) {
            throw new Error("Channel harus berupa channel teks.");
        }
        return picked;
    }
    if (!interaction.channel?.isTextBased()) {
        throw new Error("Jalankan command ini di channel teks, atau isi opsi channel.");
    }
    return interaction.channel;
}

module.exports = {
    name: "sticky",
    description: "Sticky note: catatan yang selalu menempel di dasar channel",

    async execute(interaction) {
        try {
            if (!interaction.guild) {
                return interaction.reply({
                    content: "❌ Command ini hanya bisa dipakai di server.",
                    flags: MessageFlags.Ephemeral
                });
            }

            if (!canManage(interaction)) {
                return interaction.reply({
                    content: "❌ Butuh permission Manage Messages untuk mengatur sticky.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const sub = interaction.options.getSubcommand();
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            if (sub === "list") {
                const all = stickyStore.getAllSticky();
                const ids = Object.keys(all);

                if (ids.length === 0) {
                    return interaction.editReply("📌 Belum ada channel yang punya sticky.");
                }

                const lines = ids.map(id => {
                    const s = all[id];
                    const preview = s.content.length > 60
                        ? `${s.content.slice(0, 60)}…`
                        : s.content;
                    return `<#${id}>\n> ${preview}\n> -# diperbarui ${ago(s.updatedAt)}`;
                });

                return interaction.editReply(lines.join("\n\n"));
            }

            const channel = await resolveChannel(interaction);

            if (sub === "set") {
                const content = interaction.options.getString("content");

                try {
                    stickyStore.setSticky(channel.id, content, interaction.user.id);
                } catch (err) {
                    return interaction.editReply(`❌ ${err.message}`);
                }

                await interaction.editReply(`📌 Sticky dipasang di <#${channel.id}>.`);

                await stickyEngine.pushSticky(channel, channel.id, { force: true }).catch(err => {
                    console.error("[Sticky] gagal push awal:", err);
                });
                return;
            }

            if (sub === "remove") {
                const existing = stickyStore.getSticky(channel.id);
                if (!existing) {
                    return interaction.editReply(`❌ Tidak ada sticky di <#${channel.id}>.`);
                }

                stickyEngine.clearChannel(channel.id);
                const msg = await channel.messages.fetch(existing.messageId).catch(() => null);
                if (msg) await msg.delete().catch(() => null);
                stickyStore.removeSticky(channel.id);

                return interaction.editReply(`🗑️ Sticky di <#${channel.id}> dihapus.`);
            }

            return interaction.editReply("❌ Subcommand tidak dikenal.");

        } catch (error) {
            console.error("❌ STICKY ERROR:", error);
            try {
                const text = `❌ ${error.message || "Terjadi error pada sistem."}`;
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply(text);
                } else {
                    await interaction.reply({ content: text, flags: MessageFlags.Ephemeral });
                }
            } catch (replyErr) {
                console.error("❌ Gagal kirim balasan error /sticky:", replyErr);
            }
        }
    }
};
