const handler = require("../Data/handlerData");
const { card, COLORS } = require("../lib/card");
const { emoji, setGuild } = require("../lib/emoji");

module.exports = {
    name: "leave",
    description: "Exit Handler State - TotalDone reduced according to currentJob",

    async execute(interaction) {
        try {
            await interaction.deferReply();

            if (interaction.guild) setGuild(interaction.guild);

            const allHandlers = handler.getAllHandlers();
            const data = allHandlers[interaction.user.id];

            if (!data) {
                return interaction.editReply(card({
                    heading: `## ${emoji("error")} Leave Gagal`,
                    lines: ["Kamu belum join sebagai handler, jadi tidak bisa leave."],
                    color: COLORS.danger
                }));
            }

            const currentTotalDone = data.totalDone || 0;
            const currentJob = data.currentJob || data.jobs.length || 0;
            const newTotalDone = currentJob > 0
                ? Math.max(0, currentTotalDone - currentJob)
                : currentTotalDone;

            data.totalDone = newTotalDone;
            data.jobs = [];
            data.maxJob = 0;
            data.currentJob = 0;
            data.services = [];
            handler.saveData();

            const deducted = currentJob > 0;

            const payload = card({
                heading: `## ${emoji("done")} Handler Left`,
                thumbnail: interaction.user.displayAvatarURL({ extension: "png", size: 128 }),
                fields: [
                    { label: `${emoji("bot")} Handler`, value: `${interaction.user}` },
                    { label: `${emoji("note")} Total Done`, value: String(newTotalDone) }
                ],
                lines: [
                    deducted
                        ? `⚠️ ${currentJob} job yang belum selesai dipotong dari Total Done.`
                        : "> Semua job sudah selesai, Total Done tidak berubah."
                ],
                footer: "Barokah • status handler dilepas",
                color: deducted ? COLORS.danger : COLORS.muted
            });

            await interaction.editReply(payload);

        } catch (error) {
            console.error("LEAVE ERROR:", error);

            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: "❌ Terjadi error pada sistem.",
                        flags: 64
                    });
                } else if (interaction.deferred && !interaction.replied) {
                    await interaction.editReply({
                        content: "❌ Terjadi error setelah proses."
                    });
                }
            } catch (replyErr) {
                console.error("❌ Gagal kirim balasan error /leave:", replyErr);
            }
        }
    }
};
