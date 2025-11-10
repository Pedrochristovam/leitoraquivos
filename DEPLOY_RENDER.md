# 🚀 Guia de Deploy no Render

## ✅ Alterações Realizadas

### 1. Servidor atualizado (`servidor.py`)
- ✅ Removida dependência do Jinja2Templates
- ✅ Servidor agora serve **apenas o build do React** (pasta `dist/`)
- ✅ A pasta `templates/` não é mais usada
- ✅ Arquivos estáticos do React são servidos corretamente

### 2. Dependências atualizadas (`requirements.txt`)
- ✅ Removido `jinja2` (não é mais necessário)

### 3. Script de build (`build.sh`)
- ✅ Script que instala dependências Node.js e faz o build do React
- ✅ Cria a pasta `dist/` com o build de produção

### 4. Procfile
- ✅ Configurado para usar Gunicorn
- ✅ Comando: `gunicorn servidor:app`

## 📋 Configuração no Render

### Passo a Passo

1. **Acesse o Render Dashboard**
   - Vá para https://render.com
   - Faça login na sua conta

2. **Crie um novo Web Service**
   - Clique em "New +" → "Web Service"
   - Conecte seu repositório GitHub

3. **Configure o serviço:**
   ```
   Name: sistema-contratos-3026 (ou o nome que preferir)
   Environment: Python 3
   Region: Escolha a região mais próxima
   Branch: main (ou a branch que você usa)
   Root Directory: . (raiz do projeto)
   ```

4. **Configure o Build:**
   ```
   Build Command: chmod +x build.sh && ./build.sh
   ```
   
   Ou se preferir usar npm diretamente:
   ```
   Build Command: npm install && npm run build
   ```

5. **Configure o Start:**
   ```
   Start Command: gunicorn servidor:app
   ```

6. **Plan:**
   - Escolha "Free" (ou um plano pago se necessário)

7. **Clique em "Create Web Service"**

## 🔍 Verificação

Após o deploy:

1. ✅ Acesse a URL fornecida pelo Render
2. ✅ Você deve ver o **design React moderno**
3. ✅ Teste o upload de um arquivo Excel
4. ✅ Verifique se o processamento funciona

## ⚠️ Importante

- **A pasta `templates/` não é mais usada** - o servidor serve apenas o build do React
- **A pasta `dist/` não precisa ser commitada** - ela é gerada durante o build no Render
- **Certifique-se de que o build do React seja executado** antes de iniciar o servidor

## 🐛 Troubleshooting

### Erro: "React build not found"
- Verifique se o Build Command está configurado corretamente
- Verifique os logs do build no Render
- Certifique-se de que `npm install` e `npm run build` estão sendo executados

### Erro: "Module not found"
- Verifique se todas as dependências estão no `requirements.txt` e `package.json`
- Verifique os logs do build

### Design antigo ainda aparece
- Certifique-se de que o servidor está servindo da pasta `dist/`
- Verifique se o build do React foi executado com sucesso
- Limpe o cache do navegador (Ctrl+Shift+R ou Cmd+Shift+R)

## 📝 Notas

- O Render executa o Build Command toda vez que você faz push para o repositório
- A primeira vez pode demorar alguns minutos
- Os arquivos em `uploads/` e `resultados/` são temporários e serão perdidos quando o serviço reiniciar (no plano Free)






