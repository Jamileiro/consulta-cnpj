# ConsultaCNPJ - Plugin WordPress

Plugin WordPress para consulta de CNPJ via API pública [publica.cnpj.ws](https://publica.cnpj.ws).

## 📦 Instalação

1. **Baixe** a pasta `consulta-cnpj-wordpress`
2. **Compacte** em ZIP: `consulta-cnpj-wordpress.zip`
3. No **painel WordPress**, vá em **Plugins → Adicionar → Enviar Plugin**
4. Selecione o arquivo ZIP e clique em **Instalar Agora**
5. **Ative** o plugin

## 🚀 Uso

Adicione o shortcode em qualquer página ou post:

```
[consulta_cnpj]
```

Ou com parâmetros personalizados:

```
[consulta_cnpj title="Consultar CNPJ" description="Digite o CNPJ abaixo"]
```

## ⚙️ Configurações

Vá em **Configurações → Consulta CNPJ** para ajustar:

- **Placeholder** do campo de input
- **Tema** padrão (claro/escuro)

## 🔒 Funcionalidades

- ✅ Máscara automática de CNPJ
- ✅ Validação de dígitos verificadores
- ✅ Consulta via AJAX (sem recarregar página)
- ✅ Resumo visual com cards
- ✅ Seção dinâmica em acordeão
- ✅ Badge colorido de situação
- ✅ Links externos (Receita Federal, Google Maps)
- ✅ Tema claro/escuro
- ✅ JSON bruto com copiar
- ✅ Responsivo (mobile/desktop)
- ✅ Cache de 1 hora (evita consultas repetidas)

## 🔧 Requisitos

- WordPress 5.0+
- PHP 7.4+
- Nenhum plugin adicional necessário

## 🗑️ Desinstalação

Desative e exclua o plugin pelo painel do WordPress. Os dados em cache são limpos automaticamente.
