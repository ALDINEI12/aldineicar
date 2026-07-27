 


 
 
 const supabaseUrl = 'https://nhqipyzikujszddoxlir.supabase.co';
    const supabaseKey = 'sb_publishable_PRTUmHIzf0pbq09qn9RwvQ_DZQowl4D';
    const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
    const formatarData = (dataStr) => {
    if (!dataStr) return '--/--/----';
    // Se a data já estiver no formato brasileiro, retorna ela. 
    // Se for ISO (YYYY-MM-DD), você pode converter aqui:
    return dataStr; 
};

    let usuarioAtualId = null;
    let materiais = [];
    let historico = [];
    let clientes = []; 
    let maoObraItens = [];
    let dadosOficina = { 
        nome: 'ALDINEICAR', 
        cnpj: '', 
        end: '', 
        cep: '', 
        fone: '', 
        email: '', 
        pix: '', 
        logoBase64: '',
        profissao: 'pintor'
    };
    let categoriaAtual = 'Todos';
    let acaoConfirmada = null;

    const configuracoesProfissoes = {
        pintor: {
            nome: "Pintura Automotiva",
            labelSecao: "VEÍCULO",
            categorias: ['Todos', 'Primer', 'Tintas', 'Verniz', 'Massa', 'Thinner', 'Acessórios'],
            materiais: [
                {nome:'Primer PU',valor:25,qtd:0,cat:'Primer'},
                {nome:'Verniz PU',valor:65,qtd:0,cat:'Verniz'},
                {nome:'Massa Poliéster',valor:30,qtd:0,cat:'Massa'},
                {nome:'Preto Ninja',valor:55,qtd:0,cat:'Tintas'}
            ]
        },
        mecanico: {
            nome: "Mecânica Geral",
            labelSecao: "VEÍCULO",
            categorias: ['Todos', 'Óleos/Fluidos', 'Filtros', 'Suspensão', 'Freios', 'Motor', 'Peças'],
            materiais: [
                {nome:'Óleo Motor 5W30 (Litro)',valor:45,qtd:0,cat:'Óleos/Fluidos'},
                {nome:'Filtro de Óleo',valor:35,qtd:0,cat:'Filtros'},
                {nome:'Jogo de Pastilhas de Freio',valor:120,qtd:0,cat:'Freios'},
                {nome:'Vela de Ignição',valor:25,qtd:0,cat:'Motor'}
            ]
        },
        eletricista: {
            nome: "Elétrica Profissional",
            labelSecao: "EQUIPAMENTO",
            categorias: ['Todos', 'Fiação', 'Fusíveis/Relés', 'Iluminação', 'Conectores', 'Isolantes'],
            materiais: [
                {nome:'Fita Isolante 20m',valor:12,qtd:0,cat:'Isolantes'},
                {nome:'Fusível Lâmina 10A',valor:1.50,qtd:0,cat:'Fusíveis/Relés'},
                {nome:'Relé Auxiliar 4 Pinos',valor:22,qtd:0,cat:'Fusíveis/Relés'},
                {nome:'Fio Flexível 2.5mm (Metro)',valor:4,qtd:0,cat:'Fiação'},
                {nome:'Lâmpada H7 Halógena',valor:35,qtd:0,cat:'Iluminação'}
            ]
        },
        funileiro: {
            nome: "Funilaria e Chaparia",
            labelSecao: "VEÍCULO",
            categorias: ['Todos', 'Chaparia', 'Solda', 'Abrasivos', 'Massas', 'Ferramentas'],
            materiais: [
                {nome:'Chapa de Aço Galv.',valor:80,qtd:0,cat:'Chaparia'},
                {nome:'Arame p/ Solda MIG (Kg)',valor:45,qtd:0,cat:'Solda'},
                {nome:'Disco de Corte 4.5',valor:7,qtd:0,cat:'Abrasivos'},
                {nome:'Massa Plástica',valor:18,qtd:0,cat:'Massas'}
            ]
        }
    };

    const materiaisPadrao = [
        {nome:'Primer PU',valor:25,qtd:0,cat:'Primer'},
        {nome:'Verniz PU',valor:65,qtd:0,cat:'Verniz'},
        {nome:'Massa Poliéster',valor:30,qtd:0,cat:'Massa'},
        {nome:'Preto Ninja',valor:55,qtd:0,cat:'Tintas'}
    ];

  async function carregarDadosDoUsuario(userId) {
    if (!userId) return;
    usuarioAtualId = userId;
    
    // Mova a declaração PARA CIMA de qualquer lógica de bloco
    let localTimestamp = 0;
    
    const fallback = localStorage.getItem(`aldineicar_fallback_${userId}`);
    
    if (fallback) {
        const parsed = JSON.parse(fallback);
        materiais = parsed.materiais || [...materiaisPadrao];
        historico = parsed.historico || [];
        clientes = parsed.clientes || [];
        maoObraItens = parsed.maoObraItens || [];
        dadosOficina = parsed.dadosOficina || dadosOficina;
        // Garantimos que a variável seja atribuída corretamente
        localTimestamp = parsed.local_updated_at || 0; 
    } else {
        materiais = [...materiaisPadrao];
    }

    try {
        const { data, error } = await supabaseClient
            .from('user_data')
            .select('*')
            .eq('user_id', userId);

        if (error) {
            console.error("Erro ao buscar do Supabase:", error);
        } else if (data && data.length > 0) {
            const registro = data[0];
            const cloudTimestamp = registro.updated_at ? new Date(registro.updated_at).getTime() : 0;
            
            // Agora a variável 'localTimestamp' é acessível com segurança aqui
            if (localTimestamp > cloudTimestamp) {
                console.log("Sincronizando com a nuvem...");
                await salvarNoBanco(true); 
            } else {
                if (registro.materiais && registro.materiais.length > 0) materiais = registro.materiais;
                if (registro.historico && registro.historico.length > 0) historico = registro.historico;
                if (registro.clientes && registro.clientes.length > 0) {
                    clientes = registro.clientes.map(c => typeof c === 'string' ? {nome: c, endereco: '', tel: '', cidade: ''} : c);
                }
                if (registro.mao_obra && registro.mao_obra.length > 0) maoObraItens = registro.mao_obra;
                if (registro.dados_oficina) dadosOficina = registro.dados_oficina;
                
                salvarFallbackLocal();
            }
        } else {
            await salvarNoBanco(true);
        }
    } catch (err) {
        console.error("Erro na comunicação com a nuvem:", err);
    }

    // Renderizações...
    atualizarInputsOficina();
    atualizarLogoHeader(); 
    if(!dadosOficina.profissao) dadosOficina.profissao = 'pintor';
    renderCategoriasETelas(); 
    configurarResumoPorProfissao();
    render();
    renderMaoObra();
    renderHistorico();
    renderClientes();
}

async function cadastrarProdutoLoja() {
    const nome = document.getElementById('prodNome').value;
    const preco = document.getElementById('prodPreco').value;
    const descricao = document.getElementById('prodDesc').value;
    const estoque = document.getElementById('prodEstoque').value;

    if (!nome || !preco) {
        alert("Preencha ao menos o Nome e o Preço!");
        return;
    }

    const { error } = await supabaseClient
        .from('produtos_loja')
        .insert([{ 
            user_id: usuarioAtualId, 
            nome: nome, 
            preco: preco, 
            descricao: descricao, 
            estoque: estoque // Agora o estoque está sendo enviado
        }]);

    if (error) {
        alert("Erro ao salvar: " + error.message);
    } else {
        alert("Produto salvo com sucesso!");
        // Limpar campos
        document.getElementById('prodNome').value = '';
        document.getElementById('prodPreco').value = '';
        document.getElementById('prodDesc').value = '';
        document.getElementById('prodEstoque').value = '';
        
        fecharModal();
        await carregarProdutosDaLoja(); // Atualiza a vitrine
    }
}

function fecharModal() {
    document.getElementById('modal-cadastro-produto').style.display = 'none';
}

function fecharModal() {
    document.getElementById('modal-cadastro-produto').style.display = 'none';
}

// Atualize sua função de cadastro para fechar o modal ao salvar
async function cadastrarProdutoLoja() {
    // 1. Buscamos os elementos
    const inputNome = document.getElementById('prodNome');
    const inputPreco = document.getElementById('prodPreco');
    const inputDesc = document.getElementById('prodDesc');
    const inputEstoque = document.getElementById('prodEstoque');

    // 2. Verificação de existência
    if (!inputNome || !inputPreco) {
        console.error("ERRO: Campos do formulário não encontrados no HTML!");
        alert("Erro no formulário: os campos não foram encontrados.");
        return;
    }

    const dados = {
        user_id: usuarioAtualId,
        nome: inputNome.value,
        preco: parseFloat(inputPreco.value),
        descricao: inputDesc.value,
        estoque: parseInt(inputEstoque.value) || 0
    };

    console.log("Dados que serão salvos:", dados);

    // 3. Salvamento
    const { data, error } = await supabaseClient
        .from('produtos_loja')
        .insert([dados]);

    if (error) {
        console.error("Erro do Supabase:", error);
        alert("Erro ao salvar no banco: " + error.message);
    } else {
        alert("Produto salvo com sucesso!");
        
        // Limpar os campos
        inputNome.value = '';
        inputPreco.value = '';
        inputDesc.value = '';
        inputEstoque.value = '';
        
        fecharModal();
        await carregarProdutosDaLoja();
    }
}

