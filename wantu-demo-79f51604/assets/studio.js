/* WANTU · studio
   Fila de decisão e saldos do creator titular.

   A recusa é direito incondicional: não pede motivo, não mostra confirmação
   culpabilizante e não exibe efeito nenhum em reputação. Isso é requisito de
   comportamento, não de texto, e os testes travam as três coisas.

   Não conhece DOM nem armazenamento.                                       */

;(function (raiz) {
  'use strict';

  const node = typeof module === 'object' && module.exports;
  const E = node ? require('./estado.js') : raiz.WANTU.estado;
  const P = node ? require('./politica.js') : raiz.WANTU.politica;

  const EM_PRODUCAO = ['FUNDED', 'IN_PRODUCTION', 'SUBMITTED_FOR_REVIEW', 'APPROVED_BY_PLATFORM', 'REQUIRES_CHANGES'];

  function titular(pedido, contexto) {
    return contexto.papel === 'CREATOR' && contexto.atorId === pedido.creatorPublicId;
  }

  function doCreator(pedidos, contexto) {
    return (pedidos || []).filter(function (p) { return titular(p, contexto); });
  }

  function saldos(pedidos, contexto) {
    const s = { emProducao: 0, emJanela: 0, elegivel: 0, liquidado: 0 };
    for (const p of doCreator(pedidos, contexto)) {
      const liquido = E.economia(p.brutoCentavos).liquido;
      if (EM_PRODUCAO.indexOf(p.estado) !== -1) s.emProducao += liquido;
      else if (p.estado === 'DELIVERED' || p.estado === 'DISPUTED') s.emJanela += liquido;
      else if (p.estado === 'SETTLEMENT_ELIGIBLE') s.elegivel += liquido;
      else if (p.estado === 'SETTLED' || p.estado === 'CLOSED') s.liquidado += liquido;
    }
    return s;
  }

  /* Pedido em triagem NÃO chega a quem cria: foi para a análise humana */
  function fila(pedidos, contexto, creator) {
    const bloqueados = (creator && creator.bloqueados) || [];
    return doCreator(pedidos, contexto).filter(function (p) {
      if (p.triagem === 'EM_REVISAO') return false;
      if (bloqueados.indexOf(p.compradorId) !== -1) return false;
      return p.estado === 'SUBMITTED' || p.estado === 'COUNTEROFFERED';
    });
  }

  /* Conta os retidos sem reproduzir uma linha do que foi barrado */
  function notaRetidos(pedidos) {
    const n = (pedidos || []).filter(function (p) { return p.triagem === 'EM_REVISAO'; }).length;
    if (!n) return '';
    return n === 1
      ? '1 proposta ficou retida na triagem e está em análise humana. O texto não foi encaminhado a você.'
      : n + ' propostas ficaram retidas na triagem e estão em análise humana. Os textos não foram encaminhados a você.';
  }

  function acoesDisponiveis(pedido, contexto) {
    if (!titular(pedido, contexto)) return [];
    const acoes = [];

    if (pedido.estado === 'SUBMITTED' || pedido.estado === 'COUNTEROFFERED') {
      acoes.push({ id: 'aceitar', rotulo: 'Aceitar', destino: 'ACCEPTED', tom: 'primario', exigeMotivo: false,
        nota: 'Ao aceitar, o escopo e o valor ficam congelados como estão aqui.' });
      acoes.push({ id: 'recusar', rotulo: 'Recusar', destino: 'DECLINED', tom: 'outline', exigeMotivo: false,
        nota: 'Recusar é um direito e dispensa justificativa. Não afeta a sua reputação nem a sua posição no catálogo.' });
      if ((pedido.rodadas || 0) < E.RODADAS_MAX) {
        acoes.push({ id: 'contrapropor', rotulo: 'Sugerir outras condições', destino: 'COUNTEROFFERED', tom: 'texto', exigeMotivo: false,
          nota: 'A contraproposta só vale se quem propôs aceitar. Silêncio nunca vale como aceite.' });
      }
      return acoes;
    }

    if (pedido.estado === 'FUNDED') {
      acoes.push({ id: 'iniciar_producao', rotulo: 'Começar a produção', destino: 'IN_PRODUCTION', tom: 'primario', exigeMotivo: false });
    } else if (pedido.estado === 'IN_PRODUCTION') {
      acoes.push({ id: 'enviar_midia', rotulo: 'Enviar para análise', destino: 'SUBMITTED_FOR_REVIEW', tom: 'primario', exigeMotivo: false,
        nota: 'Nesta demonstração nenhum arquivo é enviado: o envio é simulado e nenhuma imagem existe.' });
    } else if (pedido.estado === 'REQUIRES_CHANGES' || pedido.estado === 'REWORK') {
      acoes.push({ id: 'retomar', rotulo: 'Retomar a produção', destino: 'IN_PRODUCTION', tom: 'primario', exigeMotivo: false });
    }
    return acoes;
  }

  function validarContraproposta(dados, minimoProprio) {
    const bruto = Number(dados && dados.brutoCentavos);
    const prazo = Number(dados && dados.prazoDias);
    if (!isFinite(bruto) || bruto <= 0) {
      return { ok: false, erro: { codigo: 'VALOR_INVALIDO', mensagem: 'Escreva o valor da contraproposta em números.' } };
    }
    if (bruto > P.TETO_CENTAVOS) {
      return { ok: false, erro: { codigo: 'ACIMA_DO_TETO',
        mensagem: 'Nesta demonstração o valor máximo de uma proposta é R$ 50.000,00.' } };
    }
    if (minimoProprio && bruto < minimoProprio) {
      return { ok: false, erro: { codigo: 'ABAIXO_DO_PROPRIO_MINIMO',
        mensagem: 'A contraproposta ficou abaixo do mínimo que você mesmo definiu para esta modalidade.' } };
    }
    if (!isFinite(prazo) || prazo < 1 || prazo > 90) {
      return { ok: false, erro: { codigo: 'PRAZO_INVALIDO', mensagem: 'Escolha um prazo entre 1 e 90 dias.' } };
    }
    return { ok: true, erro: null };
  }

  function montarContraproposta(dados, contexto) {
    return {
      brutoCentavos: Number(dados.brutoCentavos),
      prazoDias: Number(dados.prazoDias),
      nota: String(dados.nota || '').trim(),
      em: (contexto.agora || new Date()).toISOString(),
      por: contexto.atorId,
    };
  }

  const api = {
    saldos: saldos,
    fila: fila,
    notaRetidos: notaRetidos,
    acoesDisponiveis: acoesDisponiveis,
    validarContraproposta: validarContraproposta,
    montarContraproposta: montarContraproposta,
  };

  raiz.WANTU = raiz.WANTU || {};
  raiz.WANTU.studio = api;
  if (node) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : this);
