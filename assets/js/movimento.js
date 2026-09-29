/* ============================================================
   MOVIMENTO (GSAP + ScrollTrigger)
   Camada extra: trilho de seguros fixado, linha das etapas desenhada
   pela rolagem, parallax e botões magnéticos. Se o GSAP não carregar
   ou o visitante pedir menos movimento, nada disso roda e o site
   continua completo (trilho com arraste nativo, linha estática).
   ============================================================ */
(function () {
  'use strict';
  const q = s => document.querySelector(s);
  const qa = s => Array.from(document.querySelectorAll(s));

  function iniciar() {
    if (!window.gsap || !window.ScrollTrigger) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);
    gsap.config({ nullTargetWarn: false });
    ScrollTrigger.config({ ignoreMobileResize: true });
    document.documentElement.classList.add('gsap-on');
    const mm = gsap.matchMedia();

    /* 1. SEGUROS — a rolagem vertical percorre os cartões (telas grandes) */
    mm.add('(min-width: 1000px) and (min-height: 700px)', () => {
      const sec = q('#seguros'), trilho = q('#trilho-seguros'), barra = q('.seg__barra');
      if (!sec || !trilho) return;
      sec.classList.add('is-pin');
      trilho.scrollLeft = 0;
      // percurso medido pelo último cartão (scrollWidth ignora o recuo final quando o trilho não rola)
      const ultimo = trilho.lastElementChild;
      const distancia = () => {
        const recuo = parseFloat(getComputedStyle(trilho).paddingRight) || 0;
        return Math.max(0, Math.round(ultimo.offsetLeft + ultimo.offsetWidth + recuo - trilho.clientWidth));
      };
      const percurso = gsap.to(trilho, {
        x: () => -distancia(),
        ease: 'none',
        scrollTrigger: {
          trigger: sec, start: 'top top', end: () => '+=' + distancia(),
          pin: true, scrub: .8, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: s => { if (barra) barra.style.setProperty('--prog', Math.max(.12, s.progress).toFixed(3)); }
        }
      });
      // cada foto desliza um pouco dentro do cartão enquanto o trilho anda
      qa('#trilho-seguros .cartao__img img').forEach(img => {
        gsap.fromTo(img, { xPercent: -6 }, {
          xPercent: 6, ease: 'none',
          scrollTrigger: { trigger: img.closest('.cartao'), containerAnimation: percurso, start: 'left right', end: 'right left', scrub: true }
        });
      });
      // teclado: ao focar um cartão fora da tela, a rolagem leva até ele
      const aoFocar = e => {
        const cartao = e.target.closest ? e.target.closest('.cartao') : null;
        const st = percurso.scrollTrigger;
        if (!cartao || !st) return;
        const d = distancia();
        const x = Math.min(d, Math.max(0, cartao.offsetLeft - (trilho.clientWidth - cartao.offsetWidth) / 2));
        window.scrollTo(0, st.start + (d ? x / d : 0) * (st.end - st.start));
      };
      trilho.addEventListener('focusin', aoFocar);
      return () => {
        sec.classList.remove('is-pin');
        trilho.removeEventListener('focusin', aoFocar);
        if (barra) barra.style.removeProperty('--prog');
      };
    });

    /* 2. CONSÓRCIO — a linha das etapas se desenha com a rolagem */
    mm.add('(min-width: 1000px)', () => {
      const cont = q('[data-etapas]'), linha = q('.etapas__linha'), etapas = qa('.etapa');
      if (!cont || !linha) return;
      gsap.fromTo(linha, { '--p': 0 }, {
        '--p': 1, ease: 'none',
        scrollTrigger: { trigger: cont, start: 'top 82%', end: 'top 38%', scrub: .6 },
        onUpdate() {
          const p = this.progress();
          etapas.forEach((el, i) => el.classList.toggle('is-ativa', p > .02 && p >= i / Math.max(etapas.length - 1, 1) - .02));
        }
      });
      return () => etapas.forEach(el => el.classList.remove('is-ativa'));
    });

    /* 3. PARALLAX — fotos e texto do topo em velocidades diferentes */
    mm.add('(min-width: 1000px)', () => {
      qa('[data-parallax]').forEach(el => gsap.fromTo(el, { y: 36 }, {
        y: -36, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: .8 }
      }));
      gsap.to('.hero__texto', { y: -56, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .6 } });
    });

    /* 4. BOTÕES MAGNÉTICOS — só com mouse */
    mm.add('(hover: hover) and (pointer: fine)', () => {
      const soltar = [];
      qa('.btn--magnet').forEach(botao => {
        const xTo = gsap.quickTo(botao, 'x', { duration: .5, ease: 'power3.out' });
        const yTo = gsap.quickTo(botao, 'y', { duration: .5, ease: 'power3.out' });
        const mover = e => {
          const r = botao.getBoundingClientRect();
          xTo((e.clientX - (r.left + r.width / 2)) * .22);
          yTo((e.clientY - (r.top + r.height / 2)) * .32);
        };
        const sair = () => { xTo(0); yTo(0); };
        botao.addEventListener('pointermove', mover);
        botao.addEventListener('pointerleave', sair);
        soltar.push(() => {
          botao.removeEventListener('pointermove', mover);
          botao.removeEventListener('pointerleave', sair);
          gsap.killTweensOf(botao);
          gsap.set(botao, { clearProps: 'transform' });
        });
      });
      return () => soltar.forEach(fn => fn());
    });

    /* conteúdo que muda de altura recalcula os gatilhos */
    let espera = 0;
    const recalcular = ms => { clearTimeout(espera); espera = setTimeout(() => ScrollTrigger.refresh(), ms); };
    qa('details').forEach(d => d.addEventListener('toggle', () => recalcular(360)));
    const form = q('#quote-form');
    if (form) form.addEventListener('submit', () => recalcular(1200));
    const nova = q('#new-quote');
    if (nova) nova.addEventListener('click', () => recalcular(200));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => recalcular(80));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
