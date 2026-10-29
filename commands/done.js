const { AttachmentBuilder } = require("discord.js");
const handler = require("../Data/handlerData");
const config = require("../Data/config");
const { card, COLORS } = require("../lib/card");
const { emoji, setGuild } = require("../lib/emoji");

function statusIcon(current, max) {
    if (current >= max) return emoji("offline");
    if (current > 0) return emoji("processing");
    return emoji("online");
}

module.exports = {
    name: "done",
    description: "Done job",

    async execute(interaction) {
        try {
            await interaction.deferReply();
            if (!interaction.guild)
                return interaction.editReply({ content: "❌ Command can only be used in a server." });

            setGuild(interaction.guild);

            const handlerRoleId = config.getConfig().handlerRoleId;
            if (!interaction.member.roles.cache.has(handlerRoleId)) {
                return interaction.editReply({
                    content: "❌ Kamu belum punya role handler."
                });
            }

            const jobNumber = interaction.options.getInteger("job");
            const proof = interaction.options.getAttachment("proof");

            if (!jobNumber || jobNumber < 1)
                return interaction.editReply({ content: "❌ Pilih job yang valid." });

            if (!proof || !proof.contentType?.startsWith("image/"))
                return interaction.editReply({ content: "❌ Wajib upload gambar bukti." });

            handler.loadData();

            const handlerData = handler.getHandler(interaction.user.id);
            if (!handlerData)
                return interaction.editReply({ content: "❌ Kamu belum join sebagai handler." });

            if (!handlerData.jobs || handlerData.jobs.length === 0)
                return interaction.editReply({ content: "❌ Tidak ada job aktif." });

            const jobIndex = jobNumber - 1;
            const jobData = handlerData.jobs[jobIndex];
            if (!jobData)
                return interaction.editReply({ content: "❌ Job tidak ditemukan." });

            const { order, howMany, world, customerId } = jobData;

            const removeSuccess = handler.removeJob(interaction.user.id, jobIndex);
            if (!removeSuccess)
                return interaction.editReply({ content: "❌ Gagal menyelesaikan job." });

            const updatedData = handler.getHandler(interaction.user.id);
            const updatedCurrent = updatedData.currentJob;
            const updatedMax = updatedData.maxJob;

            // Attachment harus punya nama file yang sama dengan referensi
            // `attachment://` di MediaGallery, kalau tidak Discord menolak
            // (UNFURLED_MEDIA_ITEM_REFERENCED_ATTACHMENT_NOT_FOUND).
            const proofFile = new AttachmentBuilder(proof.url, {
                name: proof.name && proof.name !== "image.png"
                    ? proof.name
                    : `proof-${Date.now()}.png`,
                description: "Bukti job selesai"
            });

            const payload = card({
                heading: `## ${emoji("done")} Service By Barokah!`,
                thumbnail: interaction.user.displayAvatarURL({ extension: "png", size: 128 }),
                fields: [
                    { label: `${emoji("user")} Customer`, value: `<@${customerId}>` },
                    { label: `${emoji("bot")} Handler`, value: `${interaction.user}` },
                    { label: `${emoji("service")} Service`, value: order },
                    { label: `${emoji("clock")} Type`, value: howMany },
                    { label: `${emoji("world")} World`, value: world },
                    { label: `${emoji("status")} Status Job`, value: `(${updatedCurrent}/${updatedMax}) ${statusIcon(updatedCurrent, updatedMax)}` }
                ],
                lines: ["📷 **PROOF**\n> Service 100% Completed Successfully."],
                images: [{ url: `attachment://${proofFile.name}` }],
                footer: "Barokah • job selesai",
                color: COLORS.success
            });

            // Bukti dikirim sebagai attachment agar URL tidak kedaluwarsa.
            const sendPayload = { ...payload, files: [proofFile] };

            const doneLogChannelId = config.getConfig().doneLogChannelId;
            const logChannel = await interaction.guild.channels.fetch(doneLogChannelId).catch(() => null);
            if (logChannel?.isTextBased()) {
                await logChannel.send(sendPayload)
                    .catch(err => console.error("❌ Failed to send /done log (cek permission bot di channel):", err));
            } else {
                console.warn(`⚠️ Done log channel tidak ditemukan: ${doneLogChannelId} (cek Done Log Channel ID di admin panel)`);
            }

            // Refresh leaderboard setelah job benar-benar dihapus.
            try {
                await handler.updateLeaderboardEmbed(interaction.guild);
            } catch (err) {
                console.log("⚠️ Failed to update leaderboard automatically:", err);
            }

            await interaction.editReply({ ...payload, files: [proofFile] });

        } catch (error) {
            console.error("❌ DONE ERROR:", error);
            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ content: "❌ System error occurred." });
                } else {
                    await interaction.reply({ content: "❌ System error occurred." });
                }
            } catch (replyErr) {
                console.error("❌ Gagal kirim balasan error /done:", replyErr);
            }
        }
    }
};
