// ===== CONFIGURAÇÃO DE MENSAGENS =====
// Edite este arquivo para personalizar as mensagens da sua oferta

const MESSAGES_CONFIG = {
    // Foto de perfil do "vendedor"
    profilePhoto: "https://randomuser.me/api/portraits/women/44.jpg",

    // Número exibido no header
    phoneNumber: "+55 31 3157-6715",

    // Delay mínimo e máximo entre mensagens (mais humano)
    minTypingDelay: 1500,  // 1.5 segundos mínimo
    maxTypingDelay: 4000,  // 4 segundos máximo

    // Delay por caractere (simula velocidade de digitação)
    delayPerChar: 50,  // 50ms por caractere

    // Chaves PIX para copiar
    pixCNPJ: "146.624.329-52",

    // Nome do titular PIX
    pixNome: "Andre Igor Moreira Miranda (PIX do meu Marido)",

    // Valor
    valor: "10,00"
};

// ===== ARQUIVOS PDF =====
// Nomes exatos dos arquivos na pasta pdfs/

const PDF_FILES = [
    {
        name: "Frente e verso para o potinho.pdf",
        size: "1,4 MB",
        file: "pdfs/Frente e verso para o potinho.pdf"
    },
    {
        name: "365 Versiculos Biblicos.pdf",
        size: "2,7 MB",
        file: "pdfs/365 Versiculos Biblicos.pdf"
    },
    {
        name: "VERSICULOS COLORIDOS.pdf",
        size: "3,4 MB",
        file: "pdfs/VERSICULOS COLORIDOS.pdf"
    },
    {
        name: "Caixinha-de-Promessas.pdf",
        size: "135 KB",
        file: "pdfs/Caixinha-de-Promessas.pdf"
    }
];

// ===== ARQUIVOS DE ÁUDIO =====
// Nomes exatos dos arquivos na pasta audios/

const AUDIO_FILES = {
    audio1: {
        file: "audios/audio1.mp3",
        duration: "0:58"
    },
    audio2: {
        file: "audios/audio2.mp3",
        duration: "0:39"
    }
};

// ===== OPÇÕES DE RESPOSTA RÁPIDA =====
// Botões que aparecem para o cliente clicar

const QUICK_RESPONSES = [
    {
        text: "✅ Sim, pode enviar!",
        triggersNextPhase: true
    }
];

// ===== SEQUÊNCIA DE MENSAGENS - FASE 1 =====
// Mensagens iniciais antes do cliente confirmar

const MESSAGES_PHASE1 = [
    {
        type: "text",
        content: "Oieeee, tudo joia? Vou te enviar tudo agora... 🤩🤩🤩",
        delay: 1500
    },
    {
        type: "text",
        content: `🙏Você está prestes a transformar a sua rotina espiritual com o nosso "365 Versículos para o Dia a Dia"! 🌟🙏

Imagine começar cada manhã do ano recebendo uma palavra de Deus, feita para fortalecer sua fé e renovar sua esperança. É como ter um presente divino diário, preparado especialmente para você. 💖

Este material inclui:

✅365 versículos bíblicos (um para cada dia do ano)
✅Mensagens curtas e inspiradoras, fáceis de ler e compartilhar
✅Formato digital para acessar direto no seu celular 📲
✅Acesso imediato, sem complicação
✅Pagamento simbólico de apenas R$10

Um ano inteiro de fé, esperança e inspiração na palma da sua mão.`,
        delay: 3500
    },
    {
        type: "audio",
        audioKey: "audio1",
        autoplay: true,
        delay: 4000
    },
    {
        type: "text",
        content: `👉 Vou te enviar agora, e DEPOIS que receber, você faz uma contribuição simbólica de R$10, combinado?

Confio no meu conteúdo e na sua honestidade
Você recebe primeiro, paga depois. Justo, né?`,
        delay: 2500
    },
    {
        type: "text",
        content: "Posso enviar?",
        delay: 1800
    },
    {
        type: "quickResponses",
        delay: 500
    }
];

// ===== SEQUÊNCIA DE MENSAGENS - FASE 2 =====
// Mensagens após o cliente confirmar

const MESSAGES_PHASE2 = [
    {
        type: "audio",
        audioKey: "audio2",
        autoplay: true,
        delay: 2500
    },
    {
        type: "pdf",
        pdfIndex: 0,
        delay: 2000
    },
    {
        type: "pdf",
        pdfIndex: 1,
        delay: 1800
    },
    {
        type: "pdf",
        pdfIndex: 2,
        delay: 1800
    },
    {
        type: "pdf",
        pdfIndex: 3,
        delay: 1800
    },
    {
        type: "text",
        content: `Agora eu conto com a sua honestidade e com o toque de Deus no seu coração. 🙏
Deixe Ele guiar você sobre quanto deseja enviar: 10, 15, 20 ou 25 reais — o valor que sentir no coração. 🙏`,
        delay: 2500
    },
    {
        type: "pix",
        delay: 2000
    },
    {
        type: "text",
        content: `Para facilitar, vou te enviar a chave Pix separada para você só copiar e colar 👇👇👇`,
        delay: 1800
    },
    {
        type: "pix-copy",
        pixType: "cnpj",
        delay: 1200
    },
    {
        type: "pix-copy",
        pixType: "email",
        delay: 1200
    },
    {
        type: "text",
        content: `Após o pagamento, me envie o comprovante aqui, que eu vou te enviar como BÔNUS especial, vou te mandar um PDF com os 150 Salmos Explicados Versículo por Versículo e também Orações Poderosas de São Miguel 📖🙏`,
        delay: 3000
    },
    {
        type: "text",
        content: `Oii! Você recebeu tudo certinho, né? Que bom.
Como combinamos, agora conto com a sua honestidade 💛
A contribuição de R$10 ajuda a manter esse projeto no ar.
Se puder, fazer o Pix ainda hoje já vai fazer muita diferença! 🙏
Deus abençoe!`,
        delay: 4000
    }
];

// ===== WAVEFORM DATA =====
const WAVEFORM_DATA = [
    20, 35, 50, 25, 60, 45, 80, 55, 40, 70,
    30, 65, 45, 75, 35, 55, 85, 40, 60, 50,
    25, 70, 45, 55, 30, 65, 40, 75, 50, 35,
    60, 45, 80, 30, 55, 70, 40, 65, 50, 35,
    75, 45, 60, 30, 55, 40, 70, 50, 65, 45
];

