// Variável global para controlar o gráfico (para podermos atualizar ele)
let chartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    carregarDados();
});

function adicionarProduto() {
    let nome = document.getElementById('produto').value;
    let qtd = Number(document.getElementById('quantidade').value);
    let custo = Number(document.getElementById('custo').value);
    let venda = Number(document.getElementById('venda').value);

    if (nome === "" || custo <= 0 || venda <= 0) {
        alert("Preencha os campos corretamente!");
        return;
    }

    let produto = {
        nome: nome,
        qtd: qtd,
        custo: custo,
        venda: venda,
        id: Date.now()
    };

    let lista = lerEstoque();
    lista.push(produto);
    salvarEstoque(lista);
    
    limparCampos();
    carregarDados();
}

function alterarQtd(id, valor) {
    let lista = lerEstoque();
    let index = lista.findIndex(p => p.id === id);
    
    if (index !== -1) {
        lista[index].qtd += valor;
        if (lista[index].qtd < 0) lista[index].qtd = 0;
        salvarEstoque(lista);
        carregarDados();
    }
}

function deletarProduto(id) {
    if(confirm("Apagar este produto?")) {
        let lista = lerEstoque();
        let novaLista = lista.filter(p => p.id !== id);
        salvarEstoque(novaLista);
        carregarDados();
    }
}

function filtrarProdutos() {
    let termo = document.getElementById('campo-busca').value.toLowerCase();
    carregarDados(termo);
}

function carregarDados(filtro = "") {
    let tabela = document.getElementById('lista-estoque');
    tabela.innerHTML = "";
    
    let lista = lerEstoque();
    
    let totalItens = 0;
    let valorTotal = 0;
    let alertas = 0;

    lista.forEach(item => {
        // Cálculos do Dashboard
        totalItens += item.qtd;
        valorTotal += (item.custo * item.qtd);
        if (item.qtd < 3) alertas++;

        // Filtro de Busca
        if (filtro && !item.nome.toLowerCase().includes(filtro)) return;

        // Renderizar Tabela
        let lucro = (((item.venda - item.custo) / item.custo) * 100).toFixed(0);
        let linha = tabela.insertRow();
        
        let nomeHTML = item.nome;
        if(item.qtd < 3) nomeHTML += ` <span class="tag-alerta">Baixo</span>`;
        linha.insertCell(0).innerHTML = nomeHTML;

        linha.insertCell(1).innerHTML = `
            <button class="btn-mini btn-menos" onclick="alterarQtd(${item.id}, -1)"><i class="fas fa-minus"></i></button>
            <span style="margin:0 10px; font-weight:bold">${item.qtd}</span>
            <button class="btn-mini btn-mais" onclick="alterarQtd(${item.id}, 1)"><i class="fas fa-plus"></i></button>
        `;

        linha.insertCell(2).innerText = `R$ ${item.custo.toFixed(2)}`;
        linha.insertCell(3).innerText = `R$ ${item.venda.toFixed(2)}`;
        linha.insertCell(4).innerHTML = `<span class="lucro-bom">${lucro}%</span>`;
        
        linha.insertCell(5).innerHTML = `
            <button class="btn-mini btn-lixo" onclick="deletarProduto(${item.id})"><i class="fas fa-trash"></i></button>
        `;
    });

    // Atualiza cards
    document.getElementById('total-itens').innerText = totalItens;
    document.getElementById('valor-estoque').innerText = `R$ ${valorTotal.toFixed(2)}`;
    document.getElementById('alertas-qtd').innerText = alertas;

    // Atualiza o gráfico
    atualizarGrafico(lista);
}

// --- FUNÇÕES AUXILIARES ---

function lerEstoque() {
    return JSON.parse(localStorage.getItem('meuEstoquePro')) || [];
}
function salvarEstoque(lista) {
    localStorage.setItem('meuEstoquePro', JSON.stringify(lista));
}
function limparCampos() {
    document.getElementById('produto').value = "";
    document.getElementById('quantidade').value = "";
    document.getElementById('custo').value = "";
    document.getElementById('venda').value = "";
}

// --- LÓGICA DO GRÁFICO (Chart.js) ---
function atualizarGrafico(lista) {
    const ctx = document.getElementById('meuGrafico').getContext('2d');

    // Ordenar a lista para pegar os top 5 com mais quantidade
    // O comando 'sort' organiza do maior para o menor (b - a)
    let topProdutos = lista.sort((a, b) => b.qtd - a.qtd).slice(0, 5);

    // Preparar dados para o gráfico
    let nomes = topProdutos.map(p => p.nome);
    let quantidades = topProdutos.map(p => p.qtd);

    // Se já existe um gráfico, destrói ele antes de criar um novo (para não sobrepor)
    if (chartInstance) {
        chartInstance.destroy();
    }

    // Criar novo gráfico
    chartInstance = new Chart(ctx, {
        type: 'bar', // Tipo barra (pode ser 'pie', 'line', etc.)
        data: {
            labels: nomes,
            datasets: [{
                label: 'Quantidade em Estoque',
                data: quantidades,
                backgroundColor: [
                    'rgba(156, 39, 176, 0.7)', // Roxo
                    'rgba(54, 162, 235, 0.7)', // Azul
                    'rgba(255, 206, 86, 0.7)', // Amarelo
                    'rgba(75, 192, 192, 0.7)', // Verde
                    'rgba(255, 99, 132, 0.7)'  // Vermelho
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}