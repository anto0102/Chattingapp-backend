const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const basicAuth = require('express-basic-auth');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'changeme'; // Cambia la password prima di mettere online

// Middleware Basic Auth per /admin
app.use('/admin', basicAuth({
  users: { [ADMIN_USERNAME]: ADMIN_PASSWORD },
  challenge: true,
  unauthorizedResponse: (req) => 'Accesso negato'
}));

// Pagina admin statica semplice (poi puoi fare frontend dedicato)
app.get('/admin', (req, res) => {
  res.sendFile(__dirname + '/admin.html');
});

// Lista nera IP
const bannedIPs = new Set();

// Utenti connessi { socketId: { ip, socket } }
const connectedUsers = {};

// Funzione per aggiornare admin con lista utenti attivi
function updateAdminUsers() {
  const adminSockets = [];
  for (const [id, data] of Object.entries(connectedUsers)) {
    if (data.isAdmin) adminSockets.push(data.socket);
  }
  const usersList = Object.values(connectedUsers).map(u => ({
    socketId: u.socket.id,
    ip: u.ip,
  }));
  adminSockets.forEach(s => s.emit('users_list', usersList));
}

io.use((socket, next) => {
  const ip = socket.handshake.address;

  // blocca banned
  if (bannedIPs.has(ip)) {
    return next(new Error('Sei stato bannato'));
  }

  next();
});

io.on("connection", (socket) => {
  const ip = socket.handshake.address;
  console.log("✅ Nuovo utente connesso:", socket.id, ip);

  // Rileva se admin (esempio: manda query ?admin=1)
  if (socket.handshake.query && socket.handshake.query.admin === '1') {
    console.log(`Admin connesso: ${socket.id}`);
    connectedUsers[socket.id] = { ip, socket, isAdmin: true };
    // Invia lista utenti all'admin appena connesso
    updateAdminUsers();
    return;
  }

  // Utente normale
  connectedUsers[socket.id] = { ip, socket, isAdmin: false };

  // Aggiorna admin su nuovi utenti
  updateAdminUsers();

  socket.on("start_chat", () => {
    if (waitingUser) {
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
    // Solo admin può bannare
    if (!connectedUsers[socket.id] || !connectedUsers[socket.id].isAdmin) {
      return;
    }

    bannedIPs.add(ipToBan);

    // Disconnetti utenti bannati se connessi
    Object.values(connectedUsers).forEach(({ ip, socket: s }) => {
      if (ip === ipToBan) {
        s.emit('banned');
        s.disconnect();
      }
    });

    updateAdminUsers();
    console.log(`IP bannato: ${ipToBan}`);
  });

  socket.on("disconnect", () => {
    console.log("❌ Utente disconnesso:", socket.id);
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
