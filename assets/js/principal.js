/* ============================================================
   CONFIGURAÇÃO
   Tudo que muda com frequência fica aqui.
   ============================================================ */
const SITE = {
  whatsapp: '5563984565618',   // apenas dígitos, com DDI
  emails: ['alansilvaseguros@yahoo.com', 'Alansilvaseguros@icloud.com'],

  // LOGO INSTITUCIONAL — usada ao lado do formulário de cotação.
  // Hoje exibe a marca da AS embutida no próprio arquivo. Deixe vazio
  // para manter a imagem atual. Para trocar: coloque o arquivo em
  // assets/ e informe o caminho aqui, por exemplo 'assets/institucional.webp'.
  imagemInstitucional: '',

  // Logos das companhias: coloque os PNGs oficiais em assets/marcas/
  // com os nomes indicados no data-src de cada card.
  // Cada logo que carregar substitui o texto; a que faltar continua
  // exibindo o nome da empresa, sem quebrar o layout.
  usarLogosMarcas: true,
  // Serviço que entrega a solicitação no e-mail da empresa.
  // O 1º envio dispara um e-mail de confirmação para o endereço abaixo:
  // é preciso clicar em "Activate Form" uma única vez. Detalhes no README.
  endpoint: 'https://formsubmit.co/ajax/alansilvaseguros@yahoo.com',
  mensagens: {
    especialista:  'Olá! Vim pelo site da AS Seguros & Consórcios e gostaria de falar com um especialista.',
    cotacao:       'Olá! Vim pelo site da AS Seguros & Consórcios e gostaria de solicitar uma cotação.',
    empresa:       'Olá! Vim pelo site da AS Seguros & Consórcios e gostaria de solicitar uma proposta empresarial.',
    consorcio:     'Olá! Vim pelo site da AS Seguros & Consórcios e gostaria de conhecer as opções de Consórcio.',
    carro:         'Olá! Vim pelo site da AS Seguros & Consórcios e quero proteger meu carro.',
    casa:          'Olá! Vim pelo site da AS Seguros & Consórcios e quero proteger minha casa.',
    familia:       'Olá! Vim pelo site da AS Seguros & Consórcios e quero proteger minha família.',
    pagamento:     'Olá! Vim pelo site da AS Seguros & Consórcios e quero encontrar uma forma de pagamento para o meu objetivo.',
    financiamento: 'Olá! Vim pelo site da AS Seguros & Consórcios e gostaria de falar sobre Financiamento.'
  }
};

const $  = (s, ctx = document) => ctx.querySelector(s);
const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));
const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const temMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/** Remove caracteres de risco antes de reutilizar o texto. */
function limpar(valor) {
  return String(valor || '').replace(/[<>]/g, '').trim().slice(0, 600);
}
function linkWhats(mensagem) {
  return 'https://wa.me/' + SITE.whatsapp + '?text=' + encodeURIComponent(mensagem);
}
/** Abre o app de e-mail do visitante com a solicitação já escrita. */
function linkEmail(assunto, corpo) {
  return 'mailto:' + SITE.emails.join(',')
       + '?subject=' + encodeURIComponent(assunto)
       + '&body='    + encodeURIComponent(corpo.replace(/\n/g, '\r\n'));
}

/* ---------- Links de WhatsApp com mensagem por contexto ---------- */
$$('[data-wa]').forEach(el => {
  const msg = SITE.mensagens[el.dataset.wa] || SITE.mensagens.especialista;
  el.setAttribute('href', linkWhats(msg));
  el.setAttribute('target', '_blank');
  el.setAttribute('rel', 'noopener');
});

/* ---------- Logos das companhias ----------
   O nome fica sempre no HTML (bom para busca e leitores de tela).
   Com SITE.usarLogosMarcas ligado, cada logo que carregar substitui
   o texto; o que faltar continua exibindo o nome, sem quebrar nada. */
const marcas = $$('.brand img[data-src]');
if (SITE.usarLogosMarcas) {
  marcas.forEach(img => {
    img.addEventListener('load',  () => img.closest('.brand').classList.add('tem-logo'));
    img.addEventListener('error', () => img.remove());
    img.src = img.dataset.src;
  });
} else {
  marcas.forEach(img => img.remove());   // evita requisições desnecessárias
}

