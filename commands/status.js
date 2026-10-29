const handler = require("../Data/handlerData");
const { card, COLORS } = require("../lib/card");

function statusIcon(current, max) {
    if (current === 0 && max === 0) return "❌";
    if (current >= max && max !== 0) return "🔴";
    if (current > 0) return "🟡";
    return "🟢";
}

function buildStatusCard(entries) {
    if (entries.length === 0) {
        return card({
            heading: "## 📊 Status Handler",
            lines: ["Tidak ada handler yang aktif sekarang."],
            footer: "Barokah • status handler",
            color: COLORS.muted
        });
    }

    const lines = entries.map(([userId, data]) => {
        const max = Number(data.maxJob) || 0;
        const current = Array.isArray(data.jobs) ? data.jobs.length : 0;
        const readyJobs = data.services && data.services.length > 0
            ? data.services.join(" / ")
            : "Empty/Offline";

        return `👤 <@${userId}>\n> ⏳ (${current}/${max}) ${statusIcon(current, max)} · 🛠 ${readyJobs}`;
    });

    return card({
        heading: "## 📊 Status Handler",
        lines,
        footer: `Barokah • ${entries.length} handler terdaftar`,
        color: COLORS.primary
    });
}

module.exports = {
    name: "status",
    description: "Check all handler status",

    async execute(interaction) {
        try {
            if (!interaction.guild) {
                return interaction.reply({
                    content: "❌ Command ini hanya bisa digunakan di server.",
                    flags: 64
                });
            }

            const entries = Object.entries(handler.getAllHandlers());
            const payload = buildStatusCard(entries);
            const ephemeral = payload.flags | 64;

            await interaction.reply({ components: payload.components, flags: ephemeral });

        } catch (error) {
            console.error("STATUS ERROR:", error);

            try {
                if (interaction.replied) {
                    await interaction.followUp({ content: "❌ Terjadi error pada sistem.", flags: 64 });
                } else if (interaction.deferred) {
                    await interaction.editReply({ content: "❌ Terjadi error pada sistem." });
                } else {
                    await interaction.reply({ content: "❌ Terjadi error pada sistem.", flags: 64 });
                }
            } catch (replyErr) {
                console.error("❌ Gagal kirim balasan error /status:", replyErr);
            }
        }
    }
};
