/* WANTU · tela creator
   Perfil público e compositor de proposta. A tela desenha e pergunta; quem
   decide é politica.js, estado.js e papel.js.                              */

;(function () {
  'use strict';

  const W = window.WANTU;
  const A = W.app;

  /* `creator` é a PROJEÇÃO pública, e é dela que a tela desenha: um campo
     novo no modelo interno não vaza para o perfil sem alguém decidir que
     vaza. `interno` existe só para a autorização, porque a projeção não
     carrega `bloqueados` e avaliar elegibilidade nela deixaria passar
     comprador bloqueado: seria trocar vazamento de dado por furo de
     autorização. */
  let creator = null;
  let interno = null;
  let modalidade = null;
  let ultimoFoco = null;

  function brutoPorId(id) {
    return A.estado().creators.find(function (c) { return c.publicId === id; }) || null;
  }

  function porId(id) {
    const bruto = brutoPorId(id);
    return bruto ? W.filtro.publico(bruto) : null;
  }

  function catGlobal(id) {
    return W.dados.CATEGORIAS.find(function (c) { return c.id === id; });
  }

  function habilitada(id) {
    return creator.categorias.find(function (c) { return c.id === id; }) || null;
  }

  /* ------------------------------------------------------------- perfil */

  function desenharPerfil() {
    const pausada = creator.disponibilidade !== 'aberta';
    document.title = 'WANTU · ' + creator.pseudonimo;

    document.getElementById('retrato').innerHTML = W.retratos.svg(creator.retratoSeed);
    document.getElementById('pseudonimo').textContent = creator.pseudonimo;
    document.getElementById('tagline').textContent = creator.tagline;
    document.getElementById('bio').textContent = creator.bio;

    document.getElementById('estilos').innerHTML = creator.estilos
      .map(function (e) { return '<span class="chip">' + A.escapar(e) + '</span>'; }).join('');

    document.getElementById('consentimento').innerHTML =
      '<span class="selo-estado ' + (pausada ? 'selo-estado--atencao' : 'selo-estado--ok') + '">'
      + (pausada ? 'Pausada' : 'Aceitando propostas') + '</span>'
      + '<span class="consentimento-nota">Aderiu em ' + A.escapar(new Date(creator.optIn.em)
        .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }))
      + ' · termos ' + A.escapar(creator.optIn.versao) + '</span>';

    document.getElementById('catalogo').innerHTML = creator.categorias.map(function (c) {
      const g = catGlobal(c.id);
      return '<tr><td>' + A.escapar(g.rotulo) + '<br><span class="caption">' + A.escapar(g.descricao) + '</span></td>'
        + '<td class="numero">' + A.dinheiro(c.minimoCentavos) + '</td>'
        + '<td class="numero">' + c.prazoDias + ' dias</td></tr>';
    }).join('');

    document.getElementById('limites').innerHTML = creator.naoAceito
      .map(function (l) { return '<li>' + A.escapar(l) + '</li>'; }).join('');

    document.getElementById('resposta').textContent = pausada
      ? 'Sem previsão de resposta enquanto a agenda estiver pausada'
      : 'Responde em cerca de ' + creator.respostaMediaHoras + ' horas';

    ajustarBotao(pausada);
  }

  function ajustarBotao(pausada) {
    const botao = document.getElementById('abrir-proposta');
    const permissao = W.papel.podeAgir({ tipo: 'creator', publicId: creator.publicId }, 'propor', A.contexto());
    const nota = document.getElementById('nota-proposta');

    if (pausada) {
      botao.disabled = true;
      botao.title = 'Este creator pausou o recebimento de propostas';
      nota.textContent = 'A disponibilidade é de quem cria, e pausar vale na hora.';
      return;
    }
    if (!permissao.ok) {
      botao.disabled = true;
      botao.title = permissao.mensagem;
      nota.innerHTML = A.negativa(permissao,
        '<button class="btn btn--outline btn--pequeno" type="button" data-virar-comprador>Trocar para o papel de comprador</button>');
      const v = nota.querySelector('[data-virar-comprador]');
      if (v) v.addEventListener('click', function () { A.trocarPapel('COMPRADOR'); });
      return;
    }
    botao.disabled = false;
    botao.removeAttribute('title');
    nota.textContent = 'Fazer uma proposta não garante resposta positiva. A recusa é um direito e dispensa justificativa.';
  }

  /* --------------------------------------------------------- compositor */

  function desenharModalidades() {
    document.getElementById('modalidades').innerHTML = W.dados.CATEGORIAS.map(function (g) {
      const h = habilitada(g.id);
      const ativa = h && g.id === modalidade;
      return '<button class="opcao-modalidade" type="button" data-cat="' + g.id + '"'
        + (h ? '' : ' disabled title="Este creator não habilitou esta modalidade"')
        + ' aria-pressed="' + (!!ativa) + '">'
        + '<span class="opcao-modalidade__nome">' + A.escapar(g.rotulo) + '</span>'
        + '<span class="opcao-modalidade__valor">' + (h ? 'a partir de ' + A.dinheiro(h.minimoCentavos) : 'não habilitada') + '</span>'
        + (h ? '<span class="opcao-modalidade__prazo">' + h.prazoDias + ' dias</span>' : '')
        + '</button>';
    }).join('');

    document.querySelectorAll('[data-cat]').forEach(function (b) {
      b.addEventListener('click', function () { escolherModalidade(b.dataset.cat); });
    });
  }

  function escolherModalidade(id) {
    const h = habilitada(id);
    if (!h) return;
    modalidade = id;
    desenharModalidades();
    const campo = document.getElementById('c-valor');
    const faixa = document.getElementById('c-faixa');
    const sugerido = Math.round(h.minimoCentavos * 1.15 / 1000) * 1000;
    faixa.min = h.minimoCentavos;
    faixa.max = Math.max(h.minimoCentavos * 6, h.minimoCentavos + 50000);
    faixa.step = 1000;
    faixa.value = sugerido;
    campo.value = (sugerido / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    document.getElementById('c-minimo').textContent = 'Mínimo de ' + A.dinheiro(h.minimoCentavos)
      + ' nesta modalidade, definido por quem cria';
    document.getElementById('c-prazo').value = String(h.prazoDias);
    document.getElementById('c-prazo-nota').textContent = 'Prazo sugerido por quem cria: ' + h.prazoDias + ' dias';
    atualizarResumo();
  }

  function centavosDoCampo() {
    const h = habilitada(modalidade);
    return W.politica.validarValor(document.getElementById('c-valor').value, h ? h.minimoCentavos : 0);
  }

  function atualizarResumo() {
    const v = centavosDoCampo();
    const caixa = document.getElementById('c-economia');
    const erro = document.getElementById('c-valor-erro');

    if (!v.ok) {
      erro.textContent = v.erro.mensagem;
      erro.hidden = false;
      document.getElementById('c-valor').setAttribute('aria-invalid', 'true');
      caixa.innerHTML = '';
      return;
    }
    erro.hidden = true;
    document.getElementById('c-valor').removeAttribute('aria-invalid');
    const e = W.estado.economia(v.centavos);
    caixa.innerHTML = ''
      + '<div class="card-pedido__numero"><span>Você oferece</span><strong>' + A.dinheiro(e.bruto) + '</strong></div>'
      + '<div class="card-pedido__numero"><span>Comissão 20%</span><strong>' + A.dinheiro(e.comissao) + '</strong></div>'
      + '<div class="card-pedido__numero"><span>Creator recebe (estimado)</span><strong>' + A.dinheiro(e.liquido) + '</strong></div>';
  }

  function avaliarAoVivo() {
    const texto = document.getElementById('c-briefing').value;
    const caixa = document.getElementById('c-briefing-aviso');
    const contador = document.getElementById('c-contador');
    contador.textContent = texto.length + ' / ' + W.compositor.BRIEFING_MAX;

    if (texto.trim().length < W.compositor.BRIEFING_MIN) {
      caixa.innerHTML = '';
      return;
    }
    const r = W.politica.avaliarBriefing(texto);
    if (r.resultado === 'LIBERADO') {
      caixa.innerHTML = '<div class="aviso aviso--ok"><span class="aviso__marca" aria-hidden="true">✓</span>'
        + '<p>Briefing sem sinal de problema. Quem cria vai receber exatamente este texto.</p></div>';
      return;
    }
    caixa.innerHTML = r.violacoes.map(function (v) {
      const tom = v.saida === 'BLOQUEADO' ? 'aviso--erro' : 'aviso--atencao';
      return '<div class="aviso ' + tom + '"><span class="aviso__marca" aria-hidden="true">!</span>'
        + '<p><strong>' + A.escapar(v.rotulo) + '.</strong> ' + A.escapar(v.explicacao) + '</p></div>';
    }).join('');
  }

  function enviar() {
    const contexto = A.contexto();
    const rascunho = {
      creatorPublicId: creator.publicId,
      categoriaId: modalidade,
      valor: document.getElementById('c-valor').value,
      briefing: document.getElementById('c-briefing').value,
      prazoDias: Number(document.getElementById('c-prazo').value),
    };

    /* A autorização olha o objeto interno, nunca a projeção pública */
    const r = W.compositor.enviar(rascunho, interno, contexto);
    const saida = document.getElementById('c-saida');

    if (r.resultado === 'RECUSADO') {
      saida.innerHTML = '<div class="aviso aviso--erro"><span class="aviso__marca" aria-hidden="true">!</span>'
        + '<p><strong>Proposta não enviada.</strong> ' + A.escapar(r.erro.mensagem) + '</p></div>';
      return;
    }

    if (r.resultado === 'BLOQUEADO') {
      saida.innerHTML = '<div class="aviso aviso--erro"><span class="aviso__marca" aria-hidden="true">!</span>'
        + '<p><strong>Briefing barrado antes de chegar a quem cria.</strong> Nada foi enviado, e quem cria não vê este texto.</p></div>'
        + r.violacoes.map(function (v) {
          return '<div class="aviso aviso--erro"><span class="aviso__marca" aria-hidden="true">!</span>'
            + '<p><strong>' + A.escapar(v.rotulo) + '.</strong> ' + A.escapar(v.explicacao) + '</p></div>';
        }).join('');
      return;
    }

    const e = A.estado();
    e.pedidos.unshift(r.pedido);
    if (r.caso) e.casos.unshift(r.caso);
    A.salvar();

    if (r.resultado === 'REVISAO') {
      saida.innerHTML = '<div class="aviso aviso--atencao"><span class="aviso__marca" aria-hidden="true">!</span>'
        + '<p><strong>Proposta em análise humana.</strong> O texto tem um sinal que precisa de olho de uma pessoa antes de seguir. '
        + 'Quem cria ainda não recebeu nada, e você acompanha o estado em Meus pedidos.</p></div>';
    } else {
      saida.innerHTML = '<div class="aviso aviso--ok"><span class="aviso__marca" aria-hidden="true">✓</span>'
        + '<p><strong>Proposta enviada.</strong> Quem cria pode aceitar, recusar sem justificativa ou sugerir outras condições. '
        + 'A proposta vale por 72 horas, e você acompanha em <a class="link" href="pedidos.html">Meus pedidos</a>.</p></div>';
    }
    document.getElementById('c-enviar').disabled = true;
    A.recado('Proposta registrada na demonstração', 'ok');
  }

  /* --------------------------------------------------------------- modal */

  function abrir() {
    ultimoFoco = document.activeElement;
    const fundo = document.getElementById('modal-proposta');
    fundo.hidden = false;
    document.body.style.overflow = 'hidden';
    document.getElementById('c-saida').innerHTML = '';
    document.getElementById('c-enviar').disabled = false;
    const primeira = habilitada(modalidade) ? modalidade : creator.categorias[0].id;
    escolherModalidade(primeira);
    avaliarAoVivo();
    fundo.querySelector('.modal__fechar').focus();
  }

  function fechar() {
    document.getElementById('modal-proposta').hidden = true;
    document.body.style.overflow = '';
    if (ultimoFoco) ultimoFoco.focus();
  }

  function prenderFoco(e) {
    const fundo = document.getElementById('modal-proposta');
    if (fundo.hidden) return;
    if (e.key === 'Escape') { fechar(); return; }
    if (e.key !== 'Tab') return;
    const focaveis = fundo.querySelectorAll('button:not([disabled]), input, textarea, select, a[href]');
    if (!focaveis.length) return;
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
  }

  function ligar() {
    document.getElementById('abrir-proposta').addEventListener('click', abrir);
    document.querySelector('#modal-proposta .modal__fechar').addEventListener('click', fechar);
    document.getElementById('modal-proposta').addEventListener('click', function (e) {
      if (e.target.id === 'modal-proposta') fechar();
    });
    document.addEventListener('keydown', prenderFoco);

    document.getElementById('c-valor').addEventListener('input', function () {
      const v = centavosDoCampo();
      if (v.ok) document.getElementById('c-faixa').value = String(v.centavos);
      atualizarResumo();
    });
    document.getElementById('c-faixa').addEventListener('input', function (e) {
      document.getElementById('c-valor').value = (Number(e.target.value) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      atualizarResumo();
    });

    let atraso = null;
    document.getElementById('c-briefing').addEventListener('input', function () {
      clearTimeout(atraso);
      atraso = setTimeout(avaliarAoVivo, 220);
    });

    document.getElementById('c-enviar').addEventListener('click', enviar);
  }

  function boot() {
    const veredito = A.iniciar('creator');
    if (!veredito.ok) {
      A.mostrarNegativa(veredito);
      return;
    }
    A.esconderNegativa();

    const id = new URLSearchParams(location.search).get('id');
    interno = brutoPorId(id) || A.estado().creators[0];
    creator = W.filtro.publico(interno);
    desenharPerfil();
    desenharModalidades();
    ligar();
  }

  window.aoAbrirPortao = boot;
  boot();
})();