/* ---------- Imagem institucional ----------
   Enquanto SITE.imagemInstitucional estiver vazio, a imagem que já está no
   arquivo é mantida. Assim que o caminho for preenchido, as duas ocorrências
   passam a usar a nova; se ela não carregar, a original continua no lugar. */
if (SITE.imagemInstitucional) {
  $$('[data-img="institucional"]').forEach(img => {
    const anterior = img.src;
    img.addEventListener('error', () => { img.src = anterior; }, { once: true });
    img.src = SITE.imagemInstitucional;
  });
}

/* ---------- Header sólido ao rolar + barra de progresso da página ---------- */
const header = $('#header');
const barraProgresso = $('.progresso');
const waFlutuante = $('.wa-float');
const heroTopo = $('.hero');
let ticking = false;
/* medidas lidas só quando o layout muda (nunca dentro do quadro de rolagem, para não forçar reflow) */
let limiteWa = 400, maxRolagem = 1;
function medirPagina() {
  limiteWa = heroTopo ? heroTopo.offsetHeight * .55 : 400;
  maxRolagem = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
}
function atualizarHeader() {
  const y = window.scrollY;
  header.classList.toggle('is-stuck', y > 24);
  if (waFlutuante) waFlutuante.classList.toggle('is-on', y > limiteWa);
  if (barraProgresso) barraProgresso.style.transform = 'scaleX(' + Math.min(y / maxRolagem, 1).toFixed(4) + ')';
  ticking = false;
}
function pedirHeader() {
  if (!ticking) { window.requestAnimationFrame(atualizarHeader); ticking = true; }
}
window.addEventListener('scroll', pedirHeader, { passive: true });
window.addEventListener('resize', () => { medirPagina(); pedirHeader(); }, { passive: true });
if ('ResizeObserver' in window) new ResizeObserver(() => { medirPagina(); pedirHeader(); }).observe(document.body);
window.addEventListener('load', () => { medirPagina(); pedirHeader(); });
medirPagina();
atualizarHeader();

/* ---------- Menu mobile ---------- */
const burger = $('#burger');
const mobnav = $('#mobnav');
const burgerIcon = $('#burger-icon use');

let fechandoMenu = 0;
function alternarMenu(abrir) {
  const aberto = abrir !== undefined ? abrir : !mobnav.classList.contains('is-open');
  const estava = mobnav.classList.contains('is-open');
  clearTimeout(fechandoMenu);
  mobnav.classList.toggle('is-open', aberto);
  burger.setAttribute('aria-expanded', String(aberto));
  burger.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
  burgerIcon.setAttribute('href', aberto ? '#i-close' : '#i-menu');
  document.body.style.overflow = aberto ? 'hidden' : '';   // menu em tela cheia: a página não rola por trás
  if (aberto) { mobnav.classList.remove('is-fechando'); mobnav.hidden = false; return; }
  // fecha com uma saída curta; o "hidden" entra logo depois
  if (estava && !semMovimento && window.innerWidth < 1030) {
    mobnav.classList.add('is-fechando');
    fechandoMenu = setTimeout(() => { mobnav.classList.remove('is-fechando'); mobnav.hidden = true; }, 220);
  } else {
    mobnav.classList.remove('is-fechando');
    mobnav.hidden = true;
  }
}
burger.addEventListener('click', () => alternarMenu());
$$('#mobnav a').forEach(a => a.addEventListener('click', () => alternarMenu(false)));
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && mobnav.classList.contains('is-open')) { alternarMenu(false); burger.focus(); }
});
window.addEventListener('resize', () => { if (window.innerWidth >= 1030) alternarMenu(false); });

/* ---------- Entradas por seção ----------
   Cada bloco .rv aparece quando entra na tela; o atraso vem da posição
   dentro do próprio grupo (--i, no HTML). Redes de segurança: varredura
   ao parar a rolagem, foco do teclado e impressão. Sem JavaScript, o CSS
   mostra tudo normalmente. */
