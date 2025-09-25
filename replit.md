# WhatsApp Bot - NEEXT LTDA

## Visão Geral
Bot WhatsApp automatizado construído com Baileys, com sistema de antilink avançado e funcionalidades de administração de grupos.

## Funcionalidades Principais

### 🤖 Comandos do Bot
- **`.ping`** - Verifica status do bot e informações do sistema
- **`.hora`** - Mostra horário atual
- **`.dono`** - Identifica o dono do bot
- **`.marca`** - Menciona todos os membros do grupo (apenas em grupos)
- **`.recado`** - Confirma que bot está ativo
- **`.s`** - Converte imagem/vídeo para sticker
- **`prefixo`** - Mostra o prefixo do bot (sem prefixo)

### 🛡️ Sistema Antilink
Sistema completo de proteção contra links em grupos:

#### Como Usar:
- **`.antilink on`** - Ativa antilink no grupo
- **`.antilink off`** - Desativa antilink no grupo
- **`.antilink`** - Verifica status atual

#### Recursos:
- ✅ Detecta automaticamente links em mensagens
- ✅ Remove mensagens com links instantaneamente
- ✅ Protege admins e dono (não remove suas mensagens)
- ✅ Configuração por grupo (salva em JSON)
- ✅ Apenas admins podem ativar/desativar
- ✅ Feedback visual com reações e mensagens

#### Links Detectados:
- URLs com http/https
- Links do WhatsApp (wa.me, chat.whatsapp.com)
- Redes sociais (Instagram, Facebook, Twitter, TikTok, YouTube)
- Telegram (t.me)
- Discord (discord.gg)
- E muito mais...

### 🔧 Configurações
As configurações do bot estão em `settings/settings.json`:
- **prefix**: Prefixo dos comandos (padrão: ".")
- **nomeDoBot**: Nome do bot
- **numeroDoDono**: Número do dono do bot
- **nickDoDono**: Apelido do dono

### 📁 Estrutura do Projeto
- `main.js` - Script principal com tratamento de erros
- `connect.js` - Gerenciamento de conexão WhatsApp
- `index.js` - Lógica do bot e comandos
- `settings/settings.json` - Configurações do bot
- `arquivos/` - Funções utilitárias e assets
- `conexao/` - Arquivos de sessão WhatsApp (auto-gerados)

### 🚀 Como Executar
O bot é executado automaticamente via Workflow do Replit:
1. Conecta automaticamente ao WhatsApp
2. Se primeira vez, solicita método de conexão (QR Code ou Pareamento)
3. Processa mensagens e comandos em tempo real

### 📊 Logs e Monitoramento
- Logs detalhados de todas as mensagens processadas
- Identificação de comandos vs mensagens normais
- Rastreamento de ações do antilink
- Tratamento de erros robusto

### 🔐 Segurança
- Arquivos de sessão excluídos do Git
- Verificação de permissões para comandos administrativos
- Proteção contra spam com cache de mensagens processadas

## Alterações Recentes
- ✅ Implementado sistema completo de antilink
- ✅ Adicionadas verificações de admin e dono
- ✅ Criado sistema de configuração por grupo
- ✅ Melhorado tratamento de erros
- ✅ Adicionadas reações visuais aos comandos

## Estado Atual
✅ **Bot Online e Funcionando**
✅ **Antilink Implementado e Testado**
✅ **Todos os Comandos Operacionais**
✅ **Projeto Configurado para Replit**