#!/bin/bash

# Script para atualizar o GitHub com todas as modificações
# Uso: ./update-github.sh "mensagem do commit"

cd /home/z/my-project

# Verifica se há alterações
if [ -z "$(git status --porcelain)" ]; then
    echo "✅ Nenhuma alteração para enviar."
    exit 0
fi

# Usa a mensagem fornecida ou uma padrão
MESSAGE="${1:-'update: modificações no projeto'}"

echo "📦 Enviando alterações para o GitHub..."

git add .
git commit -m "$MESSAGE"
git push origin main

echo "✅ Alterações enviadas com sucesso!"
