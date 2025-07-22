const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 10000;
const BANNED_IPS_FILE = path.join(__dirname, "banned-ips.json");

app.use(express.static(__dirname));

let bannedIPs = new Set();
let connectedUsers = {};

// ✅ Carica IP bannati da file (se esiste)
if (fs.existsSync(BANNED_IPS_FILE)) {
  try {
    const data = fs.readFileSync(BANNED_IPS_FILE, "utf8");
    bannedIPs = new Set(JSON.parse(data));
  } catch (err) {
    console.error("Errore caricamento banned-ips.json:", err);
  }
} else {
  fs.writeFileSync(BANNED_IPS_FILE, "[]", "utf8");
}

// ✅ Salva IP bannati
function saveBannedIPs() {
  try {
    fs.writeFileSync(BANNED_IPS_FILE, JSON.stringify([...bannedIPs], null, 2));
    console.log("📁 IP bannati salvati.");
  } catch (err) {
    console.error("❌ Errore salvataggio banned-ips.json:", err);
  }
}

// ✅ Ottieni IP reale
function getIP(socket) {
  const forwarded = socket.handshake.headers["x-forwarded-for"];
  return forwarded ? forwarded.split(",")[0].trim() : socket.conn.remoteAddress;
}

function updateAdminUI() {
  const admins = Object.values(connectedUsers).filter(u => u.isAdmin);
  const users = Object.values(connectedUsers)
    .filter(u => !u.isAdmin)
    .map(({ socket, ip }) => ({ socketId: socket.id, ip }));

  admins.forEach(({ socket }) => {
    socket.emit("users_list", users);
    socket.emit("banned_list", [...bannedIPs]);
  });
}

io.on("connection", (socket) => {
  const ip = getIP(socket);
  const isAdmin = socket.handshake.query.admin === "1";

  if (!isAdmin && bannedIPs.has(ip)) {
    socket.emit("banned");
    socket.disconnect(true);
    console.log(`🚫 Tentativo di connessione da IP bannato: ${ip}`);
    return;
  }

  connectedUsers[socket.id] = { socket, ip, isAdmin };

  console.log(`${isAdmin ? "🛡️ Admin" : "✅ Utente"} connesso: ${socket.id} (${ip})`);

  if (isAdmin) {
    socket.emit("banned_list", [...bannedIPs]);
    const users = Object.values(connectedUsers)
      .filter((u) => !u.isAdmin)
      .map(({ socket, ip }) => ({ socketId: socket.id, ip }));
    socket.emit("users_list", users);
  }

  updateAdminUI();

  socket.on("ban_ip", (ipToBan) => {
    bannedIPs.add(ipToBan);
    saveBannedIPs();
    Object.values(connectedUsers).forEach(({ socket, ip }) => {
      if (ip === ipToBan && !socket.handshake.query.admin) {
        socket.emit("banned");
        socket.disconnect(true);
      }
    });
    updateAdminUI();
    console.log(`🔒 IP bannato: ${ipToBan}`);
  });

  socket.on("unban_ip", (ipToUnban) => {
    bannedIPs.delete(ipToUnban);
    saveBannedIPs();
    updateAdminUI();
    console.log(`🔓 IP sbannato: ${ipToUnban}`);
  });

  socket.on("disconnect", () => {
    delete connectedUsers[socket.id];
    console.log(`❌ Utente disconnesso: ${socket.id}`);
    updateAdminUI();
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server avviato sulla porta ${PORT}`);
});
