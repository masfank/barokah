const { card, COLORS } = require("../lib/card");

const COMMANDS = [
    ["/menu", "Lihat semua command bot."],
    ["/join", "Daftar sebagai handler (max job + layanan)."],
    ["/leave", "Keluar dari status handler."],
    ["/take", "Ambil job dari customer."],
    ["/done", "Tandai job selesai + upload bukti."],
    ["/status", "Cek handler yang sedang ready."],
    ["/ranking", "Lihat leaderboard handler."],
    ["/sticky", "Pasang catatan sticky di channel ini."],
    ["/autopost", "Buka panel AutoPost."]
];

module.exports = {
    name: "menu",
    description: "View the list of commands",

    async execute(interaction) {
        const lines = COMMANDS.map(
            ([name, desc]) => `**${name}**\n> ${desc}`
        );

        const payload = card({
            heading: "## 📋 Menu Bot Barokah",
            thumbnail: interaction.client.user.displayAvatarURL({ extension: "png", size: 128 }),
            lines,
            footer: "Barokah • semua command slash",
            color: COLORS.primary
        });

        try {
            await interaction.reply(payload);
        } catch (error) {
            console.error("❌ MENU ERROR:", error);
        }
    }
};
