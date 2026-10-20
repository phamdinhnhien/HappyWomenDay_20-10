'use strict';

/* ===== Cấu hình: tên người nhận / người gửi (có thể ghi đè bằng ?to=Tên&from=Tên) ===== */
const RECIPIENT = 'Em Yêu';
const SENDER = 'Iu';
const MIN = 3, MAX = 9;

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const K = REDUCED ? 0.3 : 1;

/* ===== Trạng thái duy nhất của ứng dụng ===== */
const params = new URLSearchParams(location.search);
const state = {
  scene: 'shop',
  picks: [],          // danh sách id hoa đã chọn (theo thứ tự chọn)
  busy: false,        // đang chuyển cảnh / mở thiệp
  to: (params.get('to') || RECIPIENT).trim().slice(0, 40) || RECIPIENT,
  from: (params.get('from') || SENDER).trim().slice(0, 40) || SENDER
};

const $ = (s) => document.querySelector(s);

/* Gắn sự kiện chạm: pointerdown (kèm Enter/Space cho bàn phím) */
function tap(el, fn) {
  el.addEventListener('pointerdown', (e) => { if (!el.disabled) fn(e); });
  el.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !el.disabled) { e.preventDefault(); fn(e); }
  });
}

/* ===== Chuyển màn hình (hàm duy nhất) ===== */
function showScene(name) {
  state.scene = name;
  document.querySelectorAll('.scene').forEach((s) => s.classList.toggle('active', s.dataset.scene === name));
  if (name === 'pick') renderTray();
  if (name === 'wrap') startWrap();
  if (name === 'card') { buildBouquet($('#bq-final'), true); tap($('#tagBtn'), openCard); }
}

/* ===== Thư viện SVG hoa anime (toạ độ 0..100 x 0..200, gốc cành ở (50,200)) ===== */
const sp = (x, y, s = 5) => `<path d="M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z" fill="#fff"/>`; // lấp lánh ✦
const circ = (x, y, r, f, s = 'none') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" stroke="${s}" stroke-width="1.6"/>`;
/* Vòng cánh: mỗi cánh có nền, mảng bóng (cel-shading) và điểm sáng */
function ring(n, d, rx, ry, f, sh, st, rot = 0) {
  let o = '';
  for (let i = 0; i < n; i++) {
    o += `<g transform="rotate(${rot + i * 360 / n} 50 45)"><ellipse cx="50" cy="${45 - d}" rx="${rx}" ry="${ry}" fill="${f}" stroke="${st}" stroke-width="1.6"/>` +
      `<ellipse cx="${50 + rx * .3}" cy="${45 - d + ry * .4}" rx="${rx * .6}" ry="${ry * .55}" fill="${sh}" opacity=".45"/>` +
      `<ellipse cx="${50 - rx * .3}" cy="${45 - d - ry * .45}" rx="${rx * .22}" ry="${ry * .17}" fill="#fff" opacity=".85"/></g>`;
  }
  return o;
}
const STEM =
  '<path d="M50 58C46 100 54 150 50 200" fill="none" stroke="#6DB88A" stroke-width="5" stroke-linecap="round"/>' +
  '<path d="M52 70C49 110 55 150 52 196" fill="none" stroke="#B8EBC8" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>' +
  '<path d="M50 150C34 148 24 136 24 124C40 124 50 134 50 150Z" fill="#9FDDB2" stroke="#6DB88A" stroke-width="2"/>' +
  '<path d="M50 150C50 134 40 124 24 124C38 130 46 138 50 150Z" fill="#7BC796" opacity=".5"/>' +
  '<path d="M50 125C66 123 76 111 76 99C60 99 50 109 50 125Z" fill="#9FDDB2" stroke="#6DB88A" stroke-width="2"/>' +
  '<path d="M50 125C50 109 60 99 76 99C62 105 54 113 50 125Z" fill="#7BC796" opacity=".5"/>';