async function carregarProdutosDaLoja() {
    const container = document.getElementById('vitrine-produtos');
    if (!container) return;

    try {
        const { data, error } = await supabaseClient
            .from('produtos_loja')
            .select('*')
            .eq('user_id', usuarioAtualId);
        
        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = `<p style="grid-column: 1/-1; color: #64748b; text-align: center; padding: 40px; font-weight: 500;">Sua loja ainda está vazia. Adicione produtos acima para exibi-los na vitrine pública!</p>`;
            return;
        }

        container.innerHTML = data.map(p => `
            <div class="card-produto" style="background: white; border-radius: 12px; padding: 16px; border: 1px solid #e2e8f0; text-align: center; display: flex; flex-direction: column; justify-content: space-between;">
                <img src="${p.imagem_url || 'https://via.placeholder.com/150'}" style="width:100%; height:130px; object-fit:cover; border-radius:8px; margin-bottom: 12px;" onerror="this.src='https://via.placeholder.com/150'">
                <h3 style="margin: 4px 0; font-size: 14px; font-weight: 700; color: #0f172a;">${p.nome}</h3>
                <p style="font-size: 12px; color: #64748b; margin-bottom: 8px; max-height: 32px; overflow: hidden; text-overflow: ellipsis;">${p.descricao || ''}</p>
                <p style="font-weight: 800; color: #e11d48; font-size: 16px; margin-bottom: 4px;">R$ ${parseFloat(p.preco).toFixed(2)}</p>
                <p style="font-size:11px; color:#475569; margin-bottom: 12px;">Disponível: <b>${p.estoque || 0} unid.</b></p>
                <div style="display: flex; gap: 6px; margin-top: auto;">
                    <button onclick="editarProduto('${p.id}')" style="flex:1; background:#f1f5f9; color:#334155; border:none; padding:8px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer;">Editar</button>
                    <button onclick="deletarProduto('${p.id}')" style="background:#fee2e2; color:#dc2626; border:none; padding:8px 10px; border-radius:6px; cursor:pointer;">🗑️</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error("Erro ao renderizar vitrine:", err);
    }
}

function abrirResumoMobile() {
    const resumo = document.querySelector('.resumo');
    
    // Se o resumo estiver escondido, mostra. Se estiver visível, esconde.
    if (resumo.style.display === 'block') {
        resumo.style.display = 'none';
    } else {
        resumo.style.display = 'block';
        // Adiciona um botão de fechar dentro do resumo se não existir
        if (!document.getElementById('btn-fechar-resumo')) {
            const btnFechar = document.createElement('button');
            btnFechar.id = 'btn-fechar-resumo';
            btnFechar.innerHTML = '✖ Fechar';
            btnFechar.style.cssText = "width:100%; margin-bottom:20px; padding:10px; background:#f1f5f9; border:none; border-radius:8px;";
            btnFechar.onclick = () => { resumo.style.display = 'none'; };
            resumo.prepend(btnFechar);
        }
    }
}

async function inicializarSistema() {
        await carregarMateriais();
        await carregarProdutosLoja();
        // Adicione outras chamadas de carregamento caso necessário
    }

    // --- LÓGICA DE PRODUTOS / MINHA LOJA ---
    function prepararNovoProduto() {
        document.getElementById('editandoId').value = '';
        document.getElementById('titulo-modal-produto').innerText = 'Novo Produto';
        document.getElementById('prodCategoria').value = 'pintor';
        document.getElementById('prodImgFile').value = '';
        document.getElementById('prodNome').value = '';
        document.getElementById('prodPreco').value = '';
        document.getElementById('prodDesc').value = '';
        document.getElementById('prodEstoque').value = '';
        document.getElementById('modal-cadastro-produto').style.display = 'flex';
    }





 async function carregarProdutosLoja() {
    const container = document.getElementById('vitrine-produtos');
    if (!container) return;

    container.innerHTML = '<p style="color: #64748b; padding: 20px;">Carregando vitrine...</p>';

    const user_id = supabaseClient.auth.user ? supabaseClient.auth.user().id : usuarioAtualId;
    if (!user_id) return;

    try {
        // Busca apenas os produtos cadastrados por este usuário (esta oficina)
        const { data, error } = await supabaseClient
            .from('produtos_loja')
            .select('*')
            .eq('user_id', user_id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (data.length === 0) {
            container.innerHTML = '<p style="color: #64748b; padding: 20px; grid-column: 1/-1; text-align:center;">Nenhum produto cadastrado na sua loja ainda.</p>';
            return;
        }

        container.innerHTML = '';
        data.forEach(prod => {
            // Se não tiver imagem, usa uma imagem padrão vazia bonita
            const img = prod.imagem_url || 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=500&auto=format&fit=crop&q=60';
            
            container.innerHTML += `
                <div class="card" style="min-height: auto; gap: 10px; padding: 16px;">
                    <img src="${img}" style="width: 100%; height: 130px; object-fit: cover; border-radius: 8px; background: #f1f5f9;">
                    <h3 style="margin: 4px 0 0 0; font-size: 15px; color: #0f172a;">${prod.nome}</h3>
                    <p style="font-size: 12px; color: #64748b; margin: 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${prod.descricao || 'Sem descrição.'}</p>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top: 4px;">
                        <span style="font-weight: 700; color: #0f172a; font-size: 16px;">R$ ${parseFloat(prod.preco).toFixed(2)}</span>
                        <span style="font-size: 11px; background: #f1f5f9; padding: 2px 8px; border-radius: 12px; color: #475569; font-weight: 600;">Estoque: ${prod.estoque}</span>
                    </div>
                    <div style="display: flex; gap: 6px; margin-top: 8px;">
                        <button onclick="prepararEdicaoProduto('${prod.id}', '${prod.nome}', ${prod.preco}, '${prod.descricao || ''}', ${prod.estoque}, '${prod.imagem_url || ''}')" style="flex: 1; padding: 8px; background: #f1f5f9; color: #334155; font-size: 12px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">Editar</button>
                        <button onclick="deletarProdutoLoja('${prod.id}')" style="padding: 8px; background: #fff5f5; color: #e11d48; font-size: 12px; border: 1px solid #fee2e2; border-radius: 6px; cursor: pointer;">🗑️</button>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error(error);
        mostrarToast('Erro ao carregar produtos.', 'erro');
    }
}

    function renderizarProdutosLoja() {
        const vitrine = document.getElementById('vitrine-produtos');
        vitrine.innerHTML = '';

        const filtrados = produtosLoja.filter(p => {
            if (categoriaLojaAtual === 'Todos') return true;
            return p.categoria === categoriaLojaAtual;
        });

        if (filtrados.length === 0) {
            vitrine.innerHTML = '<p style="color:#64748b; font-weight:600; padding:10px;">Nenhum item nesta categoria.</p>';
            return;
        }

        filtrados.forEach(prod => {
            const imgTag = prod.imagem_url ? `<img src="${prod.imagem_url}" style="width:100%; height:140px; object-fit:cover; border-radius:8px; margin-bottom:10px;">` : `<div style="width:100%; height:140px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; border-radius:8px; margin-bottom:10px; color:#94a3b8; font-size:12px;">Sem Foto</div>`;
            
            vitrine.innerHTML += `
                <div class="card" style="min-height:auto; padding:15px; position:relative;">
                    <span style="position:absolute; top:8px; right:8px; background:#f1f5f9; color:#475569; font-size:10px; font-weight:bold; padding:3px 8px; border-radius:12px; text-transform:uppercase;">${prod.categoria || 'Geral'}</span>
                    ${imgTag}
                    <h3 style="font-size:14px; margin-bottom:4px; color:#0f172a;">${prod.nome}</h3>
                    <p style="font-size:11px; color:#64748b; margin-bottom:8px; min-height:33px; overflow:hidden;">${prod.descricao || ''}</p>
                    <div style="font-size:16px; font-weight:700; color:#e11d48; margin-bottom:8px;">R$ ${parseFloat(prod.preco).toFixed(2)}</div>
                    <div style="font-size:12px; color:#475569; margin-bottom:12px;">Estoque: <b>${prod.estoque || 0} u.</b></div>
                    <div style="display:flex; gap:5px;">
                        <button onclick="prepararEdicaoProduto('${prod.id}')" style="flex:1; padding:8px; background:#f1f5f9; border:none; border-radius:6px; font-size:12px; font-weight:600; color:#334155; cursor:pointer;">Editar</button>
                        <button onclick="deletarProdutoLoja('${prod.id}')" style="padding:8px; background:#fff5f5; border:none; border-radius:6px; color:#e11d48; cursor:pointer;">🗑️</button>
                    </div>
                </div>
            `;
        });
    }

    function filtrarProdutosLoja(cat) {
        categoriaLojaAtual = cat;
        document.querySelectorAll('#botoesCategoriasLoja button').forEach(b => b.classList.remove('active'));
        document.getElementById('btn-cat-loja-' + cat).classList.add('active');
        renderizarProdutosLoja();
    }

    function prepararEdicaoProduto(id, nome, preco, descricao, estoque, imagem_url) {
    document.getElementById('titulo-modal-produto').innerText = 'Editar Produto';
    document.getElementById('editandoId').value = id;
    document.getElementById('prodImgUrl').value = imagem_url === 'null' ? '' : imagem_url;
    document.getElementById('prodNome').value = nome;
    document.getElementById('prodPreco').value = preco;
    document.getElementById('prodDesc').value = descricao === 'null' ? '' : descricao;
    document.getElementById('prodEstoque').value = estoque;
    document.getElementById('modal-cadastro-produto').style.display = 'flex';
}

    async function salvarProdutoLoja() {
    // Captura os dados da tela
    const id = document.getElementById('editandoId').value;
    const nome = document.getElementById('prodNome').value;
    const preco = parseFloat(document.getElementById('prodPreco').value);
    const descricao = document.getElementById('prodDesc').value;
    const estoque = parseInt(document.getElementById('prodEstoque').value) || 0;
    const imagem_url = document.getElementById('prodImgUrl').value;

    // Validação simples
    if (!nome || !preco) {
        mostrarToast('Por favor, preencha o nome e o preço!', 'erro');
        return;
    }

    // Pega o ID do usuário logado (Certifique-se de que a variável usuarioAtualId existe no seu login)
    // Caso a variável no seu código tenha outro nome, ajuste aqui
    const user_id = supabaseClient.auth.user ? supabaseClient.auth.user().id : usuarioAtualId;

    if (!user_id) {
        mostrarToast('Você precisa estar logado para salvar produtos.', 'erro');
        return;
    }

    const dadosProduto = {
        nome,
        preco,
        descricao,
        estoque,
        imagem_url,
        user_id
    };

    try {
        if (id) {
            // Atualizar produto existente
            const { error } = await supabaseClient
                .from('produtos_loja')
                .update(dadosProduto)
                .eq('id', id);

            if (error) throw error;
            mostrarToast('Produto atualizado com sucesso!', 'sucesso');
        } else {
            // Inserir novo produto
            const { error } = await supabaseClient
                .from('produtos_loja')
                .insert([dadosProduto]);

            if (error) throw error;
            mostrarToast('Produto cadastrado com sucesso!', 'sucesso');
        }

        fecharModalProduto();
        carregarProdutosLoja(); // Recarrega a vitrine do painel
    } catch (error) {
        console.error(error);
        mostrarToast('Erro ao salvar produto: ' + error.message, 'erro');
    }
}

   async function deletarProdutoLoja(id) {
    if (!confirm('Deseja realmente excluir este produto da sua vitrine?')) return;

    try {
        const { error } = await supabaseClient
            .from('produtos_loja')
            .select('*') // Segurança extra
            .eq('id', id);

        const { error: deleteError } = await supabaseClient
            .from('produtos_loja')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        mostrarToast('Produto removido com sucesso!', 'sucesso');
        carregarProdutosLoja();
    } catch (error) {
        console.error(error);
        mostrarToast('Erro ao excluir produto.', 'erro');
    }
}



    function salvarFallbackLocal() {
        if (!usuarioAtualId) return;
        localStorage.setItem(`aldineicar_fallback_${usuarioAtualId}`, JSON.stringify({
            materiais, 
            historico, 
            clientes, 
            maoObraItens, 
            dadosOficina,
            local_updated_at: new Date().getTime() 
        }));
    }

   function atualizarStatusRedeVisual(online) {
        const badge = document.getElementById('statusRedeBadge');
        if (!badge) return;
        if (online) {
            badge.style.background = '#10b981';
            badge.innerText = '● Online';
        } else {
            badge.style.background = '#f59e0b';
            badge.innerText = '● Modo Local (Offline)';
        }
    }

    async function salvarNoBanco(silencioso = false) {
        if (!usuarioAtualId) return;
        salvarFallbackLocal();
        
        if (!navigator.onLine) {
            atualizarStatusRedeVisual(false);
            if (!silencioso) {
                console.log("Modo Offline ativo: Alteração armazenada apenas no dispositivo.");
            }
            return; 
        }

        atualizarStatusRedeVisual(true);

        try {
            const { error } = await supabaseClient
                .from('user_data')
                .upsert({
                    user_id: usuarioAtualId,
                    materiais: materiais,
                    historico: historico,
                    clientes: clientes,
                    mao_obra: maoObraItens,
                    dados_oficina: dadosOficina,
                    updated_at: new Date()
                }, { onConflict: 'user_id' });

            if (error) throw error;
        } catch(e) {
            console.error("Erro ao sincronizar com a nuvem:", e);
            atualizarStatusRedeVisual(false);
        }
    }

    function abrirModalOficina() { 
        atualizarInputsOficina();
        document.getElementById('modalOficina').style.display='flex'; 
    }
    
    function fecharModalOficina() { document.getElementById('modalOficina').style.display='none'; }
    function fecharModalOficina() { document.getElementById('modalOficina').style.display = 'none'; }
    function fecharModalProduto() { document.getElementById('modal-cadastro-produto').style.display = 'none'; }


    
    function processarNovaLogo(input) {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            dadosOficina.logoBase64 = e.target.result;
            const preview = document.getElementById('previewLogoModal');
            if(preview) preview.innerHTML = `<img src="${dadosOficina.logoBase64}" style="max-height:50px; margin-top:5px; border-radius:5px;">`;
        };
        reader.readAsDataURL(file);
    }

    function atualizarLogoHeader() {
        const container = document.getElementById('headerLogoContainer');
        if (!container) return;
        if (dadosOficina.logoBase64) {
            container.innerHTML = `<img src="${dadosOficina.logoBase64}" alt="Logo Oficina" class="logo-img">`;
        } else {
            container.innerHTML = `<span id="headerTextoFallback" style="font-weight: bold; font-size: 20px; color: white;">${dadosOficina.nome ? dadosOficina.nome.toUpperCase() : 'ALDINEICAR'}</span>`;
        }
    }

    async function salvarProdutoLoja() {
    const id = document.getElementById('editandoId').value;
    const dados = {
        nome: document.getElementById('prodNome').value,
        preco: document.getElementById('prodPreco').value,
        descricao: document.getElementById('prodDesc').value,
        estoque: document.getElementById('prodEstoque').value,
        imagem_url: document.getElementById('prodImgUrl').value,
        user_id: usuarioAtualId
    };

    let res;
    if (id) {
        res = await supabaseClient.from('produtos_loja').update(dados).eq('id', id);
    } else {
        res = await supabaseClient.from('produtos_loja').insert([dados]);
    }

    if (res.error) return alert("Erro ao salvar: " + res.error.message);
    
    alert("Produto salvo!");
    fecharModal();
    carregarProdutosDaLoja();
}

function prepararNovoProduto() {
    document.getElementById('titulo-modal-produto').innerText = 'Novo Produto';
    document.getElementById('editandoId').value = '';
    document.getElementById('prodImgUrl').value = '';
    document.getElementById('prodNome').value = '';
    document.getElementById('prodPreco').value = '';
    document.getElementById('prodDesc').value = '';
    document.getElementById('prodEstoque').value = '';
    document.getElementById('modal-cadastro-produto').style.display = 'flex';
}

function fecharModalProduto() {
    document.getElementById('modal-cadastro-produto').style.display = 'none';
}

async function editarProduto(id) {
    const { data } = await supabaseClient.from('produtos_loja').select('*').eq('id', id).single();
    document.getElementById('editandoId').value = data.id;
    document.getElementById('prodNome').value = data.nome;
    document.getElementById('prodPreco').value = data.preco;
    document.getElementById('prodDesc').value = data.descricao;
    document.getElementById('prodEstoque').value = data.estoque;
    document.getElementById('prodImgUrl').value = data.imagem_url || '';
    document.getElementById('titulo-modal-produto').innerText = "Editar Produto";
    document.getElementById('modal-cadastro-produto').style.display = 'flex';
}

    async function deletarProduto(id) {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;

    const { error } = await supabaseClient
        .from('produtos_loja')
        .delete()
        .eq('id', id);

    if (error) {
        alert("Erro ao excluir: " + error.message);
    } else {
        alert("Produto removido!");
        carregarProdutosDaLoja(); // Recarrega a vitrine
    }
}

