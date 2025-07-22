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

// Variabile globale per il matchmaking
let waitingUser = null;

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "changeme"; // Cambia la password prima di mettere online

// Basic auth per pagina admin
app.use(
  "/admin",
  basicAuth({
    users: { [ADMIN_USERNAME]: ADMIN_PASSWORD },
    challenge: true,
    unauthorizedResponse: () => "Accesso negato",
  })
);

// Serve pagina admin statica
app.get("/admin", (req, res) => {
  res.sendFile(__dirname + "/admin.html");
});

// --- Gestione IP bannati persistenti ---

const BANNED_IPS_FILE = path.join(__dirname, "banned-ips.json");

// Carica IP bannati da file o crea file vuoto se non esiste
let bannedIPs = new Set();
try {
  if (fs.existsSync(BANNED_IPS_FILE)) {
    const data = fs.readFileSync(BANNED_IPS_FILE, "utf-8");
    const ips = JSON.parse(data);
    if (Array.isArray(ips)) {
      bannedIPs = new Set(ips);
    }
  } else {
    // Crea file vuoto
    fs.writeFileSync(BANNED_IPS_FILE, JSON.stringify([]));
  }
} catch (err) {
  console.error("Errore caricando banned-ips.json:", err);
  bannedIPs = new Set();
}

// Funzione per salvare bannedIPs su file
function saveBannedIPs() {
  fs.writeFile(BANNED_IPS_FILE, JSON.stringify(Array.from(bannedIPs), null, 2), (err) => {
    if (err) console.error("Errore salvando banned-ips.json:", err);
  });
}

// Utenti connessi: socketId => { ip, socket, isAdmin }
const connectedUsers = {};

// Invia la lista utenti attivi agli admin
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

  adminSockets.forEach((admin) => {
    admin.emit("users_list", usersList);
    admin.emit("banned_list", Array.from(bannedIPs));
  });
}

// Blocca gli IP bannati
io.use((socket, next) => {
  const ip = socket.handshake.address;
  if (bannedIPs.has(ip)) {
    return next(new Error("Sei stato bannato"));
  }
  next();
});

// Connessione socket
io.on("connection", (socket) => {
  const ip = socket.handshake.address;
  const isAdmin = socket.handshake.query && socket.handshake.query.admin === "1";

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
    saveBannedIPs();

    // Disconnetti gli utenti bannati
    Object.values(connectedUsers).forEach(({ ip, socket: s }) => {
      if (ip === ipToBan) {
        s.emit("banned");
        s.disconnect();
      }
    });

    updateAdminUsers();
    console.log(`⛔ IP bannato: ${ipToBan}`);
  });

  socket.on("unban_ip", (ipToUnban) => {
    if (!connectedUsers[socket.id]?.isAdmin) return;

    if (bannedIPs.has(ipToUnban)) {
      bannedIPs.delete(ipToUnban);
      saveBannedIPs();
      updateAdminUsers();
      console.log(`✅ IP sbannato: ${ipToUnban}`);
    }
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server avviato sulla porta ${PORT}`);
});
