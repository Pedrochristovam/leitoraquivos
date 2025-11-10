#!/bin/bash
# Script de build para o Render
# Instala dependências Node.js e faz o build do React
# Depois o Render executa o comando de start do Procfile

echo "🔨 Instalando dependências Node.js..."
npm install

echo "📦 Fazendo build do React..."
npm run build

echo "✅ Build concluído! A pasta dist/ está pronta."