const alvos = $$('.rv');
if (semMovimento || !('IntersectionObserver' in window)) {
  alvos.forEach(el => el.classList.add('is-in'));
} else {
  const pendentes = new Set(alvos);
  const mostrar = (el, agora) => {
    if (!pendentes.has(el) && !agora) return;
    if (agora) el.style.transition = 'none';     // sem esperar a transição (teclado, impressão, salto)
    el.classList.add('is-in');
    pendentes.delete(el);
    observer.unobserve(el);
    if (agora) { void el.offsetWidth; el.style.removeProperty('transition'); }
  };
  const observer = new IntersectionObserver(entradas => {
    entradas.forEach(entrada => { if (entrada.isIntersecting) mostrar(entrada.target); });
  }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });
  alvos.forEach(el => observer.observe(el));

  let aguardando;
  const varrer = () => {
    const limite = window.innerHeight * 0.95;
    pendentes.forEach(el => { const r = el.getBoundingClientRect(); if (r.top < limite) mostrar(el, r.bottom < 0); });
    if (!pendentes.size) window.removeEventListener('scroll', aoRolar);
  };
  const aoRolar = () => { clearTimeout(aguardando); aguardando = setTimeout(varrer, 140); };
  window.addEventListener('scroll', aoRolar, { passive: true });
  // teclado: o bloco que recebe foco aparece na hora (nunca focar algo invisível)
  document.addEventListener('focusin', e => {
    const bloco = e.target && e.target.closest ? e.target.closest('.rv') : null;
    if (bloco) mostrar(bloco, true);
  });
  window.addEventListener('beforeprint', () => Array.from(pendentes).forEach(el => mostrar(el, true)));
}
document.documentElement.setAttribute('data-motion', 'ok');

/* ---------- Seção visível em destaque no menu ----------
   Só marca visualmente o item correspondente. A navegação continua sendo
   a mesma: âncoras normais, sem interceptar cliques. */
const linksNav = $$('.nav__link[href^="#"]');
if (linksNav.length && 'IntersectionObserver' in window) {
  const porId   = new Map(linksNav.map(a => [a.getAttribute('href').slice(1), a]));
  const secoes  = Array.from(porId.keys()).map(id => document.getElementById(id)).filter(Boolean);
  const ordem   = secoes.map(s => s.id);
  const visivel = new Set();
  let atual = null;

  const espiao = new IntersectionObserver(entradas => {
    entradas.forEach(e => e.isIntersecting ? visivel.add(e.target.id) : visivel.delete(e.target.id));
    const ativo = ordem.find(id => visivel.has(id)) || null;
    if (ativo === atual) return;
    atual = ativo;
    linksNav.forEach(a => a.removeAttribute('aria-current'));
    if (ativo && porId.has(ativo)) porId.get(ativo).setAttribute('aria-current', 'true');
  }, { rootMargin: '-45% 0px -50% 0px' });

  secoes.forEach(s => espiao.observe(s));
}

/* ---------- Abertura suave dos blocos <details> ----------
   O <details> nativo é mantido: clique, toque, teclado e o marcador +/–
   continuam funcionando. O script só anima a altura. Se o navegador não
   suportar animate() ou o usuário pedir menos movimento, o comportamento
   padrão do navegador assume, sem quebrar nada. */
if (!semMovimento && typeof Element.prototype.animate === 'function') {
  $$('details.mais').forEach(bloco => {
    const resumo = bloco.querySelector('summary');
    const corpo  = bloco.querySelector('.mais__corpo');
    if (!resumo || !corpo) return;
    let animacao = null;

    resumo.addEventListener('click', evento => {
      evento.preventDefault();
      if (animacao) animacao.cancel();

      const abrindo = !bloco.open;
      if (abrindo) bloco.open = true;            // precisa estar aberto para medir
      const altura = corpo.offsetHeight;

      animacao = corpo.animate(
        {
          height:  abrindo ? ['0px', altura + 'px'] : [altura + 'px', '0px'],
          opacity: abrindo ? [0, 1] : [1, 0]
        },
        { duration: 260, easing: 'cubic-bezier(.4,0,.2,1)' }
      );

      animacao.onfinish = () => {
        animacao = null;
        if (!abrindo) bloco.open = false;        // só fecha depois de animar
      };
      animacao.oncancel = () => { animacao = null; };
    });
  });
}

