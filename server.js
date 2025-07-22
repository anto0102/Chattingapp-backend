const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const basicAuth = require("express-basic-auth");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Autenticazione base per /admin
app.use(
  "/admin",
  basicAuth({
    users: { admin: "changeme" }, // Cambia password!
    challenge: true,
  })
);

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

// ──────────────────────────────────────────────────────────
// ────────────── Gestione IP Bannati ───────────────────────
// ──────────────────────────────────────────────────────────

const BANNED_IPS_FILE = path.join(__dirname, "banned-ips.json");
let bannedIPs = new Set();

// Carica IP bannati da file
if (fs.existsSync(BANNED_IPS_FILE)) {
  try {
    const content = fs.readFileSync(BANNED_IPS_FILE, "utf8");
    const list = JSON.parse(content);
    if (Array.isArray(list)) bannedIPs = new Set(list);
  } catch (e) {
    console.error("Errore lettura banned-ips.json:", e);
  }
}

// Salva IP bannati nel file
function saveBannedIPs() {
  fs.writeFileSync(BANNED_IPS_FILE, JSON.stringify([...bannedIPs], null, 2));
}

// Ottieni IP reale
function getClientIP(socket) {
  const xForwarded = socket.handshake.headers["x-forwarded-for"];
  let ip = xForwarded ? xForwarded.split(",")[0].trim() : socket.handshake.address;
  if (ip.startsWith("::ffff:")) ip = ip.replace("::ffff:", "");
  return ip;
}

// ──────────────────────────────────────────────────────────
// ────────────── Socket.IO Logica ──────────────────────────
// ──────────────────────────────────────────────────────────

let connectedUsers = {};
let waitingUser = null;

// Blocca utenti bannati
io.use((socket, next) => {
  const ip = getClientIP(socket);
  if (bannedIPs.has(ip)) return next(new Error("BANNED"));
  next();
});

io.on("connection", (socket) => {
  const ip = getClientIP(socket);
  const isAdmin = socket.handshake.query?.admin === "1";
  connectedUsers[socket.id] = { socket, ip, isAdmin };

  console.log(`${isAdmin ? "🛡️ Admin" : "✅ Utente"} connesso: ${socket.id} (${ip})`);
  updateAdminUI();

  // Messaggi chat
  if (!isAdmin) {
    socket.on("start_chat", () => {
      if (waitingUser && waitingUser.connected) {
        const room = `chat_${socket.id}_${waitingUser.id}`;
        socket.join(room);
        waitingUser.join(room);
        socket.emit("match");
        waitingUser.emit("match");
        socket.partner = waitingUser;
        waitingUser.partner = socket;
        waitingUser = null;
      } else {
        waitingUser = socket;
        socket.emit("waiting");
      }
    });

    socket.on("message", (msg) => {
      if (socket.partner) socket.partner.emit("message", msg);
    });

    socket.on("disconnect_chat", () => {
      if (socket.partner) {
        socket.partner.emit("partner_disconnected");
        socket.partner.partner = null;
        socket.partner = null;
      }
      if (waitingUser === socket) waitingUser = null;
    });
  }

  // Ban IP
  socket.on("ban_ip", (targetIP) => {
    if (!connectedUsers[socket.id]?.isAdmin) return;

    if (!bannedIPs.has(targetIP)) {
      bannedIPs.add(targetIP);
      saveBannedIPs();
      console.log(`⛔ IP bannato: ${targetIP}`);

      // Disconnetti gli utenti con quell'IP
      Object.values(connectedUsers).forEach(({ socket: s, ip }) => {
        if (ip === targetIP) {
          s.emit("banned");
          s.disconnect(true);
        }
      });

      updateAdminUI();
    }
  });

  // Unban IP
  socket.on("unban_ip", (ipToUnban) => {
    if (!connectedUsers[socket.id]?.isAdmin) return;

    if (bannedIPs.has(ipToUnban)) {
      bannedIPs.delete(ipToUnban);
      saveBannedIPs();
      console.log(`✅ IP sbannato: ${ipToUnban}`);
      updateAdminUI();
    }
  });

  socket.on("disconnect", () => {
    delete connectedUsers[socket.id];
    if (waitingUser === socket) waitingUser = null;
    updateAdminUI();
  });
});

// Aggiorna la lista per tutti gli admin connessi
function updateAdminUI() {
  const users = Object.values(connectedUsers)
    .filter((u) => !u.isAdmin)
    .map(({ socket, ip }) => ({
      socketId: socket.id,
      ip,
    }));

  const banned = [...bannedIPs];

  Object.values(connectedUsers)
    .filter((u) => u.isAdmin)
    .forEach(({ socket }) => {
      socket.emit("users_list", users);
      socket.emit("banned_list", banned);
    });
}

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`🚀 Server avviato sulla porta ${PORT}`);
});
