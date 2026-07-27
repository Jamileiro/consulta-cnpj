# TODO - Migração React → Python/Flask Web App

## ✅ Etapa 1: Estrutura do projeto

- [x] Criar diretório `consulta-cnpj-python/`
- [x] Criar subdiretórios `static/css/`, `static/js/`, `templates/`

## ✅ Etapa 2: Backend Python (servidor embutido)

- [x] Criar `app.py` - servidor HTTP puro (sem dependências) com:
  - Rota principal `/` (serve o HTML)
  - Rota `/api/consultar/{cnpj}` (proxy para API pública)
  - **Content-Security-Policy (CSP)** restritiva
  - **Headers de segurança** (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, etc.)
  - **Rate limiting** por IP (30 req/min)
  - **Proteção contra path traversal** em arquivos estáticos
  - **CORS** configurado
  - Log silencioso em produção
- [x] Criar `requirements.txt` (Flask + Requests + Gunicorn - opcionais)

## ✅ Etapa 3: Frontend - Template HTML

- [x] Criar `templates/index.html` com Tailwind CDN
  - Layout responsivo completo (mobile + desktop)
  - Campo CNPJ com máscara
  - Botão consultar com loading
  - Toast notifications
  - Detecção de conectividade (offline badge)
  - Resumo da empresa (cards com tooltips)
  - Seção dinâmica de detalhes (acordeão)
  - Botões JSON bruto / Copiar JSON
  - Contador de campos preenchidos
  - Toggle tema claro/escuro
  - Exportar PDF (Ctrl+P / window.print())
  - Footer informativo

## ✅ Etapa 4: Frontend - JavaScript

- [x] Criar `static/js/app.js` com:
  - Máscara e validação CNPJ (dígitos verificadores)
  - Chamada API via fetch
  - Loading states com spinner
  - Renderização dinâmica em acordeão (recursivo)
  - Formatação CNPJ, CEP, datas, booleanos, capital social (R$)
  - Badges coloridos de situação (Ativa/verde, Baixada/vermelho, Suspensa/amarelo)
  - Links externos (CNPJ → Receita, Endereço/CEP → Google Maps)
  - Tooltips explicativos com ícone "?"
  - Regime Tributário (Simples/Normal)
  - Tema claro/escuro com localStorage
  - Copiar JSON para clipboard
  - Contador de campos preenchidos
  - Micro-interações e animações
  - **`capital_social` mantido nos detalhes dinâmicos**

## ✅ Etapa 5: Frontend - CSS customizado

- [x] Criar `static/css/style.css` com:
  - Scrollbar customizada
  - Touch targets mínimos (44px)
  - Animações de entrada (fade-in, slide-up)
  - Skeleton loading
  - Toast notifications
  - Estilo para impressão

## ✅ Etapa 6: Segurança

- [x] Content-Security-Policy (CSP) restritiva
- [x] Rate limiting (30 requisições/minuto/IP)
- [x] Headers de segurança (X-Frame-Options, X-XSS-Protection, etc.)
- [x] Sanitização de entrada (CNPJ validado)
- [x] Proteção contra path traversal
- [x] Sem dependências externas (apenas módulos built-in Python)

## 🔄 Testes

- [x] Servidor rodando em http://127.0.0.1:5000
- [x] Compilação Python sem erros de sintaxe
- [ ] Testar consulta CNPJ real
- [ ] Verificar responsividade
