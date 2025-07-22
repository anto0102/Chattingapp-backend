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

let waitingUser = null;

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "changeme"; // Cambia la password prima di mettere online

app.use(
  "/admin",
  basicAuth({
    users: { [ADMIN_USERNAME]: ADMIN_PASSWORD },
    challenge: true,
    unauthorizedResponse: () => "Accesso negato",
  })
);

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

const BANNED_IPS_FILE = path.join(__dirname, "banned-ips.json");

let bannedIPs = new Set();
try {
  if (fs.existsSync(BANNED_IPS_FILE)) {
    const data = fs.readFileSync(BANNED_IPS_FILE, "utf8");
    const ips = JSON.parse(data);
    if (Array.isArray(ips)) bannedIPs = new Set(ips);
  } else {
    fs.writeFileSync(BANNED_IPS_FILE, JSON.stringify([]));
  }
} catch (e) {
  console.error("Errore caricando banned-ips.json:", e);
  bannedIPs = new Set();
}

// Normalizza IP per evitare mismatch IPv6/IPv4
function normalizeIP(ip) {
  if (!ip) return ip;
  if (ip.startsWith("::ffff:")) {
    return ip.split("::ffff:")[1];
  }
  return ip;
}

function saveBannedIPs() {
  fs.writeFile(BANNED_IPS_FILE, JSON.stringify(Array.from(bannedIPs), null, 2), (err) => {
    if (err) console.error("Errore salvando banned-ips.json:", err);
  });
}

const connectedUsers = {};

function updateAdminUsers() {
  const usersList = Object.values(connectedUsers)
    .filter((u) => !u.isAdmin)
    .map(({ socket, ip }) => ({
      socketId: socket.id,
      ip,
    }));

  const adminSockets = Object.values(connectedUsers)
    .filter((u) => u.isAdmin)
    .map((u) => u.socket);

  adminSockets.forEach((admin) => {
    admin.emit("users_list", usersList);
    admin.emit("banned_list", Array.from(bannedIPs));
  });
}

// Middleware blocco IP bannati
io.use((socket, next) => {
  const ip = normalizeIP(socket.handshake.address);
  if (bannedIPs.has(ip)) {
    return next(new Error("Sei stato bannato"));
  }
  next();
});

io.on("connection", (socket) => {
  const ip = normalizeIP(socket.handshake.address);
  const isAdmin = socket.handshake.query?.admin === "1";

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

  socket.on("ban_ip", (ipToBan) => {
    if (!connectedUsers[socket.id]?.isAdmin) return;

    const normalizedBanIP = normalizeIP(ipToBan);

    if (!bannedIPs.has(normalizedBanIP)) {
      bannedIPs.add(normalizedBanIP);
      saveBannedIPs();

      // Disconnetti utenti bannati
      Object.values(connectedUsers).forEach(({ ip, socket: s }) => {
        if (normalizeIP(ip) === normalizedBanIP) {
          s.emit("banned");
          s.disconnect(true);
        }
      });

      console.log(`⛔ IP bannato: ${normalizedBanIP}`);
      updateAdminUsers();
    }
  });

  socket.on("unban_ip", (ipToUnban) => {
    if (!connectedUsers[socket.id]?.isAdmin) return;

    const normalizedUnbanIP = normalizeIP(ipToUnban);

    if (bannedIPs.has(normalizedUnbanIP)) {
      bannedIPs.delete(normalizedUnbanIP);
      saveBannedIPs();
      console.log(`✅ IP sbannato: ${normalizedUnbanIP}`);
      updateAdminUsers();
    }
  });

  socket.on("disconnect", () => {
    console.log(`❌ Utente disconnesso: ${socket.id}`);
    if (socket.partner) {
      socket.partner.emit("partner_disconnected");
      socket.partner.partner = null;
    }
    if (waitingUser === socket) waitingUser = null;

    delete connectedUsers[socket.id];
    updateAdminUsers();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server avviato sulla porta ${PORT}`);
});
