const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

// Setup Socket.IO con CORS
const io = new Server(server, {
  cors: {
    origin: "*", // oppure specifica l'URL del tuo frontend
    methods: ["GET", "POST"]
  }
});

let waitingUser = null;

io.on("connection", (socket) => {
  console.log("✅ Nuovo utente connesso:", socket.id);

  if (waitingUser) {
    // Crea coppia e notifiche
    const roomId = socket.id + "#" + waitingUser.id;
    socket.join(roomId);
    waitingUser.join(roomId);

    socket.roomId = roomId;
    waitingUser.roomId = roomId;

    socket.partner = waitingUser;
    waitingUser.partner = socket;

    waitingUser.emit("partner-found");
    socket.emit("partner-found");

    waitingUser = null;
  } else {
    waitingUser = socket;
    socket.emit("waiting");
  }

  // Ricezione messaggi
  socket.on("message", (msg) => {
    if (socket.partner) {
      socket.partner.emit("message", msg);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ Utente disconnesso:", socket.id);
    if (socket.partner) {
      socket.partner.emit("partner-disconnected");
      socket.partner.partner = null;
    }
    if (waitingUser === socket) {
      waitingUser = null;
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server avviato sulla porta ${PORT}`);
});
