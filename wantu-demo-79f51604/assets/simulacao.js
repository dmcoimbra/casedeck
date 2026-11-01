/* WANTU · simulação
   Relógio injetável e eventos de plataforma simulados. É a ferramenta de
   apresentação da demo: permite levar um pedido do aceite à liquidação em
   menos de um minuto, e provar que o repasse NÃO depende do clique do
   comprador.

   Todo consumo de tempo no projeto passa por agora(), para a janela de
   contestação poder ser acelerada na demo e fixada no teste.

   disparar() muda só o campo do evento e então chama transicionar: nunca
   escreve estado direto. Não conhece DOM nem armazenamento.                */

;(function (raiz) {
  'use strict';

  const E = (typeof module === 'object' && module.exports)
    ? require('./estado.js')
    : raiz.WANTU.estado;

  /* Campo que o evento muda, e a cadeia de transições que ele autoriza.
     media.approved tem dois passos porque aprovação e entrega são eventos
     distintos no contrato, mesmo que na demo um botão dispare os dois. */
  const MAPA = {
    'payment.captured': {
      rotulo: 'Pagamento capturado pelo PSP',
      aplicar: (p, agora) => { p.pagamento = { estado: 'CAPTURADO', em: agora.toISOString(), referencia: 'sim_' + Date.now() }; },
      cadeia: ['FUNDED'],
    },
    'payment.failed': {
      rotulo: 'Pagamento recusado pelo PSP',
      aplicar: (p, agora) => { p.pagamento = { estado: 'FALHOU', em: agora.toISOString() }; },
      cadeia: ['PAYMENT_FAILED'],
    },
    'media.approved': {
      rotulo: 'Mídia aprovada na moderação',
      aplicar: (p, agora) => { p.midia = { estado: 'APROVADA', em: agora.toISOString(), derivado: 'previa-protegida' }; },
      cadeia: ['APPROVED_BY_PLATFORM', 'DELIVERED'],
    },
    'media.flagged': {
      rotulo: 'Mídia reprovada e posta em quarentena',
      aplicar: (p, agora) => { p.midia = { estado: 'QUARENTENA', em: agora.toISOString() }; },
      cadeia: ['SUSPENDED'],
    },
    'payout.confirmed': {
      rotulo: 'Repasse confirmado pelo PSP',
      aplicar: (p) => { p.repasse = 'CONFIRMADO'; },
      cadeia: ['SETTLED'],
    },
  };

  const EVENTOS = Object.keys(MAPA);

  let deslocamento = 0;
  const assinantes = [];

  function agora() {
    return new Date(Date.now() + deslocamento);
  }

  /* O modulo NUNCA avisa por conta propria. Quem chama grava o estado e
     depois chama anunciar: invertido, o assinante redesenha a tela lendo o
     estado anterior e nao e avisado de novo, porque o tique seguinte nao
     encontra mudanca nenhuma para anunciar. */
  function anunciar(evento, extra) {
    const pacote = Object.assign({ evento: evento, agora: agora() }, extra || {});
    for (const fn of assinantes.slice()) {
      try { fn(pacote); } catch (err) { /* assinante ruim não derruba o disparo */ }
    }
  }

  function assinar(fn) {
    if (typeof fn !== 'function') return function () {};
    assinantes.push(fn);
    return function cancelar() {
      const i = assinantes.indexOf(fn);
      if (i !== -1) assinantes.splice(i, 1);
    };
  }

  function avancar(ms) {
    deslocamento += Number(ms) || 0;
    return agora();
  }

  function zerar() {
    deslocamento = 0;
    return agora();
  }

  function deslocamentoAtual() {
    return deslocamento;
  }

  function definirDeslocamento(ms) {
    deslocamento = Number(ms) || 0;
    return agora();
  }

  /* De quais estados um evento parte. LIDO do mapa de transições, nunca
     duplicado aqui: assim o painel escolhe um alvo que a máquina aceita, em
     vez de escolher por prioridade de estado e colher TRANSICAO_INVALIDA na
     frente de quem está vendo a demonstração. */
  function origens(evento) {
    const def = MAPA[evento];
    if (!def) return [];
    const primeiro = def.cadeia[0];
    return Object.keys(E.TRANSICOES).filter(function (o) {
      return (E.TRANSICOES[o] || []).indexOf(primeiro) !== -1;
    });
  }

  function contextoSistema(quando) {
    return {
      papel: 'SISTEMA',
      atorId: 'sistema',
      agora: quando || agora(),
      verificacao: { idade: true, identidade: true },
    };
  }

  function clonar(obj) {
    if (typeof structuredClone === 'function') return structuredClone(obj);
    return JSON.parse(JSON.stringify(obj));
  }

  function disparar(evento, pedido, contexto) {
    const def = MAPA[evento];
    if (!def) {
      return { ok: false, pedido: null, erro: { codigo: 'EVENTO_DESCONHECIDO', mensagem: 'Este evento não existe nesta demonstração', invariante: null } };
    }

    const c = contexto || contextoSistema();
    const quando = c.agora || agora();

    /* Trabalha sobre cópia: se a transição recusar, o pedido original fica
       intacto e o campo do evento não vaza. */
    let atual = clonar(pedido);
    def.aplicar(atual, quando instanceof Date ? quando : new Date(quando));

    for (const destino of def.cadeia) {
      const r = E.transicionar(atual, destino, c);
      if (!r.ok) return { ok: false, pedido: null, erro: r.erro };
      atual = r.pedido;
    }

    return { ok: true, pedido: atual, erro: null, rotulo: def.rotulo };
  }

  /* Transições movidas pelo RELÓGIO, não por alguém clicando. É aqui que a
     demonstração prova o ponto: a janela de contestação fecha sozinha e
     libera a elegibilidade, para entrega conforme não ficar travada por um
     comprador que some. Tempo abre a elegibilidade e nunca transfere
     dinheiro: SETTLED continua dependendo do evento financeiro. */
  function varrer(pedidos, contexto) {
    const c = contexto || contextoSistema();
    const quando = c.agora || agora();
    const mudados = [];

    const saida = (pedidos || []).map(function (p) {
      let destino = null;
      if (E.expirou(p, quando)) destino = 'EXPIRED';
      else if (p.estado === 'DELIVERED' && E.janelaEncerrada(p, quando)) destino = 'SETTLEMENT_ELIGIBLE';
      if (!destino) return p;

      const r = E.transicionar(p, destino, Object.assign({}, c, { agora: quando }));
      if (!r.ok) return p;
      mudados.push(p.id);
      return r.pedido;
    });

    return { pedidos: saida, mudados: mudados };
  }

  const api = {
    EVENTOS: EVENTOS,
    varrer: varrer,
    MAPA: MAPA,
    agora: agora,
    avancar: avancar,
    zerar: zerar,
    deslocamentoAtual: deslocamentoAtual,
    definirDeslocamento: definirDeslocamento,
    contextoSistema: contextoSistema,
    disparar: disparar,
    assinar: assinar,
    anunciar: anunciar,
    origens: origens,
  };

  raiz.WANTU = raiz.WANTU || {};
  raiz.WANTU.simulacao = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : this);