/* ---------- Máscara de telefone (XX) XXXXX-XXXX ---------- */
const campoWhats = $('#whatsapp');
campoWhats.addEventListener('input', e => {
  const d = e.target.value.replace(/\D/g, '').slice(0, 11);
  let saida = d;
  if (d.length > 2) saida = '(' + d.slice(0, 2) + ') ' + d.slice(2);
  // até 10 dígitos: fixo (00) 0000-0000 | 11 dígitos: celular (00) 00000-0000
  if (d.length > 6 && d.length <= 10) saida = '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
  if (d.length > 10) saida = '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  e.target.value = saida;
});

/* ---------- Botões dos cards: pré-selecionam o atendimento ---------- */
$$('[data-preset]').forEach(link => {
  link.addEventListener('click', () => {
    const valor = link.dataset.preset;
    const select = $('#tipo');
    if (Array.from(select.options).some(o => o.text === valor)) select.value = valor;
    reiniciarFormulario();
  });
});

/* ---------- Formulário ---------- */
const form     = $('#quote-form');
const fields   = $('#form-fields');
const success  = $('#form-success');
const abertoEm = Date.now();
/* anti-flood: no máximo 3 envios automáticos por visita, com 45 s entre eles.
   Depois disso o visitante ainda conclui pelo WhatsApp ou e-mail (botões da tela de sucesso). */
const LIMITE_ENVIOS = 3, INTERVALO_ENVIOS = 45000;
let enviosFeitos = 0, ultimoEnvio = 0;

function erro(id, ligado) {
  const campo = $('#' + id), msg = $('#err-' + id);
  if (msg) msg.classList.toggle('is-on', ligado);
  if (campo) campo.setAttribute('aria-invalid', String(ligado));
}

function validar() {
  let ok = true, primeiro = null;

  const tipo = $('#tipo').value;
  erro('tipo', !tipo);
  if (!tipo) { ok = false; primeiro = primeiro || $('#tipo'); }

  const nome = $('#nome').value.trim();
  erro('nome', nome.length < 2);
  if (nome.length < 2) { ok = false; primeiro = primeiro || $('#nome'); }

  const digitos = campoWhats.value.replace(/\D/g, '');
  const foneRuim = digitos.length < 10 || digitos.length > 11;
  erro('whatsapp', foneRuim);
  if (foneRuim) { ok = false; primeiro = primeiro || campoWhats; }

  const email = $('#email').value.trim();
  const emailRuim = email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  erro('email', emailRuim);
  if (emailRuim) { ok = false; primeiro = primeiro || $('#email'); }

  if (primeiro) primeiro.focus();
  return ok;
}

function coletarDados() {
  return {
    tipo:     limpar($('#tipo').value),
    nome:     limpar($('#nome').value),
    whatsapp: limpar(campoWhats.value),
    email:    limpar($('#email').value),
    cidade:   limpar($('#cidade').value),
    pessoa:   limpar(($('input[name="pessoa"]:checked') || {}).value),
    mensagem: limpar($('#mensagem').value)
  };
}

/** Monta a mensagem do WhatsApp já adaptada ao tipo de atendimento. */
function montarMensagem(d) {
  let abertura = 'Olá! Vim pelo site da AS Seguros & Consórcios e gostaria de solicitar uma cotação de ' + d.tipo + '.';
  if (d.tipo === 'Consórcio')     abertura = SITE.mensagens.consorcio;
  if (d.tipo === 'Financiamento') abertura = SITE.mensagens.financiamento;
  if (d.tipo === 'Outro')         abertura = SITE.mensagens.cotacao;

  const linhas = [
    abertura, '',
    'Nome: ' + d.nome,
    'Atendimento: ' + d.tipo,
    'Cidade/UF: ' + (d.cidade || 'não informado'),
    'WhatsApp: ' + d.whatsapp,
    'Pessoa: ' + d.pessoa
  ];
  if (d.email)    linhas.push('E-mail: ' + d.email);
  if (d.mensagem) linhas.push('Mensagem: ' + d.mensagem);
  return linhas.join('\n');
}

