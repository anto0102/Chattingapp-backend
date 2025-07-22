const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // Cambia con il tuo dominio se vuoi
    methods: ["GET", "POST"]
  }
});

let waitingUser = null;

// 🔢 Funzione per inviare il numero di utenti connessi
function broadcastOnlineCount() {
  io.emit("online_count", io.engine.clientsCount);
}

io.on("connection", (socket) => {
  console.log("✅ Nuovo utente connesso:", socket.id);

  // Invia il numero aggiornato
  broadcastOnlineCount();

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

  socket.on("disconnect", () => {
    console.log("❌ Utente disconnesso:", socket.id);
    if (socket.partner) {
      socket.partner.emit("partner_disconnected");
      socket.partner.partner = null;
    }
    if (waitingUser === socket) {
      waitingUser = null;
    }

    // Aggiorna il numero di utenti online
    broadcastOnlineCount();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server avviato sulla porta ${PORT}`);
});
