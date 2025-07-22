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

// IP bannati salvati in file JSON
const bannedIPsFile = path.join(__dirname, "banned-ips.json");
let bannedIPs = new Set();

function saveBannedIPs() {
  fs.writeFileSync(bannedIPsFile, JSON.stringify(Array.from(bannedIPs), null, 2));
}

try {
  const data = fs.readFileSync(bannedIPsFile, "utf8");
  bannedIPs = new Set(JSON.parse(data));
  console.log("✅ IP bannati caricati da file.");
} catch (err) {
  console.log("⚠️ Nessun file di ban trovato, ne verrà creato uno nuovo.");
  saveBannedIPs();
}

// Utenti connessi: socketId => { ip, socket, isAdmin }
const connectedUsers = {};

// Invia la lista utenti attivi e bannati agli admin
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
    admin.emit("ban_list", Array.from(bannedIPs));
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

  updateAdminUsers();

  if (isAdmin) return;

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

  // 🔒 Ban IP
  socket.on("ban_ip", (ipToBan) => {
    if (!connectedUsers[socket.id]?.isAdmin) return;

    bannedIPs.add(ipToBan);
    saveBannedIPs();

    Object.values(connectedUsers).forEach(({ ip, socket: s }) => {
      if (ip === ipToBan) {
        s.emit("banned");
        s.disconnect();
      }
    });

    updateAdminUsers();
    console.log(`⛔ IP bannato: ${ipToBan}`);
  });

  // ✅ Unban IP
  socket.on("unban_ip", (ipToUnban) => {
    if (!connectedUsers[socket.id]?.isAdmin) return;

    bannedIPs.delete(ipToUnban);
    saveBannedIPs();

    updateAdminUsers();
    console.log(`🔓 IP sbannato: ${ipToUnban}`);
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
