/* --- VARABILI CSS (CUSTOM PROPERTIES) --- */
:root {
    /* Tema scuro (default) */
    --background-color: #1a1a1a;
    --card-background-color: #2c2c2c;
    --text-color: #e0e0e0;
    --primary-color: #6c63ff;
    --secondary-color: #3e3e3e;
    --success-color: #4CAF50;
    --danger-color: #f44336;
    --warning-color: #ff9800;
    --border-color: #3e3e3e;
    --shadow-color: rgba(0, 0, 0, 0.5);
    --placeholder-color: #a0a0a0;
    --online-dot-color: #4CAF50;
    --circle-color-1: rgba(108, 99, 255, 0.2);
    --circle-color-2: rgba(255, 152, 0, 0.2);
    --circle-color-3: rgba(244, 67, 54, 0.2);
}

/* Tema chiaro */
body.light-mode {
    --background-color: #f0f2f5;
    --card-background-color: #ffffff;
    --text-color: #333333;
    --primary-color: #5d53d6;
    --secondary-color: #e0e0e0;
    --success-color: #4CAF50;
    --danger-color: #f44336;
    --warning-color: #ff9800;
    --border-color: #cccccc;
    --shadow-color: rgba(0, 0, 0, 0.1);
    --placeholder-color: #666666;
    --online-dot-color: #4CAF50;
    --circle-color-1: rgba(108, 99, 255, 0.1);
    --circle-color-2: rgba(255, 152, 0, 0.1);
    --circle-color-3: rgba(244, 67, 54, 0.1);
}

/* --- STILI GLOBALI E RESETS --- */
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: 'Poppins', sans-serif;
    background-color: var(--background-color);
    color: var(--text-color);
    line-height: 1.6;
    transition: background-color 0.3s ease, color 0.3s ease;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

h1, h2, h3 {
    color: var(--text-color);
    font-weight: 600;
}

h1 { font-size: 2rem; }
h2 { font-size: 1.75rem; }
h3 { font-size: 1.2rem; }

a {
    color: var(--primary-color);
    text-decoration: none;
    transition: color 0.3s ease;
}

a:hover {
    color: var(--primary-color);
    text-decoration: underline;
}

/* --- BACKGROUND ANIMATO --- */
.background-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    z-index: -1;
}

.circle { position: absolute; border-radius: 50%; filter: blur(100px); }
.circle-1 { width: 300px; height: 300px; top: -100px; left: -100px; background-color: var(--circle-color-1); animation: moveCircle1 20s infinite alternate; }
.circle-2 { width: 400px; height: 400px; bottom: -150px; right: -150px; background-color: var(--circle-color-2); animation: moveCircle2 25s infinite alternate; }
.circle-3 { width: 250px; height: 250px; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: var(--circle-color-3); animation: moveCircle3 30s infinite alternate; }
@keyframes moveCircle1 { 0% { transform: translate(0, 0); } 100% { transform: translate(200px, 300px); } }
@keyframes moveCircle2 { 0% { transform: translate(0, 0); } 100% { transform: translate(-200px, -250px); } }
@keyframes moveCircle3 { 0% { transform: scale(1); } 100% { transform: scale(1.2); } }

/* --- HEADER E NAV BAR --- */
.header-main { background: var(--card-background-color); box-shadow: 0 4px 6px var(--shadow-color); position: sticky; top: 0; z-index: 1000; }
.navbar { display: flex; justify-content: space-between; align-items: center; padding: 1rem 2rem; max-width: 1200px; margin: 0 auto; }
.logo { font-weight: 700; font-size: 1.5rem; color: var(--primary-color); text-transform: uppercase; }
.nav-links { display: flex; align-items: center; position: relative; gap: 1.5rem; }
.nav-btn { background: none; border: none; font-family: inherit; font-size: 1rem; color: var(--text-color); padding: 0.5rem 0.5rem; cursor: pointer; transition: color 0.3s ease; position: relative; }
.nav-btn:hover { color: var(--primary-color); }
.nav-btn.active { color: var(--primary-color); }
.active-indicator { position: absolute; bottom: -5px; height: 3px; background-color: var(--primary-color); border-radius: 2px; transition: width 0.3s ease, transform 0.3s ease, opacity 0.3s ease; opacity: 0; }
.theme-toggle { font-size: 1.2rem; }
.theme-toggle .fas { color: var(--text-color); transition: color 0.3s ease; }
.hamburger { display: none; background: none; border: none; cursor: pointer; flex-direction: column; justify-content: space-between; width: 30px; height: 21px; }
.hamburger .bar { height: 3px; width: 100%; background-color: var(--text-color); border-radius: 10px; transition: all 0.3s ease; }

