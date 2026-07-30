# 📋 ConsultaCNPJ

Consulta dados cadastrais de qualquer CNPJ gratuitamente através da API pública [publica.cnpj.ws](https://publica.cnpj.ws).

![Python](https://img.shields.io/badge/Python-3.10%2B-blue)
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
- ✅ Rate limiting (60 req/min)
- ✅ Cache de consultas na API (5 min)
- ✅ Threading (múltiplas requisições simultâneas)
- ✅ Zero dependências

## 🚀 Como usar

```bash
# 1. Clone
git clone https://github.com/SEU_USUARIO/consulta-cnpj.git
cd consulta-cnpj

# 2. Execute
python app.py

# 3. Acesse
# http://localhost:5000
```

## 🔒 Segurança

- **CSP** restritiva
- **Rate limiting**: 60 requisições/minuto por IP
- **Headers de segurança**: X-Frame-Options, X-Content-Type-Options
- **Proteção contra path traversal**
- **Validação rigorosa de CNPJ**
- **Zero dependências externas**

## 📁 Estrutura

```
consulta-cnpj/
├── app.py                 # Servidor HTTP (Python puro)
├── static/
│   ├── css/style.css      # Estilos customizados
│   └── js/app.js          # Lógica do frontend
├── templates/
│   └── index.html         # Página principal
└── tests/
    └── test_app.py        # Testes unitários
```

## 🌐 Deploy

A aplicação é compatível com qualquer plataforma que suporte Python:

- **Render**: `python app.py`
- **Fly.io**: `python app.py`
- **PythonAnywhere**: configuração manual

## 📄 Licença

MIT
