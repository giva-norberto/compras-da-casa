// ==========================================
// registro-ultimo-acesso.js
// Registra o último acesso do usuário
// usando Firebase modular.
// ==========================================

import {
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    getFirestore,
    doc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const auth = getAuth();
const db = getFirestore();

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        return;
    }

    try {
        await updateDoc(
            doc(db, "usuarios", user.uid),
            {
                ultimoAcesso: serverTimestamp()
            }
        );

        console.log("Último acesso atualizado com sucesso.");
    } catch (erro) {
        console.error("Erro ao registrar último acesso:", erro);
    }
});
