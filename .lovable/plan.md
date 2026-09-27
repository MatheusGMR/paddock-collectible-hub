# Portal de administração: gestão completa + campanhas e gatilhos de notificação

O app já tem um painel de administração (Geral, Analytics, IA, Desempenho, Push, Usuários) com envio manual de push. O plano amplia esse painel, sem criar outro.

## 1. Notificações no celular (app salvo na tela inicial)
- Botão "Ativar notificações" no perfil/configurações, que pede permissão no iPhone (iOS 16.4+ com o app salvo na tela inicial) e no Android.
- Aviso quando o app está aberto só no navegador do iPhone: "Salve na tela inicial para receber notificações".
- Tocar na notificação abre a tela certa (item, anúncio, perfil, mercado).
- Assinaturas inválidas são removidas automaticamente.

## 2. Campanhas (aba Push → Campanhas)
- Criar campanha: título, mensagem, imagem opcional, link de destino.
- Público: todos, só colecionadores, só lojistas, assinantes Premium, em teste, inativos há X dias, por cidade, por tópico.
- Enviar agora ou agendar (data/hora de Brasília).
- Pré-visualização de como aparece no celular e quantas pessoas vão receber.
- Histórico: enviadas, entregues, falhas, cliques.
- Duplicar, pausar e cancelar campanhas agendadas.

## 3. Gatilhos automáticos (aba Push → Gatilhos)
Ligar/desligar e editar o texto de cada um:
- Boas-vindas após o cadastro.
- Teste Premium termina em 2 dias / terminou.
- Inativo há 7, 14 ou 30 dias ("Sua coleção sente sua falta").
- Desafio dos 50 carrinhos: faltam 5 / concluído.
- Nova curtida, comentário, seguidor, mensagem.
- Venda realizada (lojista) e pedido enviado (comprador).
- Novo anúncio de um lojista que a pessoa segue.
- Limite de envios por pessoa (por exemplo, no máximo 3 por dia) e horário de silêncio (22h às 8h).

## 4. Gestão e indicadores
- **Geral:** usuários ativos no dia/semana/mês, novos cadastros, retenção, carrinhos escaneados, receita do mercado, assinaturas (teste, ativas, canceladas, receita mensal).
- **Usuários:** busca, detalhes (coleção, assinatura, compras), dar/remover acesso de administrador, bloquear conta, enviar push individual.
- **Mercado:** anúncios ativos, vendas, taxas arrecadadas, pedidos pendentes de envio, remover anúncio.
- **Conteúdo:** posts recentes com opção de remover, fontes de notícias ativas.
- **Notificações:** taxa de abertura por campanha e por gatilho.
- Filtro de período (7, 30, 90 dias) e exportar CSV.

## Detalhes técnicos
- Novas tabelas: `push_campaigns` (conteúdo, público em JSON, `scheduled_at`, status, contadores), `push_triggers` (chave, ativo, título/mensagem modelo, limite), `push_deliveries` (usuário, campanha/gatilho, status, `clicked_at`). Todas com GRANT e RLS restrita a `has_role(auth.uid(),'admin')`; `service_role` para as funções.
- Nova coluna `user_blocked` fica em tabela separada `user_moderation` (não em profiles).
- `send-push` passa a aceitar `campaign_id`/`user_ids`/filtros de público, grava `push_deliveries` e remove assinaturas 404/410. Checagem de admin no código.
- Nova função `push-scheduler` rodada a cada 5 min por pg_cron: dispara campanhas agendadas e avalia gatilhos por tempo (fim de teste, inatividade, desafio).
- Gatilhos de evento (curtida, comentário, seguidor, mensagem, venda) chamados por triggers do banco via `pg_net` → `send-push` com a chave do gatilho.
- `push-sw.js` registra clique (`notificationclick` → endpoint de rastreio) e abre a URL de destino.
- Novas funções SQL de indicadores para o admin (`get_admin_kpis`, `get_admin_marketplace_stats`, `get_admin_push_stats`), todas verificando `has_role`.
- Novos componentes: `AdminCampaignsSection`, `AdminTriggersSection`, `AdminMarketplaceSection`, `AdminContentSection`; `AdminUsersTable` ganha ações.
- Web push segue usando as chaves VAPID existentes; iPhone nativo continua via APNs já configurado.
