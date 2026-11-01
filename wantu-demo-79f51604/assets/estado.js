/* WANTU · estado
   Máquina de estados de uma proposta, e as oito invariantes como guardas.
   Não conhece DOM, não conhece armazenamento: recebe pedido e contexto,
   devolve pedido novo ou recusa com código. Espelha a seção 5 da spec e
   serve de referência executável para o servidor, quando houver servidor.

   contexto = { papel, atorId, agora: Date, verificacao: { idade, identidade },
                creator? }  // creator só é exigido ao criar proposta          */

;(function (raiz) {
  'use strict';

  const COMISSAO = 0.20;
  const VALIDADE_H = 72;
  const JANELA_H = 48;
  const RODADAS_MAX = 3;
  const MS_H = 3600 * 1000;

  const ESTADOS = [
    'DRAFT', 'SUBMITTED', 'COUNTEROFFERED', 'ACCEPTED', 'DECLINED', 'EXPIRED',
    'CANCELLED', 'FUNDING_PENDING', 'FUNDED', 'PAYMENT_FAILED', 'IN_PRODUCTION',
    'SUBMITTED_FOR_REVIEW', 'APPROVED_BY_PLATFORM', 'REQUIRES_CHANGES', 'SUSPENDED',
    'DELIVERED', 'DISPUTED', 'REWORK', 'REFUNDED', 'SETTLEMENT_ELIGIBLE',
    'SETTLED', 'CLOSED',
  ];

  const TRANSICOES = {
    DRAFT: ['SUBMITTED'],
    SUBMITTED: ['COUNTEROFFERED', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED'],
    COUNTEROFFERED: ['ACCEPTED', 'SUBMITTED', 'DECLINED', 'EXPIRED'],
    ACCEPTED: ['FUNDING_PENDING'],
    FUNDING_PENDING: ['FUNDED', 'PAYMENT_FAILED'],
    FUNDED: ['IN_PRODUCTION'],
    IN_PRODUCTION: ['SUBMITTED_FOR_REVIEW'],
    SUBMITTED_FOR_REVIEW: ['APPROVED_BY_PLATFORM', 'REQUIRES_CHANGES', 'SUSPENDED'],
    APPROVED_BY_PLATFORM: ['DELIVERED'],
    REQUIRES_CHANGES: ['IN_PRODUCTION'],
    DELIVERED: ['DISPUTED', 'SETTLEMENT_ELIGIBLE'],
    DISPUTED: ['REWORK', 'REFUNDED', 'SETTLEMENT_ELIGIBLE'],
    REWORK: ['IN_PRODUCTION'],
    SETTLEMENT_ELIGIBLE: ['SETTLED'],
    SETTLED: ['CLOSED'],
    DECLINED: [],
    EXPIRED: [],
    CANCELLED: [],
    PAYMENT_FAILED: [],
    SUSPENDED: [],
    REFUNDED: [],
    CLOSED: [],
  };

  /* Dono por ARESTA, não por destino. A diferença importa: ACCEPTED a partir
     de SUBMITTED é ato do creator, e ACCEPTED a partir de COUNTEROFFERED é
     ato do comprador aceitando a contraproposta. Um mapa por destino
     confundiria os dois e furaria as invariantes 1 e 2.                    */
  const DONO = {
    'DRAFT->SUBMITTED': ['COMPRADOR'],
    'SUBMITTED->ACCEPTED': ['CREATOR'],
    'SUBMITTED->DECLINED': ['CREATOR'],
    'SUBMITTED->COUNTEROFFERED': ['CREATOR'],
    'SUBMITTED->CANCELLED': ['COMPRADOR'],
    'SUBMITTED->EXPIRED': ['SISTEMA'],
    'COUNTEROFFERED->ACCEPTED': ['COMPRADOR'],
    'COUNTEROFFERED->SUBMITTED': ['COMPRADOR'],
    'COUNTEROFFERED->DECLINED': ['COMPRADOR', 'CREATOR'],
    'COUNTEROFFERED->EXPIRED': ['SISTEMA'],
    'ACCEPTED->FUNDING_PENDING': ['COMPRADOR'],
    'FUNDING_PENDING->FUNDED': ['SISTEMA'],
    'FUNDING_PENDING->PAYMENT_FAILED': ['SISTEMA'],
    'FUNDED->IN_PRODUCTION': ['CREATOR'],
    'IN_PRODUCTION->SUBMITTED_FOR_REVIEW': ['CREATOR'],
    'SUBMITTED_FOR_REVIEW->APPROVED_BY_PLATFORM': ['MODERACAO', 'SISTEMA'],
    'SUBMITTED_FOR_REVIEW->REQUIRES_CHANGES': ['MODERACAO', 'SISTEMA'],
    'SUBMITTED_FOR_REVIEW->SUSPENDED': ['MODERACAO', 'SISTEMA'],
    'REQUIRES_CHANGES->IN_PRODUCTION': ['CREATOR'],
    'APPROVED_BY_PLATFORM->DELIVERED': ['SISTEMA'],
    'DELIVERED->DISPUTED': ['COMPRADOR'],
    'DELIVERED->SETTLEMENT_ELIGIBLE': ['COMPRADOR', 'SISTEMA'],
    'DISPUTED->REWORK': ['MODERACAO'],
    'DISPUTED->REFUNDED': ['MODERACAO'],
    'DISPUTED->SETTLEMENT_ELIGIBLE': ['MODERACAO'],
    'REWORK->IN_PRODUCTION': ['CREATOR'],
    'SETTLEMENT_ELIGIBLE->SETTLED': ['SISTEMA'],
    'SETTLED->CLOSED': ['SISTEMA'],
  };

  const CODIGOS = {
    NOT_CREATOR_OWNER: 'NOT_CREATOR_OWNER',
    NOT_BUYER_OWNER: 'NOT_BUYER_OWNER',
    CREATOR_NOT_ELIGIBLE: 'CREATOR_NOT_ELIGIBLE',
    AGE_OR_IDENTITY_REQUIRED: 'AGE_OR_IDENTITY_REQUIRED',
    PAYMENT_NOT_CONFIRMED: 'PAYMENT_NOT_CONFIRMED',
    MEDIA_NOT_APPROVED: 'MEDIA_NOT_APPROVED',
    SETTLEMENT_NOT_ELIGIBLE: 'SETTLEMENT_NOT_ELIGIBLE',
    UNTRUSTED_INPUT: 'UNTRUSTED_INPUT',
    /* Regra de negócio, não invariante de segurança */
    TRANSICAO_INVALIDA: 'TRANSICAO_INVALIDA',
    PROPOSTA_EXPIRADA: 'PROPOSTA_EXPIRADA',
    RODADAS_ESGOTADAS: 'RODADAS_ESGOTADAS',
  };

  const INVARIANTE = {
    NOT_CREATOR_OWNER: 1,
    NOT_BUYER_OWNER: 2,
    CREATOR_NOT_ELIGIBLE: 3,
    AGE_OR_IDENTITY_REQUIRED: 4,
    PAYMENT_NOT_CONFIRMED: 5,
    MEDIA_NOT_APPROVED: 6,
    SETTLEMENT_NOT_ELIGIBLE: 7,
    UNTRUSTED_INPUT: 8,
  };

  const MENSAGEM = {
    NOT_CREATOR_OWNER: 'Somente o creator titular pode decidir sobre esta proposta',
    NOT_BUYER_OWNER: 'Somente o comprador titular pode agir sobre este pedido',
    CREATOR_NOT_ELIGIBLE: 'Este creator não está recebendo propostas agora',
    AGE_OR_IDENTITY_REQUIRED: 'É preciso ter idade e identidade verificadas para operar',
    PAYMENT_NOT_CONFIRMED: 'Sem evento de pagamento confirmado, o pedido não é financiado',
    MEDIA_NOT_APPROVED: 'Sem mídia aprovada, nada é liberado ao comprador',
    SETTLEMENT_NOT_ELIGIBLE: 'A liquidação depende do evento financeiro e do fim da janela de contestação',
    UNTRUSTED_INPUT: 'Texto enviado por usuário é dado, nunca comando',
    TRANSICAO_INVALIDA: 'Esta transição não existe para o estado atual',
    PROPOSTA_EXPIRADA: 'O prazo de resposta desta proposta terminou',
    RODADAS_ESGOTADAS: 'O limite de contrapropostas desta negociação foi atingido',
  };

  const PAPEIS_USUARIO = ['VISITANTE', 'COMPRADOR', 'CREATOR', 'MODERACAO'];

  function clonar(obj) {
    if (typeof structuredClone === 'function') return structuredClone(obj);
    return JSON.parse(JSON.stringify(obj));
  }

  function ms(valor) {
    return valor instanceof Date ? valor.getTime() : new Date(valor).getTime();
  }

  function falha(codigo) {
    return {
      ok: false,
      pedido: null,
      erro: {
        codigo: codigo,
        mensagem: MENSAGEM[codigo] || 'Operação recusada',
        invariante: INVARIANTE[codigo] || null,
      },
    };
  }

  function expirou(pedido, agora) {
    if (!pedido || !pedido.expiraEm) return false;
    if (pedido.estado !== 'SUBMITTED' && pedido.estado !== 'COUNTEROFFERED') return false;
    return ms(agora) >= ms(pedido.expiraEm);
  }

  function janelaEncerrada(pedido, agora) {
    if (!pedido || !pedido.janelaContestacaoAte) return false;
    return ms(agora) >= ms(pedido.janelaContestacaoAte);
  }

  function creatorElegivel(creator, compradorId) {
    if (!creator) return false;
    if (!creator.optIn || !creator.optIn.versao) return false;
    if (creator.disponibilidade !== 'aberta') return false;
    if (Array.isArray(creator.bloqueados) && creator.bloqueados.indexOf(compradorId) !== -1) return false;
    if (creator.verificacao && (creator.verificacao.idade === false || creator.verificacao.identidade === 'reprovada')) return false;
    return true;
  }

  function economia(brutoCentavos) {
    const bruto = Math.max(0, Math.round(Number(brutoCentavos) || 0));
    const comissao = Math.round(bruto * COMISSAO);
    return { bruto: bruto, comissao: comissao, liquido: bruto - comissao };
  }

  function transicionar(pedido, destino, contexto) {
    const origem = pedido.estado;
    const aresta = origem + '->' + destino;
    const permitidos = TRANSICOES[origem] || [];

    /* 0 · a aresta existe no mapa */
    if (permitidos.indexOf(destino) === -1) return falha(CODIGOS.TRANSICAO_INVALIDA);

    const dono = DONO[aresta] || [];
    const papel = contexto.papel;
    const ehSistema = papel === 'SISTEMA';

    /* 1 · invariante 4, idade e identidade. O SISTEMA salta esta guarda porque
       um evento de PSP não é um usuário operando, mas só pode mover as arestas
       de que é dono, o que a guarda 2 verifica em seguida. */
    if (!ehSistema) {
      const v = contexto.verificacao || {};
      if (!v.idade || !v.identidade) return falha(CODIGOS.AGE_OR_IDENTITY_REQUIRED);
    }

    /* 2 · invariantes 1 e 2, titularidade da aresta */
    if (dono.indexOf(papel) === -1) {
      if (dono.indexOf('CREATOR') !== -1) return falha(CODIGOS.NOT_CREATOR_OWNER);
      if (dono.indexOf('COMPRADOR') !== -1) return falha(CODIGOS.NOT_BUYER_OWNER);
      return falha(CODIGOS.TRANSICAO_INVALIDA);
    }
    if (papel === 'CREATOR' && contexto.atorId !== pedido.creatorPublicId) {
      return falha(CODIGOS.NOT_CREATOR_OWNER);
    }
    if (papel === 'COMPRADOR' && contexto.atorId !== pedido.compradorId) {
      return falha(CODIGOS.NOT_BUYER_OWNER);
    }

    /* 3 · invariante 3, elegibilidade do creator, reavaliada a cada proposta */
    if (destino === 'SUBMITTED' && !creatorElegivel(contexto.creator, pedido.compradorId)) {
      return falha(CODIGOS.CREATOR_NOT_ELIGIBLE);
    }

    /* 4 · prazo e rodadas */
    if (destino !== 'EXPIRED' && expirou(pedido, contexto.agora)) {
      return falha(CODIGOS.PROPOSTA_EXPIRADA);
    }
    if (destino === 'COUNTEROFFERED' && (pedido.rodadas || 0) >= RODADAS_MAX) {
      return falha(CODIGOS.RODADAS_ESGOTADAS);
    }

    /* 5 · invariantes 5, 6 e 7, condições de estado */
    if (destino === 'FUNDED' && (!pedido.pagamento || pedido.pagamento.estado !== 'CAPTURADO')) {
      return falha(CODIGOS.PAYMENT_NOT_CONFIRMED);
    }
    if (destino === 'DELIVERED' && (!pedido.midia || pedido.midia.estado !== 'APROVADA')) {
      return falha(CODIGOS.MEDIA_NOT_APPROVED);
    }
    if (destino === 'SETTLED' && pedido.repasse !== 'CONFIRMADO') {
      return falha(CODIGOS.SETTLEMENT_NOT_ELIGIBLE);
    }
    /* O clique do comprador basta para confirmar a entrega. O sistema só
       liquida sozinho depois de a janela de contestação encerrar. */
    if (destino === 'SETTLEMENT_ELIGIBLE' && origem === 'DELIVERED' && ehSistema
        && !janelaEncerrada(pedido, contexto.agora)) {
      return falha(CODIGOS.SETTLEMENT_NOT_ELIGIBLE);
    }

    /* Efeitos. pedido.briefing nunca é consultado acima: é a invariante 8. */
    const novo = clonar(pedido);
    novo.estado = destino;
    novo.historico = (novo.historico || []).concat([{
      estado: destino,
      em: new Date(ms(contexto.agora)).toISOString(),
      ator: contexto.atorId,
    }]);

    if (destino === 'COUNTEROFFERED') novo.rodadas = (novo.rodadas || 0) + 1;

    if (destino === 'ACCEPTED') {
      /* O que o comprador aceita, vindo de COUNTEROFFERED, é a última
         contraproposta: foi ela que substituiu a oferta que o creator não
         aceitou. Congelar a oferta original aqui pagaria ao creator um valor
         que nenhuma das duas partes acertou, com o botão dizendo o oposto. */
      if (origem === 'COUNTEROFFERED') {
        const rodadas = novo.contrapropostas || [];
        const ultima = rodadas[rodadas.length - 1];
        if (ultima) {
          novo.brutoCentavos = Math.max(0, Math.round(Number(ultima.brutoCentavos) || 0));
          novo.prazoDias = Number(ultima.prazoDias) || novo.prazoDias;
        }
      }
      novo.congelado = {
        brutoCentavos: novo.brutoCentavos,
        briefing: novo.briefing,
        prazoDias: novo.prazoDias,
        em: new Date(ms(contexto.agora)).toISOString(),
      };
    }

    if (destino === 'DELIVERED') {
      novo.janelaContestacaoAte = new Date(ms(contexto.agora) + JANELA_H * MS_H).toISOString();
    }

    return { ok: true, pedido: novo, erro: null };
  }

  function podeTransicionar(pedido, destino, contexto) {
    return transicionar(pedido, destino, contexto).ok;
  }

  const api = {
    COMISSAO: COMISSAO,
    VALIDADE_H: VALIDADE_H,
    JANELA_H: JANELA_H,
    RODADAS_MAX: RODADAS_MAX,
    ESTADOS: ESTADOS,
    TRANSICOES: TRANSICOES,
    DONO: DONO,
    CODIGOS: CODIGOS,
    INVARIANTE: INVARIANTE,
    MENSAGEM: MENSAGEM,
    PAPEIS_USUARIO: PAPEIS_USUARIO,
    transicionar: transicionar,
    podeTransicionar: podeTransicionar,
    expirou: expirou,
    janelaEncerrada: janelaEncerrada,
    creatorElegivel: creatorElegivel,
    economia: economia,
  };

  raiz.WANTU = raiz.WANTU || {};
  raiz.WANTU.estado = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : this);
