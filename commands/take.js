const handler = require("../Data/handlerData");
const config = require("../Data/config");
const { card, COLORS } = require("../lib/card");

/** Ikon status slot job. */
function statusIcon(current, max) {
    if (current >= max) return "🔴";
    if (current > 0) return "🟡";
    return "🟢";
}

module.exports = {
    name: "take",
    description: "Take Job",

    async execute(interaction) {
        try {
            await interaction.deferReply();

            if (!interaction.guild) {
                return interaction.editReply({
                    content: "❌ Command can only be used in a server."
                });
            }

            const handlerRoleId = config.getConfig().handlerRoleId;
            if (!interaction.member.roles.cache.has(handlerRoleId)) {
                return interaction.editReply({
                    content: "❌ Kamu belum punya role handler."
                });
            }

            const handlerData = handler.getHandler(interaction.user.id);

            if (!handlerData) {
                return interaction.editReply({
                    content: "❌ Kamu belum join sebagai handler."
                });
            }

            const order = interaction.options.getString("order");
            const howMany = interaction.options.getString("how_many");
            const world = interaction.options.getString("world");
            const customer = interaction.options.getUser("customer");

            const currentJob = handlerData.currentJob || 0;
            const maxJob = handlerData.maxJob || 0;

            if (currentJob >= maxJob) {
                return interaction.editReply({
                    content: `❌ Slot job penuh (${currentJob}/${maxJob}). Pakai /done dulu.`
                });
            }

            const success = handler.addJob(interaction.user.id, {
                order,
                howMany,
                world,
                customerId: customer.id
            });

            if (!success) {
                return interaction.editReply({
                    content: "❌ Gagal mengambil job."
                });
            }

            const updatedData = handler.getHandler(interaction.user.id);
            const updatedCurrent = updatedData.currentJob;
            const updatedMax = updatedData.maxJob;

            const payload = card({
                heading: "## ✅ Service By Barokah!",
                thumbnail: interaction.user.displayAvatarURL({ extension: "png", size: 128 }),
                fields: [
                    { label: "👤 Customer", value: `${customer}` },
                    { label: "🤖 Handler", value: `${interaction.user}` },
                    { label: "📦 Service", value: order },
                    { label: "⏱ Time/Hours", value: howMany },
                    { label: "🌍 World", value: world },
                    { label: "⏳ Status Job", value: `(${updatedCurrent}/${updatedMax}) ${statusIcon(updatedCurrent, updatedMax)}` }
                ],
                lines: [
                    "> Service Now Process.\n> Service sudah diterima. Handler akan /done setelah selesai."
                ],
                footer: "Barokah • job tercatat",
                color: COLORS.primary
            });

            const logChannelId = config.getConfig().takeLogChannelId;
            const logChannel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);

            if (logChannel && logChannel.isTextBased()) {
                await logChannel.send(payload)
                    .then(() => console.log("✅ Log channel sent."))
                    .catch(err => console.error("❌ Failed to send /take log (cek permission bot di channel):", err));
            } else {
                console.warn(`⚠️ Take log channel tidak ditemukan: ${logChannelId} (cek Take Log Channel ID di admin panel)`);
            }

            await interaction.editReply(payload);

        } catch (error) {
            console.error("❌ TAKE ERROR:", error);

            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ content: "❌ System error occurred." });
                } else {
                    await interaction.reply({ content: "❌ System error occurred." });
                }
            } catch (replyErr) {
                console.error("❌ Gagal kirim balasan error /take:", replyErr);
            }
        }
    }
};
