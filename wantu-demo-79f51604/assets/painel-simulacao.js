/* WANTU · painel de simulação
   Ferramenta de apresentação, não debug jogado na tela. Dispara os eventos
   de plataforma e acelera o relógio, para dar de mostrar um pedido indo do
   aceite à liquidação em menos de um minuto, e para deixar visível que o
   repasse NÃO depende do clique do comprador.                             */

;(function () {
  'use strict';

  const W = window.WANTU;
  const A = W.app;
  const CHAVE_ABERTO = 'wantu.painel.aberto';

  /* O alvo é escolhido POR EVENTO, nos estados de que aquele evento parte.
     Escolher por prioridade de estado devolvia o mesmo pedido para os cinco
     botões, e na demo recém-aberta esse pedido não tinha aresta para nenhum
     dos cinco: os cinco botões recusavam com TRANSICAO_INVALIDA. */
  function pedidoAlvo(evento) {
    const origens = W.simulacao.origens(evento);
    return A.estado().pedidos.find(function (x) {
      return origens.indexOf(x.estado) !== -1;
    }) || null;
  }

  function disparar(evento) {
    const p = pedidoAlvo(evento);
    if (!p) {
      const precisa = W.simulacao.origens(evento).join(' ou ');
      A.recado('Nenhum pedido em ' + precisa + ' agora, que é de onde este evento parte', 'atencao');
      return;
    }
    const r = W.simulacao.disparar(evento, p, W.simulacao.contextoSistema());
    if (!r.ok) {
      A.recado('Evento recusado em ' + p.id + ': ' + r.erro.mensagem, 'erro');
      return;
    }
    const e = A.estado();
    e.pedidos = e.pedidos.map(function (x) { return x.id === p.id ? r.pedido : x; });
    A.salvar();
    /* Só agora, com o estado gravado, os assinantes podem redesenhar: avisar
       antes deixa a tela mostrando o estado anterior, com botão que não faz
       nada ao clique porque a ação já não existe no pedido fresco. */
    W.simulacao.anunciar(evento, { pedido: r.pedido, rotulo: r.rotulo });
    A.recado(r.rotulo + ' aplicado em ' + p.id, 'ok');
  }

  function avancar(horas) {
    W.simulacao.avancar(horas * 3600 * 1000);
    A.definir({ deslocamentoRelogio: W.simulacao.deslocamentoAtual() });
    atualizarRelogio();
    const mudados = A.varrerAgora();
    W.simulacao.anunciar('relogio.avancou', {
      deslocamento: W.simulacao.deslocamentoAtual(), mudados: mudados,
    });
    A.recado(mudados.length
      ? 'Relógio adiantou ' + horas + 'h, e ' + mudados.length + (mudados.length === 1 ? ' pedido mudou' : ' pedidos mudaram') + ' sozinho pelo prazo'
      : 'Relógio da demonstração avançou ' + horas + ' horas', 'ok');
  }

  function voltarAoTempoReal() {
    W.simulacao.zerar();
    A.definir({ deslocamentoRelogio: 0 });
    atualizarRelogio();
    W.simulacao.anunciar('relogio.zerado', { deslocamento: 0 });
    A.recado('Relógio de volta ao tempo real', 'ok');
  }

  function atualizarRelogio() {
    const d = W.simulacao.deslocamentoAtual();
    const el = document.getElementById('sim-relogio');
    if (!el) return;
    el.textContent = d === 0 ? 'tempo real' : '+' + Math.round(d / 3600000) + 'h adiantado';
  }

  function montar() {
    const alvo = document.createElement('div');
    alvo.className = 'simulacao';
    alvo.innerHTML = ''
      + '<button class="simulacao__cabeca" type="button" aria-expanded="false" aria-controls="sim-corpo">'
      + '<span>Ferramenta de apresentação</span><span class="painel__seta" aria-hidden="true">▾</span></button>'
      + '<div class="simulacao__corpo" id="sim-corpo" hidden>'
      + '<p>Dispara os eventos que, na operação real, viriam assinados do parceiro financeiro e do pipeline de mídia. '
      + 'Serve para mostrar que o repasse não depende do clique de ninguém.</p>'
      + '<p>Relógio: <span class="simulacao__relogio" id="sim-relogio">tempo real</span></p>'
      + '<div class="simulacao__grupo">'
      + '<button class="btn btn--outline btn--pequeno" type="button" data-evento="payment.captured">Pagamento capturado</button>'
      + '<button class="btn btn--outline btn--pequeno" type="button" data-evento="payment.failed">Pagamento recusado</button>'
      + '<button class="btn btn--outline btn--pequeno" type="button" data-evento="media.approved">Mídia aprovada</button>'
      + '<button class="btn btn--outline btn--pequeno" type="button" data-evento="media.flagged">Mídia em quarentena</button>'
      + '<button class="btn btn--outline btn--pequeno" type="button" data-evento="payout.confirmed">Repasse confirmado</button>'
      + '</div>'
      + '<div class="simulacao__grupo">'
      + '<button class="btn btn--texto btn--pequeno" type="button" data-avancar="24">Avançar 24h</button>'
      + '<button class="btn btn--texto btn--pequeno" type="button" data-avancar="48">Avançar 48h</button>'
      + '<button class="btn btn--texto btn--pequeno" type="button" id="sim-zerar">Voltar ao tempo real</button>'
      + '</div>'
      + '<div class="simulacao__grupo">'
      + '<button class="btn btn--perigo btn--pequeno" type="button" id="sim-restaurar">Restaurar os dados da demonstração</button>'
      + '</div>'
      + '</div>';
    document.body.appendChild(alvo);

    const cabeca = alvo.querySelector('.simulacao__cabeca');
    const corpo = alvo.querySelector('#sim-corpo');
    let aberto = false;
    try { aberto = sessionStorage.getItem(CHAVE_ABERTO) === '1'; } catch (e) { /* sem storage */ }
    corpo.hidden = !aberto;
    cabeca.setAttribute('aria-expanded', String(aberto));

    cabeca.addEventListener('click', function () {
      const agoraAberto = cabeca.getAttribute('aria-expanded') !== 'true';
      cabeca.setAttribute('aria-expanded', String(agoraAberto));
      corpo.hidden = !agoraAberto;
      try { sessionStorage.setItem(CHAVE_ABERTO, agoraAberto ? '1' : '0'); } catch (e) { /* sem storage */ }
    });

    alvo.querySelectorAll('[data-evento]').forEach(function (b) {
      b.addEventListener('click', function () { disparar(b.dataset.evento); });
    });
    alvo.querySelectorAll('[data-avancar]').forEach(function (b) {
      b.addEventListener('click', function () { avancar(Number(b.dataset.avancar)); });
    });
    alvo.querySelector('#sim-zerar').addEventListener('click', voltarAoTempoReal);
    alvo.querySelector('#sim-restaurar').addEventListener('click', function () {
      A.restaurar();
      A.recarregarOuRemontar();
    });

    /* O deslocamento sobrevive à troca de tela dentro da mesma aba */
    const guardado = A.estado().deslocamentoRelogio || 0;
    if (guardado) W.simulacao.definirDeslocamento(guardado);
    atualizarRelogio();
  }

  if (!A.estado().portaoAberto) {
    document.addEventListener('wantu:portao', montar, { once: true });
  } else {
    montar();
  }
})();