/* --- MAIN CONTAINER --- */
.container { flex-grow: 1; max-width: 1000px;  margin: 2rem auto; padding: 0 1rem; display: flex; flex-direction: column; }
.content-section { background-color: var(--card-background-color); padding: 2rem; border-radius: 10px; box-shadow: 0 4px 15px var(--shadow-color); margin-bottom: 2rem; opacity: 0; transform: translateY(20px); transition: opacity 0.5s ease, transform 0.5s ease; display: none; }
.content-section.active { opacity: 1; transform: translateY(0); display: block; }

/* --- CHAT SECTION --- */
#chat-section .header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
#chat-section .header .chat-title { font-size: 1.5rem; color: var(--primary-color); display: flex; align-items: center; white-space: nowrap; margin-right: 1rem; }
#chat-section .header .chat-title .fas { margin-right: 0.5rem; color: var(--primary-color); }
.header-controls { display: flex; align-items: center; gap: 1rem; margin-left: auto; }
.online-counter { display: flex; align-items: center; font-size: 0.9rem; color: var(--text-color); white-space: nowrap; margin-left: 0; }
.online-dot { height: 10px; width: 10px; background-color: var(--online-dot-color); border-radius: 50%; margin-right: 8px; animation: pulse-online 1.5s infinite cubic-bezier(0.66, 0, 0.34, 1); box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); }
@keyframes pulse-online { 0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); } 70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(76, 175, 80, 0); } 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); } }
.chat-wrapper { display: flex; flex-direction: column; height: 600px; max-width: 900px; width: 100%; margin: 0 auto; border-radius: 10px; overflow: hidden; background-color: var(--secondary-color); position: relative; }
.chat-content { flex-grow: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; }
#chat-messages { display: flex; flex-direction: column; gap: 4px; }
.status-message { text-align: center; color: var(--text-color); opacity: 0.7; font-style: italic; margin: auto; font-size: 1.2em; }

/* --- CORREZIONE: Stili Messaggi, Avatar e Reazioni --- */
.message-wrapper {
    display: flex;
    align-items: flex-end; /* Allinea avatar in basso rispetto al messaggio */
    gap: 10px;
    max-width: 85%;
}

.message-wrapper.you {
    justify-content: flex-end;
    align-self: flex-end;
}

.message-wrapper.other {
    justify-content: flex-start;
    align-self: flex-start;
}

.chat-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 2px solid var(--border-color);
    flex-shrink: 0;
}

/* Ordine per i messaggi 'you' (destra) */
.message-wrapper.you .chat-avatar { order: 2; }
.message-wrapper.you .message-and-button-container { order: 1; }

/* Ordine per i messaggi 'other' (sinistra) */
.message-wrapper.other .chat-avatar { order: 1; }
.message-wrapper.other .message-and-button-container { order: 2; }

.message-and-button-container {
    display: flex;
    flex-direction: column;
    position: relative;
    align-items: flex-start;
}

/* Allineamento del contenuto del fumetto */
.message-wrapper.you .message-and-button-container { align-items: flex-end; }

