const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require('uuid'); // MODIFICA: Importiamo la libreria per gli ID
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

// Funzione per inviare il conteggio degli utenti online a TUTTI i client
function emitOnlineCount() {
  const currentOnlineUsers = Object.values(connectedUsers).filter(u => !u.isAdmin).length;
  io.emit('online_count', currentOnlineUsers);
  console.log(`Aggiornato conteggio online: ${currentOnlineUsers}`);
}

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
  
  emitOnlineCount();
  updateAdminUI();

  if (!isAdmin) {
    socket.on("start_chat", () => {
      if (waitingUser && waitingUser.connected) {
        const room = `chat_${socket.id}_${waitingUser.id}`;
        socket.join(room);
        waitingUser.join(room);

        // Modifica: Invia l'IP del partner
        socket.emit("match", { partnerIp: getClientIP(waitingUser) });
        waitingUser.emit("match", { partnerIp: getClientIP(socket) });

        socket.partner = waitingUser;
        waitingUser.partner = socket;
        waitingUser = null;
      } else {
        waitingUser = socket;
        socket.emit("waiting");
      }
    });

    // MODIFICA: L'evento 'message' ora crea un oggetto con ID
    socket.on("message", (msgText) => {
      if (socket.partner && socket.partner.connected) {
        // 1. Crea un oggetto-messaggio con un ID unico
        const messageObject = {
          id: uuidv4(),
          text: msgText,
          senderId: socket.id,
          timestamp: new Date(),
          reactions: {}
        };

        // 2. Invia l'oggetto-messaggio a ENTRAMBI gli utenti nella chat
        io.to(socket.id).to(socket.partner.id).emit("new_message", messageObject);
        
        console.log(`Messaggio [${messageObject.id}] da ${socket.id} al partner ${socket.partner.id}`);

      } else {
        socket.emit("partner_disconnected");
        socket.partner = null;
      }
    });

    socket.on("react", (data) => {
      if (socket.partner && socket.partner.connected) {
        socket.partner.emit("reaction", data);
      }
    });
    
    // ⬇️ MODIFICA: Nuovi gestori per gli eventi di scrittura
    socket.on("typing", () => {
      if (socket.partner && socket.partner.connected) {
        socket.partner.emit("typing");
      }
    });

    socket.on("stop_typing", () => {
      if (socket.partner && socket.partner.connected) {
        socket.partner.emit("stop_typing");
      }
    });
    // ⬆️ FINE MODIFICA

    socket.on("disconnect_chat", () => {
      if (socket.partner) {
        socket.partner.emit("partner_disconnected");
        socket.partner.partner = null;
        socket.partner = null;
      }
      if (waitingUser === socket) waitingUser = null;
    });

    // Modifica: Riceve l'IP per la segnalazione
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

      // Cerca e disconnette l'utente segnalato tramite IP
      const reportedSocket = Object.values(connectedUsers).find(
        (u) => !u.isAdmin && u.ip === partnerIp
      )?.socket;

      if (reportedSocket) {
        reportedSocket.emit("banned");
        reportedSocket.disconnect(true);
        console.log(`🚨 Utente segnalato disconnesso: ${partnerIp}`);
      }

      // Disconnette il reporter
      if (socket.partner) {
        socket.partner.emit("partner_disconnected");
        socket.partner.partner = null;
        socket.partner = null;
      }
      if (waitingUser === socket) waitingUser = null;
      socket.disconnect(true);
      console.log(` REPORTER DISCONNECTED ${ip}`)
    });
  }

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
      emitOnlineCount();
    }
  });

  socket.on("unban_ip", (ipToUnban) => {
    if (!
