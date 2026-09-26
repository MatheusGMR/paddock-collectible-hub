# Site publicado não carrega

## O que foi verificado
- paddockonline.com e o endereço Lovable respondem normalmente.
- Em um navegador novo, a página abre e mostra a tela de login ("Qual é o seu email?").
- A versão publicada é de 25/09; se você publicou hoje, a atualização pode ainda não ter chegado ao seu aparelho.
- Causa mais provável: o aparelho ainda guarda uma versão antiga do app instalado (modo offline) e mostra tela em branco ou travada.
- Um erro de pagamento (chave vazia) aparece ao abrir o site; não bloqueia a tela, mas será corrigido.

## O que será feito
1. Proteção contra versão antiga: quando o app detectar versão nova ou falha ao iniciar, limpa automaticamente o armazenamento offline e recarrega uma única vez (sem loop).
2. Tela de reserva: se o app não iniciar em alguns segundos, mostra "Atualizar" em vez de tela em branco.
3. Pagamentos: só carregar o sistema de pagamento quando houver chave configurada, eliminando o erro.
4. Republicar e confirmar que a versão nova está no ar.

## Detalhes técnicos
- `src/main.tsx`: envolver o render em try/catch + `window.onerror` inicial; em falha, `getRegistrations().unregister()` + `caches.delete` + reload com flag em sessionStorage.
- `src/lib/pwa.ts`: ouvir `controllerchange` para recarregar após atualização do worker.
- `index.html`: fallback estático dentro de `#root` com botão que limpa caches.
- Encontrar a chamada `loadStripe` e proteger com checagem de chave vazia.
