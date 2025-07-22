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

// ─────────────────────────────────────────────
// Configurazione file
// ─────────────────────────────────────────────
const BANNED_IPS_FILE = path.join(__dirname, "banned-ips.json");
const REPORTS_FILE = path.join(__dirname, "reports.json");

let bannedIPs = new Set();
let reports = [];

// Carica IP bannati
if (fs.existsSync(BANNED_IPS_FILE)) {
  try {
    const list = JSON.parse(fs.readFileSync(BANNED_IPS_FILE, "utf8"));
    if (Array.isArray(list)) bannedIPs = new Set(list);
  } catch (e) {
    console.error("Errore lettura banned-ips.json:", e);
  }
}

// Carica report
if (fs.existsSync(REPORTS_FILE)) {
  try {
    const list = JSON.parse(fs.readFileSync(REPORTS_FILE, "utf8"));
    if (Array.isArray(list)) reports = list;
  } catch (e) {
    console.error("Errore lettura reports.json:", e);
  }
}

// Salvataggi su disco
function saveBannedIPs() {
  fs.writeFileSync(BANNED_IPS_FILE, JSON.stringify([...bannedIPs], null, 2));
}

function saveReports() {
  fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2));
}

// ─────────────────────────────────────────────
// Autenticazione admin
// ─────────────────────────────────────────────
app.use(
  "/admin",
  basicAuth({
    users: { admin: "changeme" },
    challenge: true,
  })
);

app.use(
  "/adminreport",
  basicAuth({
    users: { admin: "changeme" },
    challenge: true,
  })
);

// ─────────────────────────────────────────────
// Rotte HTML
// ─────────────────────────────────────────────
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

app.get("/adminreport", (req, res) => {
  res.sendFile(path.join(__dirname, "adminreport.html"));
});

app.get("/reports.json", (req, res) => {
  res.json(reports);
});

// ─────────────────────────────────────────────
// Gestione utenti e socket
// ─────────────────────────────────────────────
function getClientIP(socket) {
  const forwarded = socket.handshake.headers["x-forwarded-for"];
  let ip = forwarded ? forwarded.split(",")[0].trim() : socket.handshake.address;
  if (ip.startsWith("::ffff:")) ip = ip.replace("::ffff:", "");
  return ip;
}

let connectedUsers = {};
let waitingUser = null;

// Middleware: blocca IP bannati
io.use((socket, next) => {
  const ip = getClientIP(socket);
  if (bannedIPs.has(ip)) return next(new Error("BANNED"));
  next();
});

// Connessione utente
io.on("connection", (socket) => {
  const ip = getClientIP(socket);
  const isAdmin = socket.handshake.query?.admin === "1";

  connectedUsers[socket.id] = { socket, ip, isAdmin };

  console.log(`${isAdmin ? "🛡️ Admin" : "✅ Utente"} connesso: ${socket.id} (${ip})`);
  updateAdminUI();

  if (!isAdmin) {
    socket.on("start_chat", () => {
      if (waitingUser && waitingUser.connected) {
        const room = `chat_${socket.id}_${waitingUser.id}`;
        socket.join(room);
        waitingUser.join(room);
        // INVIA IP PARTNER qui
        socket.emit("match", { partnerIp: waitingUser.ip });
        waitingUser.emit("match", { partnerIp: socket.ip });
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

    // Ricevi segnalazione utente
    socket.on("report_user", ({ partnerIp, chatLog }) => {
      if (!partnerIp || !chatLog) return;
      const report = {
        reporterIp: ip,
        reportedIp: partnerIp,
        timestamp: new Date().toISOString(),
        chatLog,
      };
      reports.push(report);
      saveReports();
      console.log(`📣 Segnalazione ricevuta da ${ip} contro ${partnerIp}`);
    });
  }

  // Ban IP
  socket.on("ban_ip", (targetIP) => {
    if (!connectedUsers[socket.id]?.isAdmin) return;

    if (!bannedIPs.has(targetIP)) {
      bannedIPs.add(targetIP);
      saveBannedIPs();
      console.log(`⛔ IP bannato: ${targetIP}`);

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

// Aggiorna UI admin
function updateAdminUI() {
  const users = Object.values(connectedUsers)
    .filter((u) => !u.isAdmin)
    .map(({ socket, ip }) => ({ socketId: socket.id, ip }));

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
