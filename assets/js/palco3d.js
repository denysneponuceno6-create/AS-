/* ============================================================
   PALCO 3D — modelo interativo do hero (Three.js)
   Escudo de proteção + seis objetos que orbitam: carro, casa,
   família, empresa, chave (consórcio) e moedas (pagamento).
   Arraste para girar; escolha uma necessidade e o objeto vem
   para a frente do escudo. Toda a geometria é gerada aqui (sem
   arquivos externos): leve, nítida e rápida.
   Se o WebGL ou a CDN falharem, a ilustração SVG continua no lugar.
   ============================================================ */
(function () {
  'use strict';

  /* ==================== CONFIG ==================== */
  const CFG = {
    three: [
      'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js',
      'https://unpkg.com/three@0.160.0/build/three.module.min.js'
    ],
    fov: 30, camY: .3, camZ: 9.8,
    inclinacao: .2,                       // o palco é visto levemente de cima
    orbita: { raio: 2.6, y: -.2, giro: .22 },
    escalaOrbita: .44, escalaFoco: .9,
    focoPos: [0, -.32, 2.2],             // onde o objeto escolhido para (espaço do mundo)
    pixelRatio: { grande: 2, pequeno: 1.75 },
    faiscas: 120,
    autoGiro: .16                          // rad/s quando ninguém está mexendo
  };
  const ORDEM = ['carro', 'casa', 'familia', 'empresa', 'consorcio', 'pagamento'];
  const q = (s, c) => (c || document).querySelector(s);

  /* ==================== MATERIAIS (paleta da marca) ==================== */
  const TINTAS = {
    escudo:  { cor: 0x2586ff, cor2: 0x0a3a96, metal: .8,  brilho: 1.15, rim: 0x86c4ff, rimForca: .75 },
    ouro:    { cor: 0xffdc8f, cor2: 0xc99434, metal: .72, brilho: 1.3,  rim: 0xffe7b3, rimForca: .55 },
    perola:  { cor: 0xf5f8fd, cor2: 0xc3d1e4, metal: .12, brilho: .5,   rim: 0xa9d0ff, rimForca: .35 },
    azul:    { cor: 0x2d8dff, cor2: 0x0b56c6, metal: .38, brilho: .85,  rim: 0xa5d4ff, rimForca: .45 },
    vidro:   { cor: 0x2b527f, cor2: 0x08172c, metal: .88, brilho: 1.25, rim: 0x72b6ff, rimForca: .6 },
    grafite: { cor: 0x2c3746, cor2: 0x0f151d, metal: .25, brilho: .35,  rim: 0x5b6b80, rimForca: .2 },
    prata:   { cor: 0xe8edf5, cor2: 0x8793a6, metal: .92, brilho: 1.2,  rim: 0xffffff, rimForca: .3 },
    luz:     { cor: 0x62baff, cor2: 0x1869dc, metal: .5,  brilho: 1,    rim: 0xc4e6ff, rimForca: .4, acende: .55 },
    selo:    { cor: 0xffffff, cor2: 0xd8e4f4, metal: .2,  brilho: .9,   rim: 0xffffff, rimForca: .3, acende: .25 }
  };

  const VS_PREMIUM = [
    'varying vec3 vN;',
    'varying vec3 vP;',
    'varying float vY;',
    'void main() {',
    '  vec4 mundo = modelMatrix * vec4(position, 1.0);',
    '  vP = mundo.xyz;',
    '  vN = normalize((modelMatrix * vec4(normal, 0.0)).xyz);',
    '  vY = position.y;',
    '  gl_Position = projectionMatrix * viewMatrix * mundo;',
    '}'
  ].join('\n');
  const FS_PREMIUM = [
    'uniform vec3 uCor;',
    'uniform vec3 uCor2;',
    'uniform vec3 uRim;',
    'uniform vec3 uLuz;',
    'uniform float uMetal;',
    'uniform float uBrilho;',
    'uniform float uRimForca;',
    'uniform float uAcende;',
    'uniform float uOpac;',
    'uniform float uAltura;',
    'varying vec3 vN;',
    'varying vec3 vP;',
    'varying float vY;',
    'void main() {',
    '  vec3 n = normalize(vN);',
    '  vec3 v = normalize(cameraPosition - vP);',
    '  vec3 L = normalize(uLuz);',
    '  float envolve = max(dot(n, L) * 0.6 + 0.4, 0.0);',
    '  float dif = envolve * envolve;',
    '  vec3 h = normalize(L + v);',
    '  float esp = pow(max(dot(n, h), 0.0), mix(28.0, 96.0, uMetal));',
    '  float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);',
    '  vec3 r = reflect(-v, n);',
    '  float ceu = smoothstep(-0.25, 0.85, r.y);',
    '  vec3 ambiente = mix(vec3(0.06, 0.13, 0.26), vec3(0.66, 0.8, 1.0), ceu);',
    '  float estudio = smoothstep(0.58, 0.92, r.x * 0.55 + r.y * 0.75);',
    '  ambiente += vec3(1.0) * estudio;',
    '  float grad = smoothstep(-uAltura, uAltura, vY);',
    '  vec3 base = mix(uCor2, uCor, grad);',
    '  vec3 difusa = base * (0.26 + 0.86 * dif);',
    '  vec3 metal = base * ambiente * 1.15;',
    '  vec3 cor = mix(difusa, metal, uMetal);',
    '  cor += esp * uBrilho * mix(vec3(1.0), base, uMetal * 0.45);',
    '  cor += uRim * fres * uRimForca;',
    '  cor += base * uAcende * 0.4;',
    '  gl_FragColor = vec4(cor, uOpac);',
    '}'
  ].join('\n');
  const VS_HALO = [
    'varying vec2 vUv;',
    'void main() {',
    '  vUv = position.xz;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}'
  ].join('\n');
  const FS_HALO = [
    'uniform vec3 uCor;',
    'uniform vec3 uCor2;',
    'uniform float uForca;',
    'uniform float uRaio;',
    'uniform float uTempo;',
    'varying vec2 vUv;',
    'void main() {',
    '  float d = length(vUv) / uRaio;',
    '  float brilho = pow(max(1.0 - d, 0.0), 2.4);',
    '  float anel = (1.0 - smoothstep(0.0, 0.028, abs(d - 0.74))) * (0.55 + 0.25 * sin(uTempo * 1.4));',
    '  float anel2 = (1.0 - smoothstep(0.0, 0.014, abs(d - 0.52))) * 0.35;',
    '  vec3 cor = uCor * brilho + uCor2 * (anel + anel2);',
    '  float a = clamp((brilho * 0.9 + anel + anel2) * uForca, 0.0, 1.0);',
    '  gl_FragColor = vec4(cor, a);',
    '}'
  ].join('\n');
  const VS_FAISCA = [
    'attribute float aTam;',
    'attribute float aFase;',
    'uniform float uTempo;',
    'uniform float uPR;',
    'uniform float uForca;',
    'varying float vA;',
    'varying float vOuro;',
    'void main() {',
    '  vec3 p = position;',
    '  p.y += sin(uTempo * 0.5 + aFase * 6.2831) * 0.12;',
    '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
    '  gl_Position = projectionMatrix * mv;',
    '  gl_PointSize = aTam * 22.0 * uPR / max(-mv.z, 1.0);',
    '  vA = (0.35 + 0.65 * (0.5 + 0.5 * sin(uTempo * (1.1 + aFase) + aFase * 30.0))) * uForca;',
    '  vOuro = step(0.62, aFase);',
    '}'
  ].join('\n');
  const FS_FAISCA = [
    'varying float vA;',
    'varying float vOuro;',
    'void main() {',
    '  float d = length(gl_PointCoord - vec2(0.5));',
    '  float m = pow(1.0 - smoothstep(0.0, 0.5, d), 2.0);',
    '  vec3 cor = mix(vec3(0.45, 0.75, 1.0), vec3(1.0, 0.83, 0.5), vOuro);',
    '  float a = m * vA;',
    '  if (a < 0.004) discard;',
    '  gl_FragColor = vec4(cor, a);',
    '}'
  ].join('\n');

  /* ==================== GEOMETRIA PROCEDURAL ==================== */
  // Cada peça é { p: posições, n: normais, i: índices } em coordenadas locais.
  function chaikin(pts, vezes) {
    let r = pts;
    for (let k = 0; k < vezes; k++) {
      const s = [];
      for (let i = 0; i < r.length; i++) {
        const a = r[i], b = r[(i + 1) % r.length];
        s.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]);
      }
      r = s;
    }
    return r;
  }
  function antiHorario(pts) {
    let area = 0;
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; area += a[0] * b[1] - b[0] * a[1]; }
    return area < 0 ? pts.slice().reverse() : pts;
  }
  function centroide(pts) {
    let x = 0, y = 0;
    pts.forEach(p => { x += p[0]; y += p[1]; });
    return [x / pts.length, y / pts.length];
  }
  function normais(p, idx) {
    const n = new Array(p.length).fill(0);
    for (let k = 0; k < idx.length; k += 3) {
      const a = idx[k] * 3, b = idx[k + 1] * 3, c = idx[k + 2] * 3;
      const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
      const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      [a, b, c].forEach(o => { n[o] += nx; n[o + 1] += ny; n[o + 2] += nz; });
    }
    for (let o = 0; o < n.length; o += 3) {
      const l = Math.hypot(n[o], n[o + 1], n[o + 2]) || 1;
      n[o] /= l; n[o + 1] /= l; n[o + 2] /= l;
    }
    return n;
  }
  /** "Almofada": contorno 2D com espessura, faces levemente abauladas e borda arredondada. */
  function almofada(contorno, op) {
    op = op || {};
    const cont = antiHorario(contorno);
    const N = cont.length;
    const h = op.h || .2, dome = op.dome || 0, sb = op.sb == null ? .8 : op.sb;
    const nP = op.aneisPlano || 4, nB = op.aneisBorda || 7;
    const c = op.centro || centroide(cont);
    const perfil = [];
    for (let k = 1; k <= nP; k++) { const s = sb * k / nP; perfil.push([s, h + dome * (1 - (s / sb) * (s / sb))]); }
    for (let k = 1; k <= nB; k++) { const t = k / nB * Math.PI / 2; perfil.push([sb + (1 - sb) * Math.sin(t), h * Math.cos(t)]); }
    const frente = perfil.slice();
    for (let k = frente.length - 2; k >= 0; k--) perfil.push([frente[k][0], -frente[k][1]]);
    const p = [c[0], c[1], h + dome];
    perfil.forEach(par => {
      for (let i = 0; i < N; i++) { const o = cont[i]; p.push(c[0] + (o[0] - c[0]) * par[0], c[1] + (o[1] - c[1]) * par[0], par[1]); }
    });
    const cv = p.length / 3;
    p.push(c[0], c[1], -(h + dome));
    const anel = j => 1 + j * N;
    const idx = [];
    for (let i = 0; i < N; i++) idx.push(0, anel(0) + i, anel(0) + (i + 1) % N);
    for (let j = 0; j < perfil.length - 1; j++) {
      for (let i = 0; i < N; i++) {
        const a = anel(j) + i, b = anel(j + 1) + i, cc = anel(j + 1) + (i + 1) % N, d = anel(j) + (i + 1) % N;
        idx.push(a, b, cc, a, cc, d);
      }
    }
    const ult = anel(perfil.length - 1);
    for (let i = 0; i < N; i++) idx.push(ult + i, cv, ult + (i + 1) % N);
    return { p, n: normais(p, idx), i: idx };
  }
  function caixa(w, h, d) {
    const x = w / 2, y = h / 2, z = d / 2;
    const faces = [
      [[0, 0, 1], [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]]],
      [[0, 0, -1], [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z]]],
      [[1, 0, 0], [[x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z]]],
      [[-1, 0, 0], [[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z]]],
      [[0, 1, 0], [[-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z]]],
      [[0, -1, 0], [[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]]]
    ];
    const p = [], n = [], i = [];
    faces.forEach(f => {
      const b = p.length / 3;
      f[1].forEach(v => { p.push(v[0], v[1], v[2]); n.push(f[0][0], f[0][1], f[0][2]); });
      i.push(b, b + 1, b + 2, b, b + 2, b + 3);
    });
    return { p, n, i };
  }
  /** Cilindro no eixo Y (rTopo diferente vira tronco de cone). */
  function cilindro(r, h, seg, rTopo) {
    const rt = rTopo == null ? r : rTopo, y = h / 2;
    const p = [], n = [], i = [];
    const inc = (r - rt) / h;
    for (let k = 0; k <= seg; k++) {
      const a = k / seg * Math.PI * 2, s = Math.sin(a), c = Math.cos(a);
      const l = Math.hypot(1, inc);
      p.push(r * s, -y, r * c, rt * s, y, rt * c);
      n.push(s / l, inc / l, c / l, s / l, inc / l, c / l);
    }
    for (let k = 0; k < seg; k++) { const a = k * 2; i.push(a, a + 2, a + 3, a, a + 3, a + 1); }
    [[y, 1, rt], [-y, -1, r]].forEach(t => {
      const b = p.length / 3;
      p.push(0, t[0], 0); n.push(0, t[1], 0);
      for (let k = 0; k <= seg; k++) { const a = k / seg * Math.PI * 2; p.push(t[2] * Math.sin(a), t[0], t[2] * Math.cos(a)); n.push(0, t[1], 0); }
      for (let k = 1; k <= seg; k++) { if (t[1] > 0) i.push(b, b + k, b + k + 1); else i.push(b, b + k + 1, b + k); }
    });
    return { p, n, i };
  }
  /** Toro no plano XY (eixo Z). */
  function toro(R, r, su, sv) {
    const p = [], n = [], i = [];
    for (let a = 0; a <= su; a++) {
      const u = a / su * Math.PI * 2;
      for (let b = 0; b <= sv; b++) {
        const v = b / sv * Math.PI * 2;
        const cu = Math.cos(u), su2 = Math.sin(u), cv = Math.cos(v), sv2 = Math.sin(v);
        p.push((R + r * cv) * cu, (R + r * cv) * su2, r * sv2);
        n.push(cv * cu, cv * su2, sv2);
      }
    }
    const L = sv + 1;
    for (let a = 0; a < su; a++) for (let b = 0; b < sv; b++) {
      const k = a * L + b;
      i.push(k, k + L, k + L + 1, k, k + L + 1, k + 1);
    }
    return { p, n, i };
  }
  /** Disco horizontal voltado para cima (+Y). */
  function disco(r, seg) {
    const p = [0, 0, 0], n = [0, 1, 0], i = [];
    for (let k = 0; k <= seg; k++) { const a = k / seg * Math.PI * 2; p.push(r * Math.sin(a), 0, r * Math.cos(a)); n.push(0, 1, 0); }
    for (let k = 1; k <= seg; k++) i.push(0, k, k + 1);
    return { p, n, i };
  }
  function retArredondado(w, h, r, seg) {
    const pts = [], x = w / 2 - r, y = h / 2 - r;
    [[x, y, 0], [-x, y, 1], [-x, -y, 2], [x, -y, 3]].forEach(c => {
      for (let k = 0; k <= seg; k++) {
        const a = (c[2] + k / seg) * Math.PI / 2;
        pts.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]);
      }
    });
    return pts;
  }
  function capsula(comp, esp) { return retArredondado(comp, esp, esp / 2 - .001, 8); }
  /** Aplica escala, rotação (ordem XYZ, como no Three) e posição a uma peça. */
  function mover(g, t) {
    const s = t.s == null ? 1 : t.s;
    const sx = t.sx || s, sy = t.sy || s, sz = t.sz || s;
    const cx = Math.cos(t.rx || 0), sx_ = Math.sin(t.rx || 0);
    const cy = Math.cos(t.ry || 0), sy_ = Math.sin(t.ry || 0);
    const cz = Math.cos(t.rz || 0), sz_ = Math.sin(t.rz || 0);
    const rot = (x, y, z) => {        // R = Rx · Ry · Rz
      let a = x * cz - y * sz_, b = x * sz_ + y * cz; x = a; y = b;
      a = x * cy + z * sy_; b = -x * sy_ + z * cy; x = a; z = b;
      a = y * cx - z * sx_; b = y * sx_ + z * cx; y = a; z = b;
      return [x, y, z];
    };
    const p = [], n = [];
    for (let k = 0; k < g.p.length; k += 3) {
      const v = rot(g.p[k] * sx, g.p[k + 1] * sy, g.p[k + 2] * sz);
      p.push(v[0] + (t.x || 0), v[1] + (t.y || 0), v[2] + (t.z || 0));
      const m = rot(g.n[k] / sx, g.n[k + 1] / sy, g.n[k + 2] / sz);
      const l = Math.hypot(m[0], m[1], m[2]) || 1;
      n.push(m[0] / l, m[1] / l, m[2] / l);
    }
    return { p, n, i: g.i };
  }
  function juntar(pecas) {
    const p = [], n = [], i = [];
    pecas.forEach(g => {
      const base = p.length / 3;
      for (let k = 0; k < g.p.length; k++) { p.push(g.p[k]); n.push(g.n[k]); }
      for (let k = 0; k < g.i.length; k++) i.push(g.i[k] + base);
    });
    return { p, n, i };
  }

  /* ==================== MODELOS ==================== */
  // Cada modelo: lista de [tinta, peças]. Unidade ≈ raio 1.
  const MODELOS = {
    escudo() {
      const metade = [[0, 1.06], [.34, 1.02], [.66, .95], [.86, .88], [.92, .62], [.9, .22], [.8, -.2], [.6, -.6], [.32, -.93], [0, -1.14]];
      const lado = metade.slice(1, -1).map(v => [-v[0], v[1]]).reverse();
      const cont = chaikin(metade.concat(lado), 2);
      const ctr = [0, -.02];
      const escala = pts => pts.map(v => [ctr[0] + (v[0] - ctr[0]) * 1.085, ctr[1] + (v[1] - ctr[1]) * 1.085]);
      const barra = (a, b) => {
        const comp = Math.hypot(b[0] - a[0], b[1] - a[1]) + .2;
        return mover(almofada(capsula(comp, .2), { h: .06, dome: .02, sb: .45, aneisPlano: 2, aneisBorda: 5 }),
          { rz: Math.atan2(b[1] - a[1], b[0] - a[0]), x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, z: .3 });
      };
      return [
        ['escudo', [almofada(cont, { h: .24, dome: .07, sb: .8, aneisPlano: 5, aneisBorda: 8, centro: ctr })]],
        ['ouro', [mover(almofada(escala(cont), { h: .17, sb: .7, aneisPlano: 2, aneisBorda: 6, centro: ctr }), { z: -.03 })]],
        ['selo', [barra([-.42, .04], [-.1, -.3]), barra([-.1, -.3], [.46, .4])]]
      ];
    },
    carro() {
      const corpo = chaikin([[-1.1, -.24], [-1.13, .06], [-.98, .17], [-.7, .21], [-.47, .5], [.16, .53], [.47, .21], [.98, .13], [1.13, .01], [1.1, -.24], [.6, -.3], [-.6, -.3]], 2);
      const janela = chaikin([[-.6, .22], [-.43, .44], [.12, .46], [.36, .22]], 1);
      const rodas = [], cubos = [], farois = [];
      [[-.62, .4], [-.62, -.4], [.64, .4], [.64, -.4]].forEach(r => {
        rodas.push(mover(cilindro(.24, .18, 28), { rx: Math.PI / 2, x: r[0], y: -.3, z: r[1] }));
        cubos.push(mover(cilindro(.11, .2, 20), { rx: Math.PI / 2, x: r[0], y: -.3, z: r[1] * 1.03 }));
      });
      [.24, -.24].forEach(z => farois.push(mover(caixa(.05, .09, .16), { x: 1.1, y: .03, z })));
      return [
        ['azul', [mover(almofada(corpo, { h: .42, dome: .03, sb: .84, centro: [0, .02] }), { y: .06 })]],
        ['vidro', [mover(almofada(janela, { h: .445, sb: .7, aneisPlano: 2, aneisBorda: 4 }), { y: .06 })]],
        ['grafite', rodas],
        ['prata', cubos],
        ['ouro', farois]
      ];
    },
    casa() {
      const telhado = chaikin([[-.88, 0], [.88, 0], [0, .74]], 2);
      return [
        ['perola', [mover(almofada(retArredondado(1.32, .96, .12, 6), { h: .5, sb: .88, aneisPlano: 2, aneisBorda: 6 }), { y: -.2 })]],
        ['azul', [mover(almofada(telhado, { h: .56, sb: .9, aneisPlano: 3, aneisBorda: 6 }), { y: .24 }),
                  mover(caixa(.16, .36, .16), { x: .44, y: .62, z: -.18 })]],
        ['ouro', [mover(almofada(retArredondado(.3, .5, .06, 4), { h: .52, sb: .6, aneisPlano: 1, aneisBorda: 4 }), { x: .24, y: -.43 })]],
        ['vidro', [mover(almofada(retArredondado(.32, .3, .05, 4), { h: .52, sb: .6, aneisPlano: 1, aneisBorda: 4 }), { x: -.3, y: -.12 })]]
      ];
    },
    familia() {
      const pts = [];
      for (let k = 0; k < 72; k++) {
        const t = k / 72 * Math.PI * 2, s = Math.sin(t);
        pts.push([16 * s * s * s / 17, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17 + .1]);
      }
      return [['ouro', [almofada(pts, { h: .3, dome: .12, sb: .7, aneisPlano: 5, aneisBorda: 8, centro: [0, 0] })]]];
    },
    empresa() {
      const janelas = [], janelasAnexo = [];
      for (let c = 0; c < 3; c++) for (let l = 0; l < 6; l++) janelas.push(mover(caixa(.14, .14, .84), { x: -.24 + c * .24, y: -.46 + l * .23 }));
      for (let c = 0; c < 2; c++) for (let l = 0; l < 3; l++) janelasAnexo.push(mover(caixa(.12, .12, .76), { x: .53 + c * .19, y: -.62 + l * .22 }));
      return [
        ['perola', [almofada(retArredondado(.82, 1.72, .08, 5), { h: .4, sb: .9, aneisPlano: 2, aneisBorda: 5 }),
                    mover(almofada(retArredondado(.6, 1, .07, 5), { h: .36, sb: .9, aneisPlano: 2, aneisBorda: 5 }), { x: .62, y: -.36 })]],
        ['luz', janelas.concat(janelasAnexo)],
        ['ouro', [mover(caixa(.22, .3, .84), { y: -.71 })]]
      ];
    },
    consorcio() {
      return [['ouro', [
        mover(toro(.34, .1, 48, 16), { y: .56 }),
        mover(cilindro(.075, 1.05, 20), { y: -.18 }),
        mover(cilindro(.12, .09, 24), { y: .17 }),
        mover(caixa(.24, .12, .12), { x: .14, y: -.52 }),
        mover(caixa(.17, .12, .12), { x: .1, y: -.69 })
      ]], ['azul', [mover(cilindro(.12, .06, 24), { rx: Math.PI / 2, y: .56 })]]];
    },
    pagamento() {
      const moedas = [];
      for (let k = 0; k < 4; k++) moedas.push(mover(cilindro(.38, .09, 40), { x: .28 + (k % 2) * .03, y: -.62 + k * .097, z: .3 }));
      return [
        ['azul', [mover(almofada(retArredondado(1.2, .78, .09, 5), { h: .035, sb: .5, aneisPlano: 1, aneisBorda: 4 }), { rz: .14, rx: -.12, x: -.14, y: .2, z: -.2 })]],
        ['ouro', moedas.concat([mover(caixa(.2, .15, .09), { rz: .14, x: -.42, y: .28, z: -.2 })])]
      ];
    }
  };

  /* ==================== UTIL ==================== */
  function economizar() {
    const c = navigator.connection;
    if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''))) return true;
    if (navigator.deviceMemory && navigator.deviceMemory <= 2) return true;
    return false;
  }
  let promessaThree = null;
  function carregarThree() {
    if (promessaThree) return promessaThree;
    const tentar = k => k >= CFG.three.length ? Promise.resolve(null) : import(CFG.three[k]).catch(() => tentar(k + 1));
    promessaThree = tentar(0);
    return promessaThree;
  }
  const suave = (atual, alvo, dt, vel) => atual + (alvo - atual) * (1 - Math.exp(-dt * vel));
  const ease = t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);   // expo.out
  const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function aleatorio(semente) {
    let a = semente >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* a área só vira controle (foco + rótulo com instruções) quando o 3D está de fato na tela */
  function acessivel(alvo, ligar) {
    if (ligar) {
      alvo.setAttribute('tabindex', '0');
      alvo.setAttribute('role', 'img');
      alvo.setAttribute('aria-label', 'Modelo 3D interativo: escudo de proteção com carro, casa, coração, prédio, chave e moedas em órbita. Arraste ou use as setas do teclado para girar.');
    } else {
      ['tabindex', 'role', 'aria-label'].forEach(a => alvo.removeAttribute(a));
    }
  }

  /* ==================== CENA ==================== */
  function criarPalco(THREE, raiz, estadoInicial) {
    const alvo = q('.palco__cena', raiz);
    const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pequeno = window.matchMedia('(max-width: 699px)').matches;
    THREE.ColorManagement.enabled = false;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: (window.devicePixelRatio || 1) < 2, powerPreference: 'default' });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    const canvas = renderer.domElement;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.className = 'palco__canvas';
    alvo.appendChild(canvas);

    const cena = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(CFG.fov, 1, .1, 60);
    cam.position.set(0, CFG.camY, CFG.camZ);
    const palco = new THREE.Group();
    cena.add(palco);

    const uLuz = { value: new THREE.Vector3(-.55, .85, .75) };
    const uTempo = { value: 0 };
    const uPR = { value: 1 };
    const materiais = [];
    function material(nome, grupo) {
      const t = TINTAS[nome];
      const m = new THREE.ShaderMaterial({
        uniforms: {
          uCor: { value: new THREE.Color(t.cor) }, uCor2: { value: new THREE.Color(t.cor2) }, uRim: { value: new THREE.Color(t.rim) },
          uLuz, uMetal: { value: t.metal }, uBrilho: { value: t.brilho }, uRimForca: { value: t.rimForca },
          uAcende: { value: t.acende || 0 }, uOpac: { value: 1 }, uAltura: { value: 1 }
        },
        vertexShader: VS_PREMIUM, fragmentShader: FS_PREMIUM
      });
      m.userData = { acendeBase: t.acende || 0 };
      materiais.push(m);
      if (grupo) grupo.mats.push(m);
      return m;
    }
    function geometria(g) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(g.p, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(g.n, 3));
      const Idx = g.p.length / 3 > 65535 ? Uint32Array : Uint16Array;
      geo.setIndex(new THREE.BufferAttribute(new Idx(g.i), 1));
      return geo;
    }
    function montar(nome, grupo) {
      const obj = new THREE.Group();
      MODELOS[nome]().forEach(par => {
        const malha = new THREE.Mesh(geometria(juntar(par[1])), material(par[0], grupo));
        obj.add(malha);
      });
      return obj;
    }

    /* escudo no centro do palco */
    const infoEscudo = { mats: [] };
    const escudo = montar('escudo', infoEscudo);
    palco.add(escudo);

    /* anel da órbita + halo no chão + faíscas */
    const anelG = new THREE.Group();
    anelG.rotation.set(0, 0, CFG.orbita.giro);
    anelG.position.y = CFG.orbita.y;
    const matAnel = material('perola');
    matAnel.transparent = true; matAnel.depthWrite = false;
    matAnel.uniforms.uOpac.value = .34;
    const anel = new THREE.Mesh(geometria(mover(toro(CFG.orbita.raio, .01, 220, 6), { rx: Math.PI / 2 })), matAnel);
    anelG.add(anel);
    palco.add(anelG);

    const matHalo = new THREE.ShaderMaterial({
      uniforms: { uCor: { value: new THREE.Color(0x0a6cff) }, uCor2: { value: new THREE.Color(0x9fd2ff) }, uForca: { value: .8 }, uRaio: { value: 3.1 }, uTempo },
      vertexShader: VS_HALO, fragmentShader: FS_HALO, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    const halo = new THREE.Mesh(geometria(disco(3.1, 96)), matHalo);
    halo.position.y = -1.9;
    palco.add(halo);

    const rng = aleatorio(11);
    const nF = pequeno ? Math.round(CFG.faiscas * .6) : CFG.faiscas;
    const fp = [], ft = [], ff = [];
    for (let k = 0; k < nF; k++) {
      const r = 1.9 + rng() * 1.8, th = rng() * Math.PI * 2, ph = Math.acos(2 * rng() - 1);
      fp.push(r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * .75, r * Math.sin(ph) * Math.sin(th));
      ft.push(.6 + Math.pow(rng(), 2.5) * 2.2); ff.push(rng());
    }
    const geoF = new THREE.BufferGeometry();
    geoF.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3));
    geoF.setAttribute('aTam', new THREE.Float32BufferAttribute(ft, 1));
    geoF.setAttribute('aFase', new THREE.Float32BufferAttribute(ff, 1));
    const matF = new THREE.ShaderMaterial({
      uniforms: { uTempo, uPR, uForca: { value: .9 } },
      vertexShader: VS_FAISCA, fragmentShader: FS_FAISCA, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    const faiscas = new THREE.Points(geoF, matF);
    faiscas.frustumCulled = false;
    palco.add(faiscas);

    /* os seis objetos: ficam na raiz da cena, posição calculada a cada quadro */
    const itens = ORDEM.map((nome, k) => {
      const info = { mats: [] };
      const obj = montar(nome, info);
      cena.add(obj);
      return { nome, obj, mats: info.mats, ang: k / ORDEM.length * Math.PI * 2, foco: 0, giro: rng() * Math.PI * 2, pop: 0 };
    });

    /* ---------- estado ---------- */
    const E = {
      rot: -.5, vel: 0, rotFoco: 0, velFoco: 0,
      incl: CFG.inclinacao, inclAlvo: CFG.inclinacao,
      ptrX: 0, ptrY: 0, alvoPX: 0, alvoPY: 0,
      orbita: 0, sel: estadoInicial.selecao, recuo: 0,
      intro: reduzir ? 1 : 0, ocioso: 99, relogio: 0,
      arrastando: false, ultimoX: 0, ultimoY: 0
    };
    if (E.sel >= 0) E.recuo = 1;
    itens.forEach((it, k) => { it.foco = k === E.sel ? 1 : 0; it.pop = reduzir ? 1 : 0; });

    /* ---------- geometria do mundo (mesma ordem de transformação do Three) ---------- */
    function noMundo(local, esc, rotY, incl, pos) {
      let x = local[0] * esc, y = local[1] * esc, z = local[2] * esc;
      let a = Math.cos(rotY), b = Math.sin(rotY);
      const x1 = x * a + z * b, z1 = -x * b + z * a;
      a = Math.cos(incl); b = Math.sin(incl);
      const y2 = y * a - z1 * b, z2 = y * b + z1 * a;
      return [x1 + pos[0], y2 + pos[1], z2 + pos[2]];
    }

    function atualizar(dt) {
      E.relogio += dt;
      uTempo.value = reduzir ? 0 : E.relogio;
      E.ocioso += dt;
      // entrada
      if (E.intro < 1) E.intro = Math.min(1, E.intro + dt / 1.9);
      const ei = ease(E.intro);
      // giro: inércia do arraste + giro automático quando ocioso
      const autoAtivo = !reduzir && E.ocioso > 2.2 && !E.arrastando;
      const alvoAuto = autoAtivo ? CFG.autoGiro : 0;
      if (!E.arrastando) {
        E.vel *= Math.pow(.9, dt * 60);
        E.velFoco *= Math.pow(.9, dt * 60);
      }
      E.rot += E.vel + (E.sel < 0 ? alvoAuto * dt : alvoAuto * .35 * dt);
      E.rotFoco += E.velFoco + (E.sel >= 0 ? alvoAuto * .8 * dt : 0);
      if (!reduzir) E.orbita += dt * .18;
      // mouse sobre o palco: leve paralaxe
      E.ptrX = suave(E.ptrX, E.alvoPX, dt, 4);
      E.ptrY = suave(E.ptrY, E.alvoPY, dt, 4);
      E.incl = suave(E.incl, E.inclAlvo, dt, 6);
      E.recuo = suave(E.recuo, E.sel >= 0 ? 1 : 0, dt, 5);

      const esc = (.72 + .28 * ei) * (1 - .2 * easeIO(E.recuo));
      const pos = [0, .22 * E.recuo, -1.3 * E.recuo];
      const rotY = E.rot + (1 - ei) * -1.3 + E.ptrX * .25;
      const incl = E.incl + E.ptrY * .12;
      palco.scale.set(esc, esc, esc);
      palco.position.set(pos[0], pos[1], pos[2]);
      palco.rotation.set(incl, rotY, 0);
      escudo.rotation.y = reduzir ? 0 : Math.sin(E.relogio * .6) * .05;
      escudo.position.y = reduzir ? 0 : Math.sin(E.relogio * .9) * .04;

      const cg = Math.cos(CFG.orbita.giro), sg = Math.sin(CFG.orbita.giro);
      itens.forEach((it, k) => {
        it.foco = suave(it.foco, k === E.sel ? 1 : 0, dt, 5.5);
        const atraso = .35 + k * .09;
        it.pop = reduzir ? 1 : Math.min(1, Math.max(0, (E.intro * 1.9 - atraso) / .8));
        const th = it.ang + E.orbita;
        // ponto na órbita (plano XZ inclinado em Z), no espaço do palco
        const ox = Math.cos(th) * CFG.orbita.raio, oz = Math.sin(th) * CFG.orbita.raio;
        const local = [ox * cg, ox * sg + CFG.orbita.y, oz];
        const w = noMundo(local, esc, rotY, incl, pos);
        const f = easeIO(it.foco);
        it.obj.position.set(
          w[0] + (CFG.focoPos[0] - w[0]) * f,
          w[1] + (CFG.focoPos[1] - w[1]) * f + (reduzir ? 0 : Math.sin(E.relogio * 1.3 + k) * .05 * (1 - f)),
          w[2] + (CFG.focoPos[2] - w[2]) * f
        );
        const s = (CFG.escalaOrbita * esc * (1 - f) + CFG.escalaFoco * f) * ease(it.pop);
        it.obj.scale.set(s, s, s);
        if (!reduzir) it.giro = Math.atan2(Math.sin(it.giro + dt * (.5 - .3 * f)), Math.cos(it.giro + dt * (.5 - .3 * f)));
        it.obj.rotation.set(.12 + .1 * f + E.ptrY * .1 * f, it.giro * (1 - f) + (E.rotFoco + E.ptrX * .4 - .45) * f, 0);
        const ac = .45 * f;
        it.mats.forEach(m => { m.uniforms.uAcende.value = m.userData.acendeBase + ac; });
      });
    }

    /* ---------- tamanho ---------- */
    let prAtual = 0;   // teto de pixel ratio definido pela resolução adaptativa
    function compor() {
      const W = alvo.clientWidth, H = alvo.clientHeight;
      if (!W || !H) return;
      let pr = Math.min(window.devicePixelRatio || 1, pequeno ? CFG.pixelRatio.pequeno : CFG.pixelRatio.grande);
      if (prAtual) pr = Math.min(pr, prAtual);
      renderer.setPixelRatio(pr);
      renderer.setSize(W, H, false);
      uPR.value = pr;
      cam.aspect = W / H;
      // em telas estreitas a câmera recua para o palco inteiro caber
      cam.position.z = CFG.camZ * Math.max(1, 1.3 / cam.aspect);
      cam.updateProjectionMatrix();
    }

    /* ---------- laço ---------- */
    let rodando = false, visivel = true, ultimo = 0, primeiro = true;
    let quieto = 0, mediaDt = 1 / 60, lentos = 0;
    // resolução adaptativa: se o aparelho não sustentar ~40 fps, reduz os pixels do canvas
    function vigiarDesempenho(dt) {
      mediaDt += (dt - mediaDt) * .05;
      if (mediaDt > 1 / 40) lentos++; else lentos = Math.max(0, lentos - 2);
      if (lentos > 120) {
        lentos = 0;
        const pr = renderer.getPixelRatio ? renderer.getPixelRatio() : 1;
        if (pr > 1) { prAtual = Math.max(1, pr - .35); compor(); }
      }
    }
    function emRepouso() {
      if (E.arrastando || Math.abs(E.vel) > 1e-4 || Math.abs(E.velFoco) > 1e-4) return false;
      if (Math.abs(E.ptrX - E.alvoPX) > 1e-3 || Math.abs(E.ptrY - E.alvoPY) > 1e-3 || Math.abs(E.incl - E.inclAlvo) > 1e-3) return false;
      if (Math.abs(E.recuo - (E.sel >= 0 ? 1 : 0)) > 1e-3) return false;
      return itens.every((it, k) => Math.abs(it.foco - (k === E.sel ? 1 : 0)) < 1e-3);
    }
    function quadro(agora) {
      const dt = ultimo ? Math.min((agora - ultimo) / 1000, .05) : 1 / 60;
      ultimo = agora;
      if (!primeiro) vigiarDesempenho(dt);
      atualizar(dt);
      // com "reduzir movimento" nada se move sozinho: depois de parar, não redesenha à toa
      if (reduzir && !primeiro && emRepouso()) { if (++quieto > 2) return; } else quieto = 0;
      renderer.render(cena, cam);
      if (primeiro) { primeiro = false; raiz.classList.add('is-3d'); acessivel(alvo, true); }
    }
    function ajustar() {
      const deve = visivel && !document.hidden;
      if (deve && !rodando) { rodando = true; ultimo = 0; renderer.setAnimationLoop(quadro); }
      else if (!deve && rodando) { rodando = false; renderer.setAnimationLoop(null); }
    }

    /* ---------- interação: arrastar, mouse, teclado ---------- */
    const ouvintes = [];
    const on = (el, ev, fn, op) => { el.addEventListener(ev, fn, op); ouvintes.push([el, ev, fn, op]); };
    on(canvas, 'pointerdown', e => {
      E.arrastando = true; E.ocioso = 0; E.ultimoX = e.clientX; E.ultimoY = e.clientY;
      raiz.classList.add('is-arrastando', 'ja-mexeu');
      if (canvas.setPointerCapture) { try { canvas.setPointerCapture(e.pointerId); } catch (erro) { /* ok */ } }
    });
    on(canvas, 'pointermove', e => {
      const r = canvas.getBoundingClientRect();
      E.alvoPX = ((e.clientX - r.left) / r.width - .5) * 2;
      E.alvoPY = ((e.clientY - r.top) / r.height - .5) * 2;
      if (!E.arrastando) return;
      const dx = e.clientX - E.ultimoX, dy = e.clientY - E.ultimoY;
      E.ultimoX = e.clientX; E.ultimoY = e.clientY;
      const k = 5.2 / Math.max(r.width, 1);
      if (E.sel >= 0) { E.velFoco = dx * k; E.rotFoco += dx * k; }
      else { E.vel = dx * k; E.rot += dx * k; }
      E.inclAlvo = Math.min(.55, Math.max(-.1, E.inclAlvo + dy * k * .5));
      E.ocioso = 0;
    });
    const soltar = () => {
      if (!E.arrastando) return;
      E.arrastando = false;
      raiz.classList.remove('is-arrastando');
      E.inclAlvo = CFG.inclinacao;
    };
    on(canvas, 'pointerup', soltar);
    on(canvas, 'pointercancel', soltar);
    on(canvas, 'pointerleave', () => { E.alvoPX = 0; E.alvoPY = 0; soltar(); });
    on(alvo, 'keydown', e => {
      const passo = { ArrowLeft: -.09, ArrowRight: .09 }[e.key];
      if (passo == null) return;
      e.preventDefault();
      E.ocioso = 0;
      raiz.classList.add('ja-mexeu');
      if (E.sel >= 0) E.velFoco = passo; else E.vel = passo;
    });
    on(document, 'visibilitychange', ajustar);
    const io = new IntersectionObserver(ent => { visivel = ent[0].isIntersecting; ajustar(); }, { rootMargin: '120px 0px' });
    io.observe(raiz);
    let rafR = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(rafR); rafR = requestAnimationFrame(() => { compor(); if (!rodando) { atualizar(0); renderer.render(cena, cam); } }); });
    ro.observe(alvo);
    on(canvas, 'webglcontextlost', e => { e.preventDefault(); rodando = false; renderer.setAnimationLoop(null); raiz.classList.remove('is-3d'); acessivel(alvo, false); });

    compor();
    ajustar();

    return {
      selecionar(nome) {
        const k = ORDEM.indexOf(nome);
        E.sel = k;
        E.ocioso = 0;
        if (k >= 0) { E.rotFoco = 0; E.velFoco = .06; }
      },
      destruir() {
        renderer.setAnimationLoop(null);
        io.disconnect(); ro.disconnect(); cancelAnimationFrame(rafR);
        ouvintes.forEach(o => o[0].removeEventListener(o[1], o[2], o[3]));
        cena.traverse(o => { if (o.geometry) o.geometry.dispose(); });
        materiais.concat([matHalo, matF]).forEach(m => m.dispose());
        renderer.dispose();
        if (renderer.forceContextLoss) renderer.forceContextLoss();
        canvas.remove();
        raiz.classList.remove('is-3d');
        acessivel(alvo, false);
      }
    };
  }

  /* ==================== CICLO DE VIDA ==================== */
  let instancia = null;
  function selecaoAtual(raiz) {
    const b = raiz.querySelector('[data-need][aria-pressed="true"]');
    return b ? ORDEM.indexOf(b.dataset.need) : -1;
  }
  function iniciar() {
    const raiz = q('[data-palco]');
    if (!raiz || instancia || economizar()) return;
    if (typeof ResizeObserver === 'undefined' || typeof IntersectionObserver === 'undefined') return;
    raiz.classList.add('is-carregando');
    carregarThree().then(THREE => {
      raiz.classList.remove('is-carregando');
      if (!THREE || instancia) return;
      try {
        instancia = criarPalco(THREE, raiz, { selecao: selecaoAtual(raiz) });
      } catch (erro) {
        console.warn('[palco 3D] indisponível — mantendo a ilustração:', erro && erro.message);
        instancia = null;
      }
    });
  }
  document.addEventListener('as:necessidade', e => { if (instancia) instancia.selecionar(e.detail); });

  // carrega depois da página pronta e só quando o palco está perto da tela
  // (no celular ele fica abaixo do texto: quem não rola até lá não baixa o Three.js)
  function agendar() {
    let feito = false;
    const vai = () => { if (feito) return; feito = true; quandoPerto(iniciar); };
    if (document.readyState === 'complete') setTimeout(vai, 60);
    else { window.addEventListener('load', () => setTimeout(vai, 60), { once: true }); setTimeout(vai, 2500); }
  }
  function quandoPerto(fn) {
    const raiz = q('[data-palco]');
    if (!raiz || typeof IntersectionObserver === 'undefined') { fn(); return; }
    const io = new IntersectionObserver(ent => {
      if (!ent.some(e => e.isIntersecting)) return;
      io.disconnect();
      fn();
    }, { rootMargin: '300px 0px' });
    io.observe(raiz);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', agendar);
  else agendar();

  window.ASPalco = {
    iniciar,
    destruir() { if (instancia) { instancia.destruir(); instancia = null; } },
    modelos: ORDEM
  };
})();
