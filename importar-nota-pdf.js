/**
 * ListaLar — Importador de Nota Fiscal em PDF
 * Arquivo: importar-nota-pdf.js
 * Versão: 1.0.0
 *
 * Responsabilidades:
 * - selecionar um arquivo PDF;
 * - extrair o texto com PDF.js;
 * - interpretar NFC-e gerada pela SEF/MG;
 * - organizar os produtos;
 * - exibir uma tela de conferência;
 *
 * Este arquivo não grava no Firestore nesta primeira versão.
 */

import * as pdfjsLib from
    "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.1.200/build/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.1.200/build/pdf.worker.mjs";

const ImportadorNotaPDF = (() => {
    const ESTADO = {
        arquivo: null,
        textoCompleto: "",
        nota: null
    };

    function criarEstilos() {
        if (document.getElementById("importar-nota-pdf-estilos")) {
            return;
        }

        const style = document.createElement("style");
        style.id = "importar-nota-pdf-estilos";

        style.textContent = `
            .nota-pdf-overlay {
                position: fixed;
                inset: 0;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                background: rgba(15, 23, 42, 0.62);
                backdrop-filter: blur(4px);
            }

            .nota-pdf-modal {
                width: min(760px, 100%);
                max-height: calc(100vh - 40px);
                overflow-y: auto;
                background: #ffffff;
                border-radius: 24px;
                box-shadow: 0 25px 70px rgba(15, 23, 42, 0.28);
            }

            .nota-pdf-cabecalho {
                position: sticky;
                top: 0;
                z-index: 2;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 16px;
                padding: 20px;
                color: #ffffff;
                background: linear-gradient(135deg, #2563eb, #06b6d4);
                border-radius: 24px 24px 0 0;
            }

            .nota-pdf-cabecalho h2 {
                margin: 0;
                font-size: 22px;
            }

            .nota-pdf-fechar {
                width: 42px;
                height: 42px;
                border: 0;
                border-radius: 50%;
                color: #ffffff;
                background: rgba(255, 255, 255, 0.18);
                font-size: 25px;
                cursor: pointer;
            }

            .nota-pdf-conteudo {
                padding: 20px;
            }

            .nota-pdf-seletor {
                padding: 28px 18px;
                border: 2px dashed #93c5fd;
                border-radius: 18px;
                text-align: center;
                background: #eff6ff;
            }

            .nota-pdf-seletor input {
                display: none;
            }

            .nota-pdf-botao {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                min-height: 48px;
                padding: 12px 20px;
                border: 0;
                border-radius: 14px;
                font-size: 16px;
                font-weight: 700;
                cursor: pointer;
            }

            .nota-pdf-botao-principal {
                color: #ffffff;
                background: linear-gradient(135deg, #2563eb, #06b6d4);
            }

            .nota-pdf-botao-secundario {
                color: #334155;
                background: #e2e8f0;
            }

            .nota-pdf-status {
                display: none;
                margin-top: 18px;
                padding: 14px;
                border-radius: 14px;
                background: #f1f5f9;
                color: #334155;
                font-weight: 600;
            }

            .nota-pdf-status.ativo {
                display: block;
            }

            .nota-pdf-resumo {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 12px;
                margin-top: 20px;
            }

            .nota-pdf-card {
                padding: 14px;
                border: 1px solid #dbeafe;
                border-radius: 15px;
                background: #f8fafc;
            }

            .nota-pdf-card span {
                display: block;
                margin-bottom: 5px;
                color: #64748b;
                font-size: 13px;
            }

            .nota-pdf-card strong {
                color: #0f172a;
                font-size: 17px;
            }

            .nota-pdf-tabela-wrapper {
                margin-top: 20px;
                overflow-x: auto;
                border: 1px solid #e2e8f0;
                border-radius: 16px;
            }

            .nota-pdf-tabela {
                width: 100%;
                border-collapse: collapse;
                min-width: 630px;
            }

            .nota-pdf-tabela th,
            .nota-pdf-tabela td {
                padding: 12px;
                border-bottom: 1px solid #e2e8f0;
                text-align: left;
                vertical-align: middle;
            }

            .nota-pdf-tabela th {
                color: #334155;
                background: #f1f5f9;
                font-size: 13px;
            }

            .nota-pdf-tabela input {
                width: 100%;
                min-width: 90px;
                padding: 9px;
                border: 1px solid #cbd5e1;
                border-radius: 9px;
                font-size: 14px;
                box-sizing: border-box;
            }

            .nota-pdf-acoes {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 20px;
            }

            .nota-pdf-erro {
                margin-top: 18px;
                padding: 14px;
                border-radius: 14px;
                color: #991b1b;
                background: #fee2e2;
            }

            @media (max-width: 600px) {
                .nota-pdf-overlay {
                    align-items: flex-end;
                    padding: 0;
                }

                .nota-pdf-modal {
                    max-height: 94vh;
                    border-radius: 22px 22px 0 0;
                }

                .nota-pdf-cabecalho {
                    border-radius: 22px 22px 0 0;
                }

                .nota-pdf-resumo {
                    grid-template-columns: 1fr;
                }

                .nota-pdf-acoes {
                    flex-direction: column-reverse;
                }

                .nota-pdf-botao {
                    width: 100%;
                }
            }
        `;

        document.head.appendChild(style);
    }

    function abrir() {
        criarEstilos();

        fechar();

        const overlay = document.createElement("div");
        overlay.id = "nota-pdf-overlay";
        overlay.className = "nota-pdf-overlay";

        overlay.innerHTML = `
            <section class="nota-pdf-modal">
                <header class="nota-pdf-cabecalho">
                    <div>
                        <h2>Importar nota fiscal</h2>
                        <small>Selecione o PDF salvo pelo navegador</small>
                    </div>

                    <button
                        type="button"
                        class="nota-pdf-fechar"
                        id="nota-pdf-fechar"
                        aria-label="Fechar"
                    >
                        ×
                    </button>
                </header>

                <div class="nota-pdf-conteudo">
                    <div class="nota-pdf-seletor">
                        <div style="font-size: 42px; margin-bottom: 10px;">📄</div>

                        <strong>Escolha o PDF da nota fiscal</strong>

                        <p style="color:#64748b;">
                            O arquivo será analisado antes de qualquer informação
                            ser salva.
                        </p>

                        <label
                            for="nota-pdf-arquivo"
                            class="nota-pdf-botao nota-pdf-botao-principal"
                        >
                            Selecionar PDF
                        </label>

                        <input
                            id="nota-pdf-arquivo"
                            type="file"
                            accept="application/pdf,.pdf"
                        >
                    </div>

                    <div id="nota-pdf-status" class="nota-pdf-status"></div>
                    <div id="nota-pdf-resultado"></div>
                </div>
            </section>
        `;

        document.body.appendChild(overlay);

        document
            .getElementById("nota-pdf-fechar")
            .addEventListener("click", fechar);

        document
            .getElementById("nota-pdf-arquivo")
            .addEventListener("change", tratarSelecaoArquivo);

        overlay.addEventListener("click", (event) => {
            if (event.target === overlay) {
                fechar();
            }
        });
    }

    function fechar() {
        document.getElementById("nota-pdf-overlay")?.remove();
    }

    async function tratarSelecaoArquivo(event) {
        const arquivo = event.target.files?.[0];

        if (!arquivo) {
            return;
        }

        if (
            arquivo.type !== "application/pdf" &&
            !arquivo.name.toLowerCase().endsWith(".pdf")
        ) {
            mostrarErro("Selecione um arquivo PDF válido.");
            return;
        }

        ESTADO.arquivo = arquivo;
        ESTADO.textoCompleto = "";
        ESTADO.nota = null;

        atualizarStatus(`Lendo ${arquivo.name}...`);

        try {
            const texto = await extrairTextoPDF(arquivo);
            const nota = interpretarNotaSEFMG(texto);

            ESTADO.textoCompleto = texto;
            ESTADO.nota = nota;

            validarNota(nota);
            exibirNota(nota);

            atualizarStatus(
                `${nota.itens.length} item(ns) encontrado(s). Confira os dados antes de importar.`
            );
        } catch (erro) {
            console.error("Erro ao importar nota fiscal:", erro);

            mostrarErro(
                erro?.message ||
                "Não foi possível ler este PDF. Verifique o arquivo e tente novamente."
            );
        }
    }

    async function extrairTextoPDF(arquivo) {
        const arrayBuffer = await arquivo.arrayBuffer();

        const documento = await pdfjsLib.getDocument({
            data: new Uint8Array(arrayBuffer)
        }).promise;

        const paginas = [];

        for (
            let numeroPagina = 1;
            numeroPagina <= documento.numPages;
            numeroPagina += 1
        ) {
            const pagina = await documento.getPage(numeroPagina);
            const conteudo = await pagina.getTextContent();

            const linhas = agruparItensEmLinhas(conteudo.items);

            paginas.push(linhas.join("\n"));
        }

        return normalizarTexto(paginas.join("\n"));
    }

    function agruparItensEmLinhas(itens) {
        const grupos = new Map();
        const toleranciaY = 3;

        const ordenados = [...itens].sort((itemA, itemB) => {
            const yA = itemA.transform?.[5] ?? 0;
            const yB = itemB.transform?.[5] ?? 0;

            if (Math.abs(yA - yB) > toleranciaY) {
                return yB - yA;
            }

            const xA = itemA.transform?.[4] ?? 0;
            const xB = itemB.transform?.[4] ?? 0;

            return xA - xB;
        });

        for (const item of ordenados) {
            const texto = String(item.str || "").trim();

            if (!texto) {
                continue;
            }

            const x = item.transform?.[4] ?? 0;
            const y = item.transform?.[5] ?? 0;

            let chaveExistente = null;

            for (const chave of grupos.keys()) {
                if (Math.abs(Number(chave) - y) <= toleranciaY) {
                    chaveExistente = chave;
                    break;
                }
            }

            const chave = chaveExistente ?? String(y);

            if (!grupos.has(chave)) {
                grupos.set(chave, []);
            }

            grupos.get(chave).push({ x, texto });
        }

        return [...grupos.entries()]
            .sort(([yA], [yB]) => Number(yB) - Number(yA))
            .map(([, partes]) => {
                return partes
                    .sort((parteA, parteB) => parteA.x - parteB.x)
                    .map((parte) => parte.texto)
                    .join(" ")
                    .replace(/\s+/g, " ")
                    .trim();
            })
            .filter(Boolean);
    }

    function normalizarTexto(texto) {
        return String(texto || "")
            .replace(/\u00a0/g, " ")
            .replace(/[ \t]+/g, " ")
            .replace(/\r/g, "")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
    }

    function interpretarNotaSEFMG(texto) {
        const linhas = texto
            .split("\n")
            .map((linha) => linha.trim())
            .filter(Boolean);

        return {
            origem: "PDF_SEF_MG",
            mercadoNome: extrairMercado(linhas),
            cnpj: extrairCNPJ(texto),
            dataCompra: extrairDataCompra(texto),
            chaveAcesso: extrairChaveAcesso(texto),
            formaPagamento: extrairFormaPagamento(texto),
            quantidadeTotalItens: extrairQuantidadeTotal(texto),
            valorTotal: extrairValorTotal(texto),
            itens: extrairItensSEFMG(linhas),
            nomeArquivo: ESTADO.arquivo?.name || "",
            importadoEm: new Date().toISOString()
        };
    }

    function extrairMercado(linhas) {
        const indiceTitulo = linhas.findIndex((linha) =>
            /Nota Fiscal de Consumidor Eletrônica/i.test(linha)
        );

        const candidatos = linhas.slice(
            Math.max(0, indiceTitulo + 1),
            indiceTitulo + 7
        );

        const mercado = candidatos.find((linha) => {
            return (
                linha.length >= 4 &&
                !/^CNPJ/i.test(linha) &&
                !/Inscrição Estadual/i.test(linha) &&
                !/Secretaria de Estado/i.test(linha) &&
                !/^\d{2}\/\d{2}\/\d{4}/.test(linha)
            );
        });

        return mercado || "Estabelecimento não identificado";
    }

    function extrairCNPJ(texto) {
        const correspondencia = texto.match(
            /CNPJ\s*:\s*([\d.\-\/]{14,18})/i
        );

        return correspondencia
            ? somenteDigitos(correspondencia[1]).slice(0, 14)
            : "";
    }

    function extrairDataCompra(texto) {
        const datas = [
            ...texto.matchAll(
                /\b(\d{2}\/\d{2}\/\d{4})(?:[,\s]+(\d{2}:\d{2}(?::\d{2})?))?/g
            )
        ];

        if (!datas.length) {
            return "";
        }

        const correspondencia = datas[datas.length - 1];
        const [dia, mes, ano] = correspondencia[1].split("/");
        const horario = correspondencia[2] || "00:00";

        return `${ano}-${mes}-${dia}T${horario}`;
    }

    function extrairChaveAcesso(texto) {
        const blocos = texto.match(
            /(?:\d[\s.-]*){44}/g
        );

        if (!blocos) {
            return "";
        }

        for (const bloco of blocos) {
            const chave = somenteDigitos(bloco);

            if (chave.length === 44) {
                return chave;
            }
        }

        return "";
    }

    function extrairFormaPagamento(texto) {
        const correspondencia = texto.match(
            /Forma de Pagamento\s+(.+?)(?=\n|$)/i
        );

        return correspondencia
            ? correspondencia[1].trim()
            : "";
    }

    function extrairQuantidadeTotal(texto) {
        const correspondencias = [
            ...texto.matchAll(
                /Qtde total de itens\s+(\d+)/gi
            )
        ];

        if (!correspondencias.length) {
            return 0;
        }

        return converterNumero(
            correspondencias[correspondencias.length - 1][1]
        );
    }

    function extrairValorTotal(texto) {
        const correspondencias = [
            ...texto.matchAll(
                /Valor total R\$?\s*:?\s*(?:R\$)?\s*([\d.,]+)/gi
            )
        ];

        if (!correspondencias.length) {
            return 0;
        }

        return converterMoeda(
            correspondencias[correspondencias.length - 1][1]
        );
    }

    function extrairItensSEFMG(linhas) {
        const itens = [];
        const textoUnificado = linhas.join("\n");

        const padraoItem =
            /(.+?)\s*\(Código:\s*(\d+)\)\s*Qtde total de itens:\s*([\d.,]+)\s*UN:\s*([A-Za-z]+)\s*Valor total R\$:\s*R?\$?\s*([\d.,]+)/gi;

        let correspondencia;

        while (
            (correspondencia = padraoItem.exec(textoUnificado)) !== null
        ) {
            const descricao = limparDescricaoItem(
                correspondencia[1]
            );

            if (
                !descricao ||
                /Filtrar itens/i.test(descricao) ||
                /Nota Fiscal/i.test(descricao)
            ) {
                continue;
            }

            const quantidade = converterNumero(
                correspondencia[3]
            );

            const valorTotal = converterMoeda(
                correspondencia[5]
            );

            itens.push({
                descricaoOriginal: descricao,
                produtoNome: formatarNomeProduto(descricao),
                codigo: correspondencia[2],
                quantidade,
                unidade: correspondencia[4].toUpperCase(),
                precoTotal: valorTotal,
                precoUnitario:
                    quantidade > 0
                        ? arredondarMoeda(valorTotal / quantidade)
                        : valorTotal
            });
        }

        if (itens.length) {
            return removerItensDuplicados(itens);
        }

        return extrairItensPorLinhas(linhas);
    }

    function extrairItensPorLinhas(linhas) {
        const itens = [];

        for (let indice = 0; indice < linhas.length; indice += 1) {
            const linha = linhas[indice];

            const inicio = linha.match(
                /^(.*?)\s*\(Código:\s*(\d+)\)/i
            );

            if (!inicio) {
                continue;
            }

            const bloco = linhas
                .slice(indice, indice + 6)
                .join(" ");

            const quantidadeMatch = bloco.match(
                /Qtde total de itens:\s*([\d.,]+)/i
            );

            const unidadeMatch = bloco.match(
                /UN:\s*([A-Za-z]+)/i
            );

            const valorMatch = bloco.match(
                /Valor total R\$:\s*R?\$?\s*([\d.,]+)/i
            );

            if (!quantidadeMatch || !valorMatch) {
                continue;
            }

            const quantidade = converterNumero(
                quantidadeMatch[1]
            );

            const valorTotal = converterMoeda(
                valorMatch[1]
            );

            itens.push({
                descricaoOriginal: limparDescricaoItem(inicio[1]),
                produtoNome: formatarNomeProduto(inicio[1]),
                codigo: inicio[2],
                quantidade,
                unidade: (
                    unidadeMatch?.[1] || "UN"
                ).toUpperCase(),
                precoTotal: valorTotal,
                precoUnitario:
                    quantidade > 0
                        ? arredondarMoeda(valorTotal / quantidade)
                        : valorTotal
            });
        }

        return removerItensDuplicados(itens);
    }

    function limparDescricaoItem(descricao) {
        return String(descricao || "")
            .replace(
                /.*?(?:Filtrar itens|Filtar itens)\s*/i,
                ""
            )
            .replace(/\s+/g, " ")
            .trim();
    }

    function formatarNomeProduto(descricao) {
        const texto = limparDescricaoItem(descricao).toLowerCase();

        return texto.replace(/\b\p{L}/gu, (letra) =>
            letra.toUpperCase()
        );
    }

    function removerItensDuplicados(itens) {
        const mapa = new Map();

        for (const item of itens) {
            const chave = [
                item.codigo,
                item.descricaoOriginal,
                item.quantidade,
                item.precoTotal
            ].join("|");

            if (!mapa.has(chave)) {
                mapa.set(chave, item);
            }
        }

        return [...mapa.values()];
    }

    function validarNota(nota) {
        if (!nota.itens.length) {
            throw new Error(
                "O PDF foi aberto, mas nenhum produto foi reconhecido."
            );
        }

        if (!nota.valorTotal) {
            nota.valorTotal = arredondarMoeda(
                nota.itens.reduce(
                    (total, item) => total + item.precoTotal,
                    0
                )
            );
        }

        if (!nota.quantidadeTotalItens) {
            nota.quantidadeTotalItens = nota.itens.length;
        }
    }

    function exibirNota(nota) {
        const resultado = document.getElementById(
            "nota-pdf-resultado"
        );

        if (!resultado) {
            return;
        }

        resultado.innerHTML = `
            <div class="nota-pdf-resumo">
                <div class="nota-pdf-card">
                    <span>Estabelecimento</span>
                    <strong>${escaparHTML(nota.mercadoNome)}</strong>
                </div>

                <div class="nota-pdf-card">
                    <span>CNPJ</span>
                    <strong>${escaparHTML(formatarCNPJ(nota.cnpj))}</strong>
                </div>

                <div class="nota-pdf-card">
                    <span>Produtos encontrados</span>
                    <strong>${nota.itens.length}</strong>
                </div>

                <div class="nota-pdf-card">
                    <span>Valor total</span>
                    <strong>${formatarMoeda(nota.valorTotal)}</strong>
                </div>
            </div>

            <div class="nota-pdf-tabela-wrapper">
                <table class="nota-pdf-tabela">
                    <thead>
                        <tr>
                            <th>Produto</th>
                            <th>Quantidade</th>
                            <th>Unidade</th>
                            <th>Preço unitário</th>
                            <th>Total</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${nota.itens
                            .map((item, indice) =>
                                criarLinhaItem(item, indice)
                            )
                            .join("")}
                    </tbody>
                </table>
            </div>

            <div class="nota-pdf-acoes">
                <button
                    type="button"
                    class="nota-pdf-botao nota-pdf-botao-secundario"
                    id="nota-pdf-cancelar"
                >
                    Cancelar
                </button>

                <button
                    type="button"
                    class="nota-pdf-botao nota-pdf-botao-principal"
                    id="nota-pdf-confirmar"
                >
                    Confirmar importação
                </button>
            </div>
        `;

        resultado
            .querySelector("#nota-pdf-cancelar")
            ?.addEventListener("click", fechar);

        resultado
            .querySelector("#nota-pdf-confirmar")
            ?.addEventListener("click", confirmarImportacao);
    }

    function criarLinhaItem(item, indice) {
        return `
            <tr data-indice="${indice}">
                <td>
                    <input
                        type="text"
                        data-campo="produtoNome"
                        value="${escaparAtributo(item.produtoNome)}"
                    >
                </td>

                <td>
                    <input
                        type="number"
                        data-campo="quantidade"
                        min="0"
                        step="0.001"
                        value="${item.quantidade}"
                    >
                </td>

                <td>
                    <input
                        type="text"
                        data-campo="unidade"
                        value="${escaparAtributo(item.unidade)}"
                    >
                </td>

                <td>
                    <input
                        type="number"
                        data-campo="precoUnitario"
                        min="0"
                        step="0.01"
                        value="${item.precoUnitario.toFixed(2)}"
                    >
                </td>

                <td>
                    <input
                        type="number"
                        data-campo="precoTotal"
                        min="0"
                        step="0.01"
                        value="${item.precoTotal.toFixed(2)}"
                    >
                </td>
            </tr>
        `;
    }

    function confirmarImportacao() {
        const linhas = document.querySelectorAll(
            ".nota-pdf-tabela tbody tr"
        );

        const itensRevisados = [...linhas].map((linha) => {
            const indice = Number(linha.dataset.indice);
            const itemOriginal = ESTADO.nota.itens[indice];

            const obterValor = (campo) => {
                return linha.querySelector(
                    `[data-campo="${campo}"]`
                )?.value;
            };

            return {
                ...itemOriginal,
                produtoNome: obterValor("produtoNome")?.trim() || "",
                quantidade: converterNumero(
                    obterValor("quantidade")
                ),
                unidade:
                    obterValor("unidade")?.trim().toUpperCase() || "UN",
                precoUnitario: converterNumero(
                    obterValor("precoUnitario")
                ),
                precoTotal: converterNumero(
                    obterValor("precoTotal")
                )
            };
        });

        const notaConfirmada = {
            ...ESTADO.nota,
            itens: itensRevisados,
            revisadaEm: new Date().toISOString()
        };

        window.dispatchEvent(
            new CustomEvent("listalar:nota-pdf-importada", {
                detail: notaConfirmada
            })
        );

        console.log(
            "Nota fiscal pronta para salvar:",
            notaConfirmada
        );

        alert(
            `${notaConfirmada.itens.length} produtos foram lidos corretamente.`
        );

        fechar();
    }

    function atualizarStatus(mensagem) {
        const status = document.getElementById("nota-pdf-status");

        if (!status) {
            return;
        }

        status.textContent = mensagem;
        status.classList.add("ativo");
    }

    function mostrarErro(mensagem) {
        const resultado = document.getElementById(
            "nota-pdf-resultado"
        );

        atualizarStatus("Não foi possível concluir a leitura.");

        if (resultado) {
            resultado.innerHTML = `
                <div class="nota-pdf-erro">
                    ${escaparHTML(mensagem)}
                </div>
            `;
        }
    }

    function converterMoeda(valor) {
        const texto = String(valor || "")
            .replace(/[^\d,.-]/g, "")
            .trim();

        if (!texto) {
            return 0;
        }

        if (texto.includes(",")) {
            return Number(
                texto.replace(/\./g, "").replace(",", ".")
            ) || 0;
        }

        return Number(texto) || 0;
    }

    function converterNumero(valor) {
        const texto = String(valor ?? "")
            .replace(/[^\d,.-]/g, "")
            .trim();

        if (!texto) {
            return 0;
        }

        if (texto.includes(",") && texto.includes(".")) {
            return Number(
                texto.replace(/\./g, "").replace(",", ".")
            ) || 0;
        }

        if (texto.includes(",")) {
            return Number(texto.replace(",", ".")) || 0;
        }

        return Number(texto) || 0;
    }

    function arredondarMoeda(valor) {
        return Math.round((Number(valor) + Number.EPSILON) * 100) / 100;
    }

    function somenteDigitos(valor) {
        return String(valor || "").replace(/\D/g, "");
    }

    function formatarMoeda(valor) {
        return Number(valor || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }

    function formatarCNPJ(cnpj) {
        const numeros = somenteDigitos(cnpj);

        if (numeros.length !== 14) {
            return cnpj || "Não identificado";
        }

        return numeros.replace(
            /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
            "$1.$2.$3/$4-$5"
        );
    }

    function escaparHTML(valor) {
        return String(valor ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function escaparAtributo(valor) {
        return escaparHTML(valor);
    }

    return {
        abrir,
        fechar,
        obterUltimaNota() {
            return ESTADO.nota
                ? structuredClone(ESTADO.nota)
                : null;
        }
    };
})();

window.ImportadorNotaPDF = ImportadorNotaPDF;

window.addEventListener(
    "listalar:abrir-importador-nota",
    () => ImportadorNotaPDF.abrir()
);

console.log(
    "✅ Importador de nota fiscal PDF carregado — versão 1.0.0"
);