/** Organiza os dados no formato que o serviço de e-mail espera. */
function montarPayload(d, assunto) {
  const copias = SITE.emails.slice(1).join(',');
  const p = {
    _subject: assunto,
    _template: 'table',
    _captcha: 'false',
    'Tipo de atendimento': d.tipo,
    'Nome': d.nome,
    'WhatsApp': d.whatsapp,
    'E-mail': d.email || 'não informado',
    'Cidade/Estado': d.cidade || 'não informado',
    'Pessoa': d.pessoa,
    'Mensagem': d.mensagem || '—',
    'Origem': 'Formulário de cotação do site'
  };
  if (copias)  p._cc = copias;          // segunda caixa de entrada recebe cópia
  if (d.email) p._replyto = d.email;    // responder ao cliente com um clique
  return p;
}

/**
 * Entrega a solicitação no e-mail da empresa.
 * Desiste após 8 s, tenta de novo uma vez e devolve true/false —
 * quem chama decide o que mostrar ao visitante.
 */
async function enviarParaEmail(dados, assunto, tentativa = 1) {
  if (!SITE.endpoint) return false;
  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), 8000);
  try {
    const r = await fetch(SITE.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(montarPayload(dados, assunto)),
      signal: controle.signal
    });
    clearTimeout(limite);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const resposta = await r.json().catch(() => ({}));
    if (resposta.success === false || resposta.success === 'false') {
      throw new Error(resposta.message || 'envio recusado pelo serviço');
    }
    return true;
  } catch (erro) {
    clearTimeout(limite);
    if (tentativa < 2) {
      await new Promise(f => setTimeout(f, 900));
      return enviarParaEmail(dados, assunto, tentativa + 1);
    }
    console.warn('Não foi possível entregar a solicitação por e-mail:', erro.message);
    return false;
  }
}

function reiniciarFormulario() {
  fields.style.display = '';
  success.classList.remove('is-on');
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  if ($('#site-url').value !== '' || Date.now() - abertoEm < 2500) return;  // anti-spam
  if (!validar()) return;

  const botao = $('#btn-enviar');
  const rotulo = botao.textContent;
  botao.disabled = true;
  botao.classList.add('is-loading');
  botao.textContent = 'Enviando…';

  const dados   = coletarDados();
  const texto   = montarMensagem(dados);
  const assunto = 'Solicitação de cotação — ' + dados.tipo + ' — ' + dados.nome;

  const liberado = enviosFeitos < LIMITE_ENVIOS && Date.now() - ultimoEnvio > INTERVALO_ENVIOS;
  const entregue = liberado ? await enviarParaEmail(dados, assunto) : false;
  if (entregue) { enviosFeitos++; ultimoEnvio = Date.now(); }

  // os dois botões ficam prontos de qualquer forma
  $('#send-wa').setAttribute('href', linkWhats(texto));
  $('#send-mail').setAttribute('href', linkEmail(assunto, texto));

  success.classList.toggle('is-pendente', !entregue);
  $('#success-titulo').textContent = entregue
    ? 'Solicitação recebida com sucesso'
    : 'Falta só um passo para concluir';
  $('#success-texto').textContent = entregue
    ? 'Sua solicitação chegou à nossa equipe e entraremos em contato em breve. Se quiser adiantar, fale com a gente agora.'
    : 'Não conseguimos enviar automaticamente neste momento. Toque em um dos botões abaixo para nos mandar os mesmos dados — leva poucos segundos.';

  botao.disabled = false;
  botao.classList.remove('is-loading');
  botao.textContent = rotulo;
  fields.style.display = 'none';
  success.classList.add('is-on');
  success.focus();
});

$('#new-quote').addEventListener('click', () => {
  form.reset();
  $$('.err').forEach(el => el.classList.remove('is-on'));
  $$('[aria-invalid]').forEach(el => el.setAttribute('aria-invalid', 'false'));
  reiniciarFormulario();
  $('#tipo').focus();
});

