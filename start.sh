#!/bin/bash

GREEN='\033[1;32m'
BLUE='\033[0;34m'

while :
do
    # Texto de conexão
    printf "${BLUE} NEEXT LTDA 𝐂𝐎𝐍𝐄𝐂𝐓𝐀𝐍𝐃𝐎, 𝐀𝐆𝐔𝐀𝐑𝐃𝐄\n"

    # Chama index.js com parâmetro opcional
    if [ "$1" = "sim" ]; then
        node index.js sim
    elif [ "$1" = "não" ]; then
        node connect.js não
    else
        node connect.js
    fi

    # Texto de inicialização
    printf "${GREEN}『 NEEXT LTDA 』𝐈𝐍𝐈𝐂𝐈𝐀𝐍𝐃𝐎  𝐍𝐎𝐕𝐀𝐌𝐄𝐍𝐓𝐄\n"

    sleep 1
done