async function editarProduto(id) {
    // 1. Busca os dados do produto no banco pelo ID
    const { data, error } = await supabaseClient
        .from('produtos_loja')
        .select('*')
        .eq('id', id)
        .single();

    if (error) return alert("Erro ao carregar dados para edição");

    // 2. Preenche o formulário do modal (assumindo que você tenha um input hidden para o ID)
    document.getElementById('prodNome').value = data.nome;
    document.getElementById('prodPreco').value = data.preco;
    document.getElementById('prodDesc').value = data.descricao;
    document.getElementById('prodEstoque').value = data.estoque;

    // Adicione um campo hidden <input type="hidden" id="editandoId"> no seu modal
    document.getElementById('editandoId').value = data.id;

    // 3. Abre o modal
    document.getElementById('modal-cadastro-produto').style.display = 'flex';
}

    function atualizarInputsOficina() {
        document.getElementById('oficinaNome').value = dadosOficina.nome || 'ALDINEICAR';
        document.getElementById('oficinaCnpj').value = dadosOficina.cnpj || '';
        document.getElementById('oficinaEnd').value = dadosOficina.end || '';
        document.getElementById('oficinaCep').value = dadosOficina.cep || '';
        document.getElementById('oficinaFone').value = dadosOficina.fone || '';
        document.getElementById('oficinaEmail').value = dadosOficina.email || '';
        document.getElementById('oficinaPix').value = dadosOficina.pix || '';
        document.getElementById('oficinaProfissao').value = dadosOficina.profissao || 'pintor'; 
        
        const preview = document.getElementById('previewLogoModal');
        if (dadosOficina.logoBase64 && preview) {
            preview.innerHTML = `<img src="${dadosOficina.logoBase64}" style="max-height:50px; margin-top:5px; border-radius:5px;">`;
        } else if (preview) {
            preview.innerHTML = '';
        }
    }

    async function salvarDadosOficina() {
        const profissaoAnterior = dadosOficina.profissao || 'pintor';
        const novaProfissao = document.getElementById('oficinaProfissao').value;

        // 1. ANTES DE MUDAR, SALVAMOS O ESTADO DA PROFISSÃO ATUAL NO LOCALSTORAGE
        if (usuarioAtualId) {
            localStorage.setItem(`materiais_${profissaoAnterior}_${usuarioAtualId}`, JSON.stringify(materiais));
        }

        // Atualiza os dados de perfil
        dadosOficina.nome = document.getElementById('oficinaNome').value;
        dadosOficina.cnpj = document.getElementById('oficinaCnpj').value;
        dadosOficina.end = document.getElementById('oficinaEnd').value;
        dadosOficina.cep = document.getElementById('oficinaCep').value;
        dadosOficina.fone = document.getElementById('oficinaFone').value;
        dadosOficina.email = document.getElementById('oficinaEmail').value;
        dadosOficina.pix = document.getElementById('oficinaPix').value;
        dadosOficina.profissao = novaProfissao; 

        // 2. LÓGICA DE TROCA
        if (profissaoAnterior !== novaProfissao) {
            // Tentamos recuperar rascunho da nova profissão
            const rascunhoNovaProf = localStorage.getItem(`materiais_${novaProfissao}_${usuarioAtualId}`);
            
            if (rascunhoNovaProf) {
                // Se já existia um rascunho, recupera ele automaticamente
                materiais = JSON.parse(rascunhoNovaProf);
                categoriaAtual = 'Todos';
            } else {
                // Se é primeira vez, pergunta se quer o padrão
                if (confirm("Você alterou o Ramo de Atuação! Deseja carregar a lista de materiais padrão recomendada para esta nova área?")) {
                    const config = configuracoesProfissoes[novaProfissao];
                    materiais = JSON.parse(JSON.stringify(config.materiais));
                    categoriaAtual = 'Todos';
                }
            }
        }

        // Finalização e salvamento
        atualizarLogoHeader();
        fecharModalOficina();
        renderCategoriasETelas(); 
        render();
        configurarResumoPorProfissao(); 
        mostrarToast("Configurações profissionais salvas com sucesso!");
        
        // Salva tudo no banco e no fallback geral
        salvarFallbackLocal();
        await salvarNoBanco();
    }

    function toggleTab(tab) {
        document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
        document.getElementById('signupForm').style.display = tab === 'signup' ? 'block' : 'none';
    }

    async function handleLogin() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const btnEntrar = document.querySelector('#loginForm button');

        if (!email || !password) {
            mostrarToast("Por favor, preencha o e-mail e a senha.", "aviso");
            return;
        }

        const textoOriginal = btnEntrar.innerText;
        btnEntrar.innerText = "Entrando...";
        btnEntrar.disabled = true;

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

            if (error) {
                mostrarToast("Erro ao entrar: " + error.message, "erro");
                btnEntrar.innerText = textoOriginal;
                btnEntrar.disabled = false;
                return;
            }

            if (data && data.user) {
                await carregarDadosDoUsuario(data.user.id);
                document.getElementById('loginOverlay').style.display = 'none';
                mostrarAba('materiais');
            }
        } catch (err) {
            mostrarToast("Erro de conexão ou no servidor.", "erro");
        } finally {
            btnEntrar.innerText = textoOriginal;
            btnEntrar.disabled = false;
        }
    }

    async function handleSignup() {
        const nome = document.getElementById('signupName').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const btnCadastrar = document.querySelector('#signupForm button');

        if (!email || !password || password.length < 6) {
            mostrarToast("Preencha todos os campos corretamente (Senha mínima de 6 caracteres)", "aviso");
            return;
        }

        const textoOriginal = btnCadastrar.innerText;
        btnCadastrar.innerText = "Cadastrando...";
        btnCadastrar.disabled = true;

        try {
            const { data, error } = await supabaseClient.auth.signUp({
                email, password, options: { data: { nome } }
            });

            if (error) {
                mostrarToast("Erro ao cadastrar: " + error.message, "erro");
                return;
            }

            mostrarToast("Cadastro realizado com sucesso! Agora faça login.");
            toggleTab('login');
        } catch (err) {
            mostrarToast("Erro no processo de cadastro.", "erro");
        } finally {
            btnCadastrar.innerText = textoOriginal;
            btnCadastrar.disabled = false;
        }
    }

    async function handleLogout() {
        await supabaseClient.auth.signOut();
        usuarioAtualId = null;
        materiais = []; historico = []; clientes = []; maoObraItens = [];
        dadosOficina = { nome: 'ALDINEICAR', cnpj: '', end: '', cep: '', fone: '', email: '', pix: '', logoBase64: '' };
        localStorage.clear();
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('loginOverlay').style.display = 'flex';
        toggleTab('login');
    }

    function render(){
        const lista = document.getElementById('lista');
        if(!lista) return;
        lista.innerHTML='';
        materiais.forEach((item,index)=>{
            if(categoriaAtual !== 'Todos' && item.cat !== categoriaAtual) return;
            lista.innerHTML += `
                <div class="card">
                    <div style="display:flex;justify-content:space-between;align-items:start;gap:10px;">
                        <div>
                            <h3>${item.nome}</h3>
                            <div style="color: #777; font-size:13px; margin-top:2px;">${item.cat}</div>
                            <div class="preco">R$ ${item.valor.toFixed(2)}</div>
                        </div>
                        <div style="display:flex;gap:6px;">
                            <button onclick="editarMaterial(${index})" style="background:#f4b400;color:white;border:none;padding:8px 10px;border-radius:8px;cursor:pointer;font-weight:bold;">✏️</button>
                            <button onclick="deletarMaterial(${index})" style="background:#d40000;color:white;border:none;padding:8px 10px;border-radius:8px;cursor:pointer;font-weight:bold;">🗑️</button>
                        </div>
                    </div>
                    <div class="controls">
                        <button class="btn-minus" onclick="menos(${index})">-</button>
                        <div class="qtd">${item.qtd}</div>
                        <button class="btn-plus" onclick="mais(${index})">+</button>
                    </div>
                </div>
            `;
        });
        atualizarResumo();
    }

    async function mais(i){ materiais[i].qtd++; render(); await salvarNoBanco(); }
    async function menos(i){ if(materiais[i].qtd>0){ materiais[i].qtd--; render(); await salvarNoBanco(); } }

   function atualizarResumo(){
    let totalMateriais = materiais.reduce((s,item)=>s+(item.valor*item.qtd),0);
    let totalMaoObra = maoObraItens.reduce((s,item)=>s+item.valor,0);
    let valorCobrado = parseFloat(document.getElementById('valorCliente').value) || 0;
    
    let custoDeslocamento = 0;
    const profAtual = dadosOficina.profissao || 'pintor';

    if (profAtual === 'eletricista') {
        const inputKm = document.getElementById('km-diario');
        const inputDias = document.getElementById('dias-trabalho');
        const inputGasolina = document.getElementById('preco-gasolina');
        const inputConsumo = document.getElementById('consumo-carro');
        
        if (inputKm && inputDias && inputGasolina && inputConsumo) {
            const km = parseFloat(inputKm.value) || 0;
            const dias = parseFloat(inputDias.value) || 0;
            const precoGasolina = parseFloat(inputGasolina.value) || 0;
            const consumo = parseFloat(inputConsumo.value) || 1; 
            
            // Fórmula: (KM * Dias / Consumo) * Preço
            custoDeslocamento = ((km * dias) / consumo) * precoGasolina;
        }

        const txtCustoGasolina = document.getElementById('custo-gasolina-txt');
        if (txtCustoGasolina) {
            txtCustoGasolina.innerText = `R$ ${custoDeslocamento.toFixed(2).replace('.', ',')}`;
        }
    }

    // Agora o Lucro Real subtrai o custo de deslocamento, se houver
    let lucroReal = valorCobrado - totalMateriais - totalMaoObra - custoDeslocamento;

    const tm = document.getElementById('totalMateriais');
    const tmo = document.getElementById('totalMaoObra');
    const l = document.getElementById('lucro');

    if(tm) tm.innerText = totalMateriais.toFixed(2);
    if(tmo) tmo.innerText = totalMaoObra.toFixed(2);
    if(l) l.innerText = lucroReal.toFixed(2);
}

    async function salvarMaterial(){
        const nome = document.getElementById('nomeMaterial').value;
        const valor = parseFloat(document.getElementById('valorMaterial').value);
        const cat = document.getElementById('categoriaMaterial').value;
        if(!nome || isNaN(valor)) return;
        materiais.push({nome,valor,qtd:0,cat});
        render(); fecharModal();
        document.getElementById('nomeMaterial').value = '';
        document.getElementById('valorMaterial').value = '';
        fecharModalEspecifico('modal');
        await salvarNoBanco();
    }

    async function deletarMaterial(index){
        abrirConfirmacao('Deseja remover este material?', async function(){
            materiais.splice(index,1); render(); await salvarNoBanco();
        });
    }

    async function editarMaterial(index){
        const material = materiais[index];
        const novoNome = prompt('Editar nome:', material.nome);
        if(!novoNome) return;
        const novoValor = parseFloat(prompt('Editar valor:', material.valor));
        if(isNaN(novoValor)) return;
        material.nome = novoNome; material.valor = novoValor;
        render(); await salvarNoBanco();
    }

    function buscar(texto){
        texto = texto.toLowerCase();
        document.querySelectorAll('#lista .card').forEach(card=>{
            card.style.display = card.innerText.toLowerCase().includes(texto) ? 'block' : 'none';
        });
    }

    async function salvarOrcamento(){
        const clienteNome = document.getElementById('clienteNome').value || 'Sem nome';
        const clienteEndereco = document.getElementById('clienteEndereco').value || '';
        const clienteTel = document.getElementById('clienteTel').value || '';
        const clienteCidade = document.getElementById('clienteCidade').value || 'Sátrio Dias/BA';
        
        const veiculoModelo = document.getElementById('veiculoModelo').value || '---';
        const veiculoPlaca = document.getElementById('veiculoPlaca').value || '---';
        const veiculoAno = document.getElementById('veiculoAno').value || '';
        const veiculoCor = document.getElementById('veiculoCor').value || '';
        const nomeAvaliador = document.getElementById('nomeAvaliador').value || '';
        const tipoServico = document.getElementById('tipoServico').value || '---';
        
        const valorCobrado = parseFloat(document.getElementById('valorCliente').value) || 0;
        
        let totalMateriais = materiais.reduce((s, item) => s + (item.valor * item.qtd), 0);
        let totalMaoObra = maoObraItens.reduce((s, mo) => s + (parseFloat(mo.valor) || 0), 0);
        
        let custoDesloc = 0;
        const profAtual = dadosOficina.profissao || 'pintor';
        
        if (profAtual === 'eletricista') {
            const inputDias = document.getElementById('dias-trabalho');
            const inputGasolina = document.getElementById('preco-gasolina');
            const inputConsumo = document.getElementById('consumo-carro');
            
            if (inputDias && inputGasolina && inputConsumo) {
                const dias = parseFloat(inputDias.value) || 0;
                const precoGasolina = parseFloat(inputGasolina.value) || 0;
                const consumo = parseFloat(inputConsumo.value) || 1; 
                
                const kmDiario = 40; 
                custoDesloc = ((kmDiario * dias) / consumo) * precoGasolina;
            }
        }
        
        const novoOrcamento = {
            data: new Date().toLocaleString('pt-BR'),
            status: 'Orçamento',
            cliente: { nome: clienteNome, endereco: clienteEndereco, tel: clienteTel, cidade: clienteCidade, city: clienteCidade },
            veiculo: { 
                modelo: veiculoModelo, 
                placa: veiculoPlaca, 
                ano: veiculoAno, 
                cor: veiculoCor, 
                avaliador: nomeAvaliador,
                tipo_servico: tipoServico 
            },
            materiais: materiais.filter(m => m.qtd > 0).map(m => ({ id: m.id, nome: m.nome, qtd: m.qtd, valor: m.valor })),
            mao_obra: [...maoObraItens],
            
            totalMateriais: totalMateriais,
            totalMateriaisCalculado: totalMateriais,
            totalMaoObraCalculado: totalMaoObra,
            
            deslocamento: custoDesloc,
            totalCobrado: valorCobrado,
            lucro: valorCobrado - totalMateriais - custoDesloc
        };
        
        historico.unshift(novoOrcamento);
        
        const clienteExiste = clientes.some(c => c.nome.toLowerCase() === clienteNome.toLowerCase());
        if(!clienteExiste && clienteNome !== 'Sem nome') {
            clientes.push({ nome: clienteNome, endereco: clienteEndereco, tel: clienteTel, city: clienteCidade, cidade: clienteCidade });
            renderClientes();
        }
        
        renderHistorico();
        mostrarToast("Orçamento salvo com sucesso no histórico!");
        await salvarNoBanco();
    }

    function renderHistorico(){
        const h = document.getElementById('historicoLista');
        if(!h) return; h.innerHTML='';
        historico.forEach((item, index)=>{
            if (item.tipo_registro === 'VENDA_DIRETA_BALCAO' || item.tipo_registro === 'AGENDAMENTO') return;
            const cliente = item.cliente || { nome: 'Sem nome', endereco: '', tel: '', cidade: '' };
            const veiculo = item.veiculo || { modelo: 'Não informado', placa: '---', ano: '', cor: '', avaliador: '', tipo_servico: '---' };

            let custoMat = item.totalMateriaisCalculado !== undefined ? item.totalMateriaisCalculado : (item.totalMateriais || 0);
            let custoMaoObra = item.totalMaoObraCalculado !== undefined ? item.totalMaoObraCalculado : 0;
            if (custoMaoObra === 0 && item.mao_obra) {
                custoMaoObra = item.mao_obra.reduce((s, mo) => s + (parseFloat(mo.valor) || 0), 0);
            }

            let custoDesloc = parseFloat(item.deslocamento) || 0;
            let valorCobrado = parseFloat(item.totalCobrado) || 0;
            
            let lucroReal = valorCobrado - custoMat - custoDesloc;

            const statusAtual = item.status || 'Orçamento';
            let classeStatus = 'status-orcamento';
            if(statusAtual === 'Em Execução') classeStatus = 'status-execucao';
            if(statusAtual === 'Pronto') classeStatus = 'status-pronto';
            if(statusAtual === 'Pago') classeStatus = 'status-pago';

            const profHist = dadosOficina.profissao || 'pintor';
            let detalheObraOuVeiculo = `🚗 Veículo: ${veiculo.modelo || 'Não informado'} (${veiculo.placa || '---'})`;
            let linhaDeslocamentoHTML = '';

            if (profHist === 'eletricista') {
                detalheObraOuVeiculo = `🏢 Edifício: ${veiculo.modelo || 'Não informado'} (${veiculo.placa || '---'})`;
                if (custoDesloc > 0) {
                    linhaDeslocamentoHTML = `⛽ Deslocamento: R$ ${custoDesloc.toFixed(2).replace('.', ',')}<br>`;
                }
            }

            h.innerHTML += `
                <div class="cliente-item">
                    <div style="display:flex; justify-content:space-between; align-items:start; gap:10px; flex-wrap:wrap;">
                        <div>
                            <span class="badge-status ${classeStatus}">${statusAtual}</span><br>
                            <strong>👤 Cliente: ${cliente.nome}</strong><br>
                            ${detalheObraOuVeiculo}<br>
                            🔧 Serviço: ${veiculo.tipo_servico || '---'}<br><br>
                            
                            💰 Valor Cobrado: R$ ${valorCobrado.toFixed(2).replace('.', ',')}<br>
                            📦 Custo Materiais: R$ ${parseFloat(custoMat).toFixed(2).replace('.', ',')}<br>
                            🔨 Mão de Obra: R$ ${parseFloat(custoMaoObra).toFixed(2).replace('.', ',')}<br>
                            ${linhaDeslocamentoHTML}
                            <strong style="color: ${lucroReal >= 0 ? '#16a34a' : '#dc2626'}">📈 Lucro Real: R$ ${lucroReal.toFixed(2).replace('.', ',')}</strong><br><br>
                            
                            🕒 ${item.data || '---'}
                        </div>
                        
                        <div style="display:flex; flex-direction:column; gap:8px; min-width:140px;" id="actions-hist-${index}">
                            <label style="font-size:11px; font-weight:bold; color:#64748b;">ALTERAR ESTADO:</label>
                            <select class="select-status-inline" onchange="alterarStatus(${index}, this.value)">
                                <option value="Orçamento" ${statusAtual === 'Orçamento' ? 'selected' : ''}>📋 Orçamento</option>
                                <option value="Em Execução" ${statusAtual === 'Em Execução' ? 'selected' : ''}>🔧 Em Execução</option>
                                <option value="Pronto" ${statusAtual === 'Pronto' ? 'selected' : ''}>✅ Pronto</option>
                                <option value="Pago" ${statusAtual === 'Pago' ? 'selected' : ''}>💰 Pago</option>
                            </select>
                            <hr style="border:0; border-top:1px solid #e2e8f0; margin:4px 0;">
                            <button onclick="carregarParaEditar(${index})" style="background:#f4b400; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer; font-weight:bold; font-size:13px;">✏️ Editar</button>
                            <button onclick="gerarPDFHistorico(${index})" style="background:#00a651; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer; font-weight:bold; font-size:13px;">📄 PDF</button>
                            <button onclick="enviarWhatsAppHistorico(${index})" style="background:#25D366; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer; font-weight:bold; font-size:13px;">📱 WhatsApp</button>
                            <button onclick="deletarHistorico(${index})" style="background:#d40000; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer; font-weight:bold; font-size:13px;">🗑️</button>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    function renderClientes(){
        const c = document.getElementById('listaClientes');
        if(!c) return; c.innerHTML='';
        clientes.forEach((cli, index)=>{
            c.innerHTML += `
                <div class="cliente-item">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
                        <div>
                            <strong>👤 ${cli.nome}</strong><br>
                            <span style="font-size:13px; color:#555;">📍 ${cli.endereco || 'Sem endereço'} | 📱 ${cli.tel || 'Sem fone'}</span>
                        </div>
                        <div style="display:flex; gap:6px;">
                            <button onclick="carregarDadosClienteNoResumo(${index})" style="background:#ffd700; color:#111; border:none; padding:8px 12px; border-radius:8px; cursor:pointer; font-weight:bold; font-size:13px;">✏️ Novo Orç.</button>
                            <button onclick="gerarPDFClienteCompleto(${index})" style="background:#00a651; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer; font-weight:bold; font-size:13px;">📄 PDF</button>
                            <button onclick="deletarCliente(${index})" style="background:#d40000; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer; font-weight:bold; font-size:13px;">🗑️</button>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    function salvarEstadoProfissaoAtual() {
    if (!usuarioAtualId) return;
    // Salva o estado atual dos materiais no localStorage usando a profissão como chave
    const prof = dadosOficina.profissao || 'pintor';
    localStorage.setItem(`materiais_${prof}_${usuarioAtualId}`, JSON.stringify(materiais));
}

    function carregarParaEditar(index) {
        const item = historico[index];
        if (!item) {
            mostrarToast("Orçamento não encontrado.");
            return;
        }

        document.getElementById('clienteNome').value = item.cliente?.nome || item.nome || '';
        document.getElementById('clienteEndereco').value = item.cliente?.endereco || item.cliente?.end || '';
        document.getElementById('clienteTel').value = item.cliente?.tel || '';
        document.getElementById('clienteCidade').value = item.cliente?.cidade || item.cliente?.city || 'Sátrio Dias/BA';

        if (item.veiculo) {
            document.getElementById('veiculoModelo').value = item.veiculo.modelo || '';
            document.getElementById('veiculoPlaca').value = item.veiculo.placa || '';
            document.getElementById('veiculoAno').value = item.veiculo.ano || '';
            document.getElementById('veiculoCor').value = item.veiculo.cor || '';
            document.getElementById('nomeAvaliador').value = item.veiculo.avaliador || '';
            
            if (document.getElementById('tipoServico')) {
                document.getElementById('tipoServico').value = item.veiculo.tipo_servico || '';
            }
        }

        if (document.getElementById('valorCliente')) {
            document.getElementById('valorCliente').value = item.totalCobrado || item.total || 0;
        }

        if (typeof materiais !== 'undefined' && Array.isArray(materiais)) {
            materiais.forEach(m => m.qtd = 0);

            if (item.materiais && Array.isArray(item.materiais)) {
                item.materiais.forEach(matSalvo => {
                    const matGeral = materiais.find(m => 
                        (m.id && matSalvo.id && m.id == matSalvo.id) || 
                        (m.nome && matSalvo.nome && m.nome.toLowerCase() === matSalvo.nome.toLowerCase())
                    );
                    
                    if (matGeral) {
                        matGeral.qtd = parseInt(matSalvo.qtd || matSalvo.quantidade || 0);
                    }
                });
            }
        }

        if (item.mao_obra && typeof maoObraItens !== 'undefined') {
            maoObraItens = [...item.mao_obra];
        }

        setTimeout(() => {
            const botaoCategoria = document.querySelector('.categorias-materiais button.active') || 
                                   document.querySelector('.categorias-materiais button');
            if (botaoCategoria) {
                botaoCategoria.click();
            }

            setTimeout(() => {
                const primeiroBotaoMenos = document.querySelector('.btn-minus');
                const primeiroBotaoMais = document.querySelector('.btn-plus');
                
                if (primeiroBotaoMenos && primeiroBotaoMais) {
                    primeiroBotaoMenos.click();
                    primeiroBotaoMais.click();
                }
            }, 100); 
        }, 50);

        mostrarAba('materiais');
        mostrarToast("Orçamento carregado para edição! Verifique os materiais e valores no resumo.");
    }

    function carregarDadosClienteNoResumo(index) {
        const cli = clientes[index];
        if(!cli) return;
        document.getElementById('clienteNome').value = cli.nome;
        document.getElementById('clienteEndereco').value = cli.endereco || '';
        document.getElementById('clienteTel').value = cli.tel || '';
        document.getElementById('clienteCidade').value = cli.cidade || 'Sátrio Dias/BA';
        mostrarAba('materiais');
    }

   function mostrarAba(nome) {
    const ids = ['dashboard', 'materiais', 'clientes', 'historico', 'maoobra', 'loja', 'vendas', 'agenda'];
    ids.forEach(id => {
        const el = document.getElementById('aba-' + id);
        if (el) el.style.display = 'none';
    });

    document.querySelectorAll('.sidebar button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.sidebar button').forEach(b => {
        const oc = b.getAttribute('onclick') || '';
        if (oc.includes("'" + nome + "'") || oc.includes('"' + nome + '"')) b.classList.add('active');
    });
    if (nome === 'dashboard') {
        const btn = document.getElementById('btn-menu-dashboard');
        if (btn) btn.classList.add('active');
    }

    if (nome === 'dashboard') {
        const el = document.getElementById('aba-dashboard');
        if (el) { el.style.display = 'block'; renderDashboard(); }
        return;
    }
    if (nome === 'materiais') { document.getElementById('aba-materiais').style.display = 'block'; return; }
    if (nome === 'clientes') { document.getElementById('aba-clientes').style.display = 'block'; return; }
    if (nome === 'historico') { document.getElementById('aba-historico').style.display = 'block'; return; }
    if (nome === 'maoobra') { document.getElementById('aba-maoobra').style.display = 'block'; return; }
    if (nome === 'agenda') {
        const el = document.getElementById('aba-agenda');
        if (el) { el.style.display = 'block'; renderAgenda(); }
        return;
    }
    if (nome === 'loja') {
        document.getElementById('aba-loja').style.display = 'block';
        if (typeof carregarProdutosLoja === 'function') carregarProdutosLoja();
        else if (typeof carregarProdutosDaLoja === 'function') carregarProdutosDaLoja();
        return;
    }
    if (nome === 'vendas') {
        const el = document.getElementById('aba-vendas');
        if (el) el.style.display = 'block';
        renderizarListaVendasExclusiva();
    }
}

    function construirDocumentoPDF(nomeCli, endCli, telCli, cidCli, modVeic, placVeic, anoVeic, corVeic, avaliador, tipoServico, valorFinal, dataOrc) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        let y = 15;

        const profPDF = dadosOficina.profissao || 'pintor';
        let txtSecao = 'VEÍCULO';
        let txtPlaca = 'PLACA';
        let txtModelo = 'MODELO';
        let txtAno = 'ANO';
        let txtCor = 'COR';

        if (profPDF === 'mecanico') {
            txtSecao = 'VEÍCULO';
            txtPlaca = 'PLACA';
            txtModelo = 'MODELO / MOTORIZAÇÃO';
            txtAno = 'ANO';
            txtCor = 'QUILOMETRAGEM';
        } else if (profPDF === 'eletricista') {
            txtSecao = 'DADOS DA OBRA';
            txtPlaca = 'IDENTIFICAÇÃO';
            txtModelo = 'EDIFÍCIO';  
            txtAno = 'ÁREA m²';      
            txtCor = 'TIPO DE INSTALAÇÃO';
        }

        if (dadosOficina.logoBase64) {
            try { doc.addImage(dadosOficina.logoBase64, 'PNG', 15, y, 45, 20); } catch (e) {
                doc.setFillColor(240,240,240); doc.rect(15, y, 45, 20, 'F');
            }
        } else {
            doc.setFillColor(240,240,240); doc.rect(15, y, 45, 20, 'F');
        }

        doc.setFont('Helvetica', 'bold').setFontSize(16).setTextColor(0,0,0);
        doc.text((dadosOficina.nome || 'ALDINEICAR').toUpperCase(), 65, y + 5);
        
        doc.setFont('Helvetica', 'normal').setFontSize(9).setTextColor(60,60,60);
        doc.text(`CNPJ/CPF: ${dadosOficina.cnpj || '---'}`, 65, y + 10);
        doc.text(`END: ${dadosOficina.end || '---'}`, 65, y + 14);
        doc.text(`CEP: ${dadosOficina.cep || '---'}`, 65, y + 18);
        doc.text(`FONE: ${dadosOficina.fone || '---'}`, 65, y + 22);
        doc.text(`EMAIL: ${dadosOficina.email || '---'}`, 65, y + 26);
        doc.text(`PIX: ${dadosOficina.pix || '---'}`, 65, y + 30);

        doc.setFont('Helvetica', 'bold').setFontSize(10).setTextColor(0,0,0);
        doc.text(dataOrc, 175, y + 5);
        y += 36;
        doc.setDrawColor(200, 200, 200).line(15, y, 195, y);
        y += 5;

        doc.setDrawColor(0,0,0).rect(85, y, 40, 8);
        doc.setFont('Helvetica', 'bold').setFontSize(11).text('ORÇAMENTO', 92, y + 5.5);
        y += 15;

        doc.setFontSize(9).setTextColor(100,100,100).text(txtPlaca, 25, y).text(txtModelo, 95, y).text('AVALIADOR', 155, y);
        y += 4;
        doc.setFont('Helvetica', 'bold').setTextColor(0,0,0).setFontSize(10);
        doc.text(placVeic || '---', 25, y).text(modVeic || '---', 95, y).text(avaliador || '---', 155, y);
        
        y += 4; doc.setDrawColor(0, 0, 0).setLineWidth(0.4).line(15, y, 195, y); y += 6;

        doc.setFont('Helvetica', 'bold').setFontSize(11).text(txtSecao, 15, y).text('CLIENTE', 110, y);
        y += 2; doc.setLineWidth(0.2).line(15, y, 100, y).line(110, y, 195, y); y += 5;

        doc.setFont('Helvetica', 'normal').setFontSize(9.5);
        doc.text(`${txtModelo}: ${modVeic || '---'}`, 15, y).text(`NOME: ${nomeCli || '---'}`, 110, y); y += 5.5;
        doc.text(`${txtPlaca}: ${placVeic || '---'}`, 15, y).text(`ENDEREÇO: ${endCli || '---'}`, 110, y); y += 5.5;
        doc.text(`${txtAno}: ${anoVeic || '---'}`, 15, y).text(`TEL: ${telCli || '---'}`, 110, y); y += 5.5;
        doc.text(`${txtCor}: ${corVeic || '---'}`, 15, y).text(`CIDADE: ${cidCli || '---'}`, 110, y);
        
        y += 8;
        doc.setFont('Helvetica', 'bold').setFontSize(10).text('SERVIÇO A SER REALIZADO:', 15, y);
        y += 4.5;
        doc.setFont('Helvetica', 'normal').setFontSize(9.5).text(tipoServico.toUpperCase(), 15, y);

        y += 7; doc.setLineWidth(0.8).line(15, y, 195, y); y += 10;
        doc.setLineWidth(0.3).rect(65, y, 80, 16);
        doc.setFont('Helvetica', 'normal').setFontSize(9).text('TOTAL R$', 98, y + 5);
        doc.setFont('Helvetica', 'bold').setFontSize(15).text(`R$ ${parseFloat(valorFinal).toFixed(2)}`, 91, y + 12);
        
        y += 26; doc.setLineWidth(0.2).rect(15, y, 180, 16);
        doc.setFont('Helvetica', 'bold').setFontSize(9).text('OBSERVAÇÕES', 18, y + 5);
        doc.setFont('Helvetica', 'normal').setFontSize(9).text('ORÇAMENTO VÁLIDO POR 30 DIAS', 18, y + 11);
        
        y += 35; doc.setLineWidth(0.2).line(60, y, 150, y); y += 4;
        doc.setFont('Helvetica', 'bold').setFontSize(9).text('ASSINATURA DO CLIENTE', 85, y);

        doc.save(`orcamento_${nomeCli.replace(/\s+/g, '_')}.pdf`);
    }

    function gerarPDFdoResumo(){
        const nome = document.getElementById('clienteNome').value || 'Cliente';
        const end = document.getElementById('clienteEndereco').value || '';
        const tel = document.getElementById('clienteTel').value || '';
        const cid = document.getElementById('clienteCidade').value || 'Sátrio Dias/BA';
        const modelo = document.getElementById('veiculoModelo').value || '---';
        const placa = document.getElementById('veiculoPlaca').value || '---';
        const ano = document.getElementById('veiculoAno').value || '';
        const cor = document.getElementById('veiculoCor').value || '';
        const avaliador = document.getElementById('nomeAvaliador').value || '';
        const tipoServico = document.getElementById('tipoServico').value || '---'; 
        const valor = parseFloat(document.getElementById('valorCliente').value) || 0;
        
        construirDocumentoPDF(nome, end, tel, cid, modelo, placa, ano, cor, avaliador, tipoServico, valor, new Date().toLocaleDateString('pt-BR'));
    }

    function gerarPDFHistorico(index) {
        const item = historico[index];
        if(!item) return;
        construirDocumentoPDF(
            item.cliente.nome, item.cliente.endereco, item.cliente.tel, item.cliente.cidade,
            item.veiculo.modelo, item.veiculo.placa, item.veiculo.ano, item.veiculo.cor, item.veiculo.avaliador,
            item.veiculo.tipo_servico || '---', 
            item.totalCobrado, item.data.split(' ')[0]
        );
    }

    function gerarPDFClienteCompleto(index) {
        const cli = clientes[index];
        if(!cli) return;
        construirDocumentoPDF(cli.nome, cli.endereco, cli.tel, cli.cidade, '---', '---', '---', '---', '---', '---', 0, new Date().toLocaleDateString('pt-BR'));
    }

    function abrirModal(){ document.getElementById('modal').style.display='flex'; }
    function fecharModal() {
    // Altere 'modal' para 'modal-cadastro-produto'
    document.getElementById('modal-cadastro-produto').style.display = 'none';
}

    async function adicionarMaoObra(){
        const nome = document.getElementById('nomeServico').value;
        const valor = parseFloat(document.getElementById('valorServico').value);
        if(!nome || isNaN(valor)) return;
        maoObraItens.push({nome,valor});
        renderMaoObra(); atualizarResumo();
        document.getElementById('nomeServico').value='';
        document.getElementById('valorServico').value='';
        await salvarNoBanco();
    }

    function renderMaoObra(){
        const lista = document.getElementById('listaMaoObra');
        if(!lista) return; lista.innerHTML='';
        maoObraItens.forEach((item,index)=>{
            lista.innerHTML += `
                <div class="cliente-item">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div><strong>${item.nome}</strong><br><span style="color:#00a651; font-weight:bold;">R$ ${item.valor.toFixed(2)}</span></div>
                        <button onclick="removerMaoObra(${index})" class="btn-primary" style="padding:8px 12px;border:none;border-radius:8px;cursor:pointer; font-size:12px;">Remover</button>
                    </div>
                </div>
            `;
        });
    }

    async function removerMaoObra(i){ maoObraItens.splice(i,1); renderMaoObra(); atualizarResumo(); await salvarNoBanco(); }

    async function enviarWhatsAppHistorico(index) {
        const item = historico[index];
        if (!item) {
            mostrarToast("Orçamento não encontrado no histórico.");
            return;
        }

        if (!usuarioAtualId) {
            mostrarToast("Você precisa estar logado para realizar esta operação.");
            return;
        }

        try {
            const nome = item.cliente.nome;
            const end = item.cliente.endereco || '';
            const tel = item.cliente.tel || '';
            const cid = item.cliente.cidade || 'Sátrio Dias/BA';
            const modelo = item.veiculo.modelo || '---';
            const placa = item.veiculo.placa || '---';
            const ano = item.veiculo.ano || '';
            const cor = item.veiculo.cor || '';
            const avaliador = item.veiculo.avaliador || '';
            const tipoServico = item.veiculo.tipo_servico || '---'; 
            const valor = item.totalCobrado || 0;

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');
            let y = 15;

            if (dadosOficina.logoBase64) {
                try { doc.addImage(dadosOficina.logoBase64, 'PNG', 15, y, 45, 20); } catch (e) {
                    doc.setFillColor(240,240,240); doc.rect(15, y, 45, 20, 'F');
                }
            } else {
                doc.setFillColor(240,240,240); doc.rect(15, y, 45, 20, 'F');
            }

            doc.setFont('Helvetica', 'bold').setFontSize(16).setTextColor(0,0,0);
            doc.text((dadosOficina.nome || 'ALDINEICAR').toUpperCase(), 65, y + 5);
            
            doc.setFont('Helvetica', 'normal').setFontSize(9).setTextColor(60,60,60);
            doc.text(`CNPJ/CPF: ${dadosOficina.cnpj || '---'}`, 65, y + 10);
            doc.text(`END: ${dadosOficina.end || '---'}`, 65, y + 14);
            doc.text(`CEP: ${dadosOficina.cep || '---'}`, 65, y + 18);
            doc.text(`FONE: ${dadosOficina.fone || '---'}`, 65, y + 22);
            doc.text(`EMAIL: ${dadosOficina.email || '---'}`, 65, y + 26);
            doc.text(`PIX: ${dadosOficina.pix || '---'}`, 65, y + 30);

            const dataOrc = item.data ? item.data.split(' ')[0] : new Date().toLocaleDateString('pt-BR');
            doc.setFont('Helvetica', 'bold').setFontSize(10).setTextColor(0,0,0);
            doc.text(dataOrc, 175, y + 5);
            y += 36;
            doc.setDrawColor(200, 200, 200).line(15, y, 195, y);
            y += 5;

            doc.setDrawColor(0,0,0).rect(85, y, 40, 8);
            doc.setFont('Helvetica', 'bold').setFontSize(11).text('ORÇAMENTO', 92, y + 5.5);
            y += 15;

            doc.setFontSize(9).setTextColor(100,100,100).text('PLACA', 25, y).text('MODELO', 95, y).text('AVALIADOR', 155, y);
            y += 4;
            doc.setFont('Helvetica', 'bold').setTextColor(0,0,0).setFontSize(10);
            doc.text(placa, 25, y).text(modelo, 95, y).text(avaliador, 155, y);
            
            y += 4; doc.setDrawColor(0, 0, 0).setLineWidth(0.4).line(15, y, 195, y); y += 6;

            doc.setFont('Helvetica', 'bold').setFontSize(11).text('VEÍCULO', 15, y).text('CLIENTE', 110, y);
            y += 2; doc.setLineWidth(0.2).line(15, y, 100, y).line(110, y, 195, y); y += 5;

            doc.setFont('Helvetica', 'normal').setFontSize(9.5);
            doc.text(`MODELO: ${modelo}`, 15, y).text(`NOME: ${nome}`, 110, y); y += 5.5;
            doc.text(`PLACA: ${placa}`, 15, y).text(`ENDEREÇO: ${end}`, 110, y); y += 5.5;
            doc.text(`ANO: ${ano}`, 15, y).text(`TEL: ${tel}`, 110, y); y += 5.5;
            doc.text(`COR: ${cor}`, 15, y).text(`CIDADE: ${cid}`, 110, y);
            
            y += 8;
            doc.setFont('Helvetica', 'bold').setFontSize(10).text('SERVIÇO A SER REALIZADO:', 15, y);
            y += 4.5;
            doc.setFont('Helvetica', 'normal').setFontSize(9.5).text(tipoServico.toUpperCase(), 15, y);

            y += 7; doc.setLineWidth(0.8).line(15, y, 195, y); y += 10;
            doc.setLineWidth(0.3).rect(65, y, 80, 16);
            doc.setFont('Helvetica', 'normal').setFontSize(9).text('TOTAL R$', 98, y + 5);
            doc.setFont('Helvetica', 'bold').setFontSize(15).text(`R$ ${valor.toFixed(2)}`, 91, y + 12);
            
            y += 26; doc.setLineWidth(0.2).rect(15, y, 180, 16);
            doc.setFont('Helvetica', 'bold').setFontSize(9).text('OBSERVAÇÕES', 18, y + 5);
            doc.setFont('Helvetica', 'normal').setFontSize(9).text('ORÇAMENTO VÁLIDO POR 30 DIAS', 18, y + 11);
            
            y += 35; doc.setLineWidth(0.2).line(60, y, 150, y); y += 4;
            doc.setFont('Helvetica', 'bold').setFontSize(9).text('ASSINATURA DO CLIENTE', 85, y);

            const pdfBlob = doc.output('blob');
            const nomeArquivo = `${usuarioAtualId}/orc_${Date.now()}.pdf`;

            const { data, error } = await supabaseClient.storage
                .from('orcamentos')
                .upload(nomeArquivo, pdfBlob, { contentType: 'application/pdf', upsert: true });

            if (error) throw error;

            const { data: urlData } = supabaseClient.storage.from('orcamentos').getPublicUrl(nomeArquivo);
            const linkPdfPublico = urlData.publicUrl;

            let textoWhats = `Olá *${nome}*, segue o orçamento do seu veículo na *${dadosOficina.nome || 'ALDINEICAR'}*:\n\n`;
            textoWhats += `🚗 *Veículo:* ${modelo} (${placa})\n`;
            textoWhats += `🔧 *Serviço:* ${tipoServico}\n`; 
            textoWhats += `💰 *Valor Total:* R$ ${valor.toFixed(2)}\n\n`;
            textoWhats += `👉 *Clique no link abaixo para abrir o PDF oficial detalhado:* \n${linkPdfPublico}`;

            window.open(`https://wa.me/?text=${encodeURIComponent(textoWhats)}`, '_blank');

        } catch (err) {
            mostrarToast("Erro ao enviar WhatsApp do histórico: " + err.message, " erro ");
        }
    }

    function enviarWhatsApp() {
        const nome = document.getElementById('clienteNome').value || 'Cliente';
        const modelo = document.getElementById('veiculoModelo').value || 'Veículo';
        const placa = document.getElementById('veiculoPlaca').value || '---';
        const tipoServico = document.getElementById('tipoServico').value || '---';
        const valor = parseFloat(document.getElementById('valorCliente').value) || 0;
        
        let textoWhats = `Olá *${nome}*, segue o orçamento do seu veículo na *${dadosOficina.nome || 'ALDINEICAR'}*:\n\n`;
        textoWhats += `🚗 *Veículo:* ${modelo} (${placa})\n`;
        textoWhats += `🔧 *Serviço:* ${tipoServico}\n`;
        textoWhats += `💰 *Valor Total:* R$ ${valor.toFixed(2)}\n\n`;
        textoWhats += `Aguardamos sua aprovação!`;

        window.open(`https://wa.me/?text=${encodeURIComponent(textoWhats)}`, '_blank');
    }

    function abrirConfirmacao(texto, callback){
        const modal = document.getElementById('modalConfirmar');
        const textoEl = document.getElementById('textoConfirmacao');
        if (modal) modal.style.display = 'flex';
        if (textoEl) textoEl.innerText = texto;
        acaoConfirmada = callback;
    }
    function fecharConfirmacao(){
        const modal = document.getElementById('modalConfirmar');
        if (modal) modal.style.display = 'none';
    }
    function confirmarAcaoExclusao() {
        if (typeof acaoConfirmada === 'function') {
            const fn = acaoConfirmada;
            acaoConfirmada = null;
            fn();
        }
        fecharConfirmacao();
    }

    async function deletarHistorico(index){ abrirConfirmacao('Deseja excluir este orçamento do histórico?', async function(){ historico.splice(index,1); renderHistorico(); await salvarNoBanco(); }); }
    async function deletarCliente(index){ abrirConfirmacao('Deseja excluir este registro de cliente?', async function(){ clientes.splice(index,1); renderClientes(); await salvarNoBanco(); }); }
    async function limparResumo(){
        abrirConfirmacao('Deseja limpar todo o resumo?', async function(){
            materiais.forEach(item=>{ item.qtd = 0; }); maoObraItens = [];
            document.getElementById('clienteNome').value = ''; document.getElementById('clienteEndereco').value = '';
            document.getElementById('clienteTel').value = ''; document.getElementById('veiculoModelo').value = '';
            document.getElementById('veiculoPlaca').value = ''; document.getElementById('veiculoAno').value = '';
            document.getElementById('veiculoCor').value = ''; document.getElementById('nomeAvaliador').value = '';
            document.getElementById('valorCliente').value = '';
            render(); renderMaoObra(); atualizarResumo(); await salvarNoBanco();
        });
    }

    function filtrarCategoria(cat){ categoriaAtual = cat; render(); }

    document.addEventListener('DOMContentLoaded', () => {
        toggleTab('login');
        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            if (session && session.user) {
                await carregarDadosDoUsuario(session.user.id);
                document.getElementById('loginOverlay').style.display = 'none';
                const abas = ['aba-materiais', 'aba-clientes', 'aba-historico', 'aba-maoobra'];
                const algumaAtiva = abas.some(id => document.getElementById(id).style.display === 'block');
                if (!algumaAtiva) mostrarAba('dashboard');
            } else {
                document.getElementById('loginOverlay').style.display = 'flex';
                toggleTab('login');
            }

            window.addEventListener('DOMContentLoaded', () => {
    verificarModoCliente();
});
        });
    });

   function configurarResumoPorProfissao() {
    const prof = dadosOficina.profissao || 'pintor';
    
    const inModelo = document.getElementById('veiculoModelo');
    const inPlaca = document.getElementById('veiculoPlaca');
    const inAno = document.getElementById('veiculoAno');
    const inCor = document.getElementById('veiculoCor');

    if (!inModelo || !inPlaca || !inAno || !inCor) return;

    const lblModelo = inModelo.previousElementSibling;
    const lblPlaca = inPlaca.previousElementSibling;
    const lblAno = inAno.previousElementSibling;
    const lblCor = inCor.previousElementSibling;

    if (prof === 'mecanico') {
        if(lblModelo) lblModelo.innerText = "MODELO / MOTORIZAÇÃO";
        if(inModelo)  inModelo.placeholder = "Modelo / Motorização";
        if(lblPlaca)  lblPlaca.innerText = "PLACA";
        if(inPlaca)   inPlaca.placeholder = "Placa";
        if(lblAno)    lblAno.innerText = "ANO";
        if(inAno)     inAno.placeholder = "Ano";
        if(lblCor)    lblCor.innerText = "QUILOMETRAGEM (KM)";
        if(inCor)     { inCor.placeholder = "Quilometragem (KM)"; inCor.type = "text"; }
    } else if (prof === 'eletricista') {
        if(lblModelo) lblModelo.innerText = "EDIFÍCIO";
        if(inModelo)  inModelo.placeholder = "Edifício";
        
        if(lblPlaca)  lblPlaca.innerText = "IDENTIFICAÇÃO / NÚMERO";
        if(inPlaca)   inPlaca.placeholder = "Identificação / Número";
        
        if(lblAno)    lblAno.innerText = "ÁREA m²";
        if(inAno)     inAno.placeholder = "Área m²";
        
        if(lblCor)    lblCor.innerText = "TIPO DE INSTALAÇÃO";
        if(inCor)     { inCor.placeholder = "Tipo de Instalação"; inCor.type = "text"; }
    } else { 
        if(lblModelo) lblModelo.innerText = "MODELO DO VEÍCULO";
        if(inModelo)  inModelo.placeholder = "Modelo do Veículo";
        if(lblPlaca)  lblPlaca.innerText = "PLACA";
        if(inPlaca)   inPlaca.placeholder = "Placa";
        if(lblAno)    lblAno.innerText = "ANO";
        if(inAno)     inAno.placeholder = "Ano";
        if(lblCor)    lblCor.innerText = "COR DO VEÍCULO / CÓDIGO";
        if(inCor)     { inCor.placeholder = "Cor do Veículo / Código"; inCor.type = "text"; }
    }
}


    async function alterarStatus(index, novoStatus) {
    if (historico[index]) {
        historico[index].status = novoStatus;
        renderHistorico(); 
        await salvarNoBanco(); 
    }
}

