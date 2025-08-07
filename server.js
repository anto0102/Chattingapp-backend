const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require('uuid');
const cors = require("cors");
const basicAuth = require("express-basic-auth");
const fs = require("fs");
const path = require("path");
const geoip = require('geoip-lite');

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const BANNED_IPS_FILE = path.join(__dirname, "banned-ips.json");
const REPORTS_FILE = path.join(__dirname, "reports.json");
let bannedIPs = new Set();
let reports = [];
if (fs.existsSync(BANNED_IPS_FILE)) { try { const list = JSON.parse(fs.readFileSync(BANNED_IPS_FILE, "utf8")); if (Array.isArray(list)) bannedIPs = new Set(list); } catch (e) { console.error("Errore lettura banned-ips.json:", e); } }
if (fs.existsSync(REPORTS_FILE)) { try { const list = JSON.parse(fs.readFileSync(REPORTS_FILE, "utf8")); if (Array.isArray(list)) reports = list; } catch (e) { console.error("Errore lettura reports.json:", e); } }
function saveBannedIPs() { fs.writeFileSync(BANNED_IPS_FILE, JSON.stringify([...bannedIPs], null, 2)); }
function saveReports() { fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2)); }
app.use("/admin", basicAuth({ users: { admin: "changeme" }, challenge: true }));
app.use("/adminreport", basicAuth({ users: { admin: "changeme" }, challenge: true }));
app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "admin.html")));
app.get("/adminreport", (req, res) => res.sendFile(path.join(__dirname, "adminreport.html")));
app.get("/reports.json", (req, res) => res.json(reports));

function getClientIP(socket) {
  const forwarded = socket.handshake.headers["x-forwarded-for"];
  let ip = forwarded ? forwarded.split(",")[0].trim() : socket.handshake.address;
  if (ip.startsWith("::ffff:")) ip = ip.replace("::ffff:", "");
  return ip;
}

let connectedUsers = {};
let waitingUser = null;
let activeChats = {};

function emitOnlineCount() {
  const currentOnlineUsers = Object.values(connectedUsers).filter(u => !u.isAdmin).length;
  io.emit('online_count', currentOnlineUsers);
  console.log(`Aggiornato conteggio online: ${currentOnlineUsers}`);
}

io.use((socket, next) => {
  const ip = getClientIP(socket);
  if (bannedIPs.has(ip)) return next(new Error("BANNED"));
  next();
});

