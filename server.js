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

// Funzione per inviare il conteggio degli utenti online a TUTTI i client
function emitOnlineCount() {
  // Filtra solo gli utenti NON-admin per il conteggio pubblico
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
  
  // AGGIUNTO: Emetti il conteggio online ogni volta che qualcuno si connette
  emitOnlineCount(); 
  updateAdminUI(); // Mantiene l'aggiornamento dell'UI admin

  if (!isAdmin) {
    socket.on("start_chat", () => {
      if (waitingUser && waitingUser.connected) {
        const room = `chat_${socket.id}_${waitingUser.id}`;
        socket.join(room);
        waitingUser.join(room);

        // Mando partnerIp al client per abilitare la segnalazione
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

    socket.on("message", (msg) => {
      // Controlla anche se il partner esiste e non è null prima di emettere
      if (socket.partner && socket.partner.connected) { 
          socket.partner.emit("message", msg);
      } else {
          // Se il partner non esiste o si è disconnesso, notifica l'utente
          socket.emit("partner_disconnected");
          socket.partner = null; // pulisci il riferimento
      }
    });

    socket.on("disconnect_chat", () => {
      // Aggiunto controllo per evitare errori se socket.partner è già null
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

      // AGGIUNTO: Se l'utente segnalato è ancora connesso, disconnettilo
      // Trova il socket del partner segnalato
      const reportedSocket = Object.values(connectedUsers).find(
        (u) => !u.isAdmin && u.ip === partnerIp && u.socket.partner?.id === socket.id
      )?.socket;

      if (reportedSocket) {
        // Disconnetti solo il socket che è stato segnalato
        reportedSocket.emit("banned"); // Puoi usare un evento più specifico come 'reported_disconnected'
        reportedSocket.disconnect(true);
        console.log(`🚨 Utente segnalato disconnesso: ${partnerIp}`);
      }
      // AGGIUNTO: Disconnetti anche il reporter come già facevi sul frontend
      if (socket.partner) { // Disconnetti il partner attuale (che può essere quello segnalato)
        socket.partner.emit("partner_disconnected");
        socket.partner.partner = null;
        socket.partner = null;
      }
      if (waitingUser === socket) waitingUser = null;
      socket.disconnect(true); // Disconnetti il reporter
      console.log(` REPORTER DISCONNECTED ${ip}`)
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
          s.emit("banned"); // Evento per notificare il client che è stato bannato
          s.disconnect(true); // Forza la disconnessione del client bannato
        }
      });

      updateAdminUI();
      // AGGIUNTO: Aggiorna il conteggio online dopo un ban, perché un utente normale potrebbe essere stato disconnesso
      emitOnlineCount(); 
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
    // Prima di eliminare il socket, controlla se era in una chat attiva
    if (connectedUsers[socket.id] && connectedUsers[socket.id].socket.partner) {
      const partnerSocket = connectedUsers[socket.id].socket.partner;
      if (partnerSocket.connected) { // Assicurati che il partner sia ancora connesso
        partnerSocket.emit("partner_disconnected");
        partnerSocket.partner = null; // Rimuovi il riferimento al partner disconnesso
      }
    }

    delete connectedUsers[socket.id];
    if (waitingUser === socket) waitingUser = null;
    updateAdminUI();
    // AGGIUNTO: Emetti il conteggio online ogni volta che qualcuno si disconnette
    emitOnlineCount(); 
  });
});

// Aggiorna UI admin (invia la lista di utenti e bannati agli admin)
function updateAdminUI() {
  const users = Object.values(connectedUsers)
    .filter((u) => !u.isAdmin)
    .map(({ socket, ip }) => ({ socketId: socket.id, ip }));

  const banned = [...bannedIPs];

  Object.values(connectedUsers)
    .filter((u) => u.isAdmin)
    .forEach(({ socket }) => {
      socket.emit("users_list", users); // Questo evento è per l'UI admin
      socket.emit("banned_list", banned); // Questo evento è per l'UI admin
    });
    // L'emissione di online_count a tutti i client avviene tramite emitOnlineCount()
}

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`🚀 Server avviato sulla porta ${PORT}`);
  // AGGIUNTO: Emetti il conteggio iniziale all'avvio del server
  emitOnlineCount(); 
});
