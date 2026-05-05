const puppeteer = require('puppeteer');

/**
 * ViewSync Ultra Stress Test
 * Simula múltiplos alunos e VERIFICA se o vídeo está realmente tocando.
 * 
 * Uso: node scripts/stress-test.js [IP] [ALUNOS]
 */

const SERVER_URL = process.argv[2] || 'http://localhost:3000';
const CONCURRENT_USERS = parseInt(process.argv[3]) || 10;

async function spawnUser(id) {
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--mute-audio',
            '--autoplay-policy=no-user-gesture-required'
        ]
    });
    
    const page = await browser.newPage();
    
    try {
        await page.goto(SERVER_URL, { waitUntil: 'networkidle2' });
        
        // Verifica se o vídeo iniciou a reprodução real (WebRTC Flow)
        const isPlaying = await page.evaluate(async () => {
            const video = document.querySelector('video');
            if (!video) return false;
            
            // Espera até 10 segundos pelo sinal do SFU
            return new Promise((resolve) => {
                const check = () => {
                    if (video.readyState >= 3 && !video.paused) resolve(true);
                };
                video.addEventListener('playing', () => resolve(true));
                setTimeout(() => resolve(false), 10000);
                check();
            });
        });

        if (isPlaying) {
            console.log(`✅ [Aluno ${id}] Vídeo recebido e tocando com sucesso.`);
        } else {
            console.warn(`⚠️ [Aluno ${id}] Conectado, mas o vídeo não iniciou (Timeout).`);
        }

        // Mantém a conexão ativa por 10 minutos para teste de carga real
        await new Promise(resolve => setTimeout(resolve, 600000));
    } catch (err) {
        console.error(`❌ [Aluno ${id}] Falha na conexão:`, err.message);
    } finally {
        await browser.close();
    }
}

async function run() {
    console.log(`\n🔥 Iniciando Teste de Estresse Profissional`);
    console.log(`📍 Alvo: ${SERVER_URL}`);
    console.log(`👥 Simulação: ${CONCURRENT_USERS} alunos simultâneos\n`);

    const batchSize = 5;
    for (let i = 0; i < CONCURRENT_USERS; i++) {
        spawnUser(i + 1);
        // Conecta em lotes para não "dar pico" de processamento local
        if ((i + 1) % batchSize === 0) {
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
    }

    console.log(`\n🚀 Todos os alunos virtuais foram disparados.`);
    console.log(`📊 Monitore a CPU do computador do Professor.\n`);
}

run().catch(console.error);