const HEAD = {
  rose: () => ring(5, 13, 13, 15, '#FF9DB8', '#E0587F', '#D6648A') + ring(5, 7, 9, 10, '#FFB6C9', '#E0587F', '#D6648A', 36) +
    circ(50, 45, 6, '#FF8FB1', '#D6648A') + '<path d="M47 45a3 3 0 1 1 5 2" fill="none" stroke="#D6648A" stroke-width="1.5" stroke-linecap="round"/>' + sp(38, 30, 5) + sp(64, 57, 3),
  tulip: () => '<ellipse cx="38" cy="44" rx="12" ry="26" transform="rotate(-14 38 44)" fill="#FF8FA3" stroke="#D6648A" stroke-width="1.6"/>' +
    '<ellipse cx="62" cy="44" rx="12" ry="26" transform="rotate(14 62 44)" fill="#FF8FA3" stroke="#D6648A" stroke-width="1.6"/>' +
    '<path d="M36 66C30 44 38 26 50 14C62 26 70 44 64 66C58 74 42 74 36 66Z" fill="#FFB0BE" stroke="#D6648A" stroke-width="1.6" stroke-linejoin="round"/>' +
    '<path d="M50 14C62 26 70 44 64 66C58 74 54 74 50 72Z" fill="#E8708A" opacity=".4"/>' +
    '<ellipse cx="42" cy="38" rx="3" ry="9" transform="rotate(8 42 38)" fill="#fff" opacity=".8"/>' + sp(60, 30, 4),
  sunflower: () => ring(14, 21, 5.5, 12, '#FFD94A', '#F2A93B', '#E0A12B') + circ(50, 45, 14, '#A9714B', '#6B4A5E') +
    '<path d="M50 31A14 14 0 0 1 50 59Z" fill="#7A4E36" opacity=".45"/>' +
    [[44, 40], [52, 38], [56, 46], [47, 48], [41, 49], [52, 53], [46, 55]].map((p) => circ(p[0], p[1], 1.3, '#5E3A2A')).join('') + sp(42, 36, 5),
  daisy: () => ring(10, 17, 5.5, 13, '#FFFFFF', '#E8CFE3', '#D9C3D6') + circ(50, 45, 8, '#FFE066', '#E8B93A') + circ(47, 42, 2, '#fff') + sp(63, 26, 4),
  sakura: () => {
    let s = '';
    for (let i = 0; i < 5; i++) {
      s += `<g transform="rotate(${i * 72} 50 45)"><path d="M50 45C39 38 37 20 44 14L50 20L56 14C63 20 61 38 50 45Z" fill="#FFC9DA" stroke="#E88FB0" stroke-width="1.6" stroke-linejoin="round"/>` +
        '<path d="M50 45C61 38 63 20 56 14L50 20Z" fill="#F59BBB" opacity=".4"/><ellipse cx="45" cy="27" rx="2" ry="4" transform="rotate(-10 45 27)" fill="#fff" opacity=".8"/></g>';
    }
    for (let i = 0; i < 5; i++) { const a = i * 72 + 36, x = 50 + 11 * Math.sin(a * Math.PI / 180), y = 45 - 11 * Math.cos(a * Math.PI / 180);
      s += `<path d="M50 45L${x} ${y}" stroke="#FF8FB1" stroke-width="1.4"/>` + circ(x, y, 1.8, '#FF8FB1'); }
    return s + circ(50, 45, 4.5, '#FFE08A', '#E8B93A') + sp(38, 32, 4);
  },
  lavender: () => {
    let s = '<ellipse cx="50" cy="8" rx="3.5" ry="5" fill="#CDB8FF" stroke="#8E6FD6" stroke-width="1.2"/>';
    for (let i = 0; i < 9; i++) {
      const y = 14 + i * 7.5, a = i % 2 ? '#B79CF2' : '#CDB8FF', b = i % 2 ? '#CDB8FF' : '#B79CF2';
      s += `<ellipse cx="46" cy="${y}" rx="5" ry="3.6" transform="rotate(-25 46 ${y})" fill="${a}" stroke="#8E6FD6" stroke-width="1.2"/>` +
        `<ellipse cx="54" cy="${y + 3}" rx="5" ry="3.6" transform="rotate(25 54 ${y + 3})" fill="${b}" stroke="#8E6FD6" stroke-width="1.2"/>`;
    }
    return s + sp(57, 24, 4);
  },
  hydrangea: () => {
    const P = [[50, 18], [36, 26], [64, 26], [26, 40], [50, 34], [74, 40], [34, 54], [62, 52], [48, 66]], C = ['#B9C8FF', '#DCCBFF', '#FFC0E3'];
    return P.map((p, i) => `<g fill="${C[i % 3]}" stroke="#8F9FE0" stroke-width="1.2"><circle cx="${p[0] - 4.5}" cy="${p[1]}" r="5.5"/><circle cx="${p[0] + 4.5}" cy="${p[1]}" r="5.5"/>` +
      `<circle cx="${p[0]}" cy="${p[1] - 4.5}" r="5.5"/><circle cx="${p[0]}" cy="${p[1] + 4.5}" r="5.5"/><circle cx="${p[0]}" cy="${p[1]}" r="2" fill="#FFF3A0" stroke="none"/>` +
      `<ellipse cx="${p[0] - 4}" cy="${p[1] - 6}" rx="2" ry="1.2" fill="#fff" stroke="none" opacity=".8"/></g>`).join('') + sp(40, 24, 4);
  },
  orchid: () => '<ellipse cx="33" cy="42" rx="17" ry="12" transform="rotate(-20 33 42)" fill="#F7DCFF" stroke="#C98BE0" stroke-width="1.6"/>' +
    '<ellipse cx="67" cy="42" rx="17" ry="12" transform="rotate(20 67 42)" fill="#F7DCFF" stroke="#C98BE0" stroke-width="1.6"/>' +
    '<ellipse cx="50" cy="27" rx="8" ry="17" fill="#F0C4FF" stroke="#C98BE0" stroke-width="1.6"/>' +
    '<ellipse cx="37" cy="60" rx="7" ry="15" transform="rotate(28 37 60)" fill="#F0C4FF" stroke="#C98BE0" stroke-width="1.6"/>' +
    '<ellipse cx="63" cy="60" rx="7" ry="15" transform="rotate(-28 63 60)" fill="#F0C4FF" stroke="#C98BE0" stroke-width="1.6"/>' +
    circ(50, 50, 8, '#D86BCF', '#B04CAA') + circ(50, 44, 3.5, '#FFE8A0', '#E8B93A') + circ(47, 51, 1.3, '#FFB3EA') + circ(53, 52, 1.3, '#FFB3EA') + sp(42, 26, 4)
};
const FLOWERS = [
  { id: 'rose', name: 'Hoa hồng' }, { id: 'tulip', name: 'Tulip' }, { id: 'sunflower', name: 'Hướng dương' }, { id: 'daisy', name: 'Cúc họa mi' },
  { id: 'sakura', name: 'Anh đào' }, { id: 'lavender', name: 'Oải hương' }, { id: 'hydrangea', name: 'Cẩm tú cầu' }, { id: 'orchid', name: 'Lan' }
];
const nameOf = (id) => FLOWERS.find((f) => f.id === id).name;
const flowerInner = (id) => `<g>${STEM}${HEAD[id]()}</g>`;
const flowerSVG = (id) => `<svg viewBox="0 0 100 200" aria-hidden="true" focusable="false">${flowerInner(id)}</svg>`;
/* Lọ thủy tinh cho kệ hoa */
const JAR = '<path d="M24 122H76L82 184Q82 199 70 199H30Q18 199 18 184Z" fill="#fff" fill-opacity=".6" stroke="#E8CBA7" stroke-width="3" stroke-linejoin="round"/>' +
  '<rect x="26" y="116" width="48" height="9" rx="4" fill="#C8F0D8" stroke="#86CDA5" stroke-width="2"/><ellipse cx="29" cy="160" rx="2.5" ry="14" fill="#fff" opacity=".8"/>';