io.on("connection", (socket) => {
  const ip = getClientIP(socket);
  const isAdmin = socket.handshake.query?.admin === "1";
  
  // Memorizziamo l'oggetto completo del profilo
  connectedUsers[socket.id] = { socket, ip, isAdmin, profile: {} };
  console.log(`${isAdmin ? "🛡️ Admin" : "✅ Utente"} connesso: ${socket.id} (${ip})`);
  emitOnlineCount();
  updateAdminUI();

  if (!isAdmin) {
    socket.on("start_chat", (myProfile) => {
      // Memorizziamo il profilo dell'utente appena connesso
      connectedUsers[socket.id].profile = myProfile;

      if (waitingUser && waitingUser.connected) {
        const room = `chat_${socket.id}_${waitingUser.id}`;
        socket.join(room);
        waitingUser.join(room);

        const user1_ip = getClientIP(socket);
        const user2_ip = getClientIP(waitingUser);
        const user1_geo = geoip.lookup(user1_ip);
        const user2_geo = geoip.lookup(user2_ip);
        const user1_country_code = user1_geo ? user1_geo.country : 'Sconosciuto';
        const user2_country_code = user2_geo ? user2_geo.country : 'Sconosciuto';
        
        // Prepariamo i profili da inviare
        const user1_profile_to_send = connectedUsers[socket.id].profile;
        const user2_profile_to_send = connectedUsers[waitingUser.id].profile;

        // Inviamo a ciascun utente l'avatar e il profilo del partner
        socket.emit("match", { 
          partnerIp: user2_ip, 
          partnerCountry: user2_country_code, 
          partnerAvatar: user2_profile_to_send.avatarUrl,
          partnerProfile: user2_profile_to_send
        });
        waitingUser.emit("match", { 
          partnerIp: user1_ip, 
          partnerCountry: user1_country_code, 
          partnerAvatar: user1_profile_to_send.avatarUrl,
          partnerProfile: user1_profile_to_send
        });

        socket.partner = waitingUser;
        waitingUser.partner = socket;
        activeChats[room] = { messages: [] };
        socket.room = room;
        waitingUser.room = room;
        waitingUser = null;
        console.log(`Match avvenuto tra ${user1_ip} (${user1_country_code}) e ${user2_ip} (${user2_country_code})`);

      } else {
        waitingUser = socket;
        socket.emit("waiting");
      }
    });

    // Gestiamo l'aggiornamento del profilo
    socket.on('update_profile', (newProfile) => {
        if (connectedUsers[socket.id]) {
            connectedUsers[socket.id].profile = newProfile;
            console.log(`Profilo aggiornato per ${socket.id}`);
            // Se l'utente è in una chat, notifichiamo il partner del cambiamento
            if (socket.partner && socket.partner.connected) {
                socket.partner.emit('update_profile_from_partner', newProfile);
            }
        }
    });

    socket.on("message", (msgText) => {
        if (socket.partner && socket.partner.connected) {
            const senderAvatar = connectedUsers[socket.id]?.profile?.avatarUrl;
            const messageObject = { id: uuidv4(), text: msgText, senderId: socket.id, avatarUrl: senderAvatar, timestamp: new Date(), reactions: {} };
            
            if (socket.room && activeChats[socket.room]) {
                activeChats[socket.room].messages.push(messageObject);
            }
            io.to(socket.id).to(socket.partner.id).emit("new_message", messageObject);
            console.log(`Messaggio [${messageObject.id}] da ${socket.id}`);
        } else {
            socket.emit("partner_disconnected");
            socket.partner = null;
        }
    });
    
    socket.on('add_reaction', ({ messageId, emoji }) => {
        const room = socket.room;
        if (!room || !activeChats[room] || !socket.partner) return;
        const message = activeChats[room].messages.find(m => m.id === messageId);
        if (!message) return;
        
        for (const existingEmoji in message.reactions) {
            if (existingEmoji !== emoji && message.reactions[existingEmoji].has(socket.id)) {
                message.reactions[existingEmoji].delete(socket.id);
            }
        }

        if (!message.reactions[emoji]) {
            message.reactions[emoji] = new Set();
        }
        if (message.reactions[emoji].has(socket.id)) {
            message.reactions[emoji].delete(socket.id);
        } else {
            message.reactions[emoji].add(socket.id);
        }
        const reactionsForClient = {};
        for (const key in message.reactions) {
            const count = message.reactions[key].size;
            if (count > 0) {
                reactionsForClient[key] = count;
            }
        }
        io.to(socket.id).to(socket.partner.id).emit('update_reactions', { messageId, reactions: reactionsForClient });
    });

    socket.on("typing", () => { if (socket.partner && socket.partner.connected) { socket.partner.emit("typing"); } });
    socket.on("stop_typing", () => { if (socket.partner && socket.partner.connected) { socket.partner.emit("stop_typing"); } });
    socket.on("disconnect_chat", () => { if(socket.room) { delete activeChats[socket.room]; socket.room = null; } if (socket.partner) { socket.partner.emit("partner_disconnected"); socket.partner.partner = null; socket.partner.room = null; socket.partner = null; } if (waitingUser === socket) waitingUser = null; });
    socket.on("report_user", ({ partnerIp, chatLog }) => { if (!partnerIp || !chatLog) return; const report = { reporterIp: ip, reportedIp: partnerIp, timestamp: new Date().toISOString(), chatLog }; reports.push(report); saveReports(); const reportedSocket = Object.values(connectedUsers).find((u) => !u.isAdmin && u.ip === partnerIp)?.socket; if (reportedSocket) { reportedSocket.emit("banned"); reportedSocket.disconnect(true); } if (socket.partner) { socket.partner.emit("partner_disconnected"); socket.partner.partner = null; socket.partner = null; } if (waitingUser === socket) waitingUser = null; socket.disconnect(true); });
  }

  socket.on("disconnect", () => {
    const user = connectedUsers[socket.id];
    if (user && user.socket.room) delete activeChats[user.socket.room];
    if (user && user.socket.partner) {
      const partnerSocket = user.socket.partner;
      if (partnerSocket.connected) { partnerSocket.emit("partner_disconnected"); partnerSocket.partner = null; partnerSocket.room = null; }
    }
    delete connectedUsers[socket.id];
    if (waitingUser === socket) waitingUser = null;
    updateAdminUI();
    emitOnlineCount();
  });
});

function updateAdminUI() { const users = Object.values(connectedUsers).filter((u) => !u.isAdmin).map(({ socket, ip }) => ({ socketId: socket.id, ip })); const banned = [...bannedIPs]; Object.values(connectedUsers).filter((u) => u.isAdmin).forEach(({ socket }) => { socket.emit("users_list", users); socket.emit("banned_list", banned); }); }
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => { console.log(`🚀 Server avviato sulla porta ${PORT}`); emitOnlineCount(); });
