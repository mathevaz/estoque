// --- IMPORTAÇÃO DO FIREBASE (Não mexa aqui) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-firestore.js";

// --- CONFIGURAÇÃO ---
// ⚠️ SUBSTITUA O CÓDIGO ABAIXO PELO QUE COPIASTE DO SITE DO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyDnGDlAu9lNqrAN72kwmL256utQhhmicxY",
  authDomain: "estoque-loja-app.firebaseapp.com",
  projectId: "estoque-loja-app",
  storageBucket: "estoque-loja-app.firebasestorage.app",
  messagingSenderId: "909627341400",
  appId: "1:909627341400:web:0a3a5fb8dc8de44637682d"
};

// Inicializando o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const produtosRef = collection(db, "produtos"); // Nome da tabela no banco

// Variável global para o gráfico
let chartInstance = null;

// --- FUNÇÕES GLOBAIS (Para o HTML conseguir ver) ---
// Como usamos 'module', precisamos "pendurar" as funções na janela (window)
window.adicionarProduto = adicionarProduto;
window.alterarQtd = alterarQtd;
window.deletarProduto = deletarProduto;
window.filtrarProdutos = filtrarProdutos;

// --- ESCUTAR O BANCO DE DADOS (Tempo Real) ---
// Em vez de carregarDados(), usamos onSnapshot.
// Ele roda SOZINHO sempre que algo muda no banco (seja no PC ou no celular).
onSnapshot(produtosRef, (snapshot) => {
    let lista = [];
    snapshot.docs.forEach(doc => {
        lista.push({ ...doc.data(), id: doc.id });
    });
    
    // Atualiza a tela sempre que receber dados novos
    renderizarTabela(lista);
    window.listaGlobal = lista; // Guarda numa variável para a busca funcionar
});

// --- ADICIONAR ---
async function adicionarProduto() {
    let nome = document.getElementById('produto').value;
    let qtd = Number(document.getElementById('quantidade').value);
    let custo = Number(document.getElementById('custo').value);
    let venda = Number(document.getElementById('venda').value);

    if (nome === "" || custo <= 0 || venda <= 0) {
        alert("Preencha os campos corretamente!");
        return;
    }

    try {
        await addDoc(produtosRef, {
            nome: nome,
            qtd: qtd,
            custo: custo,
            venda: venda,
            dataCriacao: Date.now()
        });
        limparCampos();
    } catch (e) {
        console.error("Erro ao adicionar: ", e);
        alert("Erro ao salvar na nuvem!");
    }
}

// --- ALTERAR QUANTIDADE ---
async function alterarQtd(id, valor, qtdAtual) {
    let novaQtd = qtdAtual + valor;
    if (novaQtd < 0) novaQtd = 0;

    const itemRef = doc(db, "produtos", id);
    await updateDoc(itemRef, {
        qtd: novaQtd
    });
}

// --- DELETAR ---
async function deletarProduto(id) {
    if(confirm("Apagar este produto?")) {
        await deleteDoc(doc(db, "produtos", id));
    }
}

// --- FILTRO DE BUSCA (Local) ---
function filtrarProdutos() {
    let termo = document.getElementById('campo-busca').value.toLowerCase();
    if(window.listaGlobal) {
        let filtrados = window.listaGlobal.filter(item => 
            item.nome.toLowerCase().includes(termo)
        );
        renderizarTabela(filtrados);
    }
}

// --- RENDERIZAR TELA (Tabela + Gráfico + Cards) ---
function renderizarTabela(lista) {
    let tabela = document.getElementById('lista-estoque');
    tabela.innerHTML = "";
    
    let totalItens = 0;
    let valorTotal = 0;
    let alertas = 0;

    // Ordenar por nome
    lista.sort((a, b) => a.nome.localeCompare(b.nome));

    lista.forEach(item => {
        // Cálculos
        totalItens += item.qtd;
        valorTotal += (item.custo * item.qtd);
        if (item.qtd < 3) alertas++;

        let lucro = 0;
        if(item.custo > 0) {
             lucro = (((item.venda - item.custo) / item.custo) * 100).toFixed(0);
        }

        let linha = tabela.insertRow();
        
        // Nome
        let nomeHTML = item.nome;
        if(item.qtd < 3) nomeHTML += ` <span class="tag-alerta">Baixo</span>`;
        linha.insertCell(0).innerHTML = nomeHTML;

        // Qtd com botões (Passamos a qtd atual para a função)
        linha.insertCell(1).innerHTML = `
            <button class="btn-mini btn-menos" onclick="alterarQtd('${item.id}', -1, ${item.qtd})"><i class="fas fa-minus"></i></button>
            <span style="margin:0 10px; font-weight:bold">${item.qtd}</span>
            <button class="btn-mini btn-mais" onclick="alterarQtd('${item.id}', 1, ${item.qtd})"><i class="fas fa-plus"></i></button>
        `;

        linha.insertCell(2).innerText = `R$ ${item.custo.toFixed(2)}`;
        linha.insertCell(3).innerText = `R$ ${item.venda.toFixed(2)}`;
        linha.insertCell(4).innerHTML = `<span class="lucro-bom">${lucro}%</span>`;
        
        linha.insertCell(5).innerHTML = `
            <button class="btn-mini btn-lixo" onclick="deletarProduto('${item.id}')"><i class="fas fa-trash"></i></button>
        `;
    });

    // Atualiza cards
    document.getElementById('total-itens').innerText = totalItens;
    document.getElementById('valor-estoque').innerText = `R$ ${valorTotal.toFixed(2)}`;
    document.getElementById('alertas-qtd').innerText = alertas;

    // Atualiza Gráfico
    atualizarGrafico(lista);
}

function limparCampos() {
    document.getElementById('produto').value = "";
    document.getElementById('quantidade').value = "";
    document.getElementById('custo').value = "";
    document.getElementById('venda').value = "";
}

// --- GRÁFICO (Chart.js) ---
function atualizarGrafico(lista) {
    const ctx = document.getElementById('meuGrafico').getContext('2d');
    // Top 5 produtos
    let topProdutos = [...lista].sort((a, b) => b.qtd - a.qtd).slice(0, 5);
    let nomes = topProdutos.map(p => p.nome);
    let quantidades = topProdutos.map(p => p.qtd);

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: nomes,
            datasets: [{
                label: 'Top 5 Estoque',
                data: quantidades,
                backgroundColor: 'rgba(156, 39, 176, 0.7)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });
}