/* ===== Màn 1: mặt tiền tiệm hoa ===== */
const place = (id, x, y, s, r) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s}) translate(-50 -200)">${flowerInner(id)}</g>`;
function bucket(x, w, top, f, d) {
  return `<path d="M${x} ${top}H${x + w}L${x + w - 7} 470H${x + 7}Z" fill="${f}" stroke="${d}" stroke-width="3" stroke-linejoin="round"/>` +
    `<path d="M${x + w * .62} ${top}H${x + w}L${x + w - 7} 470H${x + w * .7}Z" fill="${d}" opacity=".25"/>` +
    `<rect x="${x - 3}" y="${top - 5}" width="${w + 6}" height="9" rx="4.5" fill="${f}" stroke="${d}" stroke-width="3"/>` +
    `<ellipse cx="${x + w * .2}" cy="${top + 18}" rx="3" ry="9" fill="#fff" opacity=".6"/>`;
}
function windowBox(x, ids) {
  return `<rect x="${x}" y="225" width="88" height="120" rx="12" fill="#E4F5FF"/>` +
    `<path d="M${x + 12} 345L${x + 50} 225H${x + 66}L${x + 28} 345Z" fill="#fff" opacity=".55"/>` + sp(x + 70, 245, 6) +
    ids.map((id, i) => place(id, x + 22 + i * 22, 352, .42, (i - 1) * 14)).join('') +
    `<rect x="${x - 6}" y="345" width="100" height="24" rx="8" fill="#E8CBA7" stroke="#C9A47C" stroke-width="3"/>` +
    `<rect x="${x}" y="225" width="88" height="120" rx="12" fill="none" stroke="#C8F0D8" stroke-width="6"/>`;
}
function awning() {
  let s = '';
  for (let i = 0; i < 8; i++) {
    const x = 28 + i * 43, f = i % 2 ? '#FFFFFF' : '#FFB6C9';
    s += `<path d="M${x} 152h43v38a21.5 21.5 0 0 1-43 0z" fill="${f}" stroke="#E58BA6" stroke-width="2.5" stroke-linejoin="round"/>`;
  }
  return s + '<path d="M28 152H372V164H28Z" fill="#fff" opacity=".35"/>' + sp(60, 166, 6);
}
function shopSVG() {
  return '<svg viewBox="0 0 400 480" role="img" aria-label="Mặt tiền tiệm hoa dễ thương">' +
    '<rect x="42" y="118" width="316" height="352" rx="10" fill="#FFEEF3" stroke="#E8B6C8" stroke-width="3"/>' +
    '<path d="M36 118Q36 78 76 78H324Q364 78 364 118Z" fill="#FFD3B6" stroke="#E8A98A" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M60 92H300" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".6"/>' +
    '<rect x="80" y="92" width="240" height="52" rx="18" fill="#E8CBA7" stroke="#C9A47C" stroke-width="3"/>' +
    '<text x="200" y="127" text-anchor="middle" font-family="Pacifico,cursive" font-size="25" fill="#6B4A5E">Tiệm Hoa 20/10 🌸</text>' + sp(94, 104, 6) + awning() +
    windowBox(62, ['tulip', 'rose', 'daisy']) + windowBox(250, ['hydrangea', 'sakura', 'sunflower']) +
    '<path d="M158 470V270Q158 232 200 232Q242 232 242 270V470Z" fill="#FFD9C2" stroke="#E8A98A" stroke-width="3"/>' +
    '<circle cx="200" cy="330" r="30" fill="#FFF1A8" opacity=".7"/>' + place('rose', 186, 470, .3, -8) + place('lavender', 214, 470, .3, 8) +
    '<g class="door-l"><path d="M158 470V270Q158 232 200 232V470Z" fill="#C8F0D8" stroke="#86CDA5" stroke-width="3"/><rect x="167" y="262" width="22" height="84" rx="10" fill="#E4F5FF"/><path d="M171 340L181 268" stroke="#fff" stroke-width="3" opacity=".8"/><circle cx="190" cy="390" r="4" fill="#FFE08A" stroke="#E8B93A" stroke-width="1.5"/></g>' +
    '<g class="door-r"><path d="M242 470V270Q242 232 200 232V470Z" fill="#C8F0D8" stroke="#86CDA5" stroke-width="3"/><rect x="211" y="262" width="22" height="84" rx="10" fill="#E4F5FF"/><path d="M215 340L225 268" stroke="#fff" stroke-width="3" opacity=".8"/><circle cx="210" cy="390" r="4" fill="#FFE08A" stroke="#E8B93A" stroke-width="1.5"/></g>' +
    place('sunflower', 43, 430, .5, -16) + place('rose', 43, 430, .55, 0) + place('tulip', 43, 430, .5, 16) + bucket(6, 74, 424, '#FFD3B6', '#E8A98A') +
    place('lavender', 357, 430, .5, -14) + place('daisy', 357, 430, .55, 0) + place('hydrangea', 357, 430, .5, 16) + bucket(320, 74, 424, '#DCCBFF', '#B79CF2') +
    place('sakura', 124, 446, .4, -10) + place('orchid', 128, 446, .38, 10) + bucket(100, 52, 442, '#C8F0D8', '#86CDA5') +
    place('tulip', 270, 446, .4, -10) + place('rose', 276, 446, .38, 10) + bucket(248, 52, 442, '#FFF1A8', '#E8C95A') +
    sp(30, 300, 7) + sp(372, 210, 6) + '</svg>';
}
$('#shop').innerHTML = shopSVG();

