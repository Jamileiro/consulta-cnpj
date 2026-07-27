# 📋 ConsultaCNPJ - Web App

Consulta dados cadastrais de qualquer CNPJ gratuitamente através da API pública [publica.cnpj.ws](https://publica.cnpj.ws).

![Python](https://img.shields.io/badge/Python-3.10%2B-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-ativo-brightgreen)

## ✨ Funcionalidades

- ✅ **Máscara automática** de CNPJ (00.000.000/0000-00)
- ✅ **Validação de dígitos verificadores** antes da consulta
- ✅ **Resumo visual** com razão social, fantasia, situação, endereço, CNAE, telefone, e-mail
- ✅ **Regime tributário** (Simples Nacional / Regime Normal)
- ✅ **Badge colorido** de situação cadastral (Ativa ✅, Baixada ❌, Suspensa ⚠️)
- ✅ **Links externos** nos cards (CNPJ → Receita Federal, Endereço → Google Maps)
- ✅ **Tooltips explicativos** com ícone "?" em campos técnicos
- ✅ **Seção dinâmica** em **acordeão** que renderiza automaticamente TODOS os dados do JSON
- ✅ **Capital Social** visível nos detalhes dinâmicos
- ✅ **JSON bruto** com botão "Ver JSON" e "Copiar JSON"
- ✅ **Contador de campos** preenchidos
- ✅ **Tema claro/escuro** (persistido no navegador)
- ✅ **Layout responsivo** (desktop, tablet e celular)
- ✅ **Cache em sessionStorage** (última consulta preservada)
- ✅ **Detecção de conectividade** (badge offline)
- ✅ **Exportar PDF** via impressão do navegador (Ctrl+P)

## 🚀 Como executar localmente

### Pré-requisitos

- Python 3.10 ou superior

### Passos

```bash
# Clone o repositório
git clone https://github.com/SEU_USUARIO/consulta-cnpj.git
cd consulta-cnpj/consulta-cnpj-python

# Execute o servidor (sem dependências externas!)
python app.py

# Acesse no navegador:
# http://127.0.0.1:5000
```

Para alterar a porta:

```bash
python app.py --port 8080
```

## 🔒 Segurança

- **Content-Security-Policy (CSP)** restritiva
- **Rate limiting**: máximo 30 requisições/minuto por IP
- **Headers de segurança**: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection
- **Proteção contra path traversal**
- **Validação rigorosa** de entrada
- **Zero dependências externas** (apenas módulos built-in do Python)

## 🌐 Como publicar de graça na internet

### Opção 1: Render.com (recomendado)

1. Crie conta gratuita em [render.com](https://render.com) (com GitHub)
2. Conecte seu repositório
3. Clique em **New +** → **Web Service**
4. Selecione o repositório
5. Configure:
   - **Name**: `consulta-cnpj`
   - **Region**: `Frankfurt` (Europa) ou `Singapore` (Ásia)
   - **Branch**: `main`
   - **Root Directory**: `consulta-cnpj-python`
   - **Start Command**: `python app.py`
6. Clique em **Create Web Service**

✅ Pronto! Seu app estará online em `https://consulta-cnpj.onrender.com`

### Opção 2: Fly.io

```bash
# Instale o flyctl
# Crie o Dockerfile (veja abaixo)
fly launch
fly deploy
```

### Dockerfile (para Fly.io ou Railway)

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY . .
EXPOSE 5000
CMD ["python", "app.py"]
```

## 📁 Estrutura do projeto

```
consulta-cnpj-python/
├── app.py                 # Servidor HTTP (Python puro)
├── .gitignore             # Arquivos ignorados pelo Git
├── README.md              # Este arquivo
├── requirements.txt       # Dependências opcionais
├── static/
│   ├── css/
│   │   └── style.css      # Estilos customizados
│   └── js/
│       └── app.js         # Lógica do frontend
└── templates/
    └── index.html         # Página principal
```

## 🤝 Como contribuir

1. Faça um fork do projeto
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é open source e está sob a licença MIT.

---

Feito com ❤️ para a comunidade brasileira
