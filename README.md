# 📋 Consulta CNPJ

Consulta dados cadastrais de qualquer CNPJ gratuitamente através da API pública [publica.cnpj.ws](https://publica.cnpj.ws).

![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![PWA](https://img.shields.io/badge/PWA-✓-5A0FC8)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Funcionalidades

- ✅ Máscara automática de CNPJ
- ✅ Validação de dígitos verificadores
- ✅ Resumo visual com 15 campos principais
- ✅ Acordeão dinâmico com todos os dados do JSON
- ✅ Tema claro/escuro (persistido)
- ✅ Cache em sessionStorage
- ✅ Exportar PDF
- ✅ Detecção de conectividade
- ✅ **Histórico** — Últimas 10 consultas salvas
- ✅ **Favoritos** — Salve CNPJs com ⭐
- ✅ **Copiar dados** — Copie os dados para área de transferência
- ✅ **PWA** — Instalável como app no celular
- ✅ **SEO** — Open Graph, Schema.org e Twitter Cards
- ✅ **Deploy automático** — GitHub Actions
- ✅ **Tailwind CSS compilado** — Carregamento 3x mais rápido
- ✅ Zero dependências
- ✅ 100% estático — roda em qualquer lugar

## 🚀 Como usar

### Opção 1 — GitHub Pages (recomendado)

1. Faça o fork deste repositório
2. Vá em **Settings → Pages**
3. Em "Source", selecione **Deploy from a branch**
4. Selecione `main` e pasta `/ (root)`
5. Pronto! Seu site estará em `https://SEU_USUARIO.github.io/consulta-cnpj`

### Opção 2 — Local (abrir direto)

```bash
# Clone
git clone https://github.com/SEU_USUARIO/consulta-cnpj.git
cd consulta-cnpj

# Abra o index.html no navegador (clique duplo)
# Ou use o Live Server no VSCode (Go Live)
```

### Opção 3 — Netlify / Vercel

Arraste a pasta do projeto para o [Netlify Drop](https://app.netlify.com/drop) ou importe o repositório no [Vercel](https://vercel.com).

## 📁 Estrutura

```
consulta-cnpj/
├── index.html                # Página principal
├── manifest.json             # Manifest PWA (app instalável)
├── sw.js                     # Service Worker (cache offline)
├── .editorconfig             # Padrão de código
├── .github/workflows/
│   └── deploy.yml            # Deploy automático via GitHub Actions
├── static/
│   ├── css/
│   │   ├── tailwind.min.css  # Tailwind CSS compilado (~15KB)
│   │   └── style.css         # Estilos customizados
│   ├── js/
│   │   └── app.js            # Lógica do frontend
│   └── img/
│       ├── icon-192.svg      # Ícone PWA 192px
│       └── icon-512.svg      # Ícone PWA 512px
└── README.md
```

## 📱 PWA (App Instalável)

No celular, ao acessar o site, o navegador perguntará "Adicionar à tela inicial".
Após adicionar, o site funciona como um app nativo com ícone próprio.

## 🔒 Observações

- A API [publica.cnpj.ws](https://publica.cnpj.ws) é pública e gratuita
- O CORS é aberto — chamadas diretas do navegador funcionam
- Dados ficam em cache no `sessionStorage` durante a sessão
- Favoritos e histórico ficam salvos no `localStorage`
- Nenhum dado é enviado para servidores intermediários

## 🛠 Desenvolvimento

Para gerar o CSS do Tailwind (após alterar classes):

```bash
npm install -D tailwindcss
npx @tailwindcss/cli -i static/css/input.css -o static/css/tailwind.min.css --minify
```

## 📄 Licença

MIT