/* Bấm vào tiệm: mở cửa, zoom, sang màn 2 */
tap($('#shop'), () => {
  if (state.busy || state.scene !== 'shop') return;
  state.busy = true;
  $('#shop').classList.add('enter');
  $('#shop').parentElement.classList.add('entering');
  setTimeout(() => { showScene('pick'); state.busy = false; }, REDUCED ? 300 : 1250);
});

/* ===== Màn 2: kệ hoa, khay, bộ đếm ===== */
const pending = new Set(); // chỉ số cành đang bay vào khay
const shelf = $('#shelf');
FLOWERS.forEach((f) => {
  const b = document.createElement('button');
  b.className = 'fbtn';
  b.setAttribute('aria-label', 'Chọn ' + f.name);
  b.innerHTML = `<div class="art"><svg viewBox="0 0 100 200" aria-hidden="true" focusable="false">${flowerInner(f.id)}${JAR}</svg></div><div class="plank"></div><span>${f.name}</span>`;
  tap(b, () => pickFlower(f.id, b));
  shelf.appendChild(b);
});

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('show'), 1800);
}

/* Vẽ lại khay 9 ô; ô nào đang bay tới thì ẩn đi cho đến khi cành đáp xuống */
function renderTray() {
  const tray = $('#tray');
  tray.textContent = '';
  for (let i = 0; i < MAX; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    if (state.picks[i]) {
      const b = document.createElement('button');
      b.setAttribute('aria-label', 'Bỏ ' + nameOf(state.picks[i]) + ' ra khỏi khay');
      b.innerHTML = flowerSVG(state.picks[i]);
      if (pending.has(i)) b.className = 'pending';
      tap(b, () => { if (pending.size) return; state.picks.splice(i, 1); renderTray(); });
      slot.appendChild(b);
    }
    tray.appendChild(slot);
  }
  $('#counter').textContent = `Đã chọn ${state.picks.length}/${MAX}`;
  $('#btnWrap').disabled = state.picks.length < MIN;
}

