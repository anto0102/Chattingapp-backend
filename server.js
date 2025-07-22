const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const basicAuth = require("express-basic-auth");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// 🔁 Matchmaking
let waitingUser = null;

// Auth admin
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "changeme"; // Modifica in produzione

app.use(
  "/admin",
  basicAuth({
    users: { [ADMIN_USERNAME]: ADMIN_PASSWORD },
    challenge: true,
    unauthorizedResponse: () => "Accesso negato",
  })
);

app.get("/admin", (req, res) => {
  res.sendFile(__dirname + "/admin.html");
});

// 📁 Percorso file dei ban
const BANS_FILE = path.join(__dirname, "banned-ips.json");
const bannedIPs = new Set();

// 📥 Carica IP bannati da file all'avvio
if (fs.existsSync(BANS_FILE)) {
  const data = fs.readFileSync(BANS_FILE, "utf-8");
  try {
    const parsed = JSON.parse(data);
    parsed.forEach(ip => bannedIPs.add(ip));
    console.log("📂 IP bannati caricati da file:", [...bannedIPs]);
  } catch (err) {
    console.error("Errore nel parsing di banned-ips.json", err);
  }
}

// 💾 Salva IP bannati su file
function saveBans() {
  fs.writeFileSync(BANS_FILE, JSON.stringify([...bannedIPs], null, 2));
}

// 👥 Utenti connessi
const connectedUsers = {};

function updateAdminUsers() {
  const usersList = Object.values(connectedUsers)
    .filter((u) => !u.isAdmin)
    .map((u) => ({
      socketId: u.socket.id,
      ip: u.ip,
    }));

  const adminSockets = Object.values(connectedUsers)
    .filter((u) => u.isAdmin)
    .map((u) => u.socket);

  adminSockets.forEach((admin) => admin.emit("users_list", usersList));
}

// ❌ Blocco IP bannati
io.use((socket, next) => {
  const ip = socket.handshake.address;
  if (bannedIPs.has(ip)) {
    return next(new Error("Sei stato bannato"));
  }
  next();
});

// 🔌 Connessione
io.on("connection", (socket) => {
  const ip = socket.handshake.address;
  const isAdmin = socket.handshake.query?.admin === "1";

  connectedUsers[socket.id] = { ip, socket, isAdmin };

  console.log(isAdmin ? `🛡️ Admin connesso: ${socket.id}` : `✅ Utente connesso: ${socket.id} (${ip})`);

  if (isAdmin) {
    updateAdminUsers();
    return;
  }

  updateAdminUsers();

  socket.on("start_chat", () => {
    if (waitingUser && waitingUser.connected) {
      const roomId = `${socket.id}#${waitingUser.id}`;
      socket.join(roomId);
      waitingUser.join(roomId);

      socket.roomId = roomId;
      waitingUser.roomId = roomId;

      socket.partner = waitingUser;
      waitingUser.partner = socket;

      socket.emit("match");
      waitingUser.emit("match");

      waitingUser = null;
    } else {
      waitingUser = socket;
      socket.emit("waiting");
    }
  });

  socket.on("message", (msg) => {
    if (socket.partner) {
      socket.partner.emit("message", msg);
    }
  });

  socket.on("disconnect_chat", () => {
    if (socket.partner) {
      socket.partner.emit("partner_disconnected");
      socket.partner.partner = null;
      socket.partner = null;
    }
    if (waitingUser === socket) {
      waitingUser = null;
    }
  });

  socket.on("ban_ip", (ipToBan) => {
    if (!connectedUsers[socket.id]?.isAdmin) return;

    bannedIPs.add(ipToBan);
    saveBans(); // 🔸 Salva su file

    Object.values(connectedUsers).forEach(({ ip, socket: s }) => {
      if (ip === ipToBan) {
        s.emit("banned");
        s.disconnect();
      }
    });

    updateAdminUsers();
    console.log(`⛔ IP bannato: ${ipToBan}`);
  });

  socket.on("disconnect", () => {
    console.log(`❌ Utente disconnesso: ${socket.id}`);
    if (socket.partner) {
      socket.partner.emit("partner_disconnected");
      socket.partner.partner = null;
    }
    if (waitingUser === socket) {
      waitingUser = null;
    }
    delete connectedUsers[socket.id];
    updateAdminUsers();
  });
});

// 🚀 Avvio
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server avviato sulla porta ${PORT}`);
});
