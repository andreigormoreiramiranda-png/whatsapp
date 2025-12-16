// ===== WHATSAPP CLONE - SISTEMA EM TEMPO REAL =====

// Configuração do Firebase
// Substitua COM SEUS DADOS REAIS que você me mandou
const firebaseConfig = {
    apiKey: "AIzaSyCRbXOYZqPZ9H2z4mweey0_UlkW9qENqvo",
    authDomain: "zapvendas-b4124.firebaseapp.com",
    projectId: "zapvendas-b4124",
    storageBucket: "zapvendas-b4124.firebasestorage.app",
    messagingSenderId: "582396117606",
    appId: "1:582396117606:web:0e7b0d471f7ac83dbaa3a7",
    databaseURL: "https://zapvendas-b4124-default-rtdb.firebaseio.com/"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

class WhatsAppChat {
    constructor() {
        this.messagesContainer = document.getElementById('messagesContainer');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.chatMessages = document.getElementById('chatMessages');
        this.copyToast = document.getElementById('copyToast');
        this.leadModal = document.getElementById('leadModal');
        this.leadForm = document.getElementById('leadForm');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.quickResponses = document.getElementById('quickResponses');

        this.audioElements = {};
        this.leadData = null;
        this.conversationId = null;
        this.currentPhase = 1;
        this.phase2Started = false;
        this.lastMessageCount = 0;

        // Verificar se já tem conversa salva no localStorage para recuperar ID
        const savedId = localStorage.getItem('whatsapp_conversation_id');
        if (savedId) {
            this.conversationId = savedId;
            this.leadModal.classList.add('hidden');
            this.loadMessages();
        }

        this.init();
    }

    init() {
        // Atualizar foto de perfil e número do header
        this.updateHeader();

        // Event listeners
        this.leadForm.addEventListener('submit', (e) => this.handleLeadSubmit(e));
        this.sendBtn.addEventListener('click', () => this.handleUserMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleUserMessage();
        });
    }

    updateHeader() {
        const phoneNumber = document.getElementById('phoneNumber');
        const profileImg = document.getElementById('profileImg');

        if (phoneNumber) {
            phoneNumber.textContent = MESSAGES_CONFIG.phoneNumber;
        }

        if (profileImg) {
            profileImg.src = MESSAGES_CONFIG.profilePhoto;
        }
    }

    handleLeadSubmit(e) {
        e.preventDefault();

        const name = document.getElementById('leadName').value.trim();

        if (name) {
            // Gerar ID único para esta conversa
            this.conversationId = 'conv_' + Date.now();
            localStorage.setItem('whatsapp_conversation_id', this.conversationId);

            // Salvar dados do lead
            this.leadData = {
                name: name,
                phone: 'Não informado',
                timestamp: new Date().toISOString()
            };

            // Criar conversa no Firebase
            db.ref('conversations/' + this.conversationId).set({
                id: this.conversationId,
                name: this.leadData.name,
                phone: this.leadData.phone,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                lastMessageTime: firebase.database.ServerValue.TIMESTAMP,
                unreadCount: 1
            });

            // Esconder modal
            this.leadModal.classList.add('hidden');

            // Adicionar mensagem inicial do usuário
            this.addUserMessage("Quero saber mais!");
            this.saveMessage('user', 'Quero saber mais!');
            this.saveMessage('system', `${name} iniciou a conversa`, 'system');

            // Iniciar conversa
            setTimeout(() => this.playPhase1(), 1000);

            // Começar a escutar novas mensagens
            this.listenForNewMessages();
        }
    }

    saveMessage(from, text, type = 'text', additionalData = {}) {
        if (!this.conversationId) return;

        const messageData = {
            from: from,
            text: text,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            type: type,
            ...additionalData
        };

        // Salvar mensagem na lista de mensagens
        db.ref('conversations/' + this.conversationId + '/messages').push(messageData);

        // Atualizar metadados da conversa
        db.ref('conversations/' + this.conversationId).update({
            lastMessageTime: firebase.database.ServerValue.TIMESTAMP,
            preview: text
        });

        // Se for mensagem do usuário, incrementar contador de não lidas
        if (from === 'user') {
            db.ref('conversations/' + this.conversationId + '/unreadCount').transaction((current) => {
                return (current || 0) + 1;
            });
        }
    }

    listenForNewMessages() {
        if (!this.conversationId) return;

        // Escutar APENAS mensagens novas (child_added)
        // Para não duplicar, vamos escutar mensagens adicionadas a partir de agora
        // Mas como carregamos o histórico, precisamos ter cuidado.
        // O jeito mais simples aqui é escutar tudo e só exibir se não tiver na tela,
        // mas melhor ainda: escutar child_added

        db.ref('conversations/' + this.conversationId + '/messages')
            .limitToLast(1)
            .on('child_added', (snapshot) => {
                const msg = snapshot.val();
                // Só exibir se for do admin (as do usuário/bot nós mesmos adicionamos na tela)
                // OU se estamos recarregando a página (mas aqui é simplificado)
                if (msg.from === 'admin') {
                    this.displayAdminMessage(msg.text);
                }
            });
    }

    loadMessages() {
        // Carregar estado da fase
        db.ref('conversations/' + this.conversationId + '/phase').once('value', (snapshot) => {
            if (snapshot.val() === 2) {
                this.phase2Started = true;
                // Esconder botões se a fase já começou
                this.quickResponses.style.display = 'none';
            }
        });

        // Carregar histórico
        db.ref('conversations/' + this.conversationId + '/messages')
            .once('value', (snapshot) => {
                const messages = snapshot.val();
                if (messages) {
                    Object.values(messages).forEach(msg => {
                        if (msg.from === 'user') {
                            this.addUserMessage(msg.text, false);
                        } else if (msg.from === 'admin') {
                            this.displayAdminMessage(msg.text, false);
                        } else if (msg.from === 'bot') {
                            // Reconstruir mensagem do bot
                            const reconstructedMsg = {
                                type: msg.type,
                                // Mapear 'text' do firebase de volta para 'content' que o addMessage espera
                                content: msg.text,
                                ...msg // Espalhar outras propriedades (audioKey, pdfIndex, etc)
                            };
                            this.addMessage(reconstructedMsg, false);
                        }
                    });

                    this.scrollToBottom();
                    this.listenForNewMessages();
                }
            });
    }

    displayAdminMessage(text, animate = true) {
        this.hideTyping();

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message received' + (animate ? ' fade-in' : '');

        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${this.formatText(text)}</p>
                <span class="message-time">${this.getCurrentTime()}</span>
            </div>
        `;

        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    // Calcula delay humanizado baseado no tamanho do texto
    getHumanDelay(text) {
        const charDelay = text.length * MESSAGES_CONFIG.delayPerChar;
        const baseDelay = Math.random() * (MESSAGES_CONFIG.maxTypingDelay - MESSAGES_CONFIG.minTypingDelay) + MESSAGES_CONFIG.minTypingDelay;
        return Math.min(baseDelay + charDelay, 6000); // Máximo 6 segundos
    }

    async playPhase1() {
        for (let i = 0; i < MESSAGES_PHASE1.length; i++) {
            const message = MESSAGES_PHASE1[i];

            if (message.type === 'quickResponses') {
                await this.delay(message.delay || 500);
                this.showQuickResponses();
                continue;
            }

            // Mostrar "digitando..."
            this.showTyping();

            // Delay humanizado
            let typingDelay = message.delay || this.getHumanDelay(message.content || '');
            await this.delay(typingDelay);

            // Esconder "digitando..." e exibir mensagem
            this.hideTyping();
            await this.delay(200);

            this.addMessage(message);
            this.scrollToBottom();

            // Se for áudio com autoplay
            if (message.type === 'audio' && message.autoplay) {
                await this.delay(500);
                this.autoplayAudio(message.audioKey);
            }

            // Atualizar contador de mensagens
            this.lastMessageCount++;
        }
    }

    async playPhase2() {
        if (this.phase2Started) return;
        this.phase2Started = true;

        // Salvar estado no Firebase
        if (this.conversationId) {
            db.ref('conversations/' + this.conversationId).update({
                phase: 2
            });
        }

        // Esconder botões de resposta
        this.quickResponses.innerHTML = '';
        this.quickResponses.style.display = 'none';

        for (let i = 0; i < MESSAGES_PHASE2.length; i++) {
            const message = MESSAGES_PHASE2[i];

            this.showTyping();

            let typingDelay = message.delay || this.getHumanDelay(message.content || '');
            await this.delay(typingDelay);

            this.hideTyping();
            await this.delay(200);

            this.addMessage(message);
            this.scrollToBottom();

            if (message.type === 'audio' && message.autoplay) {
                await this.delay(500);
                this.autoplayAudio(message.audioKey);
            }

            this.lastMessageCount++;
        }
    }

    showQuickResponses() {
        this.quickResponses.innerHTML = '';
        this.quickResponses.style.display = 'flex';

        QUICK_RESPONSES.forEach(response => {
            const btn = document.createElement('button');
            btn.className = 'quick-response-btn';
            btn.textContent = response.text;

            btn.addEventListener('click', () => {
                this.handleQuickResponse(response);
            });

            this.quickResponses.appendChild(btn);
        });
    }

    handleQuickResponse(response) {
        // Adicionar mensagem do usuário
        this.addUserMessage(response.text);
        this.saveMessage('user', response.text);

        // Esconder botões
        this.quickResponses.innerHTML = '';
        this.quickResponses.style.display = 'none';

        // Iniciar fase 2
        setTimeout(() => this.playPhase2(), 1000);
    }

    handleUserMessage() {
        const text = this.messageInput.value.trim();
        if (!text) return;

        this.addUserMessage(text);
        this.saveMessage('user', text);
        this.messageInput.value = '';
        this.scrollToBottom();

        // Se fase 2 ainda não começou, qualquer mensagem libera
        if (!this.phase2Started) {
            // Esconder botões
            this.quickResponses.innerHTML = '';
            this.quickResponses.style.display = 'none';

            // Iniciar fase 2
            setTimeout(() => this.playPhase2(), 1000);
        }
    }

    addUserMessage(content, animate = true) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message sent' + (animate ? ' fade-in' : '');

        const time = this.getCurrentTime();

        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${content}</p>
                <span class="message-time">${time}</span>
                <span class="message-status">
                    <svg viewBox="0 0 16 11" width="16" height="11">
                        <path fill="#53bdeb" d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.405-2.272a.463.463 0 0 0-.336-.148.457.457 0 0 0-.336.478c.006.065.026.13.057.19a.504.504 0 0 0 .13.157l2.618 2.471a.534.534 0 0 0 .352.132.482.482 0 0 0 .392-.188L11.05.983a.45.45 0 0 0 .02-.33z"></path>
                        <path fill="#53bdeb" d="M15.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-1.152-1.088a.167.167 0 0 0-.042.108.167.167 0 0 0 .042.109l.986.93a.534.534 0 0 0 .352.132.482.482 0 0 0 .392-.188L15.05.983a.45.45 0 0 0 .02-.33z"></path>
                    </svg>
                </span>
            </div>
        `;

        this.messagesContainer.appendChild(messageDiv);
    }

    addMessage(messageData, saveToDb = true) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message received fade-in';

        const time = this.getCurrentTime();
        let msgText = '';
        let msgType = messageData.type;
        let additionalData = {};

        switch (messageData.type) {
            case 'text':
                msgText = messageData.content;
                messageDiv.innerHTML = `
                    <div class="message-content">
                        <p>${this.formatText(messageData.content)}</p>
                        <span class="message-time">${time}</span>
                    </div>
                `;
                break;

            case 'audio':
                msgText = '🎵 Áudio';
                messageDiv.innerHTML = this.createAudioMessage(messageData, time);
                additionalData = { audioKey: messageData.audioKey };
                break;

            case 'pdf':
                const pdfInfo = PDF_FILES[messageData.pdfIndex];
                msgText = `📄 ${pdfInfo.name}`;
                messageDiv.innerHTML = this.createPdfMessage(messageData, time);
                additionalData = { pdfIndex: messageData.pdfIndex };
                break;

            case 'pix':
                msgText = `💳 PIX: ${MESSAGES_CONFIG.pixCPF}`;
                messageDiv.innerHTML = this.createPixInfoMessage(time);
                break;

            case 'pix-copy':
                const pixVal = messageData.pixType === 'cpf' ? MESSAGES_CONFIG.pixCPF : MESSAGES_CONFIG.pixEmail;
                msgText = pixVal;
                messageDiv.innerHTML = this.createPixCopyMessage(messageData, time);
                additionalData = { pixType: messageData.pixType };
                break;
        }

        this.messagesContainer.appendChild(messageDiv);

        // Salvar mensagem do BOT no Firebase
        if (msgText && saveToDb) {
            this.saveMessage('bot', msgText, msgType, additionalData);
        }

        // Inicializar componentes
        if (messageData.type === 'audio') {
            this.initAudioPlayer(messageDiv, messageData);
        }

        if (messageData.type === 'pix-copy') {
            this.initCopyButtons(messageDiv);
        }

        if (messageData.type === 'pdf') {
            this.initPdfButtons(messageDiv, messageData);
        }
    }

    createAudioMessage(messageData, time) {
        const audioInfo = AUDIO_FILES[messageData.audioKey];
        const waveformBars = WAVEFORM_DATA.map((height, index) =>
            `<span style="height: ${height}%;" data-index="${index}"></span>`
        ).join('');

        return `
            <div class="message-content audio-message" data-audio-key="${messageData.audioKey}">
                <div class="audio-avatar">
                    <img src="${MESSAGES_CONFIG.profilePhoto}" alt="Avatar">
                    <div class="mic-icon">
                        <svg viewBox="0 0 24 24">
                            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                        </svg>
                    </div>
                </div>
                <button class="audio-play-btn" data-playing="false">
                    <svg class="play-icon" viewBox="0 0 24 24" width="28" height="28">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                    <svg class="pause-icon" viewBox="0 0 24 24" width="28" height="28" style="display: none;">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                    </svg>
                </button>
                <div class="audio-controls">
                    <div class="audio-waveform-container">
                        <div class="waveform-bars">
                            ${waveformBars}
                        </div>
                    </div>
                    <div class="audio-duration">${audioInfo.duration}</div>
                </div>
                <span class="message-time">${time}</span>
            </div>
        `;
    }

    createPdfMessage(messageData, time) {
        const pdfInfo = PDF_FILES[messageData.pdfIndex];

        return `
            <div class="message-content pdf-message" data-pdf-index="${messageData.pdfIndex}">
                <div class="pdf-content">
                    <div class="pdf-header">
                        <div class="pdf-icon">
                            <svg viewBox="0 0 24 24">
                                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
                            </svg>
                        </div>
                        <div class="pdf-info">
                            <div class="pdf-name">${pdfInfo.name}</div>
                            <div class="pdf-details">Chrome PDF Document • ${pdfInfo.size}</div>
                        </div>
                    </div>
                    <div class="pdf-buttons">
                        <button class="pdf-btn pdf-open-btn">Abrir</button>
                        <button class="pdf-btn pdf-save-btn">Salvar como...</button>
                    </div>
                </div>
                <span class="message-time">${time}</span>
            </div>
        `;
    }

    createPixInfoMessage(time) {
        return `
            <div class="message-content">
                <p>Chave pix (CPF) : ${MESSAGES_CONFIG.pixCPF}<br>
<br>
Valor: ${MESSAGES_CONFIG.valor}<br>
<br>
* Nome: ${MESSAGES_CONFIG.pixNome} *</p>
                <span class="message-time">${time}</span>
            </div>
        `;
    }

    createPixCopyMessage(messageData, time) {
        const pixValue = messageData.pixType === 'cpf'
            ? MESSAGES_CONFIG.pixCPF
            : MESSAGES_CONFIG.pixEmail;

        return `
            <div class="message-content">
                <div class="pix-key-container">
                    <span class="pix-key-text">${pixValue}</span>
                    <button class="copy-btn" data-copy="${pixValue}">
                        <svg viewBox="0 0 24 24">
                            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                        </svg>
                        Copiar PIX
                    </button>
                </div>
                <span class="message-time">${time}</span>
            </div>
        `;
    }

    initAudioPlayer(messageDiv, messageData) {
        const playBtn = messageDiv.querySelector('.audio-play-btn');
        const playIcon = messageDiv.querySelector('.play-icon');
        const pauseIcon = messageDiv.querySelector('.pause-icon');
        const waveformBars = messageDiv.querySelectorAll('.waveform-bars span');
        const audioKey = messageData.audioKey;

        const audioInfo = AUDIO_FILES[audioKey];
        const audio = new Audio(audioInfo.file);
        this.audioElements[audioKey] = {
            audio: audio,
            waveformBars: waveformBars,
            playIcon: playIcon,
            pauseIcon: pauseIcon,
            isPlaying: false,
            animationInterval: null,
            currentBar: 0
        };

        playBtn.addEventListener('click', () => {
            this.toggleAudio(audioKey);
        });

        audio.addEventListener('ended', () => {
            this.stopAudio(audioKey);
        });
    }

    autoplayAudio(audioKey) {
        const audioData = this.audioElements[audioKey];
        if (audioData) {
            // Pausar todos os outros áudios
            Object.keys(this.audioElements).forEach(key => {
                if (key !== audioKey) {
                    this.pauseAudio(key);
                }
            });

            // Tocar o áudio DE VERDADE
            audioData.audio.play().catch(() => {
                console.log('Autoplay bloqueado pelo navegador');
            });

            // Animar o waveform
            this.startWaveformAnimation(audioKey);
        }
    }

    toggleAudio(audioKey) {
        const audioData = this.audioElements[audioKey];
        if (!audioData) return;

        if (audioData.isPlaying) {
            this.pauseAudio(audioKey);
        } else {
            this.playAudio(audioKey);
        }
    }

    playAudio(audioKey) {
        const audioData = this.audioElements[audioKey];
        if (!audioData) return;

        Object.keys(this.audioElements).forEach(key => {
            if (key !== audioKey) {
                this.pauseAudio(key);
            }
        });

        audioData.isPlaying = true;
        audioData.playIcon.style.display = 'none';
        audioData.pauseIcon.style.display = 'block';

        audioData.audio.play().catch(() => { });

        this.startWaveformAnimation(audioKey);
    }

    pauseAudio(audioKey) {
        const audioData = this.audioElements[audioKey];
        if (!audioData) return;

        audioData.isPlaying = false;
        audioData.playIcon.style.display = 'block';
        audioData.pauseIcon.style.display = 'none';
        audioData.audio.pause();

        if (audioData.animationInterval) {
            clearInterval(audioData.animationInterval);
            audioData.animationInterval = null;
        }
    }

    stopAudio(audioKey) {
        const audioData = this.audioElements[audioKey];
        if (!audioData) return;

        this.pauseAudio(audioKey);
        audioData.currentBar = 0;

        setTimeout(() => {
            audioData.waveformBars.forEach(bar => bar.classList.remove('active'));
        }, 500);
    }

    startWaveformAnimation(audioKey) {
        const audioData = this.audioElements[audioKey];
        if (!audioData || audioData.animationInterval) return;

        audioData.isPlaying = true;
        audioData.playIcon.style.display = 'none';
        audioData.pauseIcon.style.display = 'block';

        audioData.animationInterval = setInterval(() => {
            audioData.waveformBars.forEach(bar => bar.classList.remove('active'));

            for (let i = 0; i <= audioData.currentBar; i++) {
                if (audioData.waveformBars[i]) {
                    audioData.waveformBars[i].classList.add('active');
                }
            }

            audioData.currentBar++;

            if (audioData.currentBar >= audioData.waveformBars.length) {
                this.stopAudio(audioKey);
            }
        }, 1100);
    }

    initCopyButtons(messageDiv) {
        const copyBtn = messageDiv.querySelector('.copy-btn');
        if (!copyBtn) return;

        copyBtn.addEventListener('click', () => {
            const textToCopy = copyBtn.dataset.copy;
            this.copyToClipboard(textToCopy, copyBtn);
        });
    }

    initPdfButtons(messageDiv, messageData) {
        const pdfInfo = PDF_FILES[messageData.pdfIndex];
        const openBtn = messageDiv.querySelector('.pdf-open-btn');
        const saveBtn = messageDiv.querySelector('.pdf-save-btn');

        if (openBtn) {
            openBtn.addEventListener('click', () => {
                window.open(pdfInfo.file, '_blank');
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const link = document.createElement('a');
                link.href = pdfInfo.file;
                link.download = pdfInfo.name;
                link.click();
            });
        }
    }

    async copyToClipboard(text, button) {
        try {
            await navigator.clipboard.writeText(text);

            const originalHTML = button.innerHTML;
            button.innerHTML = `
                <svg viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                Copiado!
            `;
            button.classList.add('copied');

            this.showCopyToast();

            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.classList.remove('copied');
            }, 2000);

        } catch (err) {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);

            this.showCopyToast();
        }
    }

    showCopyToast() {
        this.copyToast.classList.add('show');

        setTimeout(() => {
            this.copyToast.classList.remove('show');
        }, 2500);
    }

    formatText(text) {
        return text
            .replace(/\n/g, '<br>')
            .replace(/\*(.+?)\*/g, '<strong>$1</strong>');
    }

    getCurrentTime() {
        const now = new Date();
        return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    showTyping() {
        this.typingIndicator.classList.add('active');
        this.scrollToBottom();
    }

    hideTyping() {
        this.typingIndicator.classList.remove('active');
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    new WhatsAppChat();
    console.log('📱 WhatsApp Clone com Firebase carregado!');
});