/* ---------- Imagens: fundo elegante se alguma não carregar ---------- */
$$('img').forEach(img => {
  img.addEventListener('error', () => {
    img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 10'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23122E52'/%3E%3Cstop offset='1' stop-color='%230A1E3A'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='16' height='10' fill='url(%23g)'/%3E%3C/svg%3E";
  }, { once: true });
});
/* ---------- Rolagem suave para âncoras (compensa o header fixo) ----------
   Feita aqui, e não com "scroll-behavior" no CSS, para conviver bem com as
   seções fixadas pela rolagem. Respeita "reduzir movimento". */
document.addEventListener('click', e => {
  const a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const id = a.getAttribute('href');
  if (!id || id.length < 2) return;
  const alvo = document.getElementById(id.slice(1));
  if (!alvo) return;
  e.preventDefault();
  const topo = alvo.getBoundingClientRect().top + window.scrollY - (header.offsetHeight + 8);
  window.scrollTo({ top: Math.max(0, topo), behavior: semMovimento ? 'auto' : 'smooth' });
  if (history.pushState) history.pushState(null, '', id);
  if (!alvo.hasAttribute('tabindex')) alvo.setAttribute('tabindex', '-1');
  alvo.focus({ preventScroll: true });
});

/* ---------- Palco do hero: "O que você precisa hoje?" ----------
   Cada escolha atualiza o texto, o botão do WhatsApp (com a mensagem certa)
   e avisa o modelo 3D. Funciona igual sem 3D: a ilustração destaca o ícone. */
const NECESSIDADES = {
  carro:     ['Proteger meu carro', 'Proteção para seu veículo e tranquilidade para dirigir.'],
  casa:      ['Proteger minha casa', 'Proteção para sua casa e seu patrimônio.'],
  familia:   ['Proteger minha família', 'Proteção financeira para quem você ama.'],
  empresa:   ['Proteger minha empresa', 'Proteção para o patrimônio e a operação da sua empresa.'],
  consorcio: ['Comprar um bem', 'Estratégia personalizada para alavancagem financeira e patrimonial.'],
  pagamento: ['Encontrar uma forma de pagamento', 'Encontre uma opção para realizar seus planos.']
};
const chipsNecessidade = $$('[data-need]');
const palcoCta = $('#palco-cta');
const palcoEscolha = $('#palco-escolha');
const palcoDesc = $('#palco-desc');
const palcoTextoInicial = palcoEscolha ? [palcoEscolha.textContent, palcoDesc.textContent] : null;
const palcoPoster = $('.palco__poster');
function escolherNecessidade(nome) {
  const info = NECESSIDADES[nome] || null;
  chipsNecessidade.forEach(c => c.setAttribute('aria-pressed', String(!!info && c.dataset.need === nome)));
  if (palcoEscolha) {
    palcoEscolha.textContent = info ? info[0] : palcoTextoInicial[0];
    palcoDesc.textContent = info ? info[1] : palcoTextoInicial[1];
  }
  if (palcoCta) {
    const chave = info ? nome : 'especialista';
    palcoCta.dataset.wa = chave;
    palcoCta.setAttribute('href', linkWhats(SITE.mensagens[chave] || SITE.mensagens.especialista));
  }
  if (palcoPoster) { if (info) palcoPoster.setAttribute('data-sel', nome); else palcoPoster.removeAttribute('data-sel'); }
  document.dispatchEvent(new CustomEvent('as:necessidade', { detail: info ? nome : null }));
}
chipsNecessidade.forEach(c => c.addEventListener('click', () => {
  escolherNecessidade(c.getAttribute('aria-pressed') === 'true' ? null : c.dataset.need);
}));

/* ---------- Luz que acompanha o mouse nos blocos de soluções ---------- */
const bento = $('.bento');
if (bento && temMouse && !semMovimento) {
  let rafLuz = 0, ultimoPonteiro = null;
  bento.addEventListener('pointermove', e => {
    ultimoPonteiro = e;
    if (rafLuz) return;
    rafLuz = requestAnimationFrame(() => {
      rafLuz = 0;
      const ev = ultimoPonteiro;
      const tile = ev.target && ev.target.closest ? ev.target.closest('.tile') : null;
      if (!tile) return;
      const r = tile.getBoundingClientRect();
      tile.style.setProperty('--x', Math.round(ev.clientX - r.left) + 'px');
      tile.style.setProperty('--y', Math.round(ev.clientY - r.top) + 'px');
    });
  }, { passive: true });
}

