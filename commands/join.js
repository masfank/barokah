const handler = require("../Data/handlerData");
const config = require("../Data/config");
const { card, COLORS } = require("../lib/card");
const { emoji, setGuild } = require("../lib/emoji");

module.exports = {
    name: "join",
    description: "Join as handler",

    async execute(interaction) {
        try {
            await interaction.deferReply();

            if (!interaction.guild) {
                return interaction.editReply({
                    content: "❌ Command ini hanya bisa dijalankan di server."
                });
            }

            setGuild(interaction.guild);

            const roleId = config.getConfig().handlerRoleId;

            if (!interaction.member.roles.cache.has(roleId)) {
                return interaction.editReply({
                    content: "❌ Kamu belum punya role handler."
                });
            }

            const maxJob = interaction.options.getInteger("job");
            const readyJobsInput = interaction.options.getString("ready_job");

            if (!maxJob || maxJob < 1 || maxJob > 2) {
                return interaction.editReply({
                    content: "❌ Max Job harus 1 atau 2."
                });
            }

            const oldData = handler.getHandler(interaction.user.id);

            if (oldData && oldData.maxJob > 0) {
                return interaction.editReply({
                    content: "❌ Kamu sudah join. Pakai /leave dulu kalau mau ganti."
                });
            }

            const jobTypes = readyJobsInput
                .split(/[,|&]/)
                .map(j => j.trim())
                .filter(j => j);

            if (jobTypes.length === 0) {
                return interaction.editReply({
                    content: "❌ Isi minimal 1 ready job."
                });
            }

            if (jobTypes.length > maxJob) {
                return interaction.editReply({
                    content: `❌ Ready job (${jobTypes.length}) melebihi Max Job (${maxJob}).`
                });
            }

            const joined = handler.joinHandler(interaction.user.id, maxJob);

            if (!joined) {
                return interaction.editReply({
                    content: "❌ Gagal join, silakan coba lagi."
                });
            }

            jobTypes.forEach(j => handler.addService(interaction.user.id, j));

            const payload = card({
                heading: `## ${emoji("done")} Handler Joined`,
                thumbnail: interaction.user.displayAvatarURL({ extension: "png", size: 128 }),
                fields: [
                    { label: `${emoji("bot")} Handler`, value: `${interaction.user}` },
                    { label: `${emoji("target")} Max Job`, value: String(maxJob) },
                    { label: `${emoji("online")} Status`, value: `Ready (0/${maxJob})` },
                    { label: `${emoji("tools")} Ready Job`, value: jobTypes.join(" & ") }
                ],
                footer: "Barokah • siap menerima job",
                color: COLORS.success
            });

            await interaction.editReply(payload);
        } catch (error) {
            console.error("JOIN ERROR:", error);

            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: "❌ Terjadi error pada sistem.",
                        flags: 64
                    });
                } else {
                    await interaction.editReply({
                        content: "❌ Terjadi error setelah proses."
                    });
                }
            } catch (replyErr) {
                console.error("❌ Gagal kirim balasan error /join:", replyErr);
            }
        }
    }
};
