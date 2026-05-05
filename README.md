# ViewSync - Streaming LAN de Ultra Performance (SFU)

ViewSync é uma solução profissional de espelhamento de tela projetada especificamente para ambientes com muitos usuários em rede local, como salas de aula, laboratórios e escritórios. 

Diferente de soluções tradicionais que travam com 5 ou 10 alunos, o ViewSync utiliza arquitetura de **SFU (Selective Forwarding Unit)** para suportar **60+ conexões simultâneas** com latência imperceptível e baixo uso de CPU no computador do professor.

## 🏗️ Arquitetura do Sistema

O ViewSync foi projetado com isolamento de processos para garantir estabilidade:

1.  **Processo Main (Electron)**: Gerencia a interface do professor, as janelas e o ciclo de vida do app.
2.  **Processo de Servidor (Node.js)**: Um processo isolado iniciado pelo Electron que hospeda:
    *   **Mediasoup (SFU)**: Motor C++ de alto desempenho que recebe o fluxo de vídeo e o replica para os alunos sem re-encodificação.
    *   **Socket.io**: Gerencia a sinalização WebRTC e o estado da sala.
    *   **Express**: Serve o Viewer (site do aluno) de forma local.

## 📡 Funcionamento na Rede Local (LAN)

O ViewSync opera 100% offline (não requer internet):
*   **Zero Configuração**: O professor inicia a transmissão e o sistema detecta automaticamente o IP da rede local.
*   **Latência Zero**: Utiliza WebRTC (UDP) para transmissão em tempo real. Se o UDP estiver bloqueado pela rede da escola, o sistema faz fallback automático para TCP.
*   **Eficiência de Banda**: O professor envia o vídeo apenas **uma vez** para o SFU local, que distribui para os alunos. Isso economiza até 95% de banda de upload em comparação com o P2P.

## 🛠️ Tecnologias Utilizadas

*   **Frontend (Professor)**: React, Tailwind CSS, Vite.
*   **Frontend (Aluno)**: Next.js (Static Lite), Mediasoup-client.
*   **Processamento de Mídia**: [Mediasoup](https://mediasoup.org/) (Motor SFU nativo em C++).
*   **Shell**: Electron (v30+).

## 🚀 Como Iniciar

### Pré-requisitos
- Node.js 20 (LTS recomendado).
- Python 3 e Ferramentas de Build (C++ compiler) instaladas para compilar o Mediasoup.

### Instalação
```powershell
# 1. Instale as dependências
npm install

# 2. Recompile os módulos nativos (CRÍTICO)
npm run rebuild --workspace=view-sync-desktop
```

### Desenvolvimento
```powershell
npm run start:desktop
```

## 🧪 Teste de Estresse (Simulando 60 Alunos)

Você pode testar a capacidade do seu computador de distribuir o vídeo antes de levar para a sala de aula:

1.  Instale o Puppeteer: `npm install puppeteer --save-dev`
2.  Inicie a transmissão no App do Professor.
3.  Execute o teste:
    ```powershell
    # node scripts/stress-test.js [IP_DO_SERVIDOR] [NUMERO_DE_ALUNOS]
    node scripts/stress-test.js http://localhost:3000 60
    ```
O script abrirá 60 instâncias invisíveis do Chrome e reportará se o vídeo está sendo recebido com sucesso por todos eles.

## 📦 Geração de Instaladores (.exe e .dmg)

O projeto está configurado com **GitHub Actions**. Basta fazer um push ou disparar o workflow manualmente no GitHub para receber os links de download:
*   **Windows**: Gera um instalador NSIS `.exe`.
*   **macOS**: Gera um arquivo `.dmg` universal.

---
Desenvolvido por Kellviny. Licença MIT.