/* ---------- Animações contínuas (faixa e órbitas) pausam fora da tela ---------- */
if ('IntersectionObserver' in window) {
  const pausaveis = $$('.faixa, .final');
  const vigiaAnim = new IntersectionObserver(entradas => {
    entradas.forEach(en => en.target.classList.toggle('is-pausado', !en.isIntersecting));
  }, { rootMargin: '120px 0px' });
  pausaveis.forEach(el => vigiaAnim.observe(el));
}

/* ---------- Trilho de seguros: botões, barra e arraste nativo ---------- */
const trilhoSeguros = $('#trilho-seguros');
const barraSeguros = $('.seg__barra');
if (trilhoSeguros) {
  const atualizarBarraSeguros = () => {
    if (!barraSeguros || document.querySelector('.seg.is-pin')) return;
    const max = trilhoSeguros.scrollWidth - trilhoSeguros.clientWidth;
    const p = max > 0 ? trilhoSeguros.scrollLeft / max : 1;
    barraSeguros.style.setProperty('--prog', Math.max(.12, p).toFixed(3));
  };
  trilhoSeguros.addEventListener('scroll', atualizarBarraSeguros, { passive: true });
  window.addEventListener('resize', atualizarBarraSeguros, { passive: true });
  atualizarBarraSeguros();
  $$('[data-trilho]').forEach(botao => botao.addEventListener('click', () => {
    const cartao = trilhoSeguros.querySelector('.cartao');
    const passo = cartao ? cartao.getBoundingClientRect().width + 18 : 300;
    trilhoSeguros.scrollBy({ left: passo * Number(botao.dataset.trilho), behavior: semMovimento ? 'auto' : 'smooth' });
  }));
}

/* ---------- Contadores: só para números reais ("+7" e "16") ---------- */
const contadores = $$('[data-contar]');
if (contadores.length && !semMovimento && 'IntersectionObserver' in window) {
  const observaContador = new IntersectionObserver(entradas => entradas.forEach(entrada => {
    if (!entrada.isIntersecting) return;
    observaContador.unobserve(entrada.target);
    const el = entrada.target, texto = el.textContent, m = texto.match(/^(\D*)(\d+)(\D*)$/);
    if (!m) return;
    const fim = parseInt(m[2], 10), inicio = performance.now(), duracao = 1400;
    const passo = agora => {
      const k = Math.min((agora - inicio) / duracao, 1), suave = 1 - Math.pow(1 - k, 3);
      el.textContent = k < 1 ? m[1] + Math.round(fim * suave) + m[3] : texto;   // termina no texto original
      if (k < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }), { threshold: .6 });
  contadores.forEach(el => observaContador.observe(el));
}

/* ---------- Auditoria de overflow horizontal ----------
   Ferramenta de conferência, desligada em uma visita normal.
   Abra o site com ?audit=overflow no fim da URL e veja o resultado no
   console do navegador: ele avisa se há rolagem lateral e lista os
   elementos que ultrapassam a largura da tela. */
if (location.search.includes('audit=overflow')) {
  const auditar = () => {
    const doc = document.documentElement;
    const largura = doc.clientWidth;
    const sobra = doc.scrollWidth - largura;
    console.log(`[auditoria] ${largura}px de tela — scrollWidth ${doc.scrollWidth}px — ` +
                (sobra > 0 ? `OVERFLOW de ${sobra}px` : 'sem overflow horizontal'));
    if (sobra <= 0) return;
    const nome = el => el.tagName.toLowerCase() + (el.getAttribute('class') ? '.' + el.getAttribute('class').trim().split(/\s+/).join('.') : '');
    const culpados = $$('body *')
      .map(el => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width > 0 && r.right > largura + 1)
      .slice(0, 25)
      .map(({ el, r }) => ({ elemento: nome(el), direita: Math.round(r.right), largura: Math.round(r.width) }));
    console.table(culpados);
  };
  window.addEventListener('load', auditar);
  window.addEventListener('resize', auditar, { passive: true });
}