function mostrarToast(mensagem, tipo = 'sucesso') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    
    let icone = '✅';
    if (tipo === 'erro') icone = '❌';
    if (tipo === 'aviso') icone = '⚠️';

    toast.innerHTML = `<span>${icone}</span> <span>${mensagem}</span>`;
    
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-ativo');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('toast-ativo');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3500);
}

window.addEventListener('online', async () => {
    atualizarStatusRedeVisual(true);
    console.log("Conexão restaurada! Sincronizando dados com o banco de dados nuvem...");
    if (usuarioAtualId) {
        await salvarNoBanco(true); 
    }
});

window.addEventListener('offline', () => {
    atualizarStatusRedeVisual(false);
    console.log("A conexão caiu. O sistema entrou em Modo Local automaticamente.");
});

window.addEventListener('load', () => {
    atualizarStatusRedeVisual(navigator.onLine);
});

window.addEventListener('online', async () => {
    if (usuarioAtualId) {
        console.log("Conexão restabelecida! Verificando sincronização pendente...");
        await carregarDadosDoUsuario(usuarioAtualId);
    }

    // Exemplo: após o login bem-sucedido ou carregamento da página
window.addEventListener('load', () => {
    // ... seu código de carregamento de usuário
    renderizarListaVendasExclusiva(); // <-- Chame aqui!
});
});

