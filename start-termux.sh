#!/data/data/com.termux/files/usr/bin/sh
# ============================================================
# Bot Barokah - starter interaktif untuk Termux
# Pakai: ./start-termux.sh   (atau: sh start-termux.sh)
# ============================================================
set -e
cd "$(dirname "$0")"

BOLD='\033[1m'; DIM='\033[2m'; GRN='\033[32m'; YEL='\033[33m'; RED='\033[31m'; RST='\033[0m'
say()  { printf '%s\n' "$*"; }
ok()   { printf "${GRN}✔${RST} %s\n" "$*"; }
warn() { printf "${YEL}!${RST} %s\n" "$*"; }
die()  { printf "${RED}✘${RST} %s\n" "$*"; exit 1; }

# ---------- 1. Cek environment ----------
say ""
say "${BOLD}Bot Barokah - setup Termux${RST}"
say "${DIM}----------------------------------------${RST}"

if [ ! -d "$PREFIX" ]; then
  warn "Sepertinya ini bukan Termux. Script tetap jalan, tapi pakai npm/node biasa."
fi

if ! command -v node >/dev/null 2>&1; then
  die "Node.js belum terpasang. Jalankan:  pkg install nodejs-lts"
fi
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
if [ "$NODE_MAJOR" -lt 20 ]; then
  die "Node $(node -v) terlalu lama. Butuh >=20. Jalankan: pkg install nodejs-lts"
fi
ok "Node $(node -v)"
command -v npm >/dev/null 2>&1 || die "npm tidak ditemukan (biasanya ikut nodejs-lts)."
ok "npm $(npm -v)"

# ---------- 2. Dependency ----------
if [ ! -d node_modules ]; then
  say "${DIM}node_modules belum ada, install dependency produksi...${RST}"
  npm ci --omit=dev || npm install --omit=dev
fi
ok "Dependency siap"

# ---------- 3. .env interaktif ----------
ask() {  # $1=prompt $2=default $3=wajib(1/0)
  _def="$2"; _req="$3"; _ans=""
  while [ -z "$_ans" ]; do
    if [ -n "$_def" ]; then
      printf "  %s [%s]: " "$1" "$_def"
    else
      printf "  %s: " "$1"
    fi
    IFS= read -r _ans || true
    [ -z "$_ans" ] && _ans="$_def"
    if [ -z "$_ans" ] && [ "$_req" = "1" ]; then warn "Wajib diisi."; fi
  done
  printf '%s' "$_ans"
}

if [ -f .env ]; then
  say ""
  printf "${YEL}?${RST} .env sudah ada. Ubah konfigurasi? [y/N]: "
  IFS= read -r _edit || true
else
  _edit="y"
fi

if [ "$_edit" = "y" ] || [ "$_edit" = "Y" ]; then
  say ""
  say "${BOLD}Isi konfigurasi${RST} ${DIM}(Enter = pakai nilai dalam kurung)${RST}"
  _token=$(ask "Bot TOKEN" "" 1)
  _cid=$(ask "CLIENT_ID (Application ID)" "" 1)
  _gid=$(ask "GUILD_ID (server Discord)" "" 1)
  _pass=$(ask "ADMIN_PASSWORD (panel web)" "" 1)
  _enc=$(ask "AC_ENC_KEY (opsional, enkripsi token autoclick)" "" 0)

  cat > .env <<EOF
TOKEN=$_token
CLIENT_ID=$_cid
GUILD_ID=$_gid
ADMIN_PASSWORD=$_pass
AC_ENC_KEY=$_enc
PORT=3000
EOF
  chmod 600 .env 2>/dev/null || true
  ok ".env ditulis"
fi

# DATA_DIR wajib kosong di Termux (default: ./Data)
if grep -q '^DATA_DIR=.' .env 2>/dev/null; then
  sed -i '/^DATA_DIR=/d' .env
  warn "DATA_DIR dihapus dari .env (Termux pakai folder ./Data)."
fi

# ---------- 4. Deploy slash commands ----------
say ""
printf "${YEL}?${RST} Deploy ulang slash commands sekarang? [y/N]: "
IFS= read -r _deploy || true
if [ "$_deploy" = "y" ] || [ "$_deploy" = "Y" ]; then
  npm run deploy-commands || die "Deploy commands gagal (cek TOKEN/CLIENT_ID/GUILD_ID)."
fi

# ---------- 5. Jalan ----------
say ""
say "${BOLD}Menjalankan bot...${RST} ${DIM}(Ctrl+C untuk stop)${RST}"
say "${DIM}Admin panel: http://localhost:${PORT:-3000}${RST}"
command -v termux-wake-lock >/dev/null 2>&1 && termux-wake-lock

exec node --expose-gc index.js
