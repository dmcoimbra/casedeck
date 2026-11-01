/* WANTU · app
   Boot, helpers de render, portão 18+ e barra de papel. Compartilhado por
   todas as telas. Cada tela tem o seu próprio arquivo tela-*.js.

   A tela não decide nada: pergunta a papel.js se pode, a estado.js o que
   pode virar, e a politica.js o que é aceitável. Aqui só se desenha.       */

;(function (raiz) {
  'use strict';

  const W = raiz.WANTU;

  /* Quem é o ator de cada papel, nesta demonstração */
  const ATOR = {
    VISITANTE: null,
    COMPRADOR: 'usr_ana',
    CREATOR: 'crt_lumina',
    MODERACAO: 'mod_1',
  };

  /* Duas identidades de moderação, porque caso crítico exige duas pessoas
     diferentes. Com uma só, a demo mostrava a recusa MESMO_REVISOR e nunca o
     fechamento: a regra lia como defeito. */
  const REVISORES = [
    { id: 'mod_1', nome: 'Analista 1' },
    { id: 'mod_2', nome: 'Analista 2' },
  ];

  const ROTULO_PAPEL = {
    VISITANTE: 'Visitante',
    COMPRADOR: 'Comprador',
    CREATOR: 'Creator',
    MODERACAO: 'Moderação',
  };

  const NOTA_PAPEL = {
    VISITANTE: 'Navegando sem conta, como quem chega pela primeira vez',
    COMPRADOR: 'Você é Ana, compradora verificada nesta demonstração',
    CREATOR: 'Você é Lúmina, e decide sobre as propostas que chegam',
    MODERACAO: 'Você vê a fila de análise, com dado mínimo e trilha',
  };

  let cache = null;

  function estado() {
    if (!cache) cache = W.dados.carregar();
    return cache;
  }

  function salvar() {
    return W.dados.salvar(estado());
  }

  /* Zera o cache deste modulo junto com o de dados.js: sem isso, restaurar
     sem recarregar a pagina devolveria o estado antigo que este arquivo
     ainda estivesse segurando. */
  function restaurar() {
    cache = null;
    const novo = W.dados.restaurar();
    cache = novo;
    W.simulacao.zerar();
    return novo;
  }

  function definir(mudanca) {
    Object.assign(estado(), mudanca);
    salvar();
  }

  /* Trocar de papel recarregava sempre. Num navegador que bloqueia dado de
     site, o reload resemeia e o papel recém-escolhido se perde: a demo ficava
     sem CREATOR e sem MODERACAO, calada. Onde o estado não sobrevive ao
     reload, a tela remonta no lugar, pelo mesmo caminho que o portão 18+ já
     usa. */
  function recarregarOuRemontar() {
    if (W.dados.persistente()) {
      raiz.location.reload();
      return;
    }
    montarBarraPapel();
    document.dispatchEvent(new CustomEvent('wantu:portao'));
    if (typeof raiz.aoAbrirPortao === 'function') raiz.aoAbrirPortao();
  }

  function trocarPapel(novo) {
    definir({ papel: novo });
    recarregarOuRemontar();
  }

  function contexto() {
    const e = estado();
    return {
      papel: e.papel || 'VISITANTE',
      atorId: (e.papel === 'MODERACAO' && e.revisorAtivo) ? e.revisorAtivo : ATOR[e.papel || 'VISITANTE'],
      agora: W.simulacao.agora(),
      verificacao: { idade: !!e.portaoAberto, identidade: !!e.portaoAberto },
    };
  }

  /* ------------------------------------------------------------- formato */

  function dinheiro(centavos) {
    return (Number(centavos || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function dataCurta(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function emQuanto(iso, de) {
    const ms = new Date(iso).getTime() - (de || W.simulacao.agora()).getTime();
    if (ms <= 0) return 'encerrado';
    const h = Math.floor(ms / 3600000);
    if (h < 1) return Math.max(1, Math.round(ms / 60000)) + 'min';
    if (h < 48) return h + 'h';
    return Math.round(h / 24) + ' dias';
  }

  function escapar(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  /* --------------------------------------------------------------- aviso */

  let temporizadorAviso = null;

  function recado(texto, tom) {
    let caixa = document.getElementById('recado');
    if (!caixa) {
      caixa = el('<div id="recado" class="recado" role="status" aria-live="polite"></div>');
      document.body.appendChild(caixa);
    }
    caixa.className = 'recado recado--visivel' + (tom ? ' recado--' + tom : '');
    caixa.textContent = texto;
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(function () { caixa.className = 'recado'; }, 4600);
  }

  /* A negativa NUNCA substitui o conteúdo da tela: a tela é remontada quando
     o portão 18+ abre, e nessa segunda passada os elementos que ela procura
     precisam continuar existindo. Então a negativa entra ao lado, e o
     conteúdo é escondido. */
  function mostrarNegativa(veredito, acaoHtml) {
    const principal = document.getElementById('conteudo');
    if (!principal) return null;
    const conteudo = principal.querySelector('.wrap');
    if (conteudo) conteudo.hidden = true;
    let caixa = document.getElementById('negativa-tela');
    if (!caixa) {
      caixa = el('<div class="wrap secao" id="negativa-tela"></div>');
      principal.appendChild(caixa);
    }
    caixa.hidden = false;
    caixa.innerHTML = negativa(veredito, acaoHtml || '');
    return caixa;
  }

  function esconderNegativa() {
    const caixa = document.getElementById('negativa-tela');
    if (caixa) caixa.remove();
    const conteudo = document.querySelector('#conteudo > .wrap');
    if (conteudo) conteudo.hidden = false;
  }

  /* Negativa de acesso desenhada, com o código e a explicação */
  function negativa(resultado, acao) {
    return '<div class="negativa">'
      + '<span class="negativa__codigo">' + escapar(resultado.codigo) + '</span>'
      + '<p>' + escapar(resultado.mensagem) + '</p>'
      + (acao || '')
      + '</div>';
  }

  /* ------------------------------------------------------- portão 18+ */

  /* O portão vive no HTML, visível por padrão, e o JavaScript o REMOVE quando
     a pessoa já entrou. Injetá-lo por script seria falhar aberto: bastaria o
     script não rodar para o conteúdo aparecer sem portão nenhum. */
  function cuidarDoPortao() {
    const no = document.getElementById('portao');
    if (!no) return;

    if (estado().portaoAberto) {
      no.remove();
      return;
    }

    document.body.style.overflow = 'hidden';
    const botao = no.querySelector('#portao-entrar');
    if (!botao) return;
    botao.focus();
    botao.addEventListener('click', function () {
      definir({ portaoAberto: true, papel: 'COMPRADOR' });
      no.remove();
      document.body.style.overflow = '';
      montarBarraPapel();
      /* O evento sai ANTES do boot da tela: assim um erro numa tela não
         impede o painel de apresentação de montar. */
      document.dispatchEvent(new CustomEvent('wantu:portao'));
      if (typeof raiz.aoAbrirPortao === 'function') raiz.aoAbrirPortao();
    });
  }

  /* --------------------------------------------------- barra de papel */

  function montarBarraPapel() {
    const alvo = document.querySelector('[data-barra-papel]');
    if (!alvo) return;
    const atual = estado().papel || 'VISITANTE';

    alvo.className = 'barra-papel';
    alvo.innerHTML = '<span class="selo-demo">Demo</span>'
      + '<span class="sr">Papel ativo na demonstração</span>'
      + '<div class="barra-papel__grupo" role="group" aria-label="Trocar o papel da demonstração">'
      + W.papel.PAPEIS.map(function (p) {
        return '<button class="barra-papel__opcao" type="button" data-papel="' + p + '"'
          + ' aria-pressed="' + (p === atual) + '">' + escapar(ROTULO_PAPEL[p]) + '</button>';
      }).join('')
      + '</div>'
      + '<span class="barra-papel__nota" id="barra-nota">' + escapar(NOTA_PAPEL[atual])
      + (W.dados.persistente() ? ''
        : ' · Este navegador está bloqueando dado de site, então trocar de página reinicia o estado da demonstração')
      + '</span>';

    alvo.querySelectorAll('[data-papel]').forEach(function (b) {
      b.addEventListener('click', function () { trocarPapel(b.dataset.papel); });
    });
  }

  /* ---------------------------------------------------------- navegação */

  function marcarNavegacao(tela) {
    document.querySelectorAll('.topo__links a').forEach(function (a) {
      if (a.dataset.tela === tela) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  /* O relógio move estado sem ninguém clicar: a janela de contestação fecha
     sozinha e a proposta expira sozinha. Roda no boot e num tique lento, para
     isso acontecer na frente de quem está vendo a demonstração. */
  function varrerAgora() {
    const e = estado();
    /* Contexto de SISTEMA, nunca o do usuario na tela: o relogio e a
       plataforma agindo sobre o prazo, e com o contexto de quem esta logado
       a varredura so moveria os pedidos dessa pessoa. */
    const r = W.simulacao.varrer(e.pedidos);
    if (!r.mudados.length) return [];
    e.pedidos = r.pedidos;
    salvar();
    /* Gravar e DEPOIS anunciar. Invertido, o assinante redesenha lendo o
       estado anterior e nunca é avisado de novo, porque o tique seguinte não
       encontra mudança: o recado diz que três pedidos mudaram e nenhum
       cartão muda. */
    W.simulacao.anunciar('relogio.varreu', { mudados: r.mudados });
    return r.mudados;
  }

  let tique = null;

  function iniciar(tela) {
    montarBarraPapel();
    marcarNavegacao(tela);
    cuidarDoPortao();

    const deslocado = estado().deslocamentoRelogio || 0;
    if (deslocado) W.simulacao.definirDeslocamento(deslocado);
    varrerAgora();

    clearInterval(tique);
    tique = setInterval(varrerAgora, 15000);

    return W.papel.podeVer({ tipo: 'tela', nome: tela }, contexto());
  }

  const api = {
    ATOR: ATOR,
    REVISORES: REVISORES,
    ROTULO_PAPEL: ROTULO_PAPEL,
    estado: estado,
    salvar: salvar,
    restaurar: restaurar,
    definir: definir,
    trocarPapel: trocarPapel,
    recarregarOuRemontar: recarregarOuRemontar,
    contexto: contexto,
    dinheiro: dinheiro,
    dataCurta: dataCurta,
    emQuanto: emQuanto,
    escapar: escapar,
    el: el,
    recado: recado,
    negativa: negativa,
    mostrarNegativa: mostrarNegativa,
    esconderNegativa: esconderNegativa,
    cuidarDoPortao: cuidarDoPortao,
    montarBarraPapel: montarBarraPapel,
    varrerAgora: varrerAgora,
    iniciar: iniciar,
  };

  raiz.WANTU = raiz.WANTU || {};
  raiz.WANTU.app = api;
})(typeof globalThis === 'object' ? globalThis : this);