function renderCategoriasETelas() {
    const profAtual = dadosOficina.profissao || 'pintor';
    const config = configuracoesProfissoes[profAtual] || configuracoesProfissoes.pintor;
    
    const btnMenuMaoObra = document.getElementById('btn-menu-maoobra');
    const tituloAbaMaoObra = document.getElementById('titulo-aba-maoobra');
    const conteudoMaoObraReal = document.getElementById('conteudo-mao-obra-real');
    const conteudoLogisticaEletricista = document.getElementById('conteudo-logistica-eletricista');

    if (profAtual === 'eletricista') {
        if (btnMenuMaoObra) btnMenuMaoObra.innerHTML = '⛽ Logística';
        if (tituloAbaMaoObra) tituloAbaMaoObra.innerText = 'Logística de Transporte';
        if (conteudoMaoObraReal) conteudoMaoObraReal.style.display = 'none';
        if (conteudoLogisticaEletricista) conteudoLogisticaEletricista.style.display = 'block';
    } else {
        if (btnMenuMaoObra) btnMenuMaoObra.innerHTML = '🔧 Mão de Obra';
        if (tituloAbaMaoObra) tituloAbaMaoObra.innerText = 'Mão de Obra';
        if (conteudoMaoObraReal) conteudoMaoObraReal.style.display = 'block';
        if (conteudoLogisticaEletricista) conteudoLogisticaEletricista.style.display = 'none';
    }

    const labels = document.querySelectorAll('label');
    labels.forEach(lbl => {
        if(lbl.innerText.includes("VEÍCULO")) {
            lbl.innerText = config.labelSecao;
        }
    });

    const containerBotoes = document.getElementById('botoesCategorias');
    if (containerBotoes) {
        containerBotoes.innerHTML = '';
        config.categorias.forEach(cat => {
            const isActive = cat === categoriaAtual;
            const btnClass = cat === 'Todos' ? 'btn-green' : (isActive ? 'active' : '');
            containerBotoes.innerHTML += `<button onclick="filtrarCategoria('${cat}')" class="${btnClass}">${cat}</button>`;
        });
    }

    const selectModalCat = document.getElementById('categoriaMaterial');
    if (selectModalCat) {
        selectModalCat.innerHTML = '';
        config.categorias.forEach(cat => {
            if (cat !== 'Todos') {
                selectModalCat.innerHTML += `<option value="${cat}">${cat}</option>`;
            }
        });
    }
}


