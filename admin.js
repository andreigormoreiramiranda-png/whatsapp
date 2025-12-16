// ===== ADMIN PANEL - WHATSAPP CLONE =====

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCRbXOYZqPZ9H2z4mweey0_UlkW9qENqvo",
    authDomain: "zapvendas-b4124.firebaseapp.com",
    projectId: "zapvendas-b4124",
    storageBucket: "zapvendas-b4124.firebasestorage.app",
    messagingSenderId: "582396117606",
    appId: "1:582396117606:web:0e7b0d471f7ac83dbaa3a7"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

class AdminPanel {
    constructor() {
        this.conversationsList = document.getElementById('conversationsList');
        this.chatContainer = document.getElementById('chatContainer');
        this.noChat = document.getElementById('noChat');
        this.adminMessages = document.getElementById('adminMessages');
        this.adminInput = document.getElementById('adminInput');
        this.adminSendBtn = document.getElementById('adminSendBtn');
        this.chatName = document.getElementById('chatName');
        this.chatPhone = document.getElementById('chatPhone');
        this.chatAvatar = document.getElementById('chatAvatar');

        this.currentConversationId = null;
        this.conversations = {};

        this.init();
    }

    init() {
        // Carregar conversas em tempo real
        this.listenForConversations();

        // Event listeners
        this.adminSendBtn.addEventListener('click', () => this.sendMessage());
        this.adminInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // Quick replies
        document.querySelectorAll('.quick-reply-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.adminInput.value = btn.dataset.msg;
                this.sendMessage();
            });
        });
    }

    listenForConversations() {
        // Escutar todas as conversas em tempo real
        db.ref('conversations').on('value', (snapshot) => {
            if (snapshot.exists()) {
                this.conversations = snapshot.val();
                this.renderConversationsList();
                this.updateStats();

                // Se tiver uma conversa aberta, verifica se tem novas mensagens para atualizar a view
                if (this.currentConversationId) {
                    // Recarregar mensagens pode ser pesado se for tudo de novo
                    // O ideal seria escutar mensagens individualmente, mas para simplificar:
                    this.renderMessages(this.currentConversationId);
                }
            } else {
                this.conversations = {};
                this.renderConversationsList();
                this.updateStats();
            }
        });
    }

    renderConversationsList() {
        const ids = Object.keys(this.conversations).sort((a, b) => {
            const aTime = this.conversations[a].lastMessageTime || 0;
            const bTime = this.conversations[b].lastMessageTime || 0;
            return bTime - aTime;
        });

        this.conversationsList.innerHTML = '';

        ids.forEach(id => {
            const conv = this.conversations[id];

            // Pegar a última mensagem do objeto de mensagens (que agora é um objeto no Firebase)
            let lastMsgText = 'Nova conversa';
            let lastMsgTime = conv.createdAt;

            if (conv.messages) {
                const msgs = Object.values(conv.messages);
                if (msgs.length > 0) {
                    const lastMsg = msgs[msgs.length - 1];
                    lastMsgText = lastMsg.text;
                    lastMsgTime = lastMsg.timestamp;
                }
            } else if (conv.preview) {
                lastMsgText = conv.preview;
                lastMsgTime = conv.lastMessageTime;
            }

            const unread = conv.unreadCount || 0;

            const item = document.createElement('div');
            item.className = `conversation-item ${this.currentConversationId === id ? 'active' : ''}`;
            item.innerHTML = `
                <div class="conversation-avatar">${conv.name.charAt(0).toUpperCase()}</div>
                <div class="conversation-info">
                    <div class="conversation-name">${conv.name}</div>
                    <div class="conversation-preview">${lastMsgText.substring(0, 40) + (lastMsgText.length > 40 ? '...' : '')}</div>
                </div>
                <div class="conversation-meta">
                    <div class="conversation-time">${this.formatTime(lastMsgTime)}</div>
                    ${unread > 0 ? `<span class="unread-count">${unread}</span>` : ''}
                </div>
            `;

            item.addEventListener('click', () => this.selectConversation(id));
            this.conversationsList.appendChild(item);
        });

        document.getElementById('totalLeads').textContent = ids.length > 1 ? `${ids.length} leads` : `${ids.length} lead`;
    }

    selectConversation(id) {
        this.currentConversationId = id;
        const conv = this.conversations[id];

        // Marcar como lido no Firebase
        db.ref('conversations/' + id).update({
            unreadCount: 0
        });

        // Update header
        this.chatName.textContent = conv.name;
        this.chatPhone.textContent = conv.phone;
        this.chatAvatar.textContent = conv.name.charAt(0).toUpperCase();

        // Show chat
        this.noChat.style.display = 'none';
        this.chatContainer.style.display = 'flex';

        // Render messages
        this.renderMessages(id);

        // Atualizar visual da lista para refletir seleção
        const items = this.conversationsList.querySelectorAll('.conversation-item');
        items.forEach((item, index) => {
            if (Object.keys(this.conversations)[index] === id) { // Lógica aproximada, melhor seria id nos elementos
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    renderMessages(id) {
        const conv = this.conversations[id];
        if (!conv || !conv.messages) {
            this.adminMessages.innerHTML = '';
            return;
        }

        this.adminMessages.innerHTML = '';
        const msgs = Object.values(conv.messages);

        msgs.forEach(msg => {
            const div = document.createElement('div');
            div.className = `admin-message ${msg.from === 'user' ? 'received' : 'sent'}`;

            if (msg.type === 'system') {
                div.className = 'admin-message system';
                div.textContent = msg.text;
            } else {
                div.innerHTML = `
                    <div class="text">${this.formatText(msg.text)}</div>
                    <div class="time">${this.formatTime(msg.timestamp)}</div>
                `;
            }

            this.adminMessages.appendChild(div);
        });

        // Scroll to bottom
        this.adminMessages.scrollTop = this.adminMessages.scrollHeight;
    }

    sendMessage() {
        const text = this.adminInput.value.trim();
        if (!text || !this.currentConversationId) return;

        const messageData = {
            from: 'admin',
            text: text,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            type: 'text'
        };

        // Salvar mensagem no Firebase
        db.ref('conversations/' + this.currentConversationId + '/messages').push(messageData);

        // Atualizar metadados da conversa
        db.ref('conversations/' + this.currentConversationId).update({
            lastMessageTime: firebase.database.ServerValue.TIMESTAMP,
            preview: text // Atualiza o preview da conversa
        });

        this.adminInput.value = '';
        // renderMessages será chamado automaticamente pelo listenForConversations quando o firebase atualizar
    }

    formatText(text) {
        return text
            .replace(/\n/g, '<br>')
            .replace(/\*(.+?)\*/g, '<strong>$1</strong>');
    }

    formatTime(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    updateStats() {
        const today = new Date().toDateString();
        let activeCount = 0;
        let todayCount = 0;
        let totalCount = Object.keys(this.conversations).length;

        Object.values(this.conversations).forEach(conv => {
            // Ativo nos últimos 5 minutos
            if (conv.lastMessageTime && Date.now() - conv.lastMessageTime < 5 * 60 * 1000) {
                activeCount++;
            }

            // Criado hoje
            if (conv.createdAt && new Date(conv.createdAt).toDateString() === today) {
                todayCount++;
            }
        });

        document.getElementById('statActive').textContent = activeCount;
        document.getElementById('statToday').textContent = todayCount;
        document.getElementById('statTotal').textContent = totalCount;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new AdminPanel();
    console.log('🎛️ Admin Panel com Firebase carregado!');
});
