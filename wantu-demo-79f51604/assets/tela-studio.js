/* WANTU · tela studio
   Preferências, fila de decisão, produção e financeiro do creator titular.
   Recusar não pede motivo e não mostra confirmação culpabilizante, porque
   a autonomia aqui é comportamento e não texto institucional.             */

;(function () {
  'use strict';

  const W = window.WANTU;
  const A = W.app;
  let emContraproposta = null;
  let ultimoFoco = null;

  function eu() {
    const c = A.contexto();
    return A.estado().creators.find(function (x) { return x.publicId === c.atorId; });
  }

  function salvarCreator(mudanca) {
    const e = A.estado();
    e.creators = e.creators.map(function (c) {
      return c.publicId === A.contexto().atorId ? Object.assign({}, c, mudanca) : c;
    });
    A.salvar();
  }

  function catDe(id) {
    return W.dados.CATEGORIAS.find(function (c) { return c.id === id; }) || { rotulo: id };
  }

  /* ------------------------------------------------------- preferências */

  function desenharPreferencias() {
    const c = eu();
    document.getElementById('disponivel').checked = c.disponibilidade === 'aberta';
    document.getElementById('nota-disponivel').textContent = c.disponibilidade === 'aberta'
      ? 'Você está recebendo propostas. Pausar vale na hora e não afeta a sua reputação.'
      : 'Você está pausada. Ninguém consegue propor, e você some da busca enquanto estiver assim.';

    document.getElementById('limite').value = c.limiteDiario;

    document.getElementById('catalogo-editor').innerHTML = c.categorias.map(function (cat) {
      const g = catDe(cat.id);
      return '<div class="linha linha--entre card card--plano" style="gap:var(--e-4)">'
        + '<span class="crescer"><strong>' + A.escapar(g.rotulo) + '</strong><br>'
        + '<span class="caption">âncora da plataforma ' + A.dinheiro(g.ancoraCentavos) + '</span></span>'
        + '<span class="campo" style="max-width:150px"><label class="sr" for="min-' + cat.id + '">Mínimo de ' + A.escapar(g.rotulo) + '</label>'
        + '<input id="min-' + cat.id + '" type="number" step="10" min="' + (g.ancoraCentavos / 100) + '" value="' + (cat.minimoCentavos / 100) + '" data-min="' + cat.id + '"></span>'
        + '<span class="campo" style="max-width:110px"><label class="sr" for="pz-' + cat.id + '">Prazo de ' + A.escapar(g.rotulo) + '</label>'
        + '<input id="pz-' + cat.id + '" type="number" min="1" max="90" value="' + cat.prazoDias + '" data-prazo="' + cat.id + '"></span>'
        + '</div>';
    }).join('');

    document.querySelectorAll('[data-min]').forEach(function (i) {
      i.addEventListener('change', function () {
        const g = catDe(i.dataset.min);
        const v = Math.round(Number(i.value) * 100);
        if (!isFinite(v) || v < g.ancoraCentavos) {
          i.value = String(catDe(i.dataset.min).ancoraCentavos / 100);
          A.recado('O mínimo não pode ficar abaixo da âncora da modalidade nesta demonstração', 'erro');
          return;
        }
        salvarCreator({ categorias: eu().categorias.map(function (x) {
          return x.id === i.dataset.min ? Object.assign({}, x, { minimoCentavos: v }) : x;
        }) });
        A.recado('Mínimo atualizado. Vale para as próximas propostas', 'ok');
      });
    });

    document.querySelectorAll('[data-prazo]').forEach(function (i) {
      i.addEventListener('change', function () {
        salvarCreator({ categorias: eu().categorias.map(function (x) {
          return x.id === i.dataset.prazo ? Object.assign({}, x, { prazoDias: Number(i.value) }) : x;
        }) });
        A.recado('Prazo atualizado', 'ok');
      });
    });

    document.getElementById('nao-aceito').value = c.naoAceito.join('\n');
    desenharBloqueios();
  }

  function desenharBloqueios() {
    const c = eu();
    const alvo = document.getElementById('bloqueios');
    if (!c.bloqueados.length) {
      alvo.innerHTML = '<p class="caption">Ninguém bloqueado. Bloquear não exige justificativa e interrompe as propostas na hora.</p>';
      return;
    }
    alvo.innerHTML = c.bloqueados.map(function (id) {
      return '<div class="linha linha--entre"><span class="chip">' + A.escapar(id) + '</span>'
        + '<button class="btn btn--texto btn--pequeno" type="button" data-desbloquear="' + A.escapar(id) + '">Desbloquear</button></div>';
    }).join('');
    alvo.querySelectorAll('[data-desbloquear]').forEach(function (b) {
      b.addEventListener('click', function () {
        salvarCreator({ bloqueados: eu().bloqueados.filter(function (x) { return x !== b.dataset.desbloquear; }) });
        desenharBloqueios();
        desenhar();
      });
    });
  }

  /* -------------------------------------------------------------- fila */

  function cartaoFila(p) {
    const e = W.estado.economia(p.brutoCentavos);
    const acoes = W.studio.acoesDisponiveis(p, A.contexto());
    const contra = p.contrapropostas[p.contrapropostas.length - 1];
    return '<article class="card card-pedido" data-pedido="' + A.escapar(p.id) + '">'
      + '<div class="card-pedido__topo"><div class="pilha-1">'
      + '<span class="card-pedido__id">' + A.escapar(p.id) + ' · ' + A.escapar(catDe(p.categoriaId).rotulo) + '</span>'
      + '<h3>' + A.dinheiro(p.brutoCentavos) + ' em ' + p.prazoDias + ' dias</h3></div>'
      + '<span class="selo-estado selo-estado--' + (p.estado === 'COUNTEROFFERED' ? 'atencao' : 'neutro') + '">'
      + (p.estado === 'COUNTEROFFERED' ? 'Aguardando quem propôs' : 'Aguardando você') + '</span></div>'
      + '<p class="card-pedido__briefing">' + A.escapar(p.briefing) + '</p>'
      + (contra ? '<p class="caption">Você sugeriu ' + A.dinheiro(contra.brutoCentavos) + ' em ' + contra.prazoDias
        + ' dias. Rodada ' + p.rodadas + ' de ' + W.estado.RODADAS_MAX + '.</p>' : '')
      + '<div class="card-pedido__numeros">'
      + '<div class="card-pedido__numero"><span>Valor bruto</span><strong>' + A.dinheiro(e.bruto) + '</strong></div>'
      + '<div class="card-pedido__numero"><span>Comissão 20%</span><strong>' + A.dinheiro(e.comissao) + '</strong></div>'
      + '<div class="card-pedido__numero"><span>Você recebe (estimado)</span><strong>' + A.dinheiro(e.liquido) + '</strong></div>'
      + '<div class="card-pedido__numero"><span>Responder até</span><strong>' + A.escapar(A.emQuanto(p.expiraEm)) + '</strong></div>'
      + '</div>'
      + (acoes.length ? '<div class="card-pedido__acoes">' + acoes.map(function (a) {
        return '<button class="btn btn--' + a.tom + ' btn--pequeno" type="button" data-acao="' + a.id + '">' + A.escapar(a.rotulo) + '</button>';
      }).join('') + '</div>' : '')
      + '<p class="caption">Recusar é um direito e dispensa justificativa. Não afeta a sua reputação nem a sua posição no catálogo.</p>'
      + '</article>';
  }

  function cartaoProducao(p) {
    const acoes = W.studio.acoesDisponiveis(p, A.contexto());
    const e = W.estado.economia(p.brutoCentavos);
    return '<article class="card card-pedido" data-pedido="' + A.escapar(p.id) + '">'
      + '<div class="card-pedido__topo"><div class="pilha-1">'
      + '<span class="card-pedido__id">' + A.escapar(p.id) + ' · ' + A.escapar(catDe(p.categoriaId).rotulo) + '</span>'
      + '<h3>' + A.escapar(p.briefing.slice(0, 70)) + (p.briefing.length > 70 ? '…' : '') + '</h3></div>'
      + '<span class="selo-estado selo-estado--andamento">' + A.escapar(p.estado) + '</span></div>'
      + '<div class="card-pedido__numeros">'
      + '<div class="card-pedido__numero"><span>Você recebe</span><strong>' + A.dinheiro(e.liquido) + '</strong></div>'
      + '<div class="card-pedido__numero"><span>Prazo</span><strong>' + p.prazoDias + ' dias</strong></div>'
      + '</div>'
      + (acoes.length ? '<div class="card-pedido__acoes">' + acoes.map(function (a) {
        return '<button class="btn btn--' + a.tom + ' btn--pequeno" type="button" data-acao="' + a.id + '">' + A.escapar(a.rotulo) + '</button>';
      }).join('') + '</div>' : '')
      + '</article>';
  }

  function desenhar() {
    const c = eu();
    const todos = A.estado().pedidos;
    const ctx = A.contexto();

    const fila = W.studio.fila(todos, ctx, c);
    const alvoFila = document.getElementById('fila');
    const nota = W.studio.notaRetidos(todos.filter(function (p) { return p.creatorPublicId === c.publicId; }));
    document.getElementById('nota-retidos').innerHTML = nota
      ? '<div class="aviso aviso--atencao"><span class="aviso__marca" aria-hidden="true">!</span><p>' + A.escapar(nota) + '</p></div>' : '';

    alvoFila.innerHTML = fila.length
      ? fila.map(cartaoFila).join('')
      : '<div class="vazio"><span class="vazio__marca" aria-hidden="true">✳</span>'
        + '<h3>Nenhuma proposta esperando você</h3>'
        + '<p>Quando alguém propuser um trabalho dentro do que você habilitou, ele aparece aqui com o valor líquido estimado.</p></div>';

    const producao = todos.filter(function (p) {
      return p.creatorPublicId === c.publicId
        && ['FUNDED', 'IN_PRODUCTION', 'SUBMITTED_FOR_REVIEW', 'REQUIRES_CHANGES', 'REWORK'].indexOf(p.estado) !== -1;
    });
    document.getElementById('producao').innerHTML = producao.length
      ? producao.map(cartaoProducao).join('')
      : '<p class="caption">Nada em produção agora.</p>';

    const s = W.studio.saldos(todos, ctx);
    document.getElementById('saldos').innerHTML = [
      ['Em produção', s.emProducao], ['Em janela de contestação', s.emJanela],
      ['Elegível para liquidação', s.elegivel], ['Liquidado', s.liquidado],
    ].map(function (par) {
      return '<div class="card-pedido__numero"><span>' + par[0] + '</span><strong>' + A.dinheiro(par[1]) + '</strong></div>';
    }).join('');

    ligarAcoes();
  }

  function pedidoPorId(id) {
    return A.estado().pedidos.find(function (p) { return p.id === id; });
  }

  function aplicar(p, destino, extra) {
    const r = W.estado.transicionar(p, destino, A.contexto());
    if (!r.ok) { A.recado(r.erro.mensagem, 'erro'); return false; }
    if (extra) Object.assign(r.pedido, extra);
    const e = A.estado();
    e.pedidos = e.pedidos.map(function (x) { return x.id === p.id ? r.pedido : x; });
    A.salvar();
    desenhar();
    return true;
  }

  function ligarAcoes() {
    document.querySelectorAll('[data-acao]').forEach(function (b) {
      b.addEventListener('click', function () {
        const p = pedidoPorId(b.closest('[data-pedido]').dataset.pedido);
        const acao = W.studio.acoesDisponiveis(p, A.contexto()).find(function (a) { return a.id === b.dataset.acao; });
        if (!acao) return;
        if (acao.id === 'contrapropor') { abrirContraproposta(p); return; }
        /* Recusar nao pede confirmacao: pedir confirmacao para recusar e
           empurrar a pessoa a aceitar. */
        if (aplicar(p, acao.destino)) {
          A.recado(acao.id === 'recusar' ? 'Proposta recusada' : 'Pedido atualizado', 'ok');
        }
      });
    });
  }

  /* ----------------------------------------------------- contraproposta */

  function abrirContraproposta(p) {
    emContraproposta = p;
    ultimoFoco = document.activeElement;
    const cat = eu().categorias.find(function (x) { return x.id === p.categoriaId; });
    document.getElementById('cp-valor').value = String(Math.round(p.brutoCentavos * 1.2) / 100);
    document.getElementById('cp-prazo').value = String(cat ? cat.prazoDias : p.prazoDias);
    document.getElementById('cp-nota').value = '';
    document.getElementById('cp-saida').innerHTML = '';
    document.getElementById('cp-original').textContent = A.dinheiro(p.brutoCentavos) + ' em ' + p.prazoDias + ' dias';
    document.getElementById('modal-contraproposta').hidden = false;
    document.body.style.overflow = 'hidden';
    document.querySelector('#modal-contraproposta .modal__fechar').focus();
  }

  function fecharContraproposta() {
    document.getElementById('modal-contraproposta').hidden = true;
    document.body.style.overflow = '';
    if (ultimoFoco) ultimoFoco.focus();
  }

  function enviarContraproposta() {
    const cat = eu().categorias.find(function (x) { return x.id === emContraproposta.categoriaId; });
    const dados = {
      brutoCentavos: Math.round(Number(document.getElementById('cp-valor').value) * 100),
      prazoDias: Number(document.getElementById('cp-prazo').value),
      nota: document.getElementById('cp-nota').value,
    };
    const v = W.studio.validarContraproposta(dados, cat ? cat.minimoCentavos : 0);
    const saida = document.getElementById('cp-saida');
    if (!v.ok) {
      saida.innerHTML = '<div class="aviso aviso--erro"><span class="aviso__marca" aria-hidden="true">!</span><p>'
        + A.escapar(v.erro.mensagem) + '</p></div>';
      return;
    }
    const c = W.studio.montarContraproposta(dados, A.contexto());
    const p = pedidoPorId(emContraproposta.id);
    if (aplicar(p, 'COUNTEROFFERED', { contrapropostas: p.contrapropostas.concat([c]) })) {
      fecharContraproposta();
      A.recado('Contraproposta enviada. Só vale se quem propôs aceitar', 'ok');
    }
  }

  function boot() {
    const veredito = A.iniciar('studio');
    if (!veredito.ok) {
      A.mostrarNegativa(veredito,
        '<button class="btn btn--outline btn--pequeno" type="button" id="virar-creator">Trocar para o papel de creator</button>');
      const b = document.getElementById('virar-creator');
      if (b) b.addEventListener('click', function () { A.trocarPapel('CREATOR'); });
      return;
    }
    A.esconderNegativa();

    document.getElementById('disponivel').addEventListener('change', function (e) {
      salvarCreator({ disponibilidade: e.target.checked ? 'aberta' : 'pausada' });
      desenharPreferencias();
      desenhar();
      A.recado(e.target.checked ? 'Você voltou a receber propostas' : 'Propostas pausadas. Vale a partir de agora', 'ok');
    });

    document.getElementById('limite').addEventListener('change', function (e) {
      salvarCreator({ limiteDiario: Math.max(0, Number(e.target.value) || 0) });
      A.recado('Limite diário atualizado', 'ok');
    });

    document.getElementById('salvar-limites').addEventListener('click', function () {
      const linhas = document.getElementById('nao-aceito').value.split('\n')
        .map(function (l) { return l.trim(); }).filter(Boolean);
      salvarCreator({ naoAceito: linhas });
      A.recado('A sua lista de limites foi atualizada e aparece no seu perfil', 'ok');
    });

    document.querySelector('#modal-contraproposta .modal__fechar').addEventListener('click', fecharContraproposta);
    document.getElementById('cp-enviar').addEventListener('click', enviarContraproposta);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !document.getElementById('modal-contraproposta').hidden) fecharContraproposta();
    });

    desenharPreferencias();
    desenhar();
    W.simulacao.assinar(desenhar);
  }

  window.aoAbrirPortao = boot;
  boot();
})();
