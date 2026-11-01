/* WANTU · tela pedidos
   Área do comprador: estados, prévia protegida e contestação objetiva.
   Reage aos eventos da simulação sem recarregar, para a janela de
   contestação virando ao vivo aparecer na demonstração.                   */

;(function () {
  'use strict';

  const W = window.WANTU;
  const A = W.app;
  let pedidoAtivo = null;
  let ultimoFoco = null;

  function meus() {
    const c = A.contexto();
    return A.estado().pedidos.filter(function (p) {
      return W.papel.podeVer({ tipo: 'pedido', compradorId: p.compradorId, creatorPublicId: p.creatorPublicId }, c).ok;
    });
  }

  function creatorDe(p) {
    return A.estado().creators.find(function (c) { return c.publicId === p.creatorPublicId; }) || { pseudonimo: p.creatorPublicId };
  }

  function catDe(p) {
    return W.dados.CATEGORIAS.find(function (c) { return c.id === p.categoriaId; }) || { rotulo: p.categoriaId };
  }

  const TOM = {
    SUBMITTED: 'neutro', COUNTEROFFERED: 'atencao', ACCEPTED: 'andamento',
    FUNDING_PENDING: 'andamento', FUNDED: 'andamento', IN_PRODUCTION: 'andamento',
    SUBMITTED_FOR_REVIEW: 'andamento', APPROVED_BY_PLATFORM: 'andamento',
    DELIVERED: 'atencao', DISPUTED: 'atencao', SETTLEMENT_ELIGIBLE: 'ok',
    SETTLED: 'ok', CLOSED: 'ok', DECLINED: 'erro', EXPIRED: 'erro',
    CANCELLED: 'erro', PAYMENT_FAILED: 'erro', SUSPENDED: 'erro', REFUNDED: 'erro',
  };

  const ROTULO = {
    SUBMITTED: 'Aguardando decisão', COUNTEROFFERED: 'Contraproposta recebida',
    ACCEPTED: 'Aceita, aguardando pagamento', FUNDING_PENDING: 'Pagamento em andamento',
    FUNDED: 'Pago, em fila de produção', IN_PRODUCTION: 'Em produção',
    SUBMITTED_FOR_REVIEW: 'Em análise da plataforma', APPROVED_BY_PLATFORM: 'Aprovada, liberando entrega',
    DELIVERED: 'Entregue', DISPUTED: 'Em contestação',
    SETTLEMENT_ELIGIBLE: 'Elegível para liquidação', SETTLED: 'Liquidado', CLOSED: 'Encerrado',
    DECLINED: 'Recusada', EXPIRED: 'Expirada', CANCELLED: 'Cancelada',
    PAYMENT_FAILED: 'Pagamento recusado', SUSPENDED: 'Suspensa', REFUNDED: 'Reembolsada',
  };

  function resumo(lista) {
    const entregues = lista.filter(function (p) { return p.estado === 'DELIVERED'; }).length;
    const esperando = lista.filter(function (p) { return ['SUBMITTED', 'COUNTEROFFERED'].indexOf(p.estado) !== -1; }).length;
    const fechados = lista.filter(function (p) { return ['SETTLED', 'CLOSED'].indexOf(p.estado) !== -1; }).length;
    document.getElementById('resumo').innerHTML = [
      ['Propostas', lista.length],
      ['Aguardando decisão', esperando],
      ['Entregas para conferir', entregues],
      ['Liquidadas', fechados],
    ].map(function (par) {
      return '<div class="card-pedido__numero"><span>' + par[0] + '</span><strong>' + par[1] + '</strong></div>';
    }).join('');
  }

  function linhaTempo(p) {
    return '<ol class="linha-tempo">' + p.historico.map(function (h, i) {
      const atual = i === p.historico.length - 1;
      return '<li class="linha-tempo__item ' + (atual ? 'linha-tempo__item--atual' : 'linha-tempo__item--feito') + '">'
        + '<span class="linha-tempo__ponto" aria-hidden="true"></span>'
        + '<span class="linha-tempo__texto">'
        + '<span class="linha-tempo__estado">' + A.escapar(ROTULO[h.estado] || h.estado) + '</span>'
        + '<span class="linha-tempo__meta">' + A.escapar(A.dataCurta(h.em)) + ' · por ' + A.escapar(h.ator) + '</span>'
        + '</span></li>';
    }).join('') + '</ol>';
  }

  function numeros(p) {
    const e = W.estado.economia(p.brutoCentavos);
    const linhas = [
      ['Valor bruto', A.dinheiro(e.bruto)],
      ['Comissão 20%', A.dinheiro(e.comissao)],
      ['Creator recebe', A.dinheiro(e.liquido)],
    ];
    if (p.estado === 'SUBMITTED' || p.estado === 'COUNTEROFFERED') {
      linhas.push(['Proposta expira em', A.emQuanto(p.expiraEm)]);
    } else if (p.janelaContestacaoAte && p.estado === 'DELIVERED') {
      linhas.push(['Janela de contestação', A.emQuanto(p.janelaContestacaoAte)]);
    } else {
      linhas.push(['Prazo proposto', p.prazoDias + ' dias']);
    }
    return '<div class="card-pedido__numeros">' + linhas.map(function (l) {
      return '<div class="card-pedido__numero"><span>' + l[0] + '</span><strong>' + A.escapar(l[1]) + '</strong></div>';
    }).join('') + '</div>';
  }

  function cartao(p) {
    const acoes = W.pedidos.acoesDisponiveis(p, A.contexto());
    const nota = W.pedidos.notaTriagem(p);
    const contra = p.contrapropostas[p.contrapropostas.length - 1];

    return '<article class="card card-pedido" data-pedido="' + A.escapar(p.id) + '">'
      + '<div class="card-pedido__topo">'
      + '<div class="pilha-1"><span class="card-pedido__id">' + A.escapar(p.id) + ' · '
      + A.escapar(catDe(p).rotulo) + ' · ' + A.escapar(creatorDe(p).pseudonimo) + '</span>'
      + '<h3>' + A.escapar(ROTULO[p.estado] || p.estado) + '</h3></div>'
      + '<span class="selo-estado selo-estado--' + (TOM[p.estado] || 'neutro') + '">'
      + A.escapar(ROTULO[p.estado] || p.estado) + '</span></div>'

      + '<p class="card-pedido__briefing">' + A.escapar(p.briefing) + '</p>'
      + (nota ? '<div class="aviso aviso--atencao"><span class="aviso__marca" aria-hidden="true">!</span><p>' + A.escapar(nota) + '</p></div>' : '')
      + (contra ? '<div class="aviso aviso--atencao"><span class="aviso__marca" aria-hidden="true">!</span>'
        + '<p><strong>Contraproposta de ' + A.escapar(creatorDe(p).pseudonimo) + ':</strong> '
        + A.dinheiro(contra.brutoCentavos) + ' em ' + contra.prazoDias + ' dias. ' + A.escapar(contra.nota || '') + '</p></div>' : '')
      + numeros(p)

      + '<div class="painel"><button class="painel__cabeca" type="button" aria-expanded="false" aria-controls="t-' + A.escapar(p.id) + '">'
      + '<span>Histórico de estados</span><span class="painel__seta" aria-hidden="true">▾</span></button>'
      + '<div class="painel__corpo" id="t-' + A.escapar(p.id) + '" hidden>' + linhaTempo(p) + '</div></div>'

      + (acoes.length ? '<div class="card-pedido__acoes">' + acoes.map(function (a) {
        return '<button class="btn btn--' + a.tom + ' btn--pequeno" type="button" data-acao="' + a.id + '">'
          + A.escapar(a.rotulo) + '</button>';
      }).join('') + '</div>' : '')
      + (acoes.length && acoes[0].nota ? '<p class="caption">' + A.escapar(acoes.find(function (a) { return a.nota; }) ? acoes.find(function (a) { return a.nota; }).nota : '') + '</p>' : '')
      + '</article>';
  }

  function desenhar() {
    const lista = meus();
    resumo(lista);
    const alvo = document.getElementById('lista');

    if (!lista.length) {
      alvo.innerHTML = '<div class="vazio"><span class="vazio__marca" aria-hidden="true">✳</span>'
        + '<h3>Nenhuma proposta por aqui ainda</h3>'
        + '<p>Quando você enviar uma proposta, ela aparece nesta lista com a decisão de quem cria e o histórico de cada etapa.</p>'
        + '<a class="btn btn--primario btn--pequeno" href="explorar.html">Explorar creators</a></div>';
      return;
    }
    A.esconderNegativa();

    alvo.innerHTML = lista.map(cartao).join('');
    ligarCartoes();
  }

  function pedidoPorId(id) {
    return A.estado().pedidos.find(function (p) { return p.id === id; });
  }

  function aplicar(p, destino) {
    const r = W.estado.transicionar(p, destino, A.contexto());
    if (!r.ok) { A.recado(r.erro.mensagem, 'erro'); return false; }
    const e = A.estado();
    e.pedidos = e.pedidos.map(function (x) { return x.id === p.id ? r.pedido : x; });
    A.salvar();
    desenhar();
    return true;
  }

  function ligarCartoes() {
    document.querySelectorAll('.painel__cabeca').forEach(function (b) {
      b.addEventListener('click', function () {
        const aberto = b.getAttribute('aria-expanded') === 'true';
        b.setAttribute('aria-expanded', String(!aberto));
        document.getElementById(b.getAttribute('aria-controls')).hidden = aberto;
      });
    });

    document.querySelectorAll('[data-acao]').forEach(function (b) {
      b.addEventListener('click', function () {
        const id = b.closest('[data-pedido]').dataset.pedido;
        const p = pedidoPorId(id);
        const acao = W.pedidos.acoesDisponiveis(p, A.contexto()).find(function (a) { return a.id === b.dataset.acao; });
        if (!acao) return;
        if (acao.id === 'ver_previa') { abrirPrevia(p); return; }
        if (acao.id === 'contestar') { abrirContestacao(p); return; }
        if (aplicar(p, acao.destino)) {
          A.recado(acao.id === 'confirmar'
            ? 'Entrega confirmada. O pedido ficou elegível para liquidação, e o repasse depende do evento financeiro'
            : 'Pedido atualizado', 'ok');
        }
      });
    });
  }

  /* ------------------------------------------------------------- modais */

  function abrir(id) {
    ultimoFoco = document.activeElement;
    document.getElementById(id).hidden = false;
    document.body.style.overflow = 'hidden';
    document.querySelector('#' + id + ' .modal__fechar').focus();
  }

  function fechar(id) {
    document.getElementById(id).hidden = true;
    document.body.style.overflow = '';
    if (ultimoFoco) ultimoFoco.focus();
  }

  function abrirPrevia(p) {
    pedidoAtivo = p;
    document.getElementById('previa-dagua').textContent = 'demonstração · ' + p.compradorId;
    document.getElementById('previa-titulo').textContent = 'Prévia de ' + catDe(p).rotulo.toLowerCase();
    abrir('modal-previa');
  }

  function abrirContestacao(p) {
    pedidoAtivo = p;
    document.getElementById('ct-briefing').textContent = p.briefing;
    document.getElementById('ct-saida').innerHTML = '';
    document.getElementById('ct-descricao').value = '';
    document.querySelectorAll('[name="ct-motivo"]').forEach(function (i) { i.checked = false; });
    abrir('modal-contestacao');
  }

  function enviarContestacao() {
    const motivos = Array.prototype.slice.call(document.querySelectorAll('[name="ct-motivo"]:checked'))
      .map(function (i) { return i.value; });
    const dados = { motivos: motivos, descricao: document.getElementById('ct-descricao').value };
    const v = W.pedidos.validarContestacao(dados);
    const saida = document.getElementById('ct-saida');

    if (!v.ok) {
      saida.innerHTML = '<div class="aviso aviso--erro"><span class="aviso__marca" aria-hidden="true">!</span>'
        + '<p>' + A.escapar(v.erro.mensagem) + '</p></div>';
      return;
    }

    const contestacao = W.pedidos.montarContestacao(dados, A.contexto());
    const r = W.estado.transicionar(pedidoAtivo, 'DISPUTED', A.contexto());
    if (!r.ok) {
      saida.innerHTML = '<div class="aviso aviso--erro"><span class="aviso__marca" aria-hidden="true">!</span>'
        + '<p>' + A.escapar(r.erro.mensagem) + '</p></div>';
      return;
    }
    r.pedido.disputa = contestacao;
    const e = A.estado();
    e.pedidos = e.pedidos.map(function (x) { return x.id === r.pedido.id ? r.pedido : x; });
    e.casos.unshift({
      id: 'cas_' + W.compositor.novoId().slice(4),
      tipo: 'Contestação de entrega', risco: 'medio', origem: 'Comprador',
      pedidoId: r.pedido.id,
      resumoRedigido: 'Contestação aberta com motivos objetivos: ' + motivos.join(', ') + '. Aguardando revisão humana.',
      estado: 'ABERTO', decisao: null, exigeRevisaoEmDupla: false,
      trilha: [{ em: contestacao.em, ator: 'usr_ana', nota: 'Contestação registrada dentro da janela' }],
    });
    A.salvar();
    fechar('modal-contestacao');
    desenhar();
    A.recado('Contestação aberta. Uma pessoa da equipe analisa a divergência contra o briefing', 'ok');
  }

  function boot() {
    const veredito = A.iniciar('pedidos');
    if (!veredito.ok) {
      A.mostrarNegativa(veredito,
        '<button class="btn btn--outline btn--pequeno" type="button" id="virar-comprador">Trocar para o papel de comprador</button>');
      const b = document.getElementById('virar-comprador');
      if (b) b.addEventListener('click', function () { A.trocarPapel('COMPRADOR'); });
      return;
    }

    document.querySelectorAll('.modal__fechar').forEach(function (b) {
      b.addEventListener('click', function () { fechar(b.closest('.modal-fundo').id); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      document.querySelectorAll('.modal-fundo:not([hidden])').forEach(function (m) { fechar(m.id); });
    });
    document.getElementById('ct-enviar').addEventListener('click', enviarContestacao);

    document.getElementById('ct-motivos').innerHTML = W.pedidos.MOTIVOS.map(function (m) {
      return '<label class="toggle" for="ct-' + m.id + '"><span>' + A.escapar(m.rotulo) + '</span>'
        + '<input type="checkbox" id="ct-' + m.id + '" name="ct-motivo" value="' + m.id + '"></label>';
    }).join('');

    desenhar();
    W.simulacao.assinar(desenhar);
  }

  window.aoAbrirPortao = boot;
  boot();
})();
