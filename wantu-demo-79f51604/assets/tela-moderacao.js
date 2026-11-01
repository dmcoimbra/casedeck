/* WANTU · tela moderação
   Fila por risco, decisão com justificativa obrigatória e trilha de
   auditoria. A mídia original não é servida aqui, e a tela diz de que isso
   depende na operação real.                                               */

;(function () {
  'use strict';

  const W = window.WANTU;
  const A = W.app;

  const TOM_RISCO = { critico: 'erro', alto: 'atencao', medio: 'neutro', baixo: 'neutro' };
  const ROTULO_RISCO = { critico: 'Crítico', alto: 'Alto', medio: 'Médio', baixo: 'Baixo' };
  const ROTULO_ESTADO = {
    ABERTO: 'Aberto', EM_ANALISE: 'Em análise',
    AGUARDA_SEGUNDA_REVISAO: 'Aguardando segunda revisão', RESOLVIDO: 'Resolvido',
  };

  function trilhaDe(c) {
    if (!c.trilha.length) return '<p class="caption">Sem registro ainda.</p>';
    return '<ol class="linha-tempo">' + c.trilha.map(function (t, i) {
      return '<li class="linha-tempo__item ' + (i === c.trilha.length - 1 ? 'linha-tempo__item--atual' : 'linha-tempo__item--feito') + '">'
        + '<span class="linha-tempo__ponto" aria-hidden="true"></span>'
        + '<span class="linha-tempo__texto">'
        + '<span class="linha-tempo__estado">' + A.escapar(t.decisao ? 'Decisão: ' + t.decisao : t.nota) + '</span>'
        + '<span class="linha-tempo__meta">' + A.escapar(A.dataCurta(t.em)) + ' · ' + A.escapar(t.ator)
        + (t.decisao ? ' · ' + A.escapar(t.nota) : '') + '</span>'
        + '</span></li>';
    }).join('') + '</ol>';
  }

  function cartao(c) {
    const resolvido = c.estado === 'RESOLVIDO';
    const segunda = c.estado === 'AGUARDA_SEGUNDA_REVISAO';
    return '<article class="card card-pedido" data-caso="' + A.escapar(c.id) + '">'
      + '<div class="card-pedido__topo"><div class="pilha-1">'
      + '<span class="card-pedido__id">' + A.escapar(c.id) + ' · ' + A.escapar(c.origem)
      + (c.pedidoId ? ' · pedido ' + A.escapar(c.pedidoId) : '') + '</span>'
      + '<h3>' + A.escapar(c.tipo) + '</h3></div>'
      + '<div class="linha">'
      + '<span class="selo-estado selo-estado--' + (TOM_RISCO[c.risco] || 'neutro') + '">Risco ' + A.escapar(ROTULO_RISCO[c.risco] || c.risco) + '</span>'
      + '<span class="selo-estado selo-estado--' + (resolvido ? 'ok' : segunda ? 'atencao' : 'neutro') + '">'
      + A.escapar(ROTULO_ESTADO[c.estado] || c.estado) + '</span></div></div>'

      + '<p class="card-pedido__briefing">' + A.escapar(c.resumoRedigido) + '</p>'

      + (c.exigeRevisaoEmDupla ? '<div class="aviso aviso--atencao"><span class="aviso__marca" aria-hidden="true">!</span>'
        + '<p><strong>Caso crítico.</strong> Exige duas pessoas diferentes, e quem já revisou não fecha o próprio caso. '
        + 'Esta decisão não é automatizável, e o classificador só sinaliza.</p></div>' : '')

      + '<div class="painel"><button class="painel__cabeca" type="button" aria-expanded="false" aria-controls="tr-' + A.escapar(c.id) + '">'
      + '<span>Trilha de auditoria</span><span class="painel__seta" aria-hidden="true">▾</span></button>'
      + '<div class="painel__corpo" id="tr-' + A.escapar(c.id) + '" hidden>' + trilhaDe(c) + '</div></div>'

      + (resolvido ? '<p class="caption">Decisão registrada: ' + A.escapar(c.decisao) + '. '
        + (c.divergencia ? 'As duas revisões divergiram (' + A.escapar(c.divergencia.de) + ' e '
          + A.escapar(c.divergencia.para) + '), e caso crítico com divergência escala, em vez de fechar pela escolha da segunda pessoa. ' : '')
        + 'Cabe recurso pelo canal de suporte.</p>'
        : '<div class="pilha-3">'
        + '<div class="campo"><label class="campo__rotulo" for="d-' + A.escapar(c.id) + '">Decisão</label>'
        + '<select id="d-' + A.escapar(c.id) + '" data-decisao>'
        + W.moderacao.DECISOES.map(function (d) {
          return '<option value="' + d.id + '">' + A.escapar(d.rotulo) + '</option>';
        }).join('') + '</select>'
        + '<span class="campo__ajuda" data-explicacao></span></div>'
        + '<div class="campo"><label class="campo__rotulo" for="j-' + A.escapar(c.id) + '">Justificativa, obrigatória</label>'
        + '<textarea id="j-' + A.escapar(c.id) + '" rows="3" data-justificativa placeholder="O que foi verificado e o que fundamenta a decisão"></textarea>'
        + '<span class="campo__ajuda">Vai para a trilha e sustenta um eventual recurso.</span></div>'
        + '<div data-saida class="avisos-briefing" role="status" aria-live="polite"></div>'
        + '<div class="card-pedido__acoes"><button class="btn btn--primario btn--pequeno" type="button" data-registrar>Registrar decisão</button></div>'
        + '</div>')
      + '</article>';
  }

  /* Caso crítico exige duas pessoas diferentes, e numa demonstração as duas
     são a mesma pessoa trocando de cadeira. O seletor é ferramenta de
     apresentação, como o painel: deixa mostrar o bloqueio E o fechamento. */
  function desenharRevisor() {
    const alvo = document.getElementById('revisor');
    if (!alvo) return;
    const ativo = A.contexto().atorId;
    alvo.innerHTML = '<div class="campo"><span class="campo__rotulo" id="rot-revisor">Revisando como</span>'
      + '<div class="barra-papel__grupo" role="group" aria-labelledby="rot-revisor">'
      + A.REVISORES.map(function (r) {
        return '<button class="barra-papel__opcao" type="button" data-revisor="' + r.id + '"'
          + ' aria-pressed="' + (r.id === ativo) + '">' + A.escapar(r.nome) + '</button>';
      }).join('')
      + '</div><span class="campo__ajuda">Caso crítico exige duas pessoas diferentes: quem já revisou não fecha o próprio caso.</span></div>';

    alvo.querySelectorAll('[data-revisor]').forEach(function (b) {
      b.addEventListener('click', function () {
        A.definir({ revisorAtivo: b.dataset.revisor });
        desenharRevisor();
        desenhar();
        A.recado('Agora você revisa como ' + b.textContent, 'ok');
      });
    });
  }

  function desenhar() {
    const casos = W.moderacao.fila(A.estado().casos);
    document.getElementById('resumo').innerHTML = [
      ['Casos na fila', casos.filter(function (c) { return c.estado !== 'RESOLVIDO'; }).length],
      ['Críticos', casos.filter(function (c) { return c.risco === 'critico' && c.estado !== 'RESOLVIDO'; }).length],
      ['Aguardando 2ª revisão', casos.filter(function (c) { return c.estado === 'AGUARDA_SEGUNDA_REVISAO'; }).length],
      ['Resolvidos', casos.filter(function (c) { return c.estado === 'RESOLVIDO'; }).length],
    ].map(function (p) {
      return '<div class="card-pedido__numero"><span>' + p[0] + '</span><strong>' + p[1] + '</strong></div>';
    }).join('');

    document.getElementById('fila').innerHTML = casos.length
      ? casos.map(cartao).join('')
      : '<div class="vazio"><span class="vazio__marca" aria-hidden="true">✳</span><h3>Fila vazia</h3>'
        + '<p>Nenhum caso aberto agora. Casos chegam do filtro automático, de denúncias e da verificação técnica de mídia.</p></div>';

    ligar();
  }

  function ligar() {
    document.querySelectorAll('.painel__cabeca').forEach(function (b) {
      b.addEventListener('click', function () {
        const aberto = b.getAttribute('aria-expanded') === 'true';
        b.setAttribute('aria-expanded', String(!aberto));
        document.getElementById(b.getAttribute('aria-controls')).hidden = aberto;
      });
    });

    document.querySelectorAll('[data-decisao]').forEach(function (s) {
      const mostrar = function () {
        const d = W.moderacao.DECISOES.find(function (x) { return x.id === s.value; });
        s.closest('.campo').querySelector('[data-explicacao]').textContent = d ? d.explicacao : '';
      };
      s.addEventListener('change', mostrar);
      mostrar();
    });

    document.querySelectorAll('[data-registrar]').forEach(function (b) {
      b.addEventListener('click', function () {
        const art = b.closest('[data-caso]');
        const id = art.dataset.caso;
        const caso = A.estado().casos.find(function (c) { return c.id === id; });
        const dados = {
          decisao: art.querySelector('[data-decisao]').value,
          justificativa: art.querySelector('[data-justificativa]').value,
        };
        const r = W.moderacao.decidir(caso, dados, A.contexto());
        const saida = art.querySelector('[data-saida]');
        if (!r.ok) {
          saida.innerHTML = '<div class="aviso aviso--erro"><span class="aviso__marca" aria-hidden="true">!</span><p>'
            + A.escapar(r.erro.mensagem) + '</p></div>';
          return;
        }
        const e = A.estado();
        e.casos = e.casos.map(function (c) { return c.id === id ? r.caso : c; });
        A.salvar();
        desenhar();
        A.recado(r.caso.estado === 'AGUARDA_SEGUNDA_REVISAO'
          ? 'Primeira revisão registrada. Caso crítico precisa de uma segunda pessoa'
          : 'Decisão registrada na trilha', 'ok');
      });
    });
  }

  function boot() {
    const veredito = A.iniciar('moderacao');
    if (!veredito.ok) {
      A.mostrarNegativa(veredito,
        '<button class="btn btn--outline btn--pequeno" type="button" id="virar-mod">Trocar para o papel de moderação</button>');
      const b = document.getElementById('virar-mod');
      if (b) b.addEventListener('click', function () { A.trocarPapel('MODERACAO'); });
      return;
    }
    A.esconderNegativa();
    desenharRevisor();
    desenhar();
    W.simulacao.assinar(desenhar);
  }

  window.aoAbrirPortao = boot;
  boot();
})();