.message {
    padding: 10px 15px;
    border-radius: 20px;
    max-width: 100%;
    line-height: 1.4;
    word-wrap: break-word;
    animation: fadeIn 0.3s ease-out;
}
.message.you { background-color: var(--primary-color); color: #ffffff; }
.message.other { background-color: var(--card-background-color); color: var(--text-color); }

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

.add-reaction-btn {
    background: var(--secondary-color);
    border: none;
    color: var(--text-color);
    border-radius: 50%;
    width: 24px;
    height: 24px;
    font-size: 16px;
    line-height: 24px;
    text-align: center;
    cursor: pointer;
    flex-shrink: 0;
    opacity: 0; /* Nascosto di default */
    transform: scale(0.8);
    transition: opacity 0.2s ease, transform 0.2s ease;
    position: absolute; /* Posizionamento assoluto per non spostarsi */
    top: 50%;
    transform: translateY(-50%) scale(0.8);
}

/* Posizione per i messaggi 'you' (a sinistra del messaggio) */
.message-wrapper.you .add-reaction-btn {
    left: -35px;
}

/* Posizione per i messaggi 'other' (a destra del messaggio) */
.message-wrapper.other .add-reaction-btn {
    right: -35px;
}

/* Mostra il bottone solo su hover del wrapper del messaggio */
.message-wrapper:hover .add-reaction-btn {
    opacity: 1;
    transform: translateY(-50%) scale(1);
}

/* Su mobile, il bottone è sempre visibile */
@media (max-width: 768px) {
    .add-reaction-btn {
        opacity: 0.7;
    }
}

.reaction-palette {
    position: absolute;
    top: -45px; /* Sposta la palette sopra il contenitore */
    background: var(--card-background-color); padding: 6px 8px; border-radius: 20px;
    box-shadow: 0 4px 12px var(--shadow-color); display: flex; gap: 8px; z-index: 10;
    opacity: 0; visibility: hidden; transform: translateY(5px) scale(0.9);
    transition: all 0.2s ease;
}
.reaction-palette.visible { opacity: 1; visibility: visible; transform: translateY(0) scale(1); }

/* Posiziona la palette correttamente rispetto al contenitore */
.message-wrapper.other .reaction-palette { left: 0; }
.message-wrapper.you .reaction-palette { right: 0; }

.reactions-display {
    display: flex; gap: 4px; padding: 4px 8px 0 8px;
    /* L'allineamento è gestito dal parent: .message-and-button-container */
    align-self: flex-start;
}
.message-wrapper.you .reactions-display {
    align-self: flex-end;
}


.reaction-chip {
    background-color: var(--secondary-color); padding: 2px 8px; border-radius: 10px;
    font-size: 0.8rem; border: 1px solid var(--border-color);
}

/* Stile per i messaggi di sistema */
.system-message { align-self: center; background-color: var(--secondary-color); color: var(--placeholder-color); font-style: normal; font-weight: 500; font-size: 0.85rem; padding: 6px 12px; border-radius: 15px; margin: 10px 0; max-width: fit-content; opacity: 0; transform: translateY(10px); transition: opacity 0.5s ease-out, transform 0.5s ease-out; }
.system-message.visible { opacity: 1; transform: translateY(0); }

/* Stile per notifica cambio avatar (partner) */
.avatar-change-message {
    display: flex;
    align-items: center;
    align-self: center;
    gap: 10px;
    background-color: var(--secondary-color);
    padding: 8px 15px;
    border-radius: 20px;
    margin: 10px 0;
    opacity: 0;
    transform: scale(0.9);
    transition: opacity 0.4s ease, transform 0.4s ease;
}

.avatar-change-message.visible {
    opacity: 1;
    transform: scale(1);
}

.avatar-change-message img {
    width: 35px;
    height: 35px;
    border-radius: 50%;
    border: 2px solid var(--primary-color);
}

.avatar-change-message p {
    margin: 0;
    font-size: 0.9rem;
    color: var(--text-color);
    font-weight: 500;
}

/* NUOVO: Stile per notifica cambio avatar (personale) */
.self-avatar-change-message {
    display: flex;
    align-items: center;
    align-self: center;
    gap: 10px;
    background-color: var(--success-color); /* Colore diverso per distinguerlo */
    padding: 8px 15px;
    border-radius: 20px;
    margin: 10px 0;
    opacity: 0;
    transform: scale(0.9);
    transition: opacity 0.4s ease, transform 0.4s ease;
}

.self-avatar-change-message.visible {
    opacity: 1;
    transform: scale(1);
}

.self-avatar-change-message img {
    width: 35px;
    height: 35px;
    border-radius: 50%;
    border: 2px solid #ffffff;
}

.self-avatar-change-message p {
    margin: 0;
    font-size: 0.9rem;
    color: #ffffff; /* Testo bianco per contrasto */
    font-weight: 600;
}


/* --- STILE INDICATORE "STA SCRIVENDO" --- */
.typing-indicator {
    background-color: var(--card-background-color);
    color: var(--text-color);
    padding: 10px 15px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    max-width: fit-content;
}
.typing-dots { display: flex; align-items: center; gap: 6px; }
.typing-dot { width: 8px; height: 8px; background-color: var(--placeholder-color); border-radius: 50%; animation: morph-and-move 1.6s infinite ease-in-out; }
.typing-dot:nth-child(2) { animation-delay: 0.25s; }
.typing-dot:nth-child(3) { animation-delay: 0.5s; }
@keyframes morph-and-move { 0% { transform: translateY(0) scale(1); } 25% { transform: translateY(-8px) scale(0.9); } 50% { transform: translateY(0) scale(1.1); } 100% { transform: translateY(0) scale(1); } }

.input-area { display: flex; align-items: center; padding: 1rem; background-color: var(--card-background-color); border-top: 1px solid var(--border-color); }
.input-area.hidden { display: none; }
#input { flex-grow: 1; padding: 0.75rem 1rem; border-radius: 25px; border: 1px solid var(--border-color); background-color: var(--secondary-color); color: var(--text-color); outline: none; transition: border-color 0.3s ease, box-shadow 0.3s ease; }
#input::placeholder { color: var(--placeholder-color); }
#input:focus { border-color: var(--primary-color); box-shadow: 0 0 0 2px rgba(108, 99, 255, 0.5); }
.send-btn { background-color: var(--primary-color); color: #ffffff; border: none; border-radius: 50%; width: 45px; height: 45px; margin-left: 10px; cursor: pointer; font-size: 1.2rem; transition: background-color 0.3s ease, transform 0.2s ease, opacity 0.3s ease; }
.send-btn:disabled { background-color: var(--border-color); cursor: not-allowed; opacity: 0.6; }
.send-btn:not(:disabled):hover { transform: scale(1.05); }
.send-btn.active-animation { animation: sendBtnPulse 2s infinite ease-in-out; }
@keyframes sendBtnPulse { 0% { transform: scale(1); } 50% { transform: scale(1.03); } 100% { transform: scale(1); } }
.controls-area { display: flex; justify-content: center; gap: 1rem; margin-top: 1rem; }
.control-btn { padding: 0.75rem 1.5rem; border-radius: 25px; border: none; font-size: 1rem; font-weight: 600; cursor: pointer; transition: background-color 0.3s ease, transform 0.2s ease; }
.control-btn.primary { background-color: var(--primary-color); color: #ffffff; }
.control-btn.danger { background-color: var(--danger-color); color: #ffffff; }
.control-btn.warning { background-color: var(--warning-color); color: #ffffff; }
.control-btn:disabled { background-color: var(--border-color); cursor: not-allowed; opacity: 0.6; }

/* --- SEZIONI ABOUT, FAQ, CONTACT --- */
.about-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-top: 2rem; }
.about-card { background-color: var(--secondary-color); padding: 2rem; border-radius: 10px; text-align: center; box-shadow: 0 2px 10px var(--shadow-color); transition: transform 0.3s ease; }
.about-card:hover { transform: translateY(-5px); }
.about-card .icon { font-size: 3rem; color: var(--primary-color); margin-bottom: 1rem; }
.about-card h3 { margin-bottom: 0.5rem; }
.intro-text { font-size: 1.1rem; line-height: 1.8; }
.faq-container { margin-top: 1.5rem; }
.faq-item { background-color: var(--secondary-color); padding: 1.5rem; border-radius: 10px; margin-bottom: 1rem; cursor: pointer; overflow: hidden; transition: background-color 0.3s ease, box-shadow 0.3s ease; }
.faq-item:hover { box-shadow: 0 4px 10px var(--shadow-color); }
.faq-header { display: flex; justify-content: space-between; align-items: center; }
.faq-header h3 { margin: 0; font-weight: 600; }
.faq-header .fas { transition: transform 0.3s ease; color: var(--text-color); }
.faq-item.active .faq-header .fas { transform: rotate(180deg); }
.faq-body { max-height: 0; opacity: 0; transition: max-height 0.5s ease, opacity 0.5s ease; padding-top: 0; }
.faq-item.active .faq-body { max-height: 200px; opacity: 1; padding-top: 1rem; }
.faq-body p { margin-top: 1rem; line-height: 1.6; }
.contact-details-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin: 2rem 0; }
.contact-card { background-color: var(--secondary-color); padding: 2rem; border-radius: 10px; text-align: center; box-shadow: 0 2px 10px var(--shadow-color); }
.contact-card .icon { font-size: 2.5rem; color: var(--primary-color); margin-bottom: 0.5rem; }
.contact-card h3 { margin-bottom: 0.5rem; }
.contact-card a { font-weight: 600; word-break: break-all; }
.contact-form { display: flex; flex-direction: column; gap: 1rem; }
.form-group { display: flex; flex-direction: column; }
.form-group label { margin-bottom: 0.5rem; font-weight: 600; }
.form-group input, .form-group textarea { padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid var(--border-color); background-color: var(--card-background-color); color: var(--text-color); font-family: inherit; font-size: 1rem; transition: border-color 0.3s ease; }
.form-group input:focus, .form-group textarea:focus { outline: none; border-color: var(--primary-color); }

/* --- MEDIA QUERIES --- */
@media (max-width: 768px) {
    .navbar { flex-wrap: wrap; }
    .nav-links { display: none; flex-direction: column; width: 100%; text-align: center; background-color: var(--card-background-color); box-shadow: 0 4px 6px var(--shadow-color); position: absolute; top: 60px; left: 0; z-index: 999; padding: 1rem 0; transition: all 0.3s ease; }
    .nav-links.open { display: flex; animation: fadeInDown 0.5s; }
    .nav-btn { width: 100%; padding: 1rem; border-bottom: 1px solid var(--border-color); }
    .nav-btn:last-child { border-bottom: none; }
    .active-indicator { display: none; }
    .hamburger { display: flex; }
    .hamburger.open .bar:nth-child(1) { transform: rotate(-45deg) translate(-5px, 6px); }
    .hamburger.open .bar:nth-child(2) { opacity: 0; }
    .hamburger.open .bar:nth-child(3) { transform: rotate(45deg) translate(-5px, -6px); }
    .container { padding: 0 0.5rem; }
    .content-section { padding: 1rem; }
    .chat-wrapper { height: 500px; }
    .message-wrapper { max-width: 90%; }
    .controls-area { flex-direction: column; gap: 0.5rem; }
    .control-btn { width: 100%; }
    #chat-section .header { flex-direction: row; align-items: center; justify-content: space-between; gap: 0.5rem; }
    #chat-section .header .chat-title { margin-right: 0; font-size: 1.2rem; }
}
@keyframes fadeInDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }

/* --- STILI EMOJI PICKER --- */
.emoji-btn { background-color: transparent; color: var(--text-color); border: none; border-radius: 50%; width: 45px; height: 45px; margin-right: 5px; cursor: pointer; font-size: 1.5rem; transition: color 0.3s ease, transform 0.2s ease; }
.emoji-btn:hover { color: var(--primary-color); transform: scale(1.1); }
emoji-picker { position: absolute; bottom: 75px; right: 1rem; z-index: 1001; --background: var(--card-background-color); --border-color: var(--border-color); --text-color: var(--text-color); --secondary-text-color: var(--placeholder-color); --button-hover-background: var(--secondary-color); border-radius: 10px; box-shadow: 0 5px 15px var(--shadow-color); }

/* --- STILI PER CHAT A SCHERMO INTERO (SOLO DESKTOP) --- */
@media (min-width: 769px) {
    main.container:has(#chat-section.active) { max-width: 100%; padding: 0; margin: 0; height: calc(100vh - 61px); display: flex; flex-direction: column; }
    main.container:has(#chat-section.active) #chat-section.active { flex-grow: 1; padding: 0; margin: 0; border-radius: 0; display: flex; flex-direction: column; box-shadow: none; min-height: 0; }
    main.container:has(#chat-section.active) #chat-section .header { padding: 1rem 2rem; }
    main.container:has(#chat-section.active) .chat-wrapper { max-width: none; height: auto; flex-grow: 1; min-height: 0; border-radius: 0; background-color: var(--background-color); }
    main.container:has(#chat-section.active) .chat-content { max-width: 900px; width: 100%; margin: 0 auto; }
    main.container:has(#chat-section.active) .input-area { max-width: 900px; width: 100%; margin: 0 auto 1rem auto; border-radius: 10px; box-shadow: 0 4px 15px var(--shadow-color); }
    main.container:has(#chat-section.active) .controls-area { background-color: var(--card-background-color); padding: 1.5rem 2rem; }
}

/* --- STILI PER ANIMAZIONE DI CARICAMENTO --- */
.loading-container { display: flex; flex-direction: column; justify-content: center; align-items: center; position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; transition: opacity 0.5s ease; }
.loading-container.visible { opacity: 1; }
.orb-canvas { position: relative; width: 200px; height: 150px; }
.orb { position: absolute; border-radius: 50%; filter: blur(25px); opacity: 0.8; }
.orb-1 { width: 80px; height: 80px; background-color: var(--primary-color); animation: float-orb-1 12s infinite ease-in-out; }
.orb-2 { width: 60px; height: 60px; background-color: var(--warning-color); animation: float-orb-2 15s infinite ease-in-out; }
.loading-text { margin-top: 1rem; color: var(--placeholder-color); font-style: italic; animation: pulse-text 2s infinite ease-in-out; }
@keyframes pulse-text { 0% { opacity: 0.7; } 50% { opacity: 1; } 100% { opacity: 0.7; } }
@keyframes float-orb-1 { 0% { transform: translate(50px, 50px) scale(1); } 25% { transform: translate(100px, 20px) scale(1.1); } 50% { transform: translate(40px, 80px) scale(0.9); } 75% { transform: translate(10px, 10px) scale(1.1); } 100% { transform: translate(50px, 50px) scale(1); } }
@keyframes float-orb-2 { 0% { transform: translate(100px, 40px) scale(1); } 25% { transform: translate(20px, 80px) scale(0.9); } 50% { transform: translate(80px, 10px) scale(1.1); } 75% { transform: translate(120px, 60px) scale(1); } 100% { transform: translate(100px, 40px) scale(1); } }

/* --- NUOVO: Stili per il selettore di categorie Avatar --- */
.avatar-category-selector {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-color);
}

.category-btn {
    background-color: var(--secondary-color);
    color: var(--text-color);
    border: 1px solid var(--border-color);
    padding: 0.5rem 1rem;
    border-radius: 20px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: background-color 0.3s, color 0.3s, border-color 0.3s;
}

.category-btn:hover {
    background-color: var(--primary-color);
    border-color: var(--primary-color);
    color: #ffffff;
}

.category-btn.active {
    background-color: var(--primary-color);
    border-color: var(--primary-color);
    color: #ffffff;
    font-weight: 600;
}


/* --- STILI PER FUNZIONALITÀ AVATAR --- */
.settings-btn { background: none; border: none; color: var(--text-color); font-size: 1.5rem; cursor: pointer; line-height: 1; transition: color 0.3s ease, transform 0.3s ease; }
.settings-btn:hover { color: var(--primary-color); transform: rotate(45deg); }
.avatar-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.6); backdrop-filter: blur(5px); z-index: 2000; display: flex; justify-content: center; align-items: center; opacity: 0; visibility: hidden; transition: opacity 0.3s ease, visibility 0.3s ease; }
.avatar-modal-overlay:not(.hidden) { opacity: 1; visibility: visible; }
.avatar-modal-content { background: var(--card-background-color); padding: 2rem; border-radius: 15px; box-shadow: 0 8px 32px 0 var(--shadow-color); border: 1px solid var(--border-color); width: 90%; max-width: 600px; text-align: center; transform: scale(0.95); transition: transform 0.3s ease; }
.avatar-modal-overlay:not(.hidden) .avatar-modal-content { transform: scale(1); }
.avatar-modal-content h3 { margin-bottom: 1.5rem; color: var(--primary-color); }
.avatar-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 1rem; justify-items: center; margin-bottom: 2rem; max-height: 300px; overflow-y: auto; padding-right: 10px; }
.avatar-choice { width: 80px; height: 80px; border-radius: 50%; cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease; border: 3px solid transparent; padding: 3px; background-color: var(--secondary-color); }
.avatar-choice:hover { transform: scale(1.1); }
.avatar-choice.selected { border-color: var(--primary-color); box-shadow: 0 0 15px var(--primary-color); }

/* --- NUOVO: Stili per l'avatar nella barra di navigazione --- */
.user-avatar-display {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 2px solid var(--primary-color);
    margin-left: 0.5rem; /* Spazio a sinistra */
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    cursor: pointer;
    flex-shrink: 0;
}

.user-avatar-display:hover {
    transform: scale(1.1);
    box-shadow: 0 0 10px var(--primary-color);
}

@media (max-width: 768px) {
    .user-avatar-display {
        display: none; /* Nasconde l'avatar su mobile */
    }
}
