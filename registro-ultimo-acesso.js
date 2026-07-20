// ==========================================
// registro-ultimo-acesso.js
// Atualiza automaticamente o último acesso
// do usuário no Firestore.
// ==========================================

(async function registrarUltimoAcesso() {
    try {

        const auth = firebase.auth();
        const db = firebase.firestore();

        auth.onAuthStateChanged(async (user) => {

            if (!user) return;

            await db.collection("usuarios")
                .doc(user.uid)
                .update({

                    ultimoAcesso: firebase.firestore.FieldValue.serverTimestamp()

                });

            console.log("Último acesso atualizado.");

        });

    } catch (erro) {

        console.error("Erro ao registrar último acesso:", erro);

    }

})();