let idOficinaDaLojaAtual = null;

// Interceptador global: Para QUALQUER loop de imagem quebrada na página inteira
window.addEventListener('error', function(e) {
    if (e.target.tagName === 'IMG') {
        console.warn('Imagem bloqueada ou quebrada evitada:', e.target.src);
        e.target.src = 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=500&auto=format&fit=crop&q=60';
        e.preventDefault();
    }
}, true);

function verificarModoCliente() {
    const parametrosUrl = new URLSearchParams(window.location.search);
    const idLoja = parametrosUrl.get('loja');

    if (idLoja) {
        idOficinaDaLojaAtual = idLoja;
        
        // Esconde as telas antigas para o cliente não ver o login de empresa
        const estiloEsconder = document.createElement('style');
        estiloEsconder.innerHTML = `
            #loginOverlay, #appContainer, .modal, .toast { display: none !important; }
            #visao-cliente-externo { display: flex !important; }
        `;
        document.head.appendChild(estiloEsconder);
        
        // Chama os produtos com segurança
        setTimeout(() => {
            carregarProdutosVitrinePublica(idLoja);
        }, 500);

        return true;
    }
    return false;
}

// Inicializa a checagem
verificarModoCliente();


// Busca no banco os produtos cadastrados por aquela oficina sem exigir login
async function carregarProdutosVitrinePublica(idOficina) {
    const containerVitrine = document.getElementById('vitrine-publica-cliente');
    if (!containerVitrine) return;
    
    containerVitrine.innerHTML = '<p style="color: #a1a1aa;">Buscando peças no banco de dados...</p>';

    try {
        // Faz a busca na tabela usando o ID correto do dono do produto
        const { data: produtos, error } = await supabaseClient
            .from('produtos_loja')
            .select('*')
            .eq('user_id', idOficina);

        if (error) throw error;

        containerVitrine.innerHTML = '';

        if (!produtos || produtos.length === 0) {
            containerVitrine.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #a1a1aa;">
                    <p style="font-size: 16px; font-weight: 600; margin-bottom: 4px;">Nenhum produto em exposição.</p>
                    <p style="font-size: 13px; color: #71717a;">Verifique se você cadastrou os produtos usando este mesmo usuário no painel administrativo.</p>
                </div>
            `;
            return;
        }

        const imagemPadrao = 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=500&auto=format&fit=crop&q=60';

        produtos.forEach(prod => {
            const urlImagem = prod.imagem_url || imagemPadrao;
            
            containerVitrine.innerHTML += `
                <div style="background: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; min-height: 310px;">
                    <img src="${urlImagem}" style="width: 100%; height: 130px; object-fit: cover; border-radius: 6px; background: #09090b;">
                    <div style="margin-top: 12px; flex: 1;">
                        <h4 style="font-size: 15px; color: #ffffff; font-weight: 700; margin: 0;">${prod.nome}</h4>
                        <p style="font-size: 12px; color: #a1a1aa; margin: 4px 0 0 0; line-height: 1.4;">${prod.descricao || 'Disponível para instalação.'}</p>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 15px; border-top: 1px solid #27272a; padding-top: 12px;">
                        <span style="font-size: 16px; font-weight: 800; color: #e11d48;">R$ ${parseFloat(prod.preco).toFixed(2)}</span>
                        // SUBSTITUA POR ESTE:
<button onclick="console.log('Botão acionado com sucesso para o produto ID:', '${prod.id}'); abrirModalCompra('${prod.id}', '${prod.nome}', '${prod.preco}', '${prod.qtd || prod.quantidade || 0}')" style="background: #22c55e; color: #ffffff; border: none; padding: 8px 14px; border-radius: 6px; font-weight: 700; font-size: 13px; cursor: pointer; transition: 0.2s;">
    🛒 Comprar Agora
</button>
                    </div>
                </div>
            `;
        });

    } catch (err) {
        console.error("Erro completo na requisição:", err);
        containerVitrine.innerHTML = '<p style="color: #e11d48; text-align: center; grid-column:1/-1;">Erro ao carregar os dados dos produtos.</p>';
    }
}

// Funções de Controle dos Modais do Cliente
function abrirModalOrcamentoCliente() {
    document.getElementById('modal-orcamento-cliente').style.display = 'flex';
}

function fecharModalOrcamentoCliente() {
    document.getElementById('modal-orcamento-cliente').style.display = 'none';
}

function solicitarOrcamentoProduto(nomeProduto) {
    abrirModalOrcamentoCliente();
    document.getElementById('cliOrcDescricao').value = `Olá! Gostaria de solicitar o orçamento e instalação para o item: ${nomeProduto}`;
}


// ==========================================
// FUNÇÕES DO PASSO 4: ENVIO DO PEDIDO PARA O PAINEL
// ==========================================

// SUBSITUA POR ESTA VERSÃO CORRIGIDA E COMPATÍVEL COM O SEU HISTÓRICO
// VERSÃO DEFINITIVA: SALVA DIRETO NO SITE DA OFICINA
// VERSÃO INTEGRADA AO PAINEL DE ORDENS E ORÇAMENTOS
// ENVIO DIRETO PARA O FLUXO DE TRIAGEM DO PAINEL ADM
// VERSÃO INTEGRADA PERFEITAMENTE COM O SEU MÉTODO 'salvarNoBanco'
// VERSÃO DEFINITIVA: INJETA O PEDIDO DIRETO NA SUA LINHA DO 'USER_DATA'

async function enviarOrcamentoCliente() {
    const nome = document.getElementById('cliOrcNome').value.trim();
    const telefone = document.getElementById('cliOrcTelefone').value.trim();
    const veiculo = document.getElementById('cliOrcVeiculo').value.trim();
    const desc = document.getElementById('cliOrcDescricao').value.trim();
    const dataAg = document.getElementById('cliOrcData') ? document.getElementById('cliOrcData').value : '';
    const horaAg = document.getElementById('cliOrcHora') ? document.getElementById('cliOrcHora').value : '';

    if (!nome || !telefone || !desc) {
        alert('Por favor, preencha Nome, Telefone e a sua Solicitação!');
        return;
    }
    if (!dataAg || !horaAg) {
        alert('Escolha a data e o horário desejados para o agendamento!');
        return;
    }

    // Não permitir data no passado
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    const dataEscolhida = new Date(dataAg + 'T00:00:00');
    if (dataEscolhida < hoje) {
        alert('A data do agendamento não pode ser no passado.');
        return;
    }

    if (!idOficinaDaLojaAtual) {
        alert('Erro de conexão: Identificador da oficina ausente.');
        return;
    }

    try {
        const { data: dadosAtuais, error: erroBusca } = await supabaseClient
            .from('user_data')
            .select('*')
            .eq('user_id', idOficinaDaLojaAtual)
            .single();

        if (erroBusca) throw new Error("Não foi possível localizar os dados da oficina no banco.");

        let listaHistorico = Array.isArray(dadosAtuais.historico) ? dadosAtuais.historico : [];
        let listaClientes = Array.isArray(dadosAtuais.clientes) ? dadosAtuais.clientes : [];

        // Formata data BR para exibição
        const [y, m, d] = dataAg.split('-');
        const dataBR = `${d}/${m}/${y}`;

        const novoAgendamento = {
            id_agendamento: 'AGD-' + Math.floor(100000 + Math.random() * 900000),
            data: new Date().toLocaleString('pt-BR'),
            status: 'Agendado',
            tipo_registro: 'AGENDAMENTO',
            agendamento: {
                data: dataAg,
                hora: horaAg,
                data_br: dataBR,
                label: dataBR + ' às ' + horaAg
            },
            cliente: {
                nome: nome,
                endereco: 'Agendamento Online',
                tel: telefone,
                cidade: 'Sátrio Dias/BA',
                city: 'Sátrio Dias/BA'
            },
            veiculo: {
                modelo: veiculo || '---',
                placa: '---',
                ano: '',
                cor: '',
                avaliador: 'Agendamento Online',
                tipo_servico: desc
            },
            materiais: [],
            mao_obra: [],
            totalMateriais: 0,
            totalMateriaisCalculado: 0,
            totalMaoObraCalculado: 0,
            deslocamento: 0,
            totalCobrado: 0,
            lucro: 0
        };

        listaHistorico.unshift(novoAgendamento);

        const clienteExiste = listaClientes.some(c => c && c.nome && c.nome.toLowerCase() === nome.toLowerCase());
        if (!clienteExiste) {
            listaClientes.push({
                nome: nome,
                endereco: 'Agendamento Online',
                tel: telefone,
                city: 'Sátrio Dias/BA',
                cidade: 'Sátrio Dias/BA'
            });
        }

        const { error: erroUpdate } = await supabaseClient
            .from('user_data')
            .update({
                historico: listaHistorico,
                clientes: listaClientes,
                updated_at: new Date()
            })
            .eq('user_id', idOficinaDaLojaAtual);

        if (erroUpdate) throw erroUpdate;

        alert(`Perfeito, ${nome}!\n\nSeu agendamento foi solicitado para ${dataBR} às ${horaAg}.\nA oficina entrará em contato para confirmar.\n\nObrigado!`);
        fecharModalOrcamentoCliente();

        document.getElementById('cliOrcNome').value = '';
        document.getElementById('cliOrcTelefone').value = '';
        document.getElementById('cliOrcVeiculo').value = '';
        document.getElementById('cliOrcDescricao').value = '';
        if (document.getElementById('cliOrcData')) document.getElementById('cliOrcData').value = '';
        if (document.getElementById('cliOrcHora')) document.getElementById('cliOrcHora').value = '';

        if (typeof historico !== 'undefined' && idOficinaDaLojaAtual === usuarioAtualId) {
            historico.unshift(novoAgendamento);
            if (!clienteExiste) clientes.push({ nome: nome, endereco: 'Agendamento Online', tel: telefone, city: 'Sátrio Dias/BA', cidade: 'Sátrio Dias/BA' });
            if (typeof renderAgenda === 'function') renderAgenda();
            if (typeof renderClientes === 'function') renderClientes();
        }

    } catch (err) {
        console.error("Erro no agendamento:", err);
        alert(`Erro ao enviar agendamento: ${err.message || 'Verifique as permissões da tabela user_data'}`);
    }
}



// SUBSTITUA POR ESTA VERSÃO CORRIGIDA (SEM O LOOP DO PLACEHOLDER)
async function carregarProdutosVitrinePublica(idOficina) {
    const containerVitrine = document.getElementById('vitrine-publica-cliente');
    if (!containerVitrine) return;
    
    containerVitrine.innerHTML = '<p style="color: #a1a1aa;">Carregando peças da oficina...</p>';

    try {
        const { data: produtos, error } = await supabaseClient
            .from('produtos_loja')
            .select('*')
            .eq('user_id', idOficina);

        if (error) throw error;

        containerVitrine.innerHTML = '';

        if (!produtos || produtos.length === 0) {
            containerVitrine.innerHTML = '<p style="color: #a1a1aa; grid-column: 1/-1; text-align: center; padding: 30px;">Nenhum produto em exposição nesta vitrine no momento.</p>';
            return;
        }

        // Imagem reserva caso o produto não tenha foto cadastrada
        const imagemPadraoSegura = 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=500&auto=format&fit=crop&q=60';

        produtos.forEach(prod => {
            const urlImagem = prod.imagem_url || imagemPadraoSegura;
            
            containerVitrine.innerHTML += `
                <div style="background: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; min-height: 310px;">
                    <img src="${urlImagem}" style="width: 100%; height: 130px; object-fit: cover; border-radius: 6px; background: #09090b;" 
                         onerror="this.onerror=null; this.src='${imagemPadraoSegura}';">
                    <div style="margin-top: 12px; flex: 1;">
                        <h4 style="font-size: 15px; color: #ffffff; font-weight: 700; margin: 0;">${prod.nome}</h4>
                        <p style="font-size: 12px; color: #a1a1aa; margin: 4px 0 0 0; line-height: 1.4;">${prod.descricao || 'Disponível para instalação.'}</p>
                    </div>
                   // ALTERE PARA ESTE NOVO BLOCO:
<div style="display: flex; align-items: center; justify-content: space-between; margin-top: 15px; border-top: 1px solid #27272a; padding-top: 12px;">
    <span style="font-size: 16px; font-weight: 800; color: #e11d48;">R$ ${parseFloat(prod.preco).toFixed(2)}</span>
    <button onclick="abrirModalCompra('${prod.id}', '${prod.nome}', '${prod.preco}', '${prod.estoque || 0}')" style="background: #22c55e; color: #ffffff; border: none; padding: 6px 14px; border-radius: 6px; font-weight: 700; font-size: 12px; cursor: pointer; transition: 0.2s;">
        Comprar Agora
    </button>
</div>
            `;
        });

    } catch (err) {
        console.error("Erro vitrine:", err);
        containerVitrine.innerHTML = '<p style="color: #e11d48;">Erro ao conectar com os produtos.</p>';
    }
}

// ========================================================
// SISTEMA DE ESTOQUE E COMPRA VIA PIX - ALDINEICAR (IDs BLINDADOS)
// ========================================================
let produtoSelecionadoParaCompra = null;
let precoUnitarioSelecionado = 0;
let estoqueDisponivelSelecionado = 0;
let nomeProdutoSelecionado = "";

function abrirModalCompra(id, nome, preco, estoque) {
    produtoSelecionadoParaCompra = id;
    precoUnitarioSelecionado = parseFloat(preco) || 0;
    estoqueDisponivelSelecionado = parseInt(estoque) || 0;
    nomeProdutoSelecionado = nome;

    if (estoqueDisponivelSelecionado <= 0) {
        alert("Desculpe, este produto está esgotado no momento!");
        return;
    }

    const modalAntigo = document.getElementById('modalCompraProdutoDinamico');
    if (modalAntigo) modalAntigo.remove();

    const divModal = document.createElement('div');
    divModal.id = 'modalCompraProdutoDinamico';
    divModal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:99999; display:flex; justify-content:center; align-items:center; backdrop-filter: blur(4px);";
    
    divModal.innerHTML = `
        <div style="background:#1c1c1e; padding:24px; border-radius:12px; width:90%; max-width:420px; box-shadow:0 10px 25px rgba(0,0,0,0.5); border: 1px solid #2c2c2e; color: #ffffff; font-family: sans-serif;">
            <h3 style="margin-top:0; color:#ffffff; font-size: 18px; font-weight: 700;">Finalizar Compra</h3>
            <p style="font-weight:700; color:#22c55e; margin-top: 8px; font-size: 16px;">${nome}</p>
            <p style="font-size:13px; color:#22c55e; margin-top: 2px;">Preço Unitário: R$ ${precoUnitarioSelecionado.toFixed(2)}</p>
            <p style="font-size:12px; color:#a1a1aa; margin-top: 2px;">Disponível no Estoque: ${estoqueDisponivelSelecionado} un.</p>
            
            <hr style="border: 0; border-top: 1px solid #2c2c2e; margin: 16px 0;">
            
            <div style="margin-bottom: 14px;">
                <label style="display:block; margin-bottom:6px; font-size: 13px; color: #a1a1aa; font-weight:600;">Quantidade:</label>
                <input type="number" id="vendaQtd" value="1" min="1" max="${estoqueDisponivelSelecionado}" oninput="calcularTotalCompraDinamica()" onchange="calcularTotalCompraDinamica()" style="width:100%; padding:10px; background: #2c2c2e; border:1px solid #3a3a3c; border-radius:8px; color: #ffffff; font-weight: 600;">
            </div>

            <div style="background:#2c2c2e; padding:12px; border-radius:8px; margin-bottom:16px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 14px; color: #a1a1aa; font-weight: 600;">Total a Pagar:</span>
                <span id="vendaTotalExibicao" style="font-weight:800; color:#22c55e; font-size: 18px;">R$ ${precoUnitarioSelecionado.toFixed(2)}</span>
            </div>

            <div style="margin-bottom: 12px;">
                <label style="display:block; margin-bottom:6px; font-size: 13px; color: #a1a1aa; font-weight:600;">Seu Nome:</label>
                <input type="text" id="vendaNome" placeholder="Digite seu nome" style="width:100%; padding:10px; background: #2c2c2e; border:1px solid #3a3a3c; border-radius:8px; color: #ffffff;">
            </div>

            <div style="margin-bottom: 20px;">
                <label style="display:block; margin-bottom:6px; font-size: 13px; color: #a1a1aa; font-weight:600;">Seu Telefone (WhatsApp):</label>
                <input type="text" id="vendaTel" placeholder="(75) 99999-9999" style="width:100%; padding:10px; background: #2c2c2e; border:1px solid #3a3a3c; border-radius:8px; color: #ffffff;">
            </div>

            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button onclick="fecharModalCompraDinamica()" style="background:#3a3a3c; color:#ffffff; border:none; padding:10px 16px; border-radius:8px; font-weight:600; font-size: 13px; cursor:pointer;">Cancelar</button>
                <button onclick="processarBaixaEstoqueEPix()" style="background:#22c55e; color:#ffffff; border:none; padding:10px 20px; border-radius:8px; font-weight:700; font-size: 13px; cursor:pointer;">Pagar via PIX</button>
            </div>
        </div>
    `;

    document.body.appendChild(divModal);
}

function calcularTotalCompraDinamica() {
    const inputQtd = document.getElementById('vendaQtd');
    const txtTotal = document.getElementById('vendaTotalExibicao');
    if (!inputQtd || !txtTotal) return;

    let qtd = parseInt(inputQtd.value) || 1;
    if (qtd > estoqueDisponivelSelecionado) {
        alert(`Quantidade máxima em estoque: ${estoqueDisponivelSelecionado}`);
        qtd = estoqueDisponivelSelecionado;
        inputQtd.value = qtd;
    }
    if (qtd < 1) {
        qtd = 1;
        inputQtd.value = 1;
    }

    const total = qtd * precoUnitarioSelecionado;
    txtTotal.innerText = `R$ ${total.toFixed(2)}`;
}

function fecharModalCompraDinamica() {
    const modal = document.getElementById('modalCompraProdutoDinamico');
    if (modal) modal.remove();
}

async function processarBaixaEstoqueEPix() {
    const inputQtd = document.getElementById('vendaQtd');
    const inputNome = document.getElementById('vendaNome');
    const inputTel = document.getElementById('vendaTel');

    if (!inputNome || !inputTel || !inputNome.value.trim() || !inputTel.value.trim()) {
        alert("Por favor, preencha seu nome e telefone para contato!");
        return;
    }

    const qtdComprada = parseInt(inputQtd.value) || 1;
    const nomeCliente = inputNome.value.trim();
    const telCliente = inputTel.value.trim();
    const totalVenda = qtdComprada * precoUnitarioSelecionado;

    try {
        // Tenta descobrir o ID do dono da loja por todas as vias possíveis
        let idDonoVenda = null;
        
        if (typeof idOficinaDaLojaAtual !== 'undefined' && idOficinaDaLojaAtual) {
            idDonoVenda = idOficinaDaLojaAtual;
        } else if (typeof dadosOficina !== 'undefined' && dadosOficina) {
            idDonoVenda = dadosOficina.user_id || dadosOficina.id || dadosOficina.uid;
        } else if (typeof supabaseClient.auth.user === 'function' && supabaseClient.auth.user()) {
            idDonoVenda = supabaseClient.auth.user().id;
        } else if (supabaseClient.auth.session && supabaseClient.auth.session()) {
            idDonoVenda = supabaseClient.auth.session().user?.id;
        }

        // Se ainda assim não achar, tenta pegar de algum parâmetro na URL do site (?id=...)
        if (!idDonoVenda) {
            const urlParams = new URLSearchParams(window.location.search);
            idDonoVenda = urlParams.get('id') || urlParams.get('user_id');
        }

        if (!idDonoVenda) {
            throw new Error("Não foi possível identificar o ID do proprietário desta loja para registrar a venda.");
        }

        // Busca o registro atual do usuário no banco
        const { data: dadosAtuais, error: erroBusca } = await supabaseClient
            .from('user_data')
            .select('*')
            .eq('user_id', idDonoVenda)
            .single();

        if (erroBusca) throw new Error("Erro ao conectar à base de dados da oficina.");

        let listaMateriais = Array.isArray(dadosAtuais.materiais) ? dadosAtuais.materiais : (Array.isArray(dadosAtuais.materials) ? dadosAtuais.materials : []);
        let listaHistoricoGeral = Array.isArray(dadosAtuais.historico) ? dadosAtuais.historico : [];

        // 1. Atualiza o estoque na lista de materiais
        listaMateriais = listaMateriais.map(item => {
            if (item.id === produtoSelecionadoParaCompra) {
                let estoqueAtual = parseInt(item.qtd || item.quantidade || item.estoque || 0);
                if (estoqueAtual < qtdComprada) {
                    throw new Error(`Estoque insuficiente. Disponível: ${estoqueAtual} un.`);
                }
                item.qtd = estoqueAtual - qtdComprada;
                if (item.hasOwnProperty('quantidade')) item.quantidade = estoqueAtual - qtdComprada;
                if (item.hasOwnProperty('estoque')) item.estoque = estoqueAtual - qtdComprada;
            }
            return item;
        });

        // 2. Estrutura da venda padronizada com a tag limpa
        const novoRegistroVenda = {
            id_venda: 'VND-' + Math.floor(100000 + Math.random() * 900000),
            data: new Date().toLocaleDateString('pt-BR'),
            status: 'Concluído',
            tipo_registro: 'VENDA_DIRETA_BALCAO', 
            cliente: { nome: nomeCliente, tel: telCliente, endereco: 'Vitrine Virtual' },
            veiculo: { modelo: 'Balcão / Vitrine', placa: '---' },
            produto_nome: nomeProdutoSelecionado,
            quantidade: qtdComprada,
            valor_unitario: precoUnitarioSelecionado,
            total_pago: totalVenda,
            lucro: totalVenda
        };
        
        listaHistoricoGeral.unshift(novoRegistroVenda);

        // 3. Grava de volta no Supabase
        const { error: erroUpdate } = await supabaseClient
            .from('user_data')
            .update({
                materiais: listaMateriais,
                historico: listaHistoricoGeral,
                updated_at: new Date()
            })
            .eq('user_id', idDonoVenda);

        if (erroUpdate) throw erroUpdate;

        alert(`Perfeito, ${nomeCliente}!\nSua compra foi processada com sucesso no sistema da ALDINEICAR.\n\nEfetue o pagamento de R$ ${totalVenda.toFixed(2)} via PIX.`);
        fecharModalCompraDinamica();

        // Recarrega as listagens locais após um pequeno delay para o banco propagar
        setTimeout(() => {
            if (typeof carregarProdutosVitrinePublica === 'function') carregarProdutosVitrinePublica(idDonoVenda);
            if (typeof renderizarListaVendasExclusiva === 'function') renderizarListaVendasExclusiva();
        }, 500);

    } catch (err) {
        console.error(err);
        alert(`Não foi possível concluir: ${err.message}`);
    }
}


async function renderizarListaVendasExclusiva() {
    const corpoTabela = document.getElementById('tabela-vendas-corpo');
    if (!corpoTabela) {
        console.error("Erro: tabela-vendas-corpo não encontrado.");
        return;
    }

    corpoTabela.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:#64748b;">🔄 Carregando vendas...</td></tr>`;

    try {
        let historicoGeral = Array.isArray(historico) ? historico : [];

        // Sincroniza com nuvem se possível
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            const idUsuarioLogado = session?.user?.id || usuarioAtualId;
            if (idUsuarioLogado) {
                const { data: dados, error } = await supabaseClient
                    .from('user_data')
                    .select('historico')
                    .eq('user_id', idUsuarioLogado)
                    .single();
                if (!error && dados && Array.isArray(dados.historico)) {
                    historicoGeral = dados.historico;
                    historico = dados.historico; // mantém local sincronizado
                }
            }
        } catch (e) {
            console.warn('Usando histórico local para vendas:', e);
        }

        // Índices reais no array historico para poder excluir
        const vendasComIdx = [];
        historicoGeral.forEach((item, idxHist) => {
            const isVenda = item.tipo_registro === 'VENDA_DIRETA_BALCAO' ||
                item.tipo_registro === 'LOJA_VIRTUAL' ||
                item.tipo_servico === '[VENDA DIRETA]' ||
                (item.veiculo && item.veiculo.tipo_servico && String(item.veiculo.tipo_servico).includes('[VENDA DIRETA]'));
            if (isVenda) vendasComIdx.push({ item, idxHist });
        });

        if (vendasComIdx.length === 0) {
            corpoTabela.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:24px; color:#94a3b8;">Nenhuma venda encontrada.</td></tr>`;
            return;
        }

        let linhasHTML = '';
        vendasComIdx.forEach(({ item: venda, idxHist }) => {
            let nomeCliente = 'Cliente';
            if (venda.cliente) {
                if (typeof venda.cliente === 'object' && venda.cliente.nome) nomeCliente = venda.cliente.nome;
                else if (typeof venda.cliente === 'string') nomeCliente = venda.cliente;
            } else if (venda.cliente_nome) {
                nomeCliente = venda.cliente_nome;
            }

            const nomeProduto = venda.produto_nome || venda.nome_produto || 'Produto';
            const quantidadeItem = venda.quantidade || 1;

            let valorTotalRaw = venda.total_pago || venda.valor_total || venda.totalCobrado || 0;
            if (typeof valorTotalRaw === 'string') {
                valorTotalRaw = parseFloat(valorTotalRaw.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
            }
            const valorTotal = parseFloat(valorTotalRaw) || 0;
            const statusVenda = venda.status || 'Concluído';
            const idVenda = venda.id_venda || ('#' + idxHist);

            linhasHTML += `
                <tr>
                    <td style="color:#64748b;">${idVenda}</td>
                    <td>${venda.data || ''}</td>
                    <td>${nomeCliente}</td>
                    <td style="color:#059669; font-weight:600;">${nomeProduto}</td>
                    <td>${quantidadeItem}</td>
                    <td style="font-weight:700;">R$ ${valorTotal.toFixed(2)}</td>
                    <td><span style="background:#ecfdf5; color:#059669; padding:4px 8px; border-radius:6px; font-size:12px; font-weight:600;">${statusVenda}</span></td>
                    <td>
                        <button onclick="deletarVendaPorIndice(${idxHist})" title="Excluir venda" style="background:#fee2e2; color:#dc2626; border:none; padding:6px 10px; border-radius:6px; cursor:pointer; font-size:14px;">🗑️</button>
                    </td>
                </tr>`;
        });

        corpoTabela.innerHTML = linhasHTML;
    } catch (err) {
        console.error("Erro na listagem das vendas:", err);
        corpoTabela.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:#ef4444;">Erro: ${err.message}</td></tr>`;
    }
}

async function deletarVendaPorIndice(idxHist) {
    abrirConfirmacao('Deseja excluir esta venda do histórico?', async function() {
        if (idxHist < 0 || idxHist >= historico.length) {
            mostrarToast('Venda não encontrada.', 'erro');
            return;
        }
        historico.splice(idxHist, 1);
        await salvarNoBanco();
        renderizarListaVendasExclusiva();
        if (typeof renderDashboard === 'function') {
            const dash = document.getElementById('aba-dashboard');
            if (dash && dash.style.display !== 'none') renderDashboard();
        }
        mostrarToast('Venda excluída com sucesso!', 'sucesso');
    });
}


function fecharModalEspecifico(idModal) {
    const modal = document.getElementById(idModal);
    if (modal) {
        modal.style.display = 'none';
    }
}

function renderizarVendas(vendas) {
    const lista = document.getElementById('lista-vendas');
    lista.innerHTML = ''; // Limpa a lista antes de atualizar

    vendas.forEach(venda => {
        lista.innerHTML += `
            <tr>
                <td>${venda.data}</td>
                <td>${venda.item}</td>
                <td>R$ ${venda.valor}</td>
                <td>${venda.status}</td>
            </tr>
        `;
    });
}




// ========================================================
// AGENDA ONLINE - Gestão de agendamentos dos clientes
// ========================================================
let filtroAgendaAtual = 'todos';

function filtrarAgenda(status) {
    filtroAgendaAtual = status;
    document.querySelectorAll('.agenda-filtro').forEach(b => {
        b.style.background = '#f1f5f9';
        b.style.color = '#475569';
    });
    const btn = document.getElementById('filtro-agenda-' + status);
    if (btn) {
        btn.style.background = '#0f172a';
        btn.style.color = 'white';
    }
    renderAgenda();
}

function renderAgenda() {
    const container = document.getElementById('lista-agenda');
    if (!container) return;

    const lista = Array.isArray(historico) ? historico : [];
    let agendamentos = [];
    lista.forEach((item, idx) => {
        if (item.tipo_registro === 'AGENDAMENTO' || (item.agendamento && item.agendamento.data)) {
            agendamentos.push({ item, idx });
        }
    });

    // Ordena por data do agendamento (mais próximos primeiro)
    agendamentos.sort((a, b) => {
        const da = (a.item.agendamento && a.item.agendamento.data) || '';
        const ha = (a.item.agendamento && a.item.agendamento.hora) || '';
        const db = (b.item.agendamento && b.item.agendamento.data) || '';
        const hb = (b.item.agendamento && b.item.agendamento.hora) || '';
        return (da + ha).localeCompare(db + hb);
    });

    if (filtroAgendaAtual !== 'todos') {
        agendamentos = agendamentos.filter(({ item }) => (item.status || '') === filtroAgendaAtual);
    }

    if (agendamentos.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:48px 20px; background:white; border-radius:14px; border:1px solid #e2e8f0;">
            <div style="font-size:40px; margin-bottom:12px;">📅</div>
            <p style="color:#64748b; font-weight:600; margin:0;">Nenhum agendamento${filtroAgendaAtual !== 'todos' ? ' com este filtro' : ''}.</p>
            <p style="color:#94a3b8; font-size:13px; margin:8px 0 0 0;">Os clientes agendam pela vitrine pública do seu link.</p>
        </div>`;
        return;
    }

    let html = '';
    agendamentos.forEach(({ item, idx }) => {
        const cliente = item.cliente || {};
        const veiculo = item.veiculo || {};
        const ag = item.agendamento || {};
        const status = item.status || 'Agendado';

        let badgeClass = 'agenda-badge-pendente';
        if (status === 'Confirmado') badgeClass = 'agenda-badge-ok';
        if (status === 'Cancelado') badgeClass = 'agenda-badge-cancel';
        if (status === 'Concluído') badgeClass = 'agenda-badge-done';

        const tel = cliente.tel || '';
        const telLimpo = tel.replace(/\D/g, '');
        const msgWa = encodeURIComponent(`Olá ${cliente.nome || ''}! Sobre o seu agendamento em ${ag.label || ag.data_br || ''} — ALDINEICAR`);

        html += `
        <div class="agenda-card">
            <div class="agenda-card-left">
                <div class="agenda-data-box">
                    <span class="agenda-dia">${(ag.data_br || '--/--/----').split('/')[0] || '--'}</span>
                    <span class="agenda-mes">${(ag.data_br || '').split('/')[1] || ''}/${(ag.data_br || '').split('/')[2] || ''}</span>
                    <span class="agenda-hora">${ag.hora || '--:--'}</span>
                </div>
            </div>
            <div class="agenda-card-body">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap;">
                    <div>
                        <span class="agenda-badge ${badgeClass}">${status}</span>
                        <h3 style="margin:8px 0 4px 0; font-size:16px; color:#0f172a;">${cliente.nome || 'Cliente'}</h3>
                        <p style="margin:0; font-size:13px; color:#64748b;">📱 ${tel || 'Sem telefone'} · 🚗 ${veiculo.modelo || '---'}</p>
                    </div>
                    <span style="font-size:11px; color:#94a3b8; font-weight:600;">${item.id_agendamento || ''}</span>
                </div>
                <p style="margin:12px 0 0 0; font-size:13px; color:#334155; background:#f8fafc; padding:10px 12px; border-radius:8px; border:1px solid #f1f5f9;">
                    <strong>Serviço:</strong> ${veiculo.tipo_servico || 'Não informado'}
                </p>
                <div class="agenda-acoes">
                    ${status === 'Agendado' ? `
                        <button onclick="alterarStatusAgendamento(${idx}, 'Confirmado')" class="agenda-btn agenda-btn-ok">✓ Confirmar</button>
                        <button onclick="alterarStatusAgendamento(${idx}, 'Cancelado')" class="agenda-btn agenda-btn-cancel">✕ Cancelar</button>
                    ` : ''}
                    ${status === 'Confirmado' ? `
                        <button onclick="alterarStatusAgendamento(${idx}, 'Concluído')" class="agenda-btn agenda-btn-done">✓ Concluir</button>
                        <button onclick="alterarStatusAgendamento(${idx}, 'Cancelado')" class="agenda-btn agenda-btn-cancel">✕ Cancelar</button>
                    ` : ''}
                    ${telLimpo ? `<a href="https://wa.me/55${telLimpo}?text=${msgWa}" target="_blank" class="agenda-btn agenda-btn-wa">📱 WhatsApp</a>` : ''}
                    <button onclick="deletarAgendamento(${idx})" class="agenda-btn agenda-btn-del">🗑️</button>
                </div>
            </div>
        </div>`;
    });

    container.innerHTML = html;
}

async function alterarStatusAgendamento(idx, novoStatus) {
    if (idx < 0 || idx >= historico.length) return;
    historico[idx].status = novoStatus;
    await salvarNoBanco();
    renderAgenda();
    if (typeof mostrarToast === 'function') {
        mostrarToast('Status atualizado para: ' + novoStatus, 'sucesso');
    }
}

async function deletarAgendamento(idx) {
    abrirConfirmacao('Deseja excluir este agendamento?', async function() {
        if (idx < 0 || idx >= historico.length) return;
        historico.splice(idx, 1);
        await salvarNoBanco();
        renderAgenda();
        if (typeof mostrarToast === 'function') mostrarToast('Agendamento removido.', 'sucesso');
    });
}

function prepararMinDataAgendamento() {
    const input = document.getElementById('cliOrcData');
    if (!input) return;
    const hoje = new Date();
    const y = hoje.getFullYear();
    const m = String(hoje.getMonth() + 1).padStart(2, '0');
    const d = String(hoje.getDate()).padStart(2, '0');
    input.min = `${y}-${m}-${d}`;
}

// Hook: ao abrir modal do cliente, define data mínima
const _abrirModalOrcamentoClienteOrig = typeof abrirModalOrcamentoCliente === 'function' ? abrirModalOrcamentoCliente : null;
function abrirModalOrcamentoCliente() {
    const modal = document.getElementById('modal-orcamento-cliente');
    if (modal) modal.style.display = 'flex';
    prepararMinDataAgendamento();
}

// ========================================================
// DASHBOARD FINANCEIRO - Orçamentos, Materiais e Vendas separados
// ========================================================
let graficoFinanceiroInstance = null;

function parseDataHistorico(dataStr) {
    if (!dataStr) return null;
    try {
        if (String(dataStr).includes('/')) {
            const parte = String(dataStr).split(',')[0].trim();
            const bits = parte.split('/');
            if (bits.length >= 3) {
                const dia = parseInt(bits[0], 10);
                const mes = parseInt(bits[1], 10);
                const ano = parseInt(bits[2], 10);
                if (dia && mes && ano) return new Date(ano, mes - 1, dia);
            }
        }
        const d = new Date(dataStr);
        if (!isNaN(d.getTime())) return d;
    } catch (e) {}
    return null;
}

function isRegistroVenda(item) {
    if (!item) return false;
    if (item.tipo_registro === 'VENDA_DIRETA_BALCAO' || item.tipo_registro === 'LOJA_VIRTUAL') return true;
    if (item.tipo_servico === '[VENDA DIRETA]') return true;
    if (item.veiculo && item.veiculo.tipo_servico && String(item.veiculo.tipo_servico).includes('[VENDA DIRETA]')) return true;
    return false;
}

function valorVenda(item) {
    let v = item.total_pago || item.valor_total || item.totalCobrado || 0;
    if (typeof v === 'string') v = parseFloat(v.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
    return parseFloat(v) || 0;
}

function valorOrcamento(item) {
    return parseFloat(item.totalCobrado) || parseFloat(item.total) || 0;
}

function custoMateriaisOrc(item) {
    let c = item.totalMateriaisCalculado !== undefined ? item.totalMateriaisCalculado : (item.totalMateriais || 0);
    return parseFloat(c) || 0;
}

function obterPeriodoDashboard() {
    const inputIni = document.getElementById('dashDataInicio');
    const inputFim = document.getElementById('dashDataFim');
    let ini = inputIni && inputIni.value ? new Date(inputIni.value + 'T00:00:00') : null;
    let fim = inputFim && inputFim.value ? new Date(inputFim.value + 'T23:59:59') : null;

    // Se nada definido, padrão = ano atual
    if (!ini && !fim) {
        const ano = new Date().getFullYear();
        ini = new Date(ano, 0, 1);
        fim = new Date(ano, 11, 31, 23, 59, 59);
        if (inputIni) inputIni.value = `${ano}-01-01`;
        if (inputFim) inputFim.value = `${ano}-12-31`;
    } else if (ini && !fim) {
        fim = new Date();
        fim.setHours(23, 59, 59, 999);
        if (inputFim) inputFim.value = fim.toISOString().slice(0, 10);
    } else if (!ini && fim) {
        ini = new Date(fim.getFullYear(), 0, 1);
        if (inputIni) inputIni.value = ini.toISOString().slice(0, 10);
    }

    if (ini && fim && ini > fim) {
        const tmp = ini; ini = fim; fim = tmp;
        if (inputIni) inputIni.value = ini.toISOString().slice(0, 10);
        if (inputFim) inputFim.value = fim.toISOString().slice(0, 10);
    }
    return { ini, fim };
}

function definirPeriodoRapido(tipo) {
    const inputIni = document.getElementById('dashDataInicio');
    const inputFim = document.getElementById('dashDataFim');
    if (!inputIni || !inputFim) return;

    const hoje = new Date();
    let ini, fim;

    if (tipo === 'mes') {
        ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    } else if (tipo === 'ano') {
        ini = new Date(hoje.getFullYear(), 0, 1);
        fim = new Date(hoje.getFullYear(), 11, 31);
    } else {
        // tudo: varre histórico
        let minT = null, maxT = null;
        (historico || []).forEach(item => {
            const d = parseDataHistorico(item.data);
            if (!d) return;
            const t = d.getTime();
            if (minT === null || t < minT) minT = t;
            if (maxT === null || t > maxT) maxT = t;
        });
        ini = minT !== null ? new Date(minT) : new Date(hoje.getFullYear(), 0, 1);
        fim = maxT !== null ? new Date(maxT) : hoje;
    }

    const fmt = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };
    inputIni.value = fmt(ini);
    inputFim.value = fmt(fim);
    renderDashboard();
}

function dataNoPeriodo(data, ini, fim) {
    if (!data) return false;
    const t = data.getTime();
    if (ini && t < ini.getTime()) return false;
    if (fim && t > fim.getTime()) return false;
    return true;
}

function calcularDadosPorPeriodo(ini, fim) {
    // Agrega por mês dentro do período (para o gráfico)
    const mapa = {}; // chave YYYY-MM
    let totalFatOrc = 0, totalMat = 0, totalVendas = 0, qtdOrc = 0, qtdVendas = 0;

    const lista = Array.isArray(historico) ? historico : [];
    lista.forEach(item => {
        const data = parseDataHistorico(item.data);
        if (!dataNoPeriodo(data, ini, fim)) return;

        const chave = data.getFullYear() + '-' + String(data.getMonth() + 1).padStart(2, '0');
        if (!mapa[chave]) mapa[chave] = { fatOrc: 0, materiais: 0, vendas: 0, qtdOrc: 0, qtdVendas: 0, label: '' };
        const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        mapa[chave].label = nomes[data.getMonth()] + '/' + data.getFullYear();

        if (isRegistroVenda(item)) {
            const v = valorVenda(item);
            mapa[chave].vendas += v;
            mapa[chave].qtdVendas += 1;
            totalVendas += v;
            qtdVendas += 1;
        } else {
            const status = (item.status || '').toString().trim().toLowerCase();
            if (status !== 'pago') return;
            const fat = valorOrcamento(item);
            const mat = custoMateriaisOrc(item);
            mapa[chave].fatOrc += fat;
            mapa[chave].materiais += mat;
            mapa[chave].qtdOrc += 1;
            totalFatOrc += fat;
            totalMat += mat;
            qtdOrc += 1;
        }
    });

    const chaves = Object.keys(mapa).sort();
    return {
        totalFatOrc, totalMat, totalVendas, qtdOrc, qtdVendas,
        labels: chaves.map(k => mapa[k].label),
        fatOrc: chaves.map(k => mapa[k].fatOrc),
        materiais: chaves.map(k => mapa[k].materiais),
        vendas: chaves.map(k => mapa[k].vendas),
        linhas: chaves.map(k => ({
            label: mapa[k].label,
            fatOrc: mapa[k].fatOrc,
            materiais: mapa[k].materiais,
            vendas: mapa[k].vendas,
            qtdOrc: mapa[k].qtdOrc,
            qtdVendas: mapa[k].qtdVendas
        }))
    };
}

function formatarBRL(valor) {
    const n = Number(valor) || 0;
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarDataBR(d) {
    if (!d) return '--';
    return d.toLocaleDateString('pt-BR');
}

function renderDashboard() {
    const canvas = document.getElementById('graficoFinanceiro');
    if (!canvas) return;
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js não carregado');
        return;
    }

    const { ini, fim } = obterPeriodoDashboard();
    const dados = calcularDadosPorPeriodo(ini, fim);

    const labelEl = document.getElementById('dashPeriodoLabel');
    if (labelEl) {
        labelEl.innerText = 'Período: ' + formatarDataBR(ini) + '  →  ' + formatarDataBR(fim);
    }

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    set('kpi-fat-orc', formatarBRL(dados.totalFatOrc));
    set('kpi-materiais', formatarBRL(dados.totalMat));
    set('kpi-vendas', formatarBRL(dados.totalVendas));
    set('kpi-lucro', formatarBRL(dados.totalFatOrc - dados.totalMat));
    set('kpi-fat-orc-sub', dados.qtdOrc + ' orçamento(s) pago(s) no período');
    set('kpi-materiais-sub', 'Materiais das OS pagas no período');
    set('kpi-vendas-sub', dados.qtdVendas + ' venda(s) no período');

    const tbody = document.getElementById('tabela-resumo-mensal');
    if (tbody) {
        let html = '';
        dados.linhas.forEach(m => {
            const lucro = m.fatOrc - m.materiais;
            html += `<tr>
                <td>${m.label}</td>
                <td class="val-pos">${formatarBRL(m.fatOrc)}</td>
                <td class="val-neg">${formatarBRL(m.materiais)}</td>
                <td class="${lucro >= 0 ? 'val-pos' : 'val-neg'}">${formatarBRL(lucro)}</td>
                <td style="color:#d97706;font-weight:700;">${formatarBRL(m.vendas)}</td>
                <td>${m.qtdOrc}</td>
                <td>${m.qtdVendas}</td>
            </tr>`;
        });
        tbody.innerHTML = html || `<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:20px;">Nenhum dado neste período</td></tr>`;
    }

    if (graficoFinanceiroInstance) graficoFinanceiroInstance.destroy();

    const labels = dados.labels.length ? dados.labels : ['Sem dados'];
    const fatOrc = dados.labels.length ? dados.fatOrc : [0];
    const mat = dados.labels.length ? dados.materiais : [0];
    const vendas = dados.labels.length ? dados.vendas : [0];

    graficoFinanceiroInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Orçamentos (Pagos)',
                    data: fatOrc,
                    backgroundColor: 'rgba(16, 185, 129, 0.85)',
                    borderRadius: 6,
                    borderSkipped: false,
                    maxBarThickness: 22
                },
                {
                    label: 'Materiais',
                    data: mat,
                    backgroundColor: 'rgba(225, 29, 72, 0.8)',
                    borderRadius: 6,
                    borderSkipped: false,
                    maxBarThickness: 22
                },
                {
                    label: 'Vendas Loja',
                    data: vendas,
                    backgroundColor: 'rgba(245, 158, 11, 0.85)',
                    borderRadius: 6,
                    borderSkipped: false,
                    maxBarThickness: 22
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ctx.dataset.label + ': ' + formatarBRL(ctx.parsed.y)
                    }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { font: { weight: '600', size: 11 }, color: '#64748b' } },
                y: {
                    beginAtZero: true,
                    grid: { color: '#f1f5f9' },
                    ticks: {
                        font: { size: 11 },
                        color: '#94a3b8',
                        callback: (v) => v >= 1000 ? 'R$ ' + (v / 1000).toFixed(1) + 'k' : 'R$ ' + v
                    }
                }
            }
        }
    });
}

