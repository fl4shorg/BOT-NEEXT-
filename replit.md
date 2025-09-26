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
- **`.hermitwhite`** - Cria ID no sistema NEEXT (requer dados pessoais)
- **`prefixo`** - Mostra o prefixo do bot (sem prefixo)

### 🆔 Sistema de Criação de ID - NEEXT
Comando para criar IDs únicos no sistema da NEEXT LTDA:

#### Como Usar:
- **`.hermitwhite [nome] [idade] [telefone] [instagram] [email]`** - Cria um novo ID

#### Exemplo:
```
.hermitwhite João Silva 25 5527999999999 @joao_silva joao@gmail.com
```

#### Validações:
- ✅ Todos os campos são obrigatórios
- ✅ Instagram deve incluir o @ (ex: @usuario)
- ✅ Telefone deve ter 10-15 dígitos (ex: 5527999999999)
- ✅ Email deve ser válido (ex: usuario@provedor.com)

#### Recursos:
- ✅ Integração com API Google Sheets
- ✅ Geração automática de ID sequencial
- ✅ Validação completa de dados
- ✅ Mensagem de confirmação com ID gerado
- ✅ Tratamento de erros robusto

### 🎮 Jogo Akinator
Sistema de jogo interativo do Akinator (gênio da lâmpada):

#### Como Usar:
- **`.akinator`** - Inicia uma nova partida do jogo
- **`.resetaki`** - Reseta/cancela a partida atual

#### Como Jogar:
1. Digite `.akinator` em um grupo para iniciar
2. Responda as perguntas com: **Sim**, **Não**, **Não sei**, **Provavelmente sim** ou **Provavelmente não**
3. O Akinator tentará adivinhar o personagem que você está pensando
4. Use `.resetaki` para cancelar o jogo a qualquer momento

#### Recursos:
- ✅ Funciona apenas em grupos
- ✅ Uma partida por grupo por vez
- ✅ Controle de acesso por jogador
- ✅ Limite de uma partida por dia
- ✅ Sistema de reset para admins e quem iniciou o jogo
- ✅ Respostas inteligentes em português
- ⚠️ API pode estar sujeita a limitações de Cloudflare

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
- ✅ Configurado para funcionar no ambiente Replit
- ✅ Melhorada implementação do comando Pinterest
- ✅ Instaladas todas as dependências necessárias
- ✅ **NOVO**: Implementado jogo do Akinator com aki-api
- ✅ **NOVO**: Adicionados comandos .akinator e .resetaki
- ✅ **NOVO**: Sistema de gestão de partidas por grupo
- ✅ **NOVO**: Processamento inteligente de respostas do usuário
- ✅ **NOVO**: Estrutura de banco de dados para jogos

## Estado Atual
✅ **Bot Online e Funcionando no Replit**
✅ **Antilink Implementado e Testado**
✅ **Todos os Comandos Operacionais**
✅ **Comando Pinterest Melhorado**
✅ **Workflow Configurado e Rodando**
✅ **Dependências Instaladas e Funcionando**
✅ **Stickers com Selinho Quotado Implementado**
✅ **Deployment Configurado para Produção (VM)**
✅ **Bot Conectado e Processando Comandos Ativamente**

### 🚀 Ambiente de Produção
- **Deployment Target**: VM (para conexão persistente)
- **Comando de Produção**: `node main.js`
- **Status**: Pronto para deploy