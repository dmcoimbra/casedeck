/* WANTU · pedidos
   Que ações um pedido oferece ao comprador titular, e o que uma contestação
   precisa ter para ser aceita.

   A contestação é objetiva por desenho: os motivos são uma lista fechada de
   divergências verificáveis contra o briefing, e o campo livre recusa
   julgamento de aparência ou de corpo. Pedir que alguém avalie o corpo de
   outra pessoa para liberar um pagamento é exatamente o que este produto
   não faz.

   Não conhece DOM nem armazenamento.                                       */

;(function (raiz) {
  'use strict';

  const node = typeof module === 'object' && module.exports;
  const E = node ? require('./estado.js') : raiz.WANTU.estado;

  const DESCRICAO_MIN = 40;

  const MOTIVOS = [
    { id: 'prazo', rotulo: 'A entrega passou do prazo combinado no aceite' },
    { id: 'modalidade', rotulo: 'A entrega veio em modalidade diferente da contratada' },
    { id: 'escopo', rotulo: 'Um item escrito no briefing não foi atendido' },
    { id: 'arquivo', rotulo: 'O arquivo chegou ilegível, incompleto ou corrompido' },
    { id: 'quantidade', rotulo: 'A quantidade entregue é menor que a combinada' },
  ];

  /* Termos que denunciam julgamento de pessoa, e não de entrega */
  const SUBJETIVO = /\b(apar[eê]ncia|corpo|rosto|beleza|bonit[ao]|feia?|feio|atraente|gostosa?|magr|gord|velha?|nova?\b|sexy|atraent|n[ãa]o gostei d[eao]|esperava outra)\b/i;

  function titular(pedido, contexto) {
    return contexto.papel === 'COMPRADOR' && contexto.atorId === pedido.compradorId;
  }

  function notaTriagem(pedido) {
    if (pedido.triagem !== 'EM_REVISAO') return '';
    return 'Esta proposta está em análise humana por um sinal detectado no texto. '
      + 'Quem cria ainda não recebeu nada, e nenhuma ação fica disponível enquanto a análise não terminar.';
  }

  function acoesDisponiveis(pedido, contexto) {
    if (!titular(pedido, contexto)) return [];
    if (pedido.triagem === 'EM_REVISAO') return [];

    const agora = contexto.agora || new Date();
    const acoes = [];

    switch (pedido.estado) {
      case 'SUBMITTED':
        acoes.push({ id: 'cancelar', rotulo: 'Cancelar proposta', destino: 'CANCELLED', tom: 'outline',
          nota: 'Antes do aceite, cancelar não tem custo nenhum.' });
        break;

      case 'COUNTEROFFERED':
        acoes.push({ id: 'aceitar_contraproposta', rotulo: 'Aceitar as novas condições', destino: 'ACCEPTED', tom: 'primario',
          nota: 'Silêncio nunca vale como aceite: a contraproposta só vale se você aceitar.' });
        acoes.push({ id: 'recusar_contraproposta', rotulo: 'Recusar', destino: 'DECLINED', tom: 'outline' });
        break;

      case 'ACCEPTED':
        acoes.push({ id: 'pagar', rotulo: 'Seguir para o pagamento', destino: 'FUNDING_PENDING', tom: 'primario',
          nota: 'Na operação real, daqui em diante quem conduz é o parceiro financeiro contratado.' });
        break;

      case 'DELIVERED':
        acoes.push({ id: 'ver_previa', rotulo: 'Ver prévia protegida', destino: null, tom: 'texto' });
        acoes.push({ id: 'confirmar', rotulo: 'Confirmar entrega', destino: 'SETTLEMENT_ELIGIBLE', tom: 'primario',
          nota: 'Confirmar marca o pedido como elegível para liquidação, e não transfere dinheiro: o repasse depende do evento financeiro.' });
        if (!E.janelaEncerrada(pedido, agora)) {
          acoes.push({ id: 'contestar', rotulo: 'Abrir contestação', destino: 'DISPUTED', tom: 'outline',
            nota: 'A contestação compara a entrega com o briefing combinado, por critério verificável.' });
        }
        break;

      case 'SETTLEMENT_ELIGIBLE':
      case 'SETTLED':
        acoes.push({ id: 'ver_previa', rotulo: 'Ver prévia protegida', destino: null, tom: 'texto' });
        break;

      default:
        break;
    }

    return acoes;
  }

  function erro(codigo, mensagem) {
    return { ok: false, erro: { codigo: codigo, mensagem: mensagem } };
  }

  function validarContestacao(dados) {
    const motivos = (dados && dados.motivos) || [];
    const descricao = String((dados && dados.descricao) || '').trim();

    if (!motivos.length) {
      return erro('SEM_MOTIVO', 'Marque pelo menos um motivo objetivo. A contestação compara a entrega com o que foi combinado.');
    }
    const validos = MOTIVOS.map(function (m) { return m.id; });
    if (!motivos.every(function (m) { return validos.indexOf(m) !== -1; })) {
      return erro('MOTIVO_INVALIDO', 'Escolha um dos motivos da lista. Não existe contestação por preferência pessoal.');
    }
    /* Subjetividade ANTES de tamanho: mandar escrever mais um texto que seria
       recusado de qualquer jeito só ensina a pessoa a encompridar o mesmo
       julgamento. A recusa aqui diz o que se pede no lugar. */
    if (SUBJETIVO.test(descricao)) {
      return erro('JULGAMENTO_SUBJETIVO',
        'A contestação não avalia a pessoa, avalia a entrega contra o briefing. Aponte o que estava escrito no pedido e não foi cumprido, '
        + 'como prazo, modalidade, quantidade ou um item de escopo. Gosto pessoal não é divergência verificável e não trava o pagamento de quem produziu.');
    }
    if (descricao.length < DESCRICAO_MIN) {
      return erro('DESCRICAO_CURTA', 'Descreva a divergência com pelo menos ' + DESCRICAO_MIN
        + ' caracteres, apontando o que o briefing pedia e o que chegou.');
    }
    return { ok: true, erro: null };
  }

  function montarContestacao(dados, contexto) {
    return {
      motivos: dados.motivos.slice(),
      descricao: String(dados.descricao).trim(),
      em: (contexto.agora || new Date()).toISOString(),
      por: contexto.atorId,
      estado: 'ABERTA',
    };
  }

  const api = {
    MOTIVOS: MOTIVOS,
    DESCRICAO_MIN: DESCRICAO_MIN,
    acoesDisponiveis: acoesDisponiveis,
    notaTriagem: notaTriagem,
    validarContestacao: validarContestacao,
    montarContestacao: montarContestacao,
  };

  raiz.WANTU = raiz.WANTU || {};
  raiz.WANTU.pedidos = api;
  if (node) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : this);