/* Chọn một loại hoa: cành bay cong từ kệ vào khay */
function pickFlower(id, btn) {
  if (state.picks.length >= MAX) { toast('Bó hoa đã đầy rồi nè 💐'); return; }
  const idx = state.picks.length;
  state.picks.push(id);
  if (REDUCED) { renderTray(); return; }
  pending.add(idx);
  renderTray();
  const a = btn.querySelector('.art').getBoundingClientRect();
  const t = $('#tray').children[idx].getBoundingClientRect();
  const dx = t.left + t.width / 2 - (a.left + a.width / 2), dy = t.top + t.height / 2 - (a.top + a.height / 2);
  const fly = document.createElement('div');
  fly.className = 'fly';
  fly.style.left = (a.left + a.width / 2 - 22) + 'px';
  fly.style.top = (a.top + a.height / 2 - 44) + 'px';
  fly.innerHTML = flowerSVG(id);
  document.body.appendChild(fly);
  fly.firstChild.style.cssText = 'width:100%;height:100%';
  const anim = fly.animate([
    { transform: 'translate(0,0) scale(1) rotate(0deg)' },
    { transform: `translate(${dx / 2}px,${dy / 2 - 120}px) scale(1.15) rotate(180deg)`, offset: .5 },
    { transform: `translate(${dx}px,${dy}px) scale(.9) rotate(360deg)` }
  ], { duration: 650, easing: 'ease-in-out', fill: 'forwards' });
  anim.onfinish = () => { fly.remove(); pending.delete(idx); renderTray(); };
}

tap($('#btnReset'), () => { if (pending.size) return; state.picks = []; renderTray(); });
tap($('#btnWrap'), () => { if (state.picks.length >= MIN && !pending.size) showScene('wrap'); });

/* ===== Màn 3 + 4: bó hoa ===== */
/* Xen kẽ các loại hoa: lấy lần lượt mỗi loại một cành */
function interleave(list) {
  const groups = {};
  list.forEach((id) => (groups[id] = groups[id] || []).push(id));
  const out = [], keys = Object.keys(groups);
  while (out.length < list.length) keys.forEach((k) => { if (groups[k].length) out.push(groups[k].shift()); });
  return out;
}
const CONE_BACK = '<svg viewBox="0 0 240 140"><path d="M4 8Q120 32 236 8L130 136Q120 142 110 136Z" fill="#E8CBA7" stroke="#C9A47C" stroke-width="2.5" stroke-linejoin="round"/>' +
  '<path d="M4 8Q120 32 236 8Q120 20 4 8Z" fill="#D4B088"/><path d="M120 22L236 8L130 136Q120 142 120 140Z" fill="#C9A47C" opacity=".35"/></svg>';
