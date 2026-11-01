/* WANTU · compositor
   Monta uma proposta a partir do rascunho e devolve uma das quatro saídas:
   LIBERADO, REVISAO, BLOQUEADO ou RECUSADO.

   A ordem das checagens importa e é deliberada: elegibilidade do creator
   primeiro, depois catálogo, depois valor e prazo, e só então o briefing.
   Avaliar o texto de quem propõe a alguém que nem está recebendo propostas
   seria processar dado sensível à toa.

   Não conhece DOM nem armazenamento.                                       */

;(function (raiz) {
  'use strict';

  const node = typeof module === 'object' && module.exports;
  const E = node ? require('./estado.js') : raiz.WANTU.estado;
  const P = node ? require('./politica.js') : raiz.WANTU.politica;

  const BRIEFING_MIN = 24;
  const BRIEFING_MAX = 900;
  const PRAZO_MIN = 1;
  const PRAZO_MAX = 90;

  function id() {
    const aleatorio = Math.random().toString(36).slice(2, 8);
    const tempo = Date.now().toString(36).slice(-5);
    return 'off_' + tempo + aleatorio;
  }

  function recusa(codigo, mensagem) {
    return {
      resultado: 'RECUSADO',
      pedido: null,
      caso: null,
      violacoes: [],
      economia: null,
      erro: { codigo: codigo, mensagem: mensagem },
    };
  }

  /* O caso de moderação guarda a CLASSE e um trecho curto, nunca o briefing
     inteiro: a fila humana precisa saber o que foi detectado, não ler o que
     a pessoa escreveu. */
  function caso(pedidoId, violacoes, agora) {
    const classes = violacoes.map(function (v) { return v.rotulo; }).join(', ');
    return {
      id: 'cas_' + id().slice(4),
      tipo: 'Briefing retido na triagem',
      risco: 'medio',
      origem: 'Filtro automático de briefing',
      pedidoId: pedidoId,
      resumoRedigido: 'Briefing retido antes de chegar a quem cria. Sinal detectado: ' + classes
        + '. O texto não foi encaminhado e não é reproduzido aqui.',
      estado: 'ABERTO',
      decisao: null,
      exigeRevisaoEmDupla: false,
      trilha: [{ em: agora.toISOString(), ator: 'filtro', nota: 'Classificado como ' + violacoes.map(function (v) { return v.classe; }).join(', ') }],
    };
  }

  function enviar(rascunho, creator, contexto) {
    const agora = contexto.agora instanceof Date ? contexto.agora : new Date(contexto.agora);

    /* 1 · idade e identidade, antes de qualquer processamento */
    const v = contexto.verificacao || {};
    if (!v.idade || !v.identidade) {
      return recusa(E.CODIGOS.AGE_OR_IDENTITY_REQUIRED, E.MENSAGEM.AGE_OR_IDENTITY_REQUIRED);
    }

    /* 2 · elegibilidade do creator, reavaliada a cada proposta */
    if (!E.creatorElegivel(creator, contexto.atorId)) {
      const pausada = creator && creator.disponibilidade !== 'aberta';
      return recusa(E.CODIGOS.CREATOR_NOT_ELIGIBLE, pausada
        ? 'Este creator pausou o recebimento de propostas. A disponibilidade é dele, e vale na hora.'
        : E.MENSAGEM.CREATOR_NOT_ELIGIBLE);
    }

    /* 3 · catálogo habilitado */
    if (!P.categoriaDisponivel(creator, rascunho.categoriaId)) {
      return recusa('MODALIDADE_NAO_HABILITADA',
        'Este creator não habilitou esta modalidade. Só aparecem para proposta as modalidades que a própria pessoa escolheu receber.');
    }

    /* 4 · valor e prazo */
    const minimo = P.valorMinimo(creator, rascunho.categoriaId);
    const valor = P.validarValor(rascunho.valor, minimo);
    if (!valor.ok) return recusa(valor.erro.codigo, valor.erro.mensagem);

    const prazo = Number(rascunho.prazoDias);
    if (!isFinite(prazo) || prazo < PRAZO_MIN || prazo > PRAZO_MAX) {
      return recusa('PRAZO_INVALIDO', 'Escolha um prazo entre ' + PRAZO_MIN + ' e ' + PRAZO_MAX + ' dias.');
    }

    /* 5 · briefing: tamanho primeiro, política depois */
    const texto = String(rascunho.briefing || '').trim();
    if (texto.length < BRIEFING_MIN) {
      return recusa('BRIEFING_CURTO',
        'Descreva a criação com pelo menos ' + BRIEFING_MIN + ' caracteres, para quem cria conseguir decidir.');
    }
    if (texto.length > BRIEFING_MAX) {
      return recusa('BRIEFING_LONGO', 'O briefing passa de ' + BRIEFING_MAX + ' caracteres. Resuma a ideia principal.');
    }

    const avaliacao = P.avaliarBriefing(texto);
    if (avaliacao.resultado === 'BLOQUEADO') {
      return {
        resultado: 'BLOQUEADO',
        pedido: null,
        caso: null,
        violacoes: avaliacao.violacoes,
        economia: null,
        erro: null,
      };
    }

    /* 6 · o pedido nasce pela máquina de estados, nunca escrito na mão */
    const emRevisao = avaliacao.resultado === 'REVISAO';
    const rascunhoPedido = {
      id: id(),
      compradorId: contexto.atorId,
      creatorPublicId: creator.publicId,
      categoriaId: rascunho.categoriaId,
      brutoCentavos: valor.centavos,
      briefing: texto,
      prazoDias: prazo,
      estado: 'DRAFT',
      triagem: emRevisao ? 'EM_REVISAO' : 'LIBERADO',
      historico: [],
      contrapropostas: [],
      rodadas: 0,
      expiraEm: new Date(agora.getTime() + E.VALIDADE_H * 3600 * 1000).toISOString(),
      termosVersao: '2026-10-a',
      pagamento: { estado: 'NAO_CRIADO' },
      midia: { estado: 'NENHUMA' },
      disputa: null,
      janelaContestacaoAte: null,
      repasse: 'NAO_CRIADO',
    };

    const t = E.transicionar(rascunhoPedido, 'SUBMITTED', Object.assign({}, contexto, { creator: creator, agora: agora }));
    if (!t.ok) return recusa(t.erro.codigo, t.erro.mensagem);

    return {
      resultado: emRevisao ? 'REVISAO' : 'LIBERADO',
      pedido: t.pedido,
      caso: emRevisao ? caso(t.pedido.id, avaliacao.violacoes, agora) : null,
      violacoes: avaliacao.violacoes,
      economia: E.economia(valor.centavos),
      erro: null,
    };
  }

  const api = {
    BRIEFING_MIN: BRIEFING_MIN,
    BRIEFING_MAX: BRIEFING_MAX,
    PRAZO_MIN: PRAZO_MIN,
    PRAZO_MAX: PRAZO_MAX,
    enviar: enviar,
    novoId: id,
  };

  raiz.WANTU = raiz.WANTU || {};
  raiz.WANTU.compositor = api;
  if (node) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : this);
