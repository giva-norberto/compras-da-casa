// ==========================================
// ListaLar - Menu Administrativo
// Mostra o botão "Administração"
// apenas para o administrador.
// ==========================================

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const EMAIL_ADMIN = "giva.norberto@gmail.com";

function criarBotaoAdmin() {

    if (document.getElementById("tab-admin")) return;

    const menu = document.querySelector(".bottom-nav");

    if (!menu) return;

    // Ajusta para 4 colunas
    menu.style.gridTemplateColumns = "repeat(4,1fr)";

    const botao = document.createElement("button");

    botao.id = "tab-admin";
    botao.className = "tab";
    botao.type = "button";

    botao.innerHTML = `
        <span class="ico">⚙️</span>
        <span>Admin</span>
    `;

    botao.onclick = () => {

        window.location.href = "admin.html";

    };

    menu.appendChild(botao);

}

function removerBotaoAdmin(){

    const botao = document.getElementById("tab-admin");

    if(botao){

        botao.remove();

    }

    const menu = document.querySelector(".bottom-nav");

    if(menu){

        menu.style.gridTemplateColumns = "repeat(3,1fr)";

    }

}

const auth = getAuth();

onAuthStateChanged(auth,(user)=>{

    if(
        user &&
        user.email &&
        user.email.toLowerCase()===EMAIL_ADMIN
    ){

        criarBotaoAdmin();

    }else{

        removerBotaoAdmin();

    }

});