const CONE_FRONT = '<svg viewBox="0 0 240 140"><path d="M22 30Q120 52 218 30L128 136Q120 142 112 136Z" fill="#FFB6C9" stroke="#E58BA6" stroke-width="2.5" stroke-linejoin="round"/>' +
  '<path d="M120 42L218 30L128 136Q120 142 120 140Z" fill="#E58BA6" opacity=".35"/><path d="M22 30Q120 52 218 30L212 40Q120 62 28 40Z" fill="#FFD3E0"/>' +
  '<circle cx="80" cy="70" r="4" fill="#fff" opacity=".8"/><circle cx="150" cy="62" r="3" fill="#fff" opacity=".8"/><circle cx="118" cy="98" r="3.5" fill="#fff" opacity=".8"/>' + sp(60, 52, 7) +'</svg>';
const BOW = '<svg viewBox="0 0 120 56"><rect x="8" y="22" width="104" height="12" rx="6" fill="#DCCBFF" stroke="#9B7FE0" stroke-width="2"/>' +
  '<path d="M56 34L44 55L56 49Z" fill="#C9B2FF" stroke="#9B7FE0" stroke-width="2" stroke-linejoin="round"/><path d="M64 34L76 55L64 49Z" fill="#C9B2FF" stroke="#9B7FE0" stroke-width="2" stroke-linejoin="round"/>' +
  '<path d="M60 28C40 0 8 6 14 28C8 50 40 56 60 28Z" fill="#DCCBFF" stroke="#9B7FE0" stroke-width="2.5" stroke-linejoin="round"/><path d="M60 28C80 0 112 6 106 28C112 50 80 56 60 28Z" fill="#DCCBFF" stroke="#9B7FE0" stroke-width="2.5" stroke-linejoin="round"/>' +
  '<path d="M60 28C80 0 112 6 106 28C112 50 80 56 60 28Z" fill="#B79CF2" opacity=".35"/><ellipse cx="30" cy="16" rx="8" ry="3.5" transform="rotate(-25 30 16)" fill="#fff" opacity=".8"/>' +
  '<circle cx="60" cy="28" r="8" fill="#DCCBFF" stroke="#9B7FE0" stroke-width="2.5"/>' + sp(97, 14, 6) + '</svg>';
const TAG = '<svg viewBox="0 0 70 92"><path d="M35 0V32" stroke="#B79CF2" stroke-width="2.5"/>' +
  '<path d="M35 86C10 66 6 50 6 44C6 34 14 30 21 30C28 30 33 35 35 40C37 35 42 30 49 30C56 30 64 34 64 44C64 50 60 66 35 86Z" fill="#FFB6C9" stroke="#E58BA6" stroke-width="2.5" stroke-linejoin="round"/>' +
  '<path d="M35 86C60 66 64 50 64 44C64 34 56 30 49 30C60 38 52 66 35 86Z" fill="#E58BA6" opacity=".35"/><circle cx="35" cy="32" r="3" fill="#fff" stroke="#E58BA6" stroke-width="1.5"/>' +
  '<text x="35" y="57" text-anchor="middle" font-family="Pacifico,cursive" font-size="13" fill="#6B4A5E">20/10</text>' + sp(19, 44, 5) + '</svg>';

/* Dựng bó hoa vào phần tử host; vị trí/góc nghiêng tính theo số cành */
function buildBouquet(host, withTag) {
  const seq = interleave(state.picks), n = seq.length;
  const half = Math.min(8 + n * 4.5, 44); // nửa góc của hình quạt
  let h = `<div class="bq-back">${CONE_BACK}</div>`;
  seq.forEach((id, i) => {
    const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
    const s = 1 - (i % 2) * 0.14 - Math.abs(t) * 0.06;
    h += `<div class="bq-f" style="--a:${(t * half).toFixed(1)}deg;--s:${s.toFixed(2)};--i:${i};z-index:${i % 2 ? 2 : 3}">${flowerSVG(id)}</div>`;
  });
  h += `<div class="bq-front">${CONE_FRONT}</div><div class="bq-bow">${BOW}</div>`;
  for (let i = 0; i < 8; i++) {
    const ang = i * 45 * Math.PI / 180;
    h += `<span class="spk" aria-hidden="true" style="--x:${(Math.cos(ang) * 90).toFixed(0)}px;--y:${(Math.sin(ang) * 70).toFixed(0)}px">✦</span>`;
  }
  if (withTag) h += `<button class="tag" id="tagBtn" aria-label="Mở thiệp chúc mừng">${TAG}</button>`;
  host.innerHTML = h;
}

