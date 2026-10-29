const handler = require("../Data/handlerData");
const config = require("../Data/config");
const { buildLeaderboard } = require("../lib/leaderboard");

module.exports = {
    name: "ranking",
    description: "Show LeaderBoard Handler",

    async execute(interaction) {
        try {
            await interaction.deferReply();
            if (!interaction.guild) {
                return interaction.editReply({
                    content: "❌ Command ini hanya bisa digunakan di server."
                });
            }

            // Prioritas: channel tersimpan > config admin panel
            let channelId = handler.getRankingChannel();
            if (!channelId) {
                channelId = config.getConfig().rankingChannelId;
                handler.setRankingChannel(channelId);
            }

            const logChannel = await interaction.guild.channels.fetch(channelId).catch(() => null);
            if (!logChannel || !logChannel.isTextBased()) {
                return interaction.editReply({
                    content: "❌ Channel leaderboard not found."
                });
            }

            const payload = buildLeaderboard(handler.getAllHandlers());

            // Edit pesan leaderboard lama, atau buat baru.
            const messageId = handler.getRankingMessage();
            let edited = false;

            if (messageId) {
                const oldMessage = await logChannel.messages.fetch(messageId).catch(() => null);
                if (oldMessage) {
                    await oldMessage.edit(payload).catch(err => {
                        console.log("⚠️ Gagal edit leaderboard message, buat baru:", err.message);
                    });
                    edited = Boolean(await oldMessage.fetch(true).catch(() => null)) && !oldMessage.deleted;
                }
            }

            if (!edited) {
                const msg = await logChannel.send(payload);
                handler.setRankingMessage(msg.id);
            }

            await interaction.editReply({ content: "✅ Leaderboard updated." });

        } catch (error) {
            console.error("❌ RANKING ERROR:", error);
            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ content: "❌ Terjadi error pada sistem." });
                } else {
                    await interaction.reply({ content: "❌ Terjadi error pada sistem.", flags: 64 });
                }
            } catch (replyErr) {
                console.error("❌ Gagal kirim balasan error /ranking:", replyErr);
            }
        }
    }
};
