const puppeteer = require('puppeteer');

/**
 * Script de Teste de Carga ViewSync
 * Simula múltiplos alunos conectando ao servidor local.
 * 
 * Uso: 
 * 1. Instale o puppeteer: npm install puppeteer --save-dev
 * 2. Inicie o app do professor: npm run start:desktop
 * 3. Comece a transmissão de uma tela.
 * 4. Rode este script: node scripts/load-test.js [numero_de_alunos]
 */

const USERS_COUNT = parseInt(process.argv[2]) || 10;
const SERVER_URL = 'http://localhost:3000';

async function spawnUser(id) {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--mute-audio']
    });
    
    const page = await browser.newPage();
    
    try {
        await page.goto(SERVER_URL);
        console.log(`[User ${id}] Conectado a ${SERVER_URL}`);
        
        // Simula o clique inicial se necessário para autoplay
        await page.click('body').catch(() => {});
        
        // Mantém a página aberta por 5 minutos
        await new Promise(resolve => setTimeout(resolve, 300000));
    } catch (err) {
        console.error(`[User ${id}] Erro:`, err.message);
    } finally {
        await browser.close();
    }
}

async function run() {
    console.log(`🚀 Iniciando teste de carga com ${USERS_COUNT} alunos virtuais...`);
    console.log(`📍 Alvo: ${SERVER_URL}`);

    const batchSize = 5; // Conecta em grupos de 5 para não travar a CPU no início
    for (let i = 0; i < USERS_COUNT; i++) {
        spawnUser(i + 1);
        if ((i + 1) % batchSize === 0) {
            console.log(`⏳ Aguardando lote de ${batchSize} estabilizar...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    console.log('✅ Todos os alunos virtuais foram disparados.');
    console.log('💡 Monitore o "Connected Count" no App do Professor.');
}

run();