/* Màn 3: hoạt cảnh gói hoa ~4 giây, có thể bỏ qua */
let wrapTimer = 0;
function startWrap() {
  const host = $('#bq-wrap');
  host.classList.remove('go');
  buildBouquet(host, false);
  void host.offsetWidth;
  host.classList.add('go');
  clearTimeout(wrapTimer);
  wrapTimer = setTimeout(finishWrap, 4300 * K + 100);
}
function finishWrap() {
  clearTimeout(wrapTimer);
  if (state.scene === 'wrap') showScene('card');
}
tap($('#btnSkip'), finishWrap);

/* ===== Màn 4: thiệp ===== */
function addLine(parent, tag, text, i, cls) {
  const p = document.createElement(tag);
  p.className = 'line' + (cls ? ' ' + cls : '');
  p.style.setProperty('--i', i);
  p.textContent = text; // textContent: không chèn mã từ URL
  parent.appendChild(p);
}
function openCard() {
  if (state.busy) return;
  state.busy = true;
  const counts = {};
  state.picks.forEach((id) => (counts[id] = (counts[id] || 0) + 1));
  const list = FLOWERS.filter((f) => counts[f.id]).map((f) => `${f.name} ×${counts[f.id]}`).join(', ');
  const letter = $('#letter');
  letter.textContent = '';
  addLine(letter, 'p', `Gửi ${state.to} ,`, 0);
  addLine(letter, 'p', 'Nhân ngày Phụ nữ Việt Nam 20/10, Tặng Babi bó hoa này cùng lời chúc: luôn xinh đẹp, rạng rỡ, khỏe mạnh, thật nhiều niềm vui và được yêu thương mỗi ngày. Chúc babi 20/10 thật ngọt ngào. Mong babi mãi mỉm cười thật tươi nhé! 🌸', 1);
  addLine(letter, 'p', 'Yêu Thương,', 3);


  const overlay = $('#overlay'), book = $('#book');
  const r = $('#tagBtn').getBoundingClientRect();
  overlay.hidden = false;
  book.style.transition = 'none'; // đặt thẻ ở vị trí cũ rồi bay ra giữa
  book.style.transform = `translate(${r.left + r.width / 2 - innerWidth / 2}px,${r.top + r.height / 2 - innerHeight / 2}px) scale(.12) rotate(-8deg)`;
  void book.offsetWidth;
  book.style.transition = '';
  book.style.transform = '';
  overlay.classList.add('show');
  setTimeout(() => book.classList.add('open'), REDUCED ? 100 : 850);
  setTimeout(() => letter.classList.add('show'), REDUCED ? 400 : 1700);
}
function closeCard(after) {
  const overlay = $('#overlay');
  overlay.classList.remove('show');
  $('#book').classList.remove('open');
  setTimeout(() => {
    overlay.hidden = true;
    $('#letter').classList.remove('show');
    state.busy = false;
    if (after) after();
  }, 450);
}
tap($('#btnClose'), () => closeCard());
tap($('#btnNew'), () => closeCard(() => { state.picks = []; showScene('pick'); }));

/* ===== Cánh hoa anh đào rơi (tối đa 25) ===== */
if (!REDUCED) {
  const box = $('#petals'), n = innerWidth < 600 ? 14 : 22;
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.className = 'petal';
    p.style.left = (Math.random() * 100) + 'vw';
    p.style.setProperty('--s', (8 + Math.random() * 8).toFixed(0) + 'px');
    p.style.setProperty('--dx', ((Math.random() - .5) * 30).toFixed(0) + 'vw');
    p.style.animationDuration = (9 + Math.random() * 9).toFixed(1) + 's';
    p.style.animationDelay = '-' + (Math.random() * 15).toFixed(1) + 's';
    box.appendChild(p);
  }
}

renderTray();
