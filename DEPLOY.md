# 🚀 Guia de Deploy - ConsultaCNPJ

Escolha a plataforma mais adequada para hospedar sua aplicação Flask gratuitamente.

---

## 📌 Comparativo de Plataformas Gratuitas

| Plataforma         | Flask  | Domínio próprio | Limitações     | Dormência                               |
| ------------------ | ------ | --------------- | -------------- | --------------------------------------- |
| **Render.com** ✅  | ✅ Sim | ✅ Sim          | 750h/mês       | 15min inatividade (desperta com acesso) |
| **Railway.app**    | ✅ Sim | ✅ Sim          | $5 crédito/mês | Nunca dorme                             |
| **PythonAnywhere** | ✅ Sim | ❌ Não (free)   | 1 app, 512MB   | Nunca dorme                             |
| **Koyeb**          | ✅ Sim | ✅ Sim          | 1 app grátis   | 30min inatividade                       |

---

## ✅ Opção Recomendada: Render.com (mais simples)

### Passo 1: Criar conta no Render

1. Acesse https://render.com
2. Clique em **"Get Started"** e faça login com seu GitHub

### Passo 2: Deploy automático

1. No dashboard do Render, clique em **"New +"** → **"Web Service"**
2. Conecte seu GitHub e selecione o repositório **`Jamileiro/consulta-cnpj`**
3. Configure:
   - **Name**: `consulta-cnpj`
   - **Region**: `Frankfurt (EU)` (mais perto do Brasil)
   - **Branch**: `main`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
   - **Plan**: **Free** ✅

4. Clique em **"Create Web Service"**
5. Aguarde 2-3 minutos para o build e deploy

### ✅ Pronto! Sua aplicação estará em:

```
https://consulta-cnpj.onrender.com
```

> ⚡ **Nota**: No plano Free, o Render "dorme" após 15 minutos sem uso. Quando alguém acessar, ele acorda em ~30 segundos.

---

## 🔧 Opção Alternativa: PythonAnywhere (nunca dorme)

1. Crie conta em https://www.pythonanywhere.com
2. Vá em **"Consoles"** → **"Bash"**
3. Clone o repositório:
   ```bash
   git clone https://github.com/Jamileiro/consulta-cnpj.git
   ```
4. Vá em **"Web"** → **"Add a new web app"**
5. Escolha **"Manual Configuration"** → **"Python 3.10"**
6. Em **"Code"** → **"WSGI configuration file"**, edite para:
   ```python
   import sys
   path = '/home/seu-usuario/consulta-cnpj'
   if path not in sys.path:
       sys.path.append(path)
   from app import app as application
   ```
7. Em **"Virtualenv"**, crie um virtualenv e instale:
   ```bash
   mkvirtualenv --python=/usr/bin/python3.10 myenv
   pip install -r requirements.txt
   ```
8. Clique em **"Reload"**

### ✅ URL:

```
https://seu-usuario.pythonanywhere.com
```

---

## 🌐 Opção Avançada: Railway.app (mais rápido)

1. Acesse https://railway.app
2. Login com GitHub
3. Clique em **"New Project"** → **"Deploy from GitHub repo"**
4. Selecione `Jamileiro/consulta-cnpj`
5. Em **Settings** → **Start Command**: `gunicorn app:app`
6. Railway detecta automaticamente o `requirements.txt`

---

## ⚙️ Arquivos de Configuração

Já incluí no repositório o arquivo `requirements.txt` com `gunicorn` para produção. O Render e Railway usam ele automaticamente.

---

## 📱 Testar em qualquer dispositivo

Depois do deploy, você pode acessar de:

- 💻 **Desktop**: URL do Render
- 📱 **Celular/Android** 🏆: Abra o Chrome, digite a URL
- 💾 **Salvar como app**: No Chrome Android, clique em "Adicionar à tela inicial"

---

## 🆓 Resumo: Qual escolher?

| Seu objetivo                              | Recomendação                          |
| ----------------------------------------- | ------------------------------------- |
| Testar rapidamente                        | **Render.com** ✅                     |
| Nunca dormir (grátis)                     | **PythonAnywhere**                    |
| Performance (grátis)                      | **Railway.app** ($5/mês grátis cobre) |
| Ter seu domínio (ex: consultacnpj.com.br) | **Render.com** (plano pago ~$7/mês)   |

---

## 🔒 Dica Importante

> Ative o GitHub Secret Scanning no repositório:
> Settings → Security & analysis → Secret scanning (ativar)

E nunca coloque tokens/senhas no código-fonte!
