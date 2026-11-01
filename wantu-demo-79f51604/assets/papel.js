/* WANTU · papel
   Autorização por objeto, checada em cada render e em cada ação, nunca só na
   navegação. Negar devolve código E mensagem em português, porque na demo a
   tela MOSTRA a negativa em vez de esconder o caminho: ensinar o modelo de
   permissão vale mais, aqui, do que simular que ele existe.

   Os códigos reusam WANTU.estado.CODIGOS, sem segunda lista.
   Não conhece DOM nem armazenamento.                                        */

;(function (raiz) {
  'use strict';

  const E = (typeof module === 'object' && module.exports)
    ? require('./estado.js')
    : raiz.WANTU.estado;

  const PAPEIS = ['VISITANTE', 'COMPRADOR', 'CREATOR', 'MODERACAO'];

  /* Telas públicas, e telas que exigem o portão 18+ */
  const TELAS_PUBLICAS = ['landing', 'documentos'];
  const TELAS_POR_PAPEL = {
    explorar: PAPEIS,
    creator: PAPEIS,
    componentes: PAPEIS,
    pedidos: ['COMPRADOR'],
    studio: ['CREATOR'],
    moderacao: ['MODERACAO'],
  };

  /* Quem é dono de cada ação. Espelha o mapa de arestas de estado.js: a
     diferença é que aqui a pergunta é "esta pessoa pode clicar", e lá é
     "esta transição pode acontecer". As duas são checadas. */
  const ACOES = {
    propor: 'COMPRADOR',
    cancelar: 'COMPRADOR',
    aceitar_contraproposta: 'COMPRADOR',
    confirmar: 'COMPRADOR',
    contestar: 'COMPRADOR',
    ver_previa: 'COMPRADOR',
    aceitar: 'CREATOR',
    recusar: 'CREATOR',
    contrapropor: 'CREATOR',
    enviar_midia: 'CREATOR',
    editar: 'CREATOR',
    bloquear: 'CREATOR',
    pausar: 'CREATOR',
    decidir: 'MODERACAO',
    triar: 'MODERACAO',
  };

  const MSG_PORTAO = 'Este espaço é só para pessoas adultas. Confirme a entrada na demonstração para continuar. Na operação real, isto seria verificação de idade por fornecedor especializado, e autodeclaração não bastaria.';
  const MSG_TELA = 'Esta área não pertence ao papel que está ativo agora. Troque o papel na barra de demonstração para ver o outro lado.';
  const MSG_CASO = 'A fila de análise é só da equipe de moderação, e cada acesso fica registrado.';
  const MSG_ORIGINAL = 'O arquivo original não é servido nesta demonstração, por nenhum papel. Na operação real, o acesso de moderação depende de necessidade justificada, autorização específica e registro em trilha de auditoria.';
  const MSG_DESCONHECIDO = 'Não há regra de acesso declarada para este objeto, então o acesso é negado por padrão.';

  function ok() {
    return { ok: true, codigo: null, mensagem: null, invariante: null };
  }

  function nao(codigo, mensagem) {
    return {
      ok: false,
      codigo: codigo,
      mensagem: mensagem || E.MENSAGEM[codigo] || 'Acesso negado',
      invariante: E.INVARIANTE[codigo] || null,
    };
  }

  /* Na demonstração o portão 18+ É o que marca a idade como verificada.
     É exatamente a confusão que a produção não pode fazer, e a tela do
     portão diz isso em voz alta. */
  function portaoAberto(contexto) {
    return !!(contexto && contexto.verificacao && contexto.verificacao.idade);
  }

  function ehTitularCreator(objeto, contexto) {
    const id = objeto.creatorPublicId || objeto.publicId;
    return contexto.atorId === id;
  }

  function podeVer(objeto, contexto) {
    const c = contexto || {};
    const papel = c.papel || 'VISITANTE';
    if (!objeto || !objeto.tipo) return nao(E.CODIGOS.TRANSICAO_INVALIDA, MSG_DESCONHECIDO);

    if (objeto.tipo === 'tela') {
      if (TELAS_PUBLICAS.indexOf(objeto.nome) !== -1) return ok();
      if (!portaoAberto(c)) return nao(E.CODIGOS.AGE_OR_IDENTITY_REQUIRED, MSG_PORTAO);
      const permitidos = TELAS_POR_PAPEL[objeto.nome];
      if (!permitidos) return nao(E.CODIGOS.TRANSICAO_INVALIDA, MSG_DESCONHECIDO);
      if (permitidos.indexOf(papel) !== -1) return ok();
      if (permitidos.indexOf('CREATOR') !== -1) return nao(E.CODIGOS.NOT_CREATOR_OWNER, E.MENSAGEM.NOT_CREATOR_OWNER + '. ' + MSG_TELA);
      if (permitidos.indexOf('COMPRADOR') !== -1) return nao(E.CODIGOS.NOT_BUYER_OWNER, E.MENSAGEM.NOT_BUYER_OWNER + '. ' + MSG_TELA);
      return nao(E.CODIGOS.NOT_BUYER_OWNER, MSG_CASO);
    }

    /* O arquivo original não existe nesta demonstração, para nenhum papel */
    if (objeto.tipo === 'midia_original') {
      return nao(E.CODIGOS.NOT_BUYER_OWNER, MSG_ORIGINAL);
    }

    if (!portaoAberto(c)) return nao(E.CODIGOS.AGE_OR_IDENTITY_REQUIRED, MSG_PORTAO);

    if (objeto.tipo === 'creator') return ok();

    if (objeto.tipo === 'pedido') {
      if (papel === 'MODERACAO') return ok();
      if (papel === 'COMPRADOR') {
        return contexto.atorId === objeto.compradorId ? ok() : nao(E.CODIGOS.NOT_BUYER_OWNER);
      }
      if (papel === 'CREATOR') {
        return ehTitularCreator(objeto, contexto) ? ok() : nao(E.CODIGOS.NOT_CREATOR_OWNER);
      }
      return nao(E.CODIGOS.NOT_BUYER_OWNER, MSG_TELA);
    }

    if (objeto.tipo === 'caso') {
      return papel === 'MODERACAO' ? ok() : nao(E.CODIGOS.NOT_BUYER_OWNER, MSG_CASO);
    }

    return nao(E.CODIGOS.TRANSICAO_INVALIDA, MSG_DESCONHECIDO);
  }

  function podeAgir(objeto, acao, contexto) {
    const c = contexto || {};
    const papel = c.papel || 'VISITANTE';
    const exigido = ACOES[acao];
    if (!exigido) return nao(E.CODIGOS.TRANSICAO_INVALIDA, 'Esta ação não existe, então não é permitida.');

    const visivel = podeVer(objeto, c);
    if (!visivel.ok) return visivel;

    if (papel !== exigido) {
      if (exigido === 'CREATOR') return nao(E.CODIGOS.NOT_CREATOR_OWNER);
      if (exigido === 'COMPRADOR') return nao(E.CODIGOS.NOT_BUYER_OWNER);
      return nao(E.CODIGOS.NOT_BUYER_OWNER, MSG_CASO);
    }

    if (papel === 'CREATOR' && (objeto.creatorPublicId || objeto.publicId)) {
      if (!ehTitularCreator(objeto, c)) return nao(E.CODIGOS.NOT_CREATOR_OWNER);
    }
    if (papel === 'COMPRADOR' && objeto.compradorId) {
      if (c.atorId !== objeto.compradorId) return nao(E.CODIGOS.NOT_BUYER_OWNER);
    }

    return ok();
  }

  const api = {
    PAPEIS: PAPEIS,
    TELAS_PUBLICAS: TELAS_PUBLICAS,
    TELAS_POR_PAPEL: TELAS_POR_PAPEL,
    ACOES: ACOES,
    podeVer: podeVer,
    podeAgir: podeAgir,
    portaoAberto: portaoAberto,
  };

  raiz.WANTU = raiz.WANTU || {};
  raiz.WANTU.papel = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : this);
