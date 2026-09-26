#!/usr/bin/env node
/**
 * Builds the Kasoundbox "Reservation & Inventory Process Flow" guide.
 *
 *   node docs/process-flow/build.mjs
 *
 * Writes Kasoundbox-Process-Flow-Guide.html next to this file, then prints it to
 * Kasoundbox-Process-Flow-Guide.pdf with a headless Chromium browser (Edge or Chrome).
 * Set BROWSER=/path/to/browser to choose one explicitly.
 *
 * Source of truth for every rule shown here:
 *   docs/superpowers/specs/2026-09-26-kasoundbox-rental-reservation-design.md
 * When the spec changes, update the text/diagrams below and rebuild.
 */
import { writeFileSync, existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_HTML = join(HERE, 'Kasoundbox-Process-Flow-Guide.html');
const OUT_PDF = join(HERE, 'Kasoundbox-Process-Flow-Guide.pdf');
const VERSION = 'Version 1.0 · September 26, 2026';

// ─── Flowchart primitives ────────────────────────────────────────────────────

const LH = 15; // line height inside shapes (px)

// Process palette (diagram-generator conventions): blue start/end, amber
// decisions, red problems; actors get their own tint so "who does it" is visible.
const PAL = {
  terminal: { stroke: '#1864ab', fill: '#dbeafe', text: '#0b3d6e' },
  good: { stroke: '#2b8a3e', fill: '#d3f9d8', text: '#1b5e2a' },
  bad: { stroke: '#c92a2a', fill: '#ffe3e3', text: '#7d1a1a' },
  CUSTOMER: { stroke: '#0c8599', fill: '#e3fafc', tag: '#0b7285' },
  ADMIN: { stroke: '#2f9e44', fill: '#ebfbee', tag: '#2b8a3e' },
  SYSTEM: { stroke: '#7048e8', fill: '#f3f0ff', tag: '#5f3dc4' },
  decision: { stroke: '#e67700', fill: '#fff3bf', tag: '#b35000' },
  stop: { stroke: '#e03131', fill: '#fff5f5', tag: '#c92a2a' },
  note: { stroke: '#adb5bd', fill: '#f8f9fa', tag: '#6b7280' },
};

// Status colors (life cycle and stock-state diagrams).
const ST = {
  req: { stroke: '#e67700', fill: '#fff3bf', text: '#6b3500' },
  con: { stroke: '#1864ab', fill: '#d0ebff', text: '#0b3d6e' },
  out: { stroke: '#0c8599', fill: '#c5f6fa', text: '#084c55' },
  ret: { stroke: '#7048e8', fill: '#e5dbff', text: '#3b1f99' },
  done: { stroke: '#2b8a3e', fill: '#d3f9d8', text: '#1b5e2a' },
  bad: { stroke: '#c92a2a', fill: '#ffe3e3', text: '#7d1a1a' },
};

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// "*word*" → bold tspan (inside SVG text).
const fmt = (s) =>
  String(s)
    .split('*')
    .map((p, i) => (i % 2 ? `<tspan font-weight="700">${esc(p)}</tspan>` : esc(p)))
    .join('');

function tagOf(n) {
  if (n.tag !== undefined) return n.tag;
  if (n.kind === 'step') return n.actor;
  if (n.kind === 'stop') return 'STOP';
  if (n.kind === 'note') return 'NOTE';
  if (n.kind === 'decision') return 'QUESTION';
  return '';
}

function sizeOf(n) {
  const k = n.lines.length;
  const tag = tagOf(n) ? 11 : 0;
  switch (n.kind) {
    case 'terminal':
    case 'good':
    case 'bad':
      return { w: 250, h: Math.max(34, 14 + k * LH) };
    case 'decision':
      return { w: 200, h: k >= 2 ? 84 : 70 };
    case 'state':
      return { w: 230, h: 16 + k * LH };
    default:
      return { w: 250, h: 14 + tag + k * LH };
  }
}

function port(n, side, off = 0) {
  const L = n.cx - n.w / 2, R = n.cx + n.w / 2, T = n.cy - n.h / 2, B = n.cy + n.h / 2;
  if (side === 'top') return [n.cx + off, T];
  if (side === 'bottom') return [n.cx + off, B];
  if (side === 'left') return [L, n.cy + off];
  return [R, n.cy + off];
}

function autoVia([x1, y1], s1, [x2, y2], s2) {
  const v1 = s1 === 'top' || s1 === 'bottom';
  const v2 = s2 === 'top' || s2 === 'bottom';
  if (v1 && v2) {
    if (Math.abs(x1 - x2) < 0.5) return [];
    const my = (y1 + y2) / 2;
    return [[x1, my], [x2, my]];
  }
  if (!v1 && !v2) {
    if (Math.abs(y1 - y2) < 0.5) return [];
    const mx = (x1 + x2) / 2;
    return [[mx, y1], [mx, y2]];
  }
  return v1 ? [[x1, y2]] : [[x2, y1]];
}

function roundedPath(raw, r = 7) {
  const pts = raw.filter((p, i) => i === 0 || Math.hypot(p[0] - raw[i - 1][0], p[1] - raw[i - 1][1]) > 0.1);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    const d1 = Math.hypot(x1 - x0, y1 - y0), d2 = Math.hypot(x2 - x1, y2 - y1);
    const rr = Math.min(r, d1 / 2, d2 / 2);
    const ax = x1 - ((x1 - x0) / d1) * rr, ay = y1 - ((y1 - y0) / d1) * rr;
    const bx = x1 + ((x2 - x1) / d2) * rr, by = y1 + ((y2 - y1) / d2) * rr;
    d += ` L${ax.toFixed(1)},${ay.toFixed(1)} Q${x1},${y1} ${bx.toFixed(1)},${by.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  return { d: `${d} L${last[0]},${last[1]}`, pts };
}

function textBlock(n, { color, tag, tagColor, boldFirst = false, align = 'middle' }) {
  const blockH = (tag ? 11 : 0) + n.lines.length * LH;
  const x = align === 'start' ? n.cx - n.w / 2 + 12 : n.cx;
  let y = n.cy - blockH / 2;
  let s = '';
  if (tag) {
    s += `<text x="${x}" y="${(y + 8).toFixed(1)}" text-anchor="${align}" class="tag" fill="${tagColor}">${esc(tag)}</text>`;
    y += 11;
  }
  n.lines.forEach((line, i) => {
    const cls = boldFirst && i === 0 ? 'lbl strong' : 'lbl';
    s += `<text x="${x}" y="${(y + 11.3).toFixed(1)}" text-anchor="${align}" class="${cls}" fill="${color}">${fmt(line)}</text>`;
    y += LH;
  });
  return s;
}

function renderNode(n) {
  const L = n.cx - n.w / 2, T = n.cy - n.h / 2;
  const tag = tagOf(n);
  let s = '';
  if (n.kind === 'terminal' || n.kind === 'good' || n.kind === 'bad') {
    const c = PAL[n.kind];
    s += `<rect x="${L}" y="${T}" width="${n.w}" height="${n.h}" rx="${Math.min(n.h / 2, 22)}" fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.7"/>`;
    s += textBlock(n, { color: c.text });
  } else if (n.kind === 'decision') {
    const c = PAL.decision;
    s += `<polygon points="${n.cx},${T} ${n.cx + n.w / 2},${n.cy} ${n.cx},${T + n.h} ${L},${n.cy}" fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.7" stroke-linejoin="round"/>`;
    s += textBlock(n, { color: '#3d2600', tag, tagColor: c.tag });
  } else if (n.kind === 'state') {
    const c = n.pal;
    s += `<rect x="${L}" y="${T}" width="${n.w}" height="${n.h}" rx="10" fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.8"/>`;
    s += textBlock(n, { color: c.text, boldFirst: true });
  } else {
    const c = n.kind === 'step' ? PAL[n.actor] : PAL[n.kind];
    const dash = n.kind === 'note' ? ' stroke-dasharray="5 4"' : '';
    s += `<rect x="${L}" y="${T}" width="${n.w}" height="${n.h}" rx="8" fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.6"${dash}/>`;
    s += textBlock(n, { color: '#1b2433', tag, tagColor: c.tag, align: n.align ?? 'middle' });
  }
  if (n.num != null) {
    const [bx, by] = n.kind === 'decision' ? [L + 34, T + 12] : [L + 1, T + 1];
    s += `<circle cx="${bx}" cy="${by}" r="9.5" fill="#1b2433" stroke="#fff" stroke-width="1.5"/>`;
    s += `<text x="${bx}" y="${by + 3.6}" text-anchor="middle" class="badge-t">${esc(n.num)}</text>`;
  }
  return s;
}

function renderEdge(e, nodes) {
  const a = nodes[e.from], b = nodes[e.to];
  const fs = e.fs ?? 'bottom', ts = e.ts ?? 'top';
  const p1 = port(a, fs, e.fromOff ?? 0), p2 = port(b, ts, e.toOff ?? 0);
  let via = typeof e.via === 'function' ? e.via(nodes) : e.via;
  if (!via) via = e.direct ? [] : autoVia(p1, fs, p2, ts);
  const { d, pts } = roundedPath([p1, ...via, p2]);
  const dash = e.dashed ? ' stroke-dasharray="5 4"' : '';
  const marker = e.arrow === false ? '' : ' marker-end="url(#arr)"';
  const color = e.color ?? '#495057';
  let s = `<path d="${d}" fill="none" stroke="${color}" stroke-width="1.6"${dash}${marker}/>`;
  if (e.label) {
    let x, y, anchor;
    if (e.labelAt) {
      [x, y] = e.labelAt;
      anchor = e.anchor ?? 'middle';
    } else {
      const [[x1, y1], [x2, y2]] = pts;
      if (Math.abs(x1 - x2) < 0.5) {
        x = x1 + 7; y = y1 + (y2 > y1 ? 15 : -8); anchor = 'start';
      } else {
        const dir = x2 > x1 ? 1 : -1;
        x = x1 + dir * 7; y = y1 - 6; anchor = dir > 0 ? 'start' : 'end';
      }
    }
    const lines = Array.isArray(e.label) ? e.label : [e.label];
    s += `<text x="${x}" y="${y}" text-anchor="${anchor}" class="elabel">`;
    lines.forEach((l, i) => { s += `<tspan x="${x}" dy="${i ? 12.5 : 0}">${fmt(l)}</tspan>`; });
    s += '</text>';
  }
  return s;
}

function Flow({ width = 680, pad = 12 } = {}) {
  const nodes = {}, edges = [], decor = [], overlay = [];
  const f = {
    nodes,
    node(id, kind, lines, o = {}) {
      const n = { id, kind, lines: Array.isArray(lines) ? lines : [lines], ...o };
      const s = sizeOf(n);
      n.w ??= s.w;
      n.h ??= s.h;
      nodes[id] = n;
      return f;
    },
    at(id, cx, cy) { nodes[id].cx = cx; nodes[id].cy = cy; return f; },
    stack(ids, { y = pad, gap = 18, gaps = {} } = {}) {
      for (const id of ids) {
        const n = nodes[id];
        if (gaps[id] != null) y += gaps[id] - gap;
        n.cy = y + n.h / 2;
        y += n.h + gap;
      }
      return f;
    },
    align(id, ref, dy = 0) { nodes[id].cy = nodes[ref].cy + dy; return f; },
    below(id, ref, gap = 18) {
      const r = nodes[ref], n = nodes[id];
      n.cy = r.cy + r.h / 2 + gap + n.h / 2;
      return f;
    },
    edge(from, to, o = {}) { edges.push({ from, to, ...o }); return f; },
    decor(svg) { decor.push(svg); return f; },
    overlay(svg) { overlay.push(svg); return f; },
    svg(title, { minHeight = 0 } = {}) {
      let maxY = minHeight;
      for (const n of Object.values(nodes)) maxY = Math.max(maxY, n.cy + n.h / 2 + pad);
      const H = Math.ceil(maxY);
      return `<svg viewBox="0 0 ${width} ${H}" role="img" aria-label="${esc(title)}" xmlns="http://www.w3.org/2000/svg">`
        + decor.join('')
        + Object.values(nodes).map(renderNode).join('')
        + edges.map((e) => renderEdge(e, nodes)).join('')
        + overlay.join('')
        + '</svg>';
    },
  };
  return f;
}

// Route helper: leave a side node downward and join the main flow just above a target's top.
const joinTop = (from, to, lift = 12) => (N) => [
  [N[from].cx, N[to].cy - N[to].h / 2 - lift],
  [N[to].cx, N[to].cy - N[to].h / 2 - lift],
];

// ─── Diagrams ────────────────────────────────────────────────────────────────

function legendSvg() {
  const f = Flow();
  f.node('t', 'terminal', 'Start / End', { w: 200 })
    .node('c', 'step', 'Done by the customer', { actor: 'CUSTOMER', w: 200 })
    .node('a', 'step', 'Done by you (admin)', { actor: 'ADMIN', w: 200 })
    .node('s', 'step', 'Done by the system', { actor: 'SYSTEM', w: 200 })
    .node('d', 'decision', 'Yes or No?', { w: 190 })
    .node('x', 'stop', 'Problem: fix it first', { w: 200 })
    .node('b', 'bad', 'Ends early (not completed)', { w: 200 })
    .node('n', 'note', 'Extra information', { w: 200 })
    .node('k', 'note', 'Numbers match the text', { w: 200, tag: 'STEP NUMBER', num: 1 });
  f.at('t', 110, 30).at('c', 340, 30).at('a', 570, 30)
    .at('s', 110, 112).at('d', 340, 112).at('x', 570, 112)
    .at('b', 110, 192).at('n', 340, 192).at('k', 570, 192);
  return f.svg('Flowchart legend');
}

function overviewSvg() {
  const f = Flow();
  const L = 175, R = 522;
  f.node('s', 'terminal', 'Customer visits the website', { cx: L, w: 300 })
    .node('l1', 'step', ['Picks items, event date, start', 'time and number of days'], { actor: 'CUSTOMER', cx: L, w: 300 })
    .node('l2', 'step', 'Sends a reservation request', { actor: 'CUSTOMER', cx: L, w: 300 })
    .node('l3', 'step', ['Reviews, collects the downpayment', 'and confirms the booking'], { actor: 'ADMIN', cx: L, w: 300 })
    .node('l4', 'step', 'Delivers the items (dispatch)', { actor: 'ADMIN', cx: L, w: 300 })
    .node('l5', 'step', ['Uses the items', '(22 hours per rental day)'], { actor: 'CUSTOMER', cx: L, w: 300 })
    .node('l6', 'step', ['Picks up, checks and tests', 'the items (check-in)'], { actor: 'ADMIN', cx: L, w: 300 })
    .node('e', 'terminal', 'Fully paid: *COMPLETED*', { cx: L, w: 300 })
    .node('r1', 'step', ['Shows how many are free', 'for that exact time'], { actor: 'SYSTEM', cx: R, w: 290 })
    .node('r2', 'step', ['Checks stock again before', 'saving the request'], { actor: 'SYSTEM', cx: R, w: 290 })
    .node('r3', 'step', ['Holds the items for this booking;', 'no one else can book them'], { actor: 'SYSTEM', cx: R, w: 290 })
    .node('r4', 'step', ['Records which units went out', '(e.g. videoke VK-02)'], { actor: 'SYSTEM', cx: R, w: 290 })
    .node('r6', 'step', ['Updates stock: good → back,', 'damaged → repair, missing → lost'], { actor: 'SYSTEM', cx: R, w: 290 });
  f.stack(['s', 'l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'e'], { y: 40, gap: 20 });
  f.align('r1', 'l1').align('r2', 'l2').align('r3', 'l3').align('r4', 'l4').align('r6', 'l6');
  for (const [a, b] of [['s', 'l1'], ['l1', 'l2'], ['l2', 'l3'], ['l3', 'l4'], ['l4', 'l5'], ['l5', 'l6'], ['l6', 'e']]) f.edge(a, b);
  for (const [a, b] of [['l1', 'r1'], ['l2', 'r2'], ['l3', 'r3'], ['l4', 'r4'], ['l6', 'r6']]) {
    f.edge(a, b, { fs: 'right', ts: 'left', dashed: true, arrow: false, color: '#7048e8' });
  }
  f.decor(`<text x="${L}" y="20" text-anchor="middle" class="hdr">RESERVATION MODULE</text>`)
    .decor(`<text x="${R}" y="20" text-anchor="middle" class="hdr">INVENTORY MODULE</text>`)
    .decor(`<line x1="348" y1="8" x2="348" y2="600" stroke="#dee2e6" stroke-width="1" stroke-dasharray="2 4"/>`);
  return f.svg('The big picture: reservation and inventory modules');
}

function timelineSvg() {
  const x0 = 40, x2 = 640, x1 = x0 + (22 / 24) * (x2 - x0);
  return `<svg viewBox="0 0 680 190" role="img" aria-label="The 22-hour rule timeline" xmlns="http://www.w3.org/2000/svg">
    <text x="${x1 + (x2 - x1) / 2}" y="30" text-anchor="middle" class="small" fill="#5f3dc4">2 hours: pickup,</text>
    <text x="${x1 + (x2 - x1) / 2}" y="44" text-anchor="middle" class="small" fill="#5f3dc4">check &amp; test</text>
    <line x1="${x1 + (x2 - x1) / 2}" y1="50" x2="${x1 + (x2 - x1) / 2}" y2="72" stroke="#7048e8" stroke-width="1.2"/>
    <rect x="${x0}" y="76" width="${x1 - x0}" height="34" rx="6" fill="#c5f6fa" stroke="#0c8599" stroke-width="1.6"/>
    <text x="${(x0 + x1) / 2}" y="98" text-anchor="middle" class="lbl strong" fill="#084c55">22 hours with the customer</text>
    <rect x="${x1}" y="76" width="${x2 - x1}" height="34" rx="6" fill="#e5dbff" stroke="#7048e8" stroke-width="1.6"/>
    <line x1="${x0}" y1="110" x2="${x0}" y2="122" stroke="#1b2433" stroke-width="1.6"/>
    <line x1="${x1}" y1="110" x2="${x1}" y2="122" stroke="#1b2433" stroke-width="1.6"/>
    <line x1="${x2}" y1="110" x2="${x2}" y2="156" stroke="#1b2433" stroke-width="1.6"/>
    <text x="${x0}" y="138" text-anchor="start" class="axis">Oct 10, 8:00 AM</text>
    <text x="${x0}" y="152" text-anchor="start" class="small" fill="#495057">Delivery (the start time)</text>
    <text x="${x1 - 4}" y="138" text-anchor="end" class="axis">Oct 11, 6:00 AM</text>
    <text x="${x1 - 4}" y="152" text-anchor="end" class="small" fill="#495057">Pickup</text>
    <text x="${x2}" y="170" text-anchor="end" class="axis">Oct 11, 8:00 AM</text>
    <text x="${x2}" y="184" text-anchor="end" class="small" fill="#495057">Free for the next customer</text>
  </svg>`;
}

function a1Svg() {
  const f = Flow();
  const M = 230, S = 522, W = 260, SW = 236;
  f.node('s', 'terminal', 'Customer opens the website', { cx: M, w: W })
    .node('n1', 'step', ['Browse the catalog', '(no account needed)'], { actor: 'CUSTOMER', cx: M, w: W, num: 1 })
    .node('n2', 'step', ['Set the event date, start time', '(8 AM–5 PM) and number of days'], { actor: 'CUSTOMER', cx: M, w: W, num: 2 })
    .node('n3', 'step', ['Show the price and how many', 'are free for that exact time'], { actor: 'SYSTEM', cx: M, w: W, num: 3 })
    .node('n4', 'step', 'Add items or packages to the cart', { actor: 'CUSTOMER', cx: M, w: W, num: 4 })
    .node('d5', 'decision', 'Signed in?', { cx: M, num: 5 })
    .node('s5', 'step', ['Sign in (Google or email).', 'First time: add your name and', 'mobile number, and accept', 'the privacy notice'], { actor: 'CUSTOMER', cx: S, w: SW })
    .node('n6', 'step', ['Enter venue address, landmark,', 'notes, and promo code (optional)'], { actor: 'CUSTOMER', cx: M, w: W, num: 6 })
    .node('d7', 'decision', ['Promo code OK?', '(if entered)'], { cx: M, tag: 'SYSTEM CHECK', num: 7 })
    .node('s7', 'stop', ['“Code not valid”: remove', 'or fix the code'], { cx: S, w: SW })
    .node('n8', 'step', 'Tap “Send request”', { actor: 'CUSTOMER', cx: M, w: W, num: 8 })
    .node('d9', 'decision', ['Still enough', 'stock now?'], { cx: M, tag: 'SYSTEM CHECK', num: 9 })
    .node('s9', 'stop', ['“Only X left for that time”:', 'change the cart (step 4)'], { cx: S, w: SW })
    .node('n10', 'step', ['Save as *REQUESTED* with a code', '(e.g. KSB-7Q4M); notify admins'], { actor: 'SYSTEM', cx: M, w: W, num: 10 })
    .node('e', 'terminal', ['Customer waits for review, then', 'pays the downpayment when asked'], { cx: M, w: W });
  f.stack(['s', 'n1', 'n2', 'n3', 'n4', 'd5', 'n6', 'd7', 'n8', 'd9', 'n10', 'e'], { gaps: { n6: 30 } });
  f.align('s5', 'd5').align('s7', 'd7').align('s9', 'd9');
  f.edge('s', 'n1').edge('n1', 'n2').edge('n2', 'n3').edge('n3', 'n4').edge('n4', 'd5')
    .edge('d5', 'n6', { label: 'Yes' })
    .edge('d5', 's5', { fs: 'right', ts: 'left', label: 'No' })
    .edge('s5', 'n6', { fs: 'bottom', ts: 'right', toOff: -9 })
    .edge('n6', 'd7')
    .edge('d7', 'n8', { label: 'Yes' })
    .edge('d7', 's7', { fs: 'right', ts: 'left', label: 'No' })
    .edge('s7', 'n6', { fs: 'top', ts: 'right', toOff: 9 })
    .edge('n8', 'd9')
    .edge('d9', 'n10', { label: 'Yes' })
    .edge('d9', 's9', { fs: 'right', ts: 'left', label: 'No' })
    .edge('s9', 'n4', { fs: 'right', ts: 'right', via: (N) => [[664, N.s9.cy], [664, N.n4.cy]] })
    .edge('n10', 'e');
  return f.svg('A1 flowchart: customer sends a reservation request');
}

function a2Svg() {
  const f = Flow();
  const M = 355, Lc = 105, Rc = 585;
  f.node('s', 'terminal', 'New request notification', { cx: M })
    .node('n1', 'step', ['Open the request: items, time,', 'venue and customer details'], { actor: 'ADMIN', cx: M, num: 1 })
    .node('n2', 'step', ['Each item shows green (enough)', 'or red (not enough)'], { actor: 'SYSTEM', cx: M, num: 2 })
    .node('d3', 'decision', 'All green?', { cx: M, num: 3 })
    .node('d4', 'decision', 'Can it be fixed?', { cx: Lc, w: 180, tag: 'ADMIN DECIDES', num: 4 })
    .node('s5', 'step', ['Edit the request:', 'fewer items, other', 'time or other item'], { actor: 'ADMIN', cx: Lc, w: 180, num: 5 })
    .node('x', 'bad', ['Decline with', 'a reason (the', 'customer is told)'], { cx: Lc, w: 180 })
    .node('n6', 'step', ['Add a delivery charge or', 'discount if needed (optional)'], { actor: 'ADMIN', cx: M, num: 6 })
    .node('n7', 'step', ['Ask the customer to pay the', 'downpayment (GCash, bank, cash)'], { actor: 'ADMIN', cx: M, num: 7 })
    .node('e', 'terminal', ['Next: confirm with the', 'downpayment (see A3)'], { cx: M })
    .node('note', 'note', ['Requests don’t hold', 'stock yet. Confirm', 'soon so no one else', 'takes the items.'], { cx: Rc, w: 170 });
  f.stack(['s', 'n1', 'n2', 'd3', 'n6', 'n7', 'e'], { gaps: { d3: 46 } });
  f.align('s5', 'n2').align('d4', 'd3').below('x', 'd4', 22).align('note', 'n6', 10);
  f.edge('s', 'n1').edge('n1', 'n2').edge('n2', 'd3')
    .edge('d3', 'n6', { label: 'Yes' })
    .edge('d3', 'd4', { fs: 'left', ts: 'right', label: 'No' })
    .edge('d4', 's5', { fs: 'top', ts: 'bottom', label: 'Yes' })
    .edge('s5', 'n2', { fs: 'right', ts: 'left' })
    .edge('d4', 'x', { label: 'No' })
    .edge('n6', 'n7').edge('n7', 'e');
  return f.svg('A2 flowchart: admin reviews a request');
}

function a3Svg() {
  const f = Flow();
  const M = 250, S = 540, SW = 230;
  f.node('s', 'terminal', ['The customer has paid', 'the downpayment'], { cx: M, w: 260 })
    .node('n1', 'step', ['Open the booking, tap “Record', 'downpayment & confirm”'], { actor: 'ADMIN', cx: M, w: 260, num: 1 })
    .node('n2', 'step', ['Enter the amount, method', '(GCash, bank, cash), reference'], { actor: 'ADMIN', cx: M, w: 260, num: 2 })
    .node('d3', 'decision', 'Paid enough?', { cx: M, tag: 'SYSTEM CHECK', num: 3 })
    .node('s3', 'stop', ['Shows how much is still', 'needed. Nothing is saved.'], { cx: S, w: SW })
    .node('d4', 'decision', ['Promo still has', 'uses left?'], { cx: M, tag: 'SYSTEM CHECK', num: 4 })
    .node('s4', 'stop', ['Limit reached: remove the', 'code or give a manual', 'discount. Nothing is saved.'], { cx: S, w: SW })
    .node('d5', 'decision', ['Items still', 'available?'], { cx: M, tag: 'SYSTEM CHECK', num: 5 })
    .node('s5', 'stop', ['Shows what’s short. Nothing', 'is saved. Fix it with the', 'customer (see A2).'], { cx: S, w: SW })
    .node('n6', 'step', ['*CONFIRMED*: payment saved,', 'items held for this booking,', 'promo use counted'], { actor: 'SYSTEM', cx: M, w: 260, num: 6 })
    .node('e', 'terminal', ['Customer gets “Booking', 'confirmed” notification'], { cx: M, w: 260 })
    .node('note', 'note', ['All or nothing: if a check', 'fails, nothing is saved, not', 'even the payment. Fix it and', 'tap confirm again.'], { cx: S, w: SW });
  f.stack(['s', 'n1', 'n2', 'd3', 'd4', 'd5', 'n6', 'e']);
  f.align('s3', 'd3').align('s4', 'd4').align('s5', 'd5').below('note', 's5', 22);
  f.edge('s', 'n1').edge('n1', 'n2').edge('n2', 'd3')
    .edge('d3', 'd4', { label: 'Yes' })
    .edge('d3', 's3', { fs: 'right', ts: 'left', label: 'No' })
    .edge('s3', 'n2', { fs: 'top', ts: 'right' })
    .edge('d4', 'd5', { label: 'Yes (or no promo)' })
    .edge('d4', 's4', { fs: 'right', ts: 'left', label: 'No' })
    .edge('s4', 'n1', { fs: 'right', ts: 'right', via: (N) => [[668, N.s4.cy], [668, N.n1.cy]] })
    .edge('d5', 'n6', { label: 'Yes' })
    .edge('d5', 's5', { fs: 'right', ts: 'left', label: 'No' })
    .edge('n6', 'e');
  return f.svg('A3 flowchart: admin confirms with the downpayment');
}

function statusSvg() {
  const f = Flow();
  const M = 270, R = 555;
  const st = (id, lines, pal, cx, w = 240) => f.node(id, 'state', lines, { pal, cx, w });
  st('req', ['REQUESTED', 'Sent by the customer.', 'No stock held yet.'], ST.req, M);
  st('con', ['CONFIRMED', 'Downpayment is in.', 'The items are held.'], ST.con, M);
  st('out', ['OUT', 'Delivered. The items are', 'with the customer.'], ST.out, M);
  st('ret', ['RETURNED', 'Picked up and checked;', 'balance not yet paid.'], ST.ret, M);
  st('done', ['COMPLETED', 'Picked up, checked', 'and fully paid.'], ST.done, M);
  st('early', ['ENDS EARLY', 'DECLINED: admin said no', 'CANCELLED: customer/admin', 'EXPIRED: time passed'], ST.bad, R, 230);
  st('canc', ['CANCELLED', 'After confirmation, by', 'admin only; refund if any'], ST.bad, R, 230);
  f.at('req', M, 66).at('con', M, 176).at('out', M, 286).at('ret', M, 396).at('done', M, 506)
    .at('early', R, 66).at('canc', R, 176);
  const mid = (a, b) => (f.nodes[a].cy + f.nodes[a].h / 2 + f.nodes[b].cy - f.nodes[b].h / 2) / 2;
  const left = M - 12;
  f.edge('req', 'con', { label: ['Downpayment recorded', '+ admin confirms'], labelAt: [left, mid('req', 'con') - 3], anchor: 'end' })
    .edge('con', 'out', { label: ['Admin dispatches', '(delivery)'], labelAt: [left, mid('con', 'out') - 3], anchor: 'end' })
    .edge('out', 'ret', { label: ['Admin checks in', 'after pickup'], labelAt: [left, mid('out', 'ret') - 3], anchor: 'end' })
    .edge('ret', 'done', { label: ['Balance reaches ₱0', '(automatic)'], labelAt: [left, mid('ret', 'done') - 3], anchor: 'end' })
    .edge('req', 'early', { fs: 'right', ts: 'left' })
    .edge('con', 'canc', { fs: 'right', ts: 'left' })
    .edge('out', 'out', { fs: 'left', ts: 'left', fromOff: -9, toOff: 9, via: (N) => [[N.out.cx - N.out.w / 2 - 26, N.out.cy - 9], [N.out.cx - N.out.w / 2 - 26, N.out.cy + 9]], label: ['Extend:', 'add days'], labelAt: [M - 120 - 32, 283], anchor: 'end' });
  return f.svg('A4 diagram: booking statuses');
}

function a5Svg() {
  const f = Flow();
  const M = 250, S = 545, SW = 220;
  f.node('s', 'terminal', 'Morning: open today’s run list', { cx: M, w: 260 })
    .node('n1', 'step', ['Lists deliveries and pickups in', 'time order: items to load and', 'balance to collect'], { actor: 'SYSTEM', cx: M, w: 260, num: 1 })
    .node('n2', 'step', 'Load the items for each delivery', { actor: 'ADMIN', cx: M, w: 260, num: 2 })
    .node('n3', 'step', ['Pick the exact units for tracked', 'items (e.g. videoke VK-01)'], { actor: 'ADMIN', cx: M, w: 260, num: 3 })
    .node('d4', 'decision', ['Unit free and', 'in service?'], { cx: M, tag: 'SYSTEM CHECK', num: 4 })
    .node('s4', 'stop', 'Pick a different unit', { cx: S, w: SW })
    .node('n5', 'step', ['Tick the inclusions checklist', '(mics, remote, cables…)'], { actor: 'ADMIN', cx: M, w: 260, num: 5 })
    .node('n6', 'step', 'Tap “Dispatch”', { actor: 'ADMIN', cx: M, w: 260, num: 6 })
    .node('n7', 'step', ['Status → *OUT*. Units marked out.', 'Customer gets “Out for delivery”'], { actor: 'SYSTEM', cx: M, w: 260, num: 7 })
    .node('n8', 'step', ['Deliver and set up by the', 'start time'], { actor: 'ADMIN', cx: M, w: 260, num: 8 })
    .node('d9', 'decision', ['Balance paid', 'now?'], { cx: M, num: 9 })
    .node('s9', 'step', ['Record the payment (amount,', 'method, reference number)'], { actor: 'ADMIN', cx: S, w: SW })
    .node('e', 'terminal', ['Items stay with the customer', 'until pickup'], { cx: M, w: 260 });
  f.stack(['s', 'n1', 'n2', 'n3', 'd4', 'n5', 'n6', 'n7', 'n8', 'd9', 'e'], { gaps: { e: 40 } });
  f.align('s4', 'd4').align('s9', 'd9');
  f.edge('s', 'n1').edge('n1', 'n2').edge('n2', 'n3').edge('n3', 'd4')
    .edge('d4', 'n5', { label: 'Yes' })
    .edge('d4', 's4', { fs: 'right', ts: 'left', label: 'No' })
    .edge('s4', 'n3', { fs: 'top', ts: 'right' })
    .edge('n5', 'n6').edge('n6', 'n7').edge('n7', 'n8').edge('n8', 'd9')
    .edge('d9', 'e', { label: 'No: pay later' })
    .edge('d9', 's9', { fs: 'right', ts: 'left', label: 'Yes' })
    .edge('s9', 'e', { fs: 'bottom', ts: 'right' });
  return f.svg('A5 flowchart: delivery day (dispatch)');
}

function a6Svg() {
  const f = Flow();
  const M = 250, S = 545, SW = 220;
  f.node('s', 'terminal', 'Customer asks for more days', { cx: M, w: 260 })
    .node('n1', 'step', ['Open the booking (status OUT),', 'tap “Extend” and add days'], { actor: 'ADMIN', cx: M, w: 260, num: 1 })
    .node('d2', 'decision', ['Extra time', 'OK?'], { cx: M, tag: 'SYSTEM CHECK', num: 2 })
    .node('s2', 'stop', ['Can’t extend: the items are', 'booked by someone else, or', 'it would pass 30 days.', 'Offer another item instead.'], { cx: S, w: SW })
    .node('n3', 'step', ['Moves the pickup time and adds', 'the extra days to the price'], { actor: 'SYSTEM', cx: M, w: 260, num: 3 })
    .node('n4', 'step', ['Tell the customer the new', 'pickup time and balance'], { actor: 'ADMIN', cx: M, w: 260, num: 4 })
    .node('e', 'terminal', 'Pickup happens at the new time', { cx: M, w: 260 });
  f.stack(['s', 'n1', 'd2', 'n3', 'n4', 'e']);
  f.align('s2', 'd2');
  f.edge('s', 'n1').edge('n1', 'd2')
    .edge('d2', 'n3', { label: 'Yes' })
    .edge('d2', 's2', { fs: 'right', ts: 'left', label: 'No' })
    .edge('n3', 'n4').edge('n4', 'e');
  return f.svg('A6 flowchart: extending a rental');
}

function b1Svg() {
  const f = Flow();
  const M = 245, S = 560, NW = 200;
  f.node('s', 'terminal', ['Question: can we rent N of this', 'item for this exact time?'], { cx: M, w: 270 })
    .node('n1', 'step', ['Count usable units: in service', 'only (repair doesn’t count)'], { actor: 'SYSTEM', cx: M, w: 270, num: 1 })
    .node('n2', 'step', ['Find confirmed and out bookings', 'that overlap that time'], { actor: 'SYSTEM', cx: M, w: 270, num: 2 })
    .node('n3', 'step', ['Find the busiest moment', '(most units in use at once)'], { actor: 'SYSTEM', cx: M, w: 270, num: 3 })
    .node('n4', 'step', 'Free = usable − busiest moment', { actor: 'SYSTEM', cx: M, w: 270, num: 4 })
    .node('n5', 'step', ['Add up what the cart needs:', 'package contents + extra items'], { actor: 'SYSTEM', cx: M, w: 270, num: 5 })
    .node('d6', 'decision', ['Enough for', 'every item?'], { cx: M, tag: 'SYSTEM CHECK', num: 6 })
    .node('ok', 'good', 'Yes: it can be reserved', { cx: M, w: 270 })
    .node('no', 'bad', ['No: “Only X left” plus', 'the busiest time'], { cx: S, w: 210 })
    .node('nc', 'note', ['Asked when a customer', 'browses or sends a', 'request, and when you', 'confirm, edit or extend.'], { cx: S, w: NW })
    .node('na', 'note', ['Requests don’t count.', 'Only confirmed and out', 'bookings hold stock.'], { cx: S, w: NW })
    .node('nb', 'note', ['Late items that aren’t', 'checked in yet count', 'as still out.'], { cx: S, w: NW });
  f.stack(['s', 'n1', 'n2', 'n3', 'n4', 'n5', 'd6', 'ok']);
  f.align('na', 'n2').align('nb', 'n4').align('no', 'd6');
  f.nodes.nc.cy = 12 + f.nodes.nc.h / 2;
  f.edge('s', 'n1').edge('n1', 'n2').edge('n2', 'n3').edge('n3', 'n4').edge('n4', 'n5').edge('n5', 'd6')
    .edge('d6', 'ok', { label: 'Yes' })
    .edge('d6', 'no', { fs: 'right', ts: 'left', label: 'No' })
    .edge('nc', 's', { fs: 'left', ts: 'right', dashed: true, arrow: false, color: '#adb5bd' })
    .edge('na', 'n2', { fs: 'left', ts: 'right', dashed: true, arrow: false, color: '#adb5bd' })
    .edge('nb', 'n4', { fs: 'left', ts: 'right', dashed: true, arrow: false, color: '#adb5bd' });
  return f.svg('B1 flowchart: how the system checks availability');
}

function busiestSvg() {
  const x0 = 130, x1 = 650, hours = 30, px = (x1 - x0) / hours;
  const X = (h) => +(x0 + h * px).toFixed(1);
  const base = 262, perChair = 1.2, Y = (n) => +(base - n * perChair).toFixed(1);
  const bar = (label, from, to, y, fill, stroke, textColor, dashed = false) =>
    `<rect x="${X(from)}" y="${y}" width="${X(to) - X(from)}" height="24" rx="5" fill="${fill}" stroke="${stroke}" stroke-width="1.6"${dashed ? ' stroke-dasharray="6 4"' : ''}/>`
    + `<text x="${(X(from) + X(to)) / 2}" y="${y + 16}" text-anchor="middle" class="small" fill="${textColor}">${label}</text>`;
  const step = `M${X(0)},${base} L${X(0)},${Y(60)} L${X(6)},${Y(60)} L${X(6)},${Y(90)} L${X(24)},${Y(90)} L${X(24)},${Y(30)} L${X(30)},${Y(30)} L${X(30)},${base} Z`;
  const ticks = [[0, '8 AM'], [4, '12 PM'], [6, '2 PM'], [24, '8 AM'], [28, '12 PM'], [30, '2 PM']]
    .map(([h, t]) => `<line x1="${X(h)}" y1="${base}" x2="${X(h)}" y2="${base + 6}" stroke="#495057"/><text x="${X(h)}" y="${base + 19}" text-anchor="middle" class="axis">${t}</text>`)
    .join('');
  return `<svg viewBox="0 0 680 305" role="img" aria-label="B2 example: finding the busiest moment" xmlns="http://www.w3.org/2000/svg">
    <rect x="${X(4)}" y="8" width="${X(28) - X(4)}" height="${base - 8}" fill="#fff3bf" opacity=".55"/>
    <text x="10" y="32" class="lbl strong" fill="#1b2433">Booking A</text>
    <text x="10" y="70" class="lbl strong" fill="#1b2433">Booking B</text>
    <text x="10" y="108" class="lbl strong" fill="#1b2433">New request</text>
    <text x="10" y="200" class="lbl strong" fill="#1b2433">Chairs in use</text>
    <text x="10" y="215" class="small" fill="#495057">(you own 100)</text>
    ${bar('A: 60 chairs · Oct 10, 8 AM → Oct 11, 8 AM', 0, 24, 14, '#c5f6fa', '#0c8599', '#084c55')}
    ${bar('B: 30 chairs · Oct 10, 2 PM → Oct 11, 2 PM', 6, 30, 52, '#c5f6fa', '#0c8599', '#084c55')}
    ${bar('New: 20 chairs · Oct 10, 12 PM → Oct 11, 12 PM', 4, 28, 90, '#fff9db', '#e67700', '#6b3500', true)}
    <path d="${step}" fill="#dbe4ff" stroke="#364fc7" stroke-width="1.8"/>
    <line x1="${X(0)}" y1="${Y(100)}" x2="${X(30)}" y2="${Y(100)}" stroke="#e03131" stroke-width="1.6" stroke-dasharray="6 4"/>
    <text x="${X(30)}" y="${Y(100) - 5}" text-anchor="end" class="small" fill="#c92a2a">100 chairs owned</text>
    <text x="${(X(0) + X(6)) / 2}" y="${Y(60) + 17}" text-anchor="middle" class="small" fill="#1b2433">60 in use</text>
    <text x="${(X(6) + X(24)) / 2}" y="${Y(90) + 17}" text-anchor="middle" class="lbl strong" fill="#1b2433">90 in use: the busiest moment → only 10 free</text>
    <text x="${(X(24) + X(30)) / 2}" y="${Y(30) + 17}" text-anchor="middle" class="small" fill="#1b2433">30 in use</text>
    <line x1="${X(0)}" y1="${base}" x2="${X(30)}" y2="${base}" stroke="#495057" stroke-width="1.2"/>
    ${ticks}
    <text x="${X(0)}" y="${base + 34}" text-anchor="start" class="axis">Oct 10</text>
    <text x="${X(24)}" y="${base + 34}" text-anchor="middle" class="axis">Oct 11</text>
  </svg>`;
}

function countedStatesSvg() {
  const f = Flow();
  f.node('new', 'terminal', ['New stock', 'bought'], { w: 110 })
    .node('svc', 'state', ['IN SERVICE', 'Can be rented'], { pal: ST.done, w: 180 })
    .node('rep', 'state', ['IN REPAIR', 'Not rentable until fixed'], { pal: ST.req, w: 180 })
    .node('off', 'state', ['WRITTEN OFF', 'Lost or broken for good;', 'removed from stock'], { pal: ST.bad, w: 220 });
  f.at('new', 68, 64).at('svc', 285, 64).at('rep', 580, 64).at('off', 437, 196);
  f.edge('new', 'svc', { fs: 'right', ts: 'left', label: 'Add stock' })
    .edge('svc', 'rep', { fs: 'right', ts: 'left', fromOff: -9, toOff: -9, label: 'Send to repair', labelAt: [432, 49] })
    .edge('rep', 'svc', { fs: 'left', ts: 'right', fromOff: 9, toOff: 9, label: 'Back from repair', labelAt: [432, 90] })
    .edge('svc', 'off', { fs: 'bottom', ts: 'left', label: 'Write off', labelAt: [291, 150], anchor: 'start' })
    .edge('rep', 'off', { fs: 'bottom', ts: 'right', label: 'Can’t be fixed', labelAt: [586, 150], anchor: 'start' });
  return f.svg('B3 diagram: stock states for counted items');
}

function unitStatesSvg() {
  const f = Flow();
  f.node('svc', 'state', ['IN SERVICE', 'At the shop, ready to rent'], { pal: ST.done })
    .node('out', 'state', ['OUT WITH CUSTOMER', 'Assigned to a booking'], { pal: ST.out })
    .node('rep', 'state', ['IN REPAIR', 'Not rentable until fixed'], { pal: ST.req })
    .node('ret', 'state', ['RETIRED', 'Lost, sold or beyond repair'], { pal: ST.bad });
  f.at('svc', 170, 58).at('out', 510, 58).at('rep', 170, 232).at('ret', 510, 232);
  f.edge('svc', 'out', { fs: 'right', ts: 'left', fromOff: -9, toOff: -9, label: 'Dispatch' })
    .edge('out', 'svc', { fs: 'left', ts: 'right', fromOff: 9, toOff: 9, label: 'Check-in: good', labelAt: [340, 91] })
    .edge('out', 'ret', { fs: 'bottom', ts: 'top', fromOff: 40, toOff: 40, label: 'Check-in: missing', labelAt: [557, 150], anchor: 'start' })
    .edge('out', 'rep', { fs: 'bottom', ts: 'top', fromOff: -60, toOff: 60, via: [[450, 148], [230, 148]], label: 'Check-in: damaged', labelAt: [340, 141] })
    .edge('rep', 'svc', { fs: 'top', ts: 'bottom', fromOff: -50, toOff: -50, label: 'Fixed', labelAt: [113, 152], anchor: 'end' })
    .edge('rep', 'ret', { fs: 'right', ts: 'left', label: 'Can’t be fixed' });
  return f.svg('B3 diagram: states of a tracked unit');
}

function b4Svg() {
  const f = Flow();
  const M = 235, S = 540, SW = 230;
  f.node('s', 'terminal', ['Pickup time (e.g. 6:00 AM),', 'shown on the run list'], { cx: M, w: 260 })
    .node('n1', 'step', ['Pick up all the items and', 'bring them back to the shop'], { actor: 'ADMIN', cx: M, w: 260, num: 1 })
    .node('n2', 'step', ['Tap “Check-in”: count good,', 'damaged, missing; test units'], { actor: 'ADMIN', cx: M, w: 260, num: 2 })
    .node('d3', 'decision', ['Anything', 'damaged?'], { cx: M, num: 3 })
    .node('s3', 'step', ['Moves it to *IN REPAIR*. You', 'enter a damage charge (the', 'replacement cost is a guide)'], { actor: 'SYSTEM', cx: S, w: SW })
    .node('d4', 'decision', ['Anything', 'missing?'], { cx: M, num: 4 })
    .node('s4', 'step', ['Writes it off from stock and', 'adds a charge = replacement', 'cost (you can edit it)'], { actor: 'SYSTEM', cx: S, w: SW })
    .node('d5', 'decision', ['Checked in over', '1 hour late?'], { cx: M, tag: 'SYSTEM CHECK', num: 5 })
    .node('s5', 'step', ['Suggests a late charge. Waive', 'it if the delay wasn’t the', 'customer’s fault.'], { actor: 'SYSTEM', cx: S, w: SW })
    .node('n6', 'step', ['Releases the hold: the items', 'are free for new bookings'], { actor: 'SYSTEM', cx: M, w: 260, num: 6 })
    .node('d7', 'decision', ['Balance', 'is ₱0?'], { cx: M, tag: 'SYSTEM CHECK', num: 7 })
    .node('s7', 'step', ['Status: *RETURNED*, waiting', 'for the payment'], { actor: 'SYSTEM', cx: S, w: SW })
    .node('s7b', 'step', ['Record the payment when', 'the customer pays'], { actor: 'ADMIN', cx: S, w: SW })
    .node('e', 'terminal', '*COMPLETED*', { cx: M, w: 260 });
  f.stack(['s', 'n1', 'n2', 'd3', 'd4', 'd5', 'n6', 'd7', 'e'], { gaps: { d4: 30, d5: 30, n6: 30, e: 76 } });
  f.align('s3', 'd3').align('s4', 'd4').align('s5', 'd5').align('s7', 'd7').below('s7b', 's7');
  f.edge('s', 'n1').edge('n1', 'n2').edge('n2', 'd3')
    .edge('d3', 's3', { fs: 'right', ts: 'left', label: 'Yes' })
    .edge('d3', 'd4', { label: 'No' })
    .edge('s3', 'd4', { fs: 'bottom', ts: 'top', via: joinTop('s3', 'd4') })
    .edge('d4', 's4', { fs: 'right', ts: 'left', label: 'Yes' })
    .edge('d4', 'd5', { label: 'No' })
    .edge('s4', 'd5', { fs: 'bottom', ts: 'top', via: joinTop('s4', 'd5') })
    .edge('d5', 's5', { fs: 'right', ts: 'left', label: 'Yes' })
    .edge('d5', 'n6', { label: 'No' })
    .edge('s5', 'n6', { fs: 'bottom', ts: 'top', via: joinTop('s5', 'n6') })
    .edge('n6', 'd7')
    .edge('d7', 'e', { label: 'Yes' })
    .edge('d7', 's7', { fs: 'right', ts: 'left', label: 'No' })
    .edge('s7', 's7b')
    .edge('s7b', 'e', { fs: 'bottom', ts: 'right' });
  return f.svg('B4 flowchart: pickup and check-in');
}

function b5Svg() {
  const f = Flow();
  const M = 250, S = 555, SW = 210;
  f.node('s', 'terminal', 'Something changed in real life', { cx: M, w: 270 })
    .node('n1', 'step', ['Open Inventory and pick the', 'action (list on the right)'], { actor: 'ADMIN', cx: M, w: 270, num: 1 })
    .node('n2', 'step', ['Enter the quantity or unit', 'code, and the reason'], { actor: 'ADMIN', cx: M, w: 270, num: 2 })
    .node('n3', 'step', ['Saves it and logs who, when', 'and why'], { actor: 'SYSTEM', cx: M, w: 270, num: 3 })
    .node('n4', 'step', ['Re-checks every upcoming', 'booking against the new stock'], { actor: 'SYSTEM', cx: M, w: 270, num: 4 })
    .node('d5', 'decision', ['Still enough for', 'every booking?'], { cx: M, tag: 'SYSTEM CHECK', num: 5 })
    .node('s5', 'step', ['Shows a *SHORT* alert:', 'item, time, how many', 'short, which bookings'], { actor: 'SYSTEM', cx: S, w: SW })
    .node('s5b', 'step', ['Fix it: repair faster,', 'swap units, rent from a', 'partner or call the', 'customer'], { actor: 'ADMIN', cx: S, w: SW })
    .node('e', 'terminal', 'Done', { cx: M, w: 270 })
    .node('list', 'note', ['• Add stock (bought more)', '• Send to repair', '• Back from repair', '• Write off (lost, broken)', '• Count correction'], { cx: S, w: SW, tag: 'ACTIONS', align: 'start' });
  f.stack(['s', 'n1', 'n2', 'n3', 'n4', 'd5', 'e'], { gaps: { e: 98 } });
  f.align('s5', 'd5').below('s5b', 's5').align('list', 'n1', 18);
  f.edge('s', 'n1').edge('n1', 'n2').edge('n2', 'n3').edge('n3', 'n4').edge('n4', 'd5')
    .edge('d5', 'e', { label: 'Yes' })
    .edge('d5', 's5', { fs: 'right', ts: 'left', label: 'No' })
    .edge('s5', 's5b')
    .edge('s5b', 'e', { fs: 'bottom', ts: 'right' })
    .edge('list', 'n1', { fs: 'left', ts: 'right', dashed: true, arrow: false, color: '#adb5bd' });
  return f.svg('B5 flowchart: recording inventory changes');
}

// ─── Document ────────────────────────────────────────────────────────────────

const fig = (svg, caption, size = '') =>
  `<figure class="diagram ${size}">${svg}${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`;
// The heading lives inside the first list item so a page break can never strand it.
const steps = (items, heading = 'Step by step') =>
  `<ol class="steps">${items
    .map(([n, title, body], i) =>
      `<li>${i === 0 && heading ? `<h3 class="steps-title">${heading}</h3>` : ''}<span class="badge">${n}</span><div><strong>${title}</strong> ${body}</div></li>`)
    .join('')}</ol>`;
const callout = (kind, title, body) => `<div class="callout ${kind}"><div class="callout-title">${title}</div>${body}</div>`;
const section = (code, title, lead, body) =>
  `<section class="sec"><h2><span class="code">${code}</span>${title}</h2>${lead ? `<p class="lead">${lead}</p>` : ''}${body}</section>`;

const cover = `
<section class="cover">
  <div class="cover-band">
    <div class="kicker">KASOUNDBOX · PARTY NEEDS RENTAL</div>
    <h1>Reservation &amp; Inventory<br>Process Flow</h1>
    <p class="cover-sub">A plain-language guide to how a booking moves from “I want to rent” to “returned and paid”, and how the system keeps count of every chair, table, tent and videoke.</p>
  </div>
  <div class="journey">
    <span class="j j1">Request</span><span class="arrow">→</span>
    <span class="j j2">Confirm</span><span class="arrow">→</span>
    <span class="j j3">Deliver</span><span class="arrow">→</span>
    <span class="j j4">Pick up</span><span class="arrow">→</span>
    <span class="j j5">Complete</span>
  </div>
  <div class="cover-meta">
    <div><span>Document</span>Process flow guide for the Kasoundbox system</div>
    <div><span>Version</span>${VERSION}</div>
    <div><span>Based on</span>Design spec v1 (docs/superpowers/specs/2026-09-26-kasoundbox-rental-reservation-design.md)</div>
    <div><span>For</span>Kasoundbox admins</div>
  </div>
</section>`;

const contents = `
<section class="sec toc">
  <h2>Contents</h2>
  <ol class="toc-list">
    <li><b>1</b> How to read this guide</li>
    <li><b>2</b> Key words</li>
    <li><b>3</b> The big picture</li>
    <li><b>4</b> The 22-hour rule</li>
    <li class="toc-part">Part A · Reservation module</li>
    <li><b>A1</b> Customer sends a reservation request</li>
    <li><b>A2</b> Admin reviews the request</li>
    <li><b>A3</b> Admin confirms with the downpayment</li>
    <li><b>A4</b> Booking statuses (the life cycle)</li>
    <li><b>A5</b> Delivery day (dispatch)</li>
    <li><b>A6</b> Extending a rental</li>
    <li><b>A7</b> How the price is computed</li>
    <li class="toc-part">Part B · Inventory module</li>
    <li><b>B1</b> How the system checks availability</li>
    <li><b>B2</b> Example: finding the busiest moment</li>
    <li><b>B3</b> Stock states</li>
    <li><b>B4</b> Pickup and check-in (returns)</li>
    <li><b>B5</b> Recording inventory changes</li>
    <li><b>B6</b> Daily alerts</li>
    <li class="toc-part">Appendix</li>
    <li><b>C1</b> Settings that change these flows</li>
    <li><b>C2</b> Who gets notified</li>
  </ol>
</section>`;

const howToRead = section('1', 'How to read this guide',
  'This guide shows, step by step, how the Kasoundbox system handles reservations and inventory. Each process has a flowchart (a picture of the steps) followed by an explanation in plain words. The numbers in each flowchart match the numbers in its explanation.',
  `<h3>Who’s who</h3>
  <div class="cards">
    <div class="card c-cust"><div class="card-tag">CUSTOMER</div>The person renting. Anyone can browse the website. An account is needed only to send a reservation request.</div>
    <div class="card c-admin"><div class="card-tag">ADMIN</div>You and your dad. Only admins can confirm bookings, record payments, handle deliveries and returns, and change prices or settings.</div>
    <div class="card c-sys"><div class="card-tag">SYSTEM</div>The app itself. It checks stock, computes prices, saves every change and sends notifications automatically.</div>
  </div>
  <h3>The shapes</h3>
  ${fig(legendSvg())}
  <h3>How to follow a flowchart</h3>
  <ul class="plain">
    <li>Start at the blue <b>Start</b> shape and follow the arrows.</li>
    <li>At an amber <b>diamond</b>, answer the question and follow the <b>Yes</b> or <b>No</b> arrow. The small label on top says who decides: you, the system, or either.</li>
    <li>A red <b>STOP</b> box means something must be fixed first. Its arrow shows where to go back to.</li>
    <li>A dashed gray box is a side note that explains the step it points to.</li>
  </ul>`);

const keyWords = section('2', 'Key words',
  'The words used in the system and in this guide, in plain language.',
  `<table class="kw">
    <tr><th>Word</th><th>What it means</th></tr>
    <tr><td>Item</td><td>Something you rent out, like “Monobloc Chair” or “Videoke Set”. Each item has its own prices and stock.</td></tr>
    <tr><td>Counted item</td><td>An item tracked by quantity only, like 200 chairs. The system knows <i>how many</i>, not <i>which one</i>.</td></tr>
    <tr><td>Tracked unit</td><td>A high-value piece with its own code, like videoke machines VK-01 and VK-02. The system knows exactly which unit went to which customer.</td></tr>
    <tr><td>Package</td><td>A ready-made bundle with its own price, like Party Package A: 1 tent + 5 tables + 50 chairs.</td></tr>
    <tr><td>Request</td><td>What a customer sends online. It does <b>not</b> hold any items yet.</td></tr>
    <tr><td>Booking</td><td>A request that an admin has confirmed. From here the items are held for that customer’s time.</td></tr>
    <tr><td>Downpayment</td><td>What the customer pays first so the booking can be confirmed (for example 50% of the total).</td></tr>
    <tr><td>Balance</td><td>What the customer still owes: the total minus everything paid.</td></tr>
    <tr><td>Held items</td><td>Items promised to a confirmed booking for a certain time. No one else can book them for that time.</td></tr>
    <tr><td>Run list</td><td>The dashboard’s list of today’s and tomorrow’s deliveries and pickups, in time order.</td></tr>
    <tr><td>Dispatch</td><td>Sending the items out for delivery. The booking becomes OUT.</td></tr>
    <tr><td>Pickup</td><td>Getting the items back from the venue.</td></tr>
    <tr><td>Check-in</td><td>Checking and testing returned items: how many are good, damaged or missing.</td></tr>
    <tr><td>Buffer</td><td>The 2 hours after each rental for pickup, checking and testing before the next delivery.</td></tr>
    <tr><td>In service</td><td>Can be rented out.</td></tr>
    <tr><td>In repair</td><td>Broken. Can’t be rented until it is fixed.</td></tr>
    <tr><td>Written off / Retired</td><td>Lost, sold or broken for good. Removed from stock.</td></tr>
    <tr><td>Promo code</td><td>A code a customer types to get a discount, like FIESTA10.</td></tr>
    <tr><td>Manual discount</td><td>A discount an admin gives on one booking, like a suki discount.</td></tr>
    <tr><td>Overdue</td><td>Items that should have been checked in by now but weren’t.</td></tr>
    <tr><td>Short</td><td>A confirmed booking that can no longer be fully covered by the stock you have.</td></tr>
  </table>`);

const bigPicture = section('3', 'The big picture',
  'The system has two parts that work together. The left side of the diagram is the <b>reservation module</b>: the customer and the booking. The right side is the <b>inventory module</b>: your stock.',
  `${fig(overviewSvg())}
  <ul class="plain">
    <li><b>Reservation module</b> handles people and paperwork: the request, confirmation, payments, delivery and pickup.</li>
    <li><b>Inventory module</b> keeps count: how many of each item you own, how many are in repair, and which items are promised to which booking at which time.</li>
    <li>They meet at the purple boxes: showing what’s free, holding items when a booking is confirmed, recording which units went out, and updating stock after check-in.</li>
  </ul>
  ${callout('good', 'The golden rule', '<p>The system never lets confirmed bookings need more of an item than you have at any moment. Every step in this guide protects that rule.</p>')}`);

const rule22 = section('4', 'The 22-hour rule',
  'Every rental is counted in 24-hour blocks that start at the delivery time. Each block is 22 hours with the customer plus 2 hours for pickup, checking and testing.',
  `${fig(timelineSvg(), 'One rental day: delivered at 8:00 AM, picked up at 6:00 AM the next day, ready again at 8:00 AM.')}
  <ul class="plain">
    <li><b>Start time = delivery time.</b> Customers can pick any whole hour from 8:00 AM to 5:00 PM. When you make a booking yourself, you can set any time.</li>
    <li><b>Pickup</b> is 2 hours before the start time, on the day after the last rental day.</li>
    <li><b>Free again:</b> the items can go to the next customer exactly at the end of the last 24-hour block, the same clock time as the start.</li>
  </ul>
  <table>
    <tr><th>Start</th><th>Days</th><th>Pickup</th><th>Free again</th></tr>
    <tr><td>Oct 10, 8:00 AM</td><td>1</td><td>Oct 11, 6:00 AM</td><td>Oct 11, 8:00 AM</td></tr>
    <tr><td>Oct 10, 5:00 PM</td><td>1</td><td>Oct 11, 3:00 PM</td><td>Oct 11, 5:00 PM</td></tr>
    <tr><td>Oct 10, 8:00 AM</td><td>3 (e.g. a wake)</td><td>Oct 13, 6:00 AM</td><td>Oct 13, 8:00 AM</td></tr>
  </table>
  ${callout('info', 'Good to know', `<ul class="plain">
    <li>Because customers start between 8:00 AM and 5:00 PM, pickups always fall between <b>6:00 AM and 3:00 PM</b>.</li>
    <li>Back-to-back is allowed: if booking A frees a videoke at 8:00 AM, booking B can start with it at 8:00 AM.</li>
    <li>The start window and the 2-hour buffer can be changed in Settings. Changes apply to new bookings only.</li>
  </ul>`)}`);

const partA = `<div class="part"><div class="part-kicker">PART A</div><div class="part-title">Reservation module</div><div class="part-sub">From a customer’s first look to a completed booking.</div></div>`;

const a1 = section('A1', 'Customer sends a reservation request',
  `${partA}How a customer goes from browsing to a saved request. A request does not hold any items yet; that happens only when you confirm it (A3).`,
  `${fig(a1Svg())}
  ${steps([
    [1, 'Browse the catalog.', 'Anyone can look at items, packages and prices. No account is needed.'],
    [2, 'Set the event time.', 'The customer picks the event date, the start (delivery) time from 8:00 AM to 5:00 PM, and how many days.'],
    [3, 'See prices and availability.', 'For that exact time, each item shows its total price and how many are free, for example “Up to 37 available”. The quantity can’t go above that number.'],
    [4, 'Add to the cart.', 'Items and packages can be mixed, for example Party Package A plus 20 extra chairs.'],
    [5, 'Sign in.', 'Needed only when sending the request, and the cart is kept while signing in. The first time, the customer adds a full name and mobile number (09XXXXXXXXX) and accepts the privacy notice.'],
    [6, 'Venue and notes.', 'The delivery address, a landmark to help the driver, notes, and an optional promo code.'],
    [7, 'Promo code check.', 'If a code was entered, the system checks that it is active, within its dates, that the order reaches the code’s minimum amount, and that it still has uses left. If not, the customer is told why and can remove or fix it.'],
    [8, 'Send the request.', ''],
    [9, 'Final stock check.', 'Right before saving, the system checks stock again. If a booking was confirmed in the meantime and there’s no longer enough, the customer sees “Only X left for that time” and changes the cart.'],
    [10, 'Saved as REQUESTED.', 'The request gets a code like KSB-7Q4M, and you and your dad get a notification.'],
  ])}
  <p>At the end, the customer sees what happens next (you review it and ask for the downpayment) and is asked to allow notifications.</p>
  ${callout('info', 'Good to know', `<ul class="plain">
    <li>A customer can have up to <b>3 open requests</b> at a time.</li>
    <li>A request must start at least <b>24 hours</b> from now and at most <b>365 days</b> ahead, for up to <b>30 days</b>.</li>
    <li>The customer can cancel their own request while it is still REQUESTED. After confirmation, only admins can cancel.</li>
    <li>If the start time passes and nobody confirmed the request, it <b>expires</b> automatically and the customer is told.</li>
  </ul>`)}`);

const a2 = section('A2', 'Admin reviews the request',
  'What you do when a new request comes in, before any money changes hands.',
  `${fig(a2Svg(), '', 'fig-sm')}
  ${steps([
    [1, 'Open the request.', 'You get a notification for every new request. Open it to see the items, the time, the venue and the customer’s details.'],
    [2, 'Green or red.', 'Each item shows green (enough stock for that time) or red (not enough). This is live: it changes if another booking gets confirmed.'],
    [3, 'All green?', 'If yes, go on to step 6.'],
    [4, 'Can it be fixed?', 'If something is red, talk to the customer by phone or Messenger. Maybe they can take fewer items, move the time, or use a different item.'],
    [5, 'Edit the request.', 'Make the change you agreed on. The colors refresh (back to step 2). If nothing works, decline the request with a short reason; the customer gets a notification.'],
    [6, 'Delivery charge or discount.', 'If needed, add a delivery charge or a manual discount (for example a suki discount). The total and the downpayment update right away.'],
    [7, 'Ask for the downpayment.', 'Tell the customer how much to pay and how. The payment instructions from Settings also appear on the customer’s reservation page.'],
  ])}
  ${callout('info', 'Good to know', `<ul class="plain">
    <li><b>Walk-in, phone and Messenger bookings:</b> create the booking yourself in the admin panel. It follows the same steps, and you can set any start time.</li>
    <li><b>Refresh prices:</b> if you changed prices after the customer sent the request, the request keeps the old prices. Press “Refresh prices” only if you want the new ones.</li>
  </ul>`)}`);

const a3 = section('A3', 'Admin confirms with the downpayment',
  'Confirming is one button that saves the payment, checks everything, and holds the items, all at once.',
  `${fig(a3Svg())}
  ${steps([
    [1, 'Record downpayment & confirm.', 'Open the booking and tap the button.'],
    [2, 'Enter the payment.', 'The amount, the method (GCash, bank transfer or cash) and the reference number.'],
    [3, 'Paid enough?', 'The system compares what’s paid with the required downpayment (for example 50% of the total). If it’s short, it shows how much is still needed and saves nothing.'],
    [4, 'Promo still has uses left?', 'A promo use counts only when a booking is confirmed. If the code reached its limit in the meantime, the system stops and asks you to remove the code (you’ll see the new price) or give a manual discount instead. The price never changes without you knowing.'],
    [5, 'Items still available?', 'The final stock check. If another booking took the items, the system shows exactly what’s short, for example “Only 20 Monobloc Chairs free on Oct 10; this booking needs 30”, and saves nothing. Go back to the customer to fix it (A2).'],
    [6, 'Confirmed.', 'In one go the system saves the payment, holds the items for this booking’s time, and counts the promo use. The customer gets “Booking confirmed”.'],
  ])}
  ${callout('good', 'All or nothing', '<p>A confirmation either fully succeeds or saves nothing at all, not even the payment record. There is never a half-confirmed booking.</p>')}
  ${callout('info', 'Good to know', `<ul class="plain">
    <li><b>Two admins, same moment:</b> if you and your dad confirm two bookings for the last items at the same time, only one can succeed. The other gets the “what’s short” message.</li>
    <li>After confirmation, only admins can change or cancel the booking, and every change checks stock again.</li>
  </ul>`)}`);

const a4 = section('A4', 'Booking statuses (the life cycle)',
  'Every booking has one status at a time. It moves down the middle column as the rental happens, or ends early on the right.',
  `${fig(statusSvg(), '', 'fig-sm')}
  <table>
    <tr><th>Status</th><th>What it means</th><th>Items held?</th><th>What can happen next</th></tr>
    <tr><td><b>Requested</b></td><td>Sent by the customer, waiting for your review.</td><td>No</td><td>You confirm or decline; the customer or you cancel; it expires at the start time.</td></tr>
    <tr><td><b>Confirmed</b></td><td>Downpayment recorded; the items are held.</td><td>Yes</td><td>You dispatch it, or cancel it (refund recorded if any).</td></tr>
    <tr><td><b>Out</b></td><td>Delivered; the items are with the customer.</td><td>Yes, until check-in</td><td>You extend it or check it in.</td></tr>
    <tr><td><b>Returned</b></td><td>Picked up and checked; the balance is not fully paid.</td><td>No</td><td>Becomes Completed when the balance reaches ₱0.</td></tr>
    <tr><td><b>Completed</b></td><td>Picked up, checked and fully paid.</td><td>No</td><td>Nothing; it’s done.</td></tr>
    <tr><td><b>Declined</b></td><td>You said no, with a reason.</td><td>No</td><td>Nothing.</td></tr>
    <tr><td><b>Cancelled</b></td><td>Cancelled before or after confirmation.</td><td>No</td><td>Nothing (refund recorded separately if any).</td></tr>
    <tr><td><b>Expired</b></td><td>Nobody confirmed it before the start time.</td><td>No</td><td>Nothing.</td></tr>
  </table>
  ${callout('info', 'Good to know', '<p>If the balance is already ₱0 at check-in, the booking goes straight from <b>Out</b> to <b>Completed</b>.</p>')}`);

const a5 = section('A5', 'Delivery day (dispatch)',
  'What happens on the morning of a delivery, from the run list to the customer’s door.',
  `${fig(a5Svg())}
  ${steps([
    [1, 'The run list.', 'Every morning the dashboard lists today’s and tomorrow’s deliveries and pickups in time order. Each stop shows the time, the customer, a tap-to-call mobile number, the address and landmark, the items to load (packages are listed item by item) and the balance to collect.'],
    [2, 'Load the items.', ''],
    [3, 'Pick the units.', 'For tracked items like videoke machines, choose the exact units you’re bringing, for example VK-01.'],
    [4, 'Unit free and in service?', 'The system only offers units that are in service and not already out with another customer. If a unit is in repair, pick another.'],
    [5, 'Inclusions checklist.', 'Tick the accessories that go with each item: mics, remote, cables. This protects you if something goes missing.'],
    [6, 'Tap “Dispatch”.', 'Everything on the booking goes out together. You can dispatch starting on the booking’s start date.'],
    [7, 'Status OUT.', 'The chosen units are marked as out, and the customer gets “Out for delivery”.'],
    [8, 'Deliver and set up', 'by the start time.'],
    [9, 'Balance paid now?', 'If the customer pays the balance at delivery, record it (amount, method, reference). If not, the balance stays on the booking to be paid later.'],
  ])}
  ${callout('info', 'Print slip', '<p>You can print a delivery receipt listing the items, unit codes and inclusions, with signature lines, so there’s a record of what the customer received. It is a delivery receipt only, not a BIR official receipt.</p>')}`);

const a6 = section('A6', 'Extending a rental',
  'When a customer wants to keep the items longer, for example a wake that runs an extra day.',
  `${fig(a6Svg())}
  ${steps([
    [1, 'Extend.', 'Open the booking (it must be OUT), tap “Extend” and enter how many days to add.'],
    [2, 'Extra time OK?', 'The system checks that no other booking needs these items during the extra time, and that the total stays within the maximum (30 days by default). If not, you can’t extend; offer a different item or keep the original pickup.'],
    [3, 'New pickup and price.', 'The pickup time moves by 24 hours per added day, and the extra days are added at the extra-day price. The balance goes up.'],
    [4, 'Tell the customer', 'the new pickup time and balance. They can also see both on their reservation page.'],
  ])}
  ${callout('info', 'Example', '<p>A videoke costs ₱1,000 for the 1st day and ₱800 for each extra day. A 1-day rental extended by 2 days becomes 3 days: ₱1,000 + ₱800 × 2 = <b>₱2,600</b>. The pickup moves from Oct 11, 6:00 AM to Oct 13, 6:00 AM.</p>')}`);

const a7 = section('A7', 'How the price is computed',
  'The same order every time: items first, then discounts, then extra charges. Here is a full example.',
  `<div class="receipt">
    <div class="r-head">Booking KSB-7Q4M · Oct 10, 8:00 AM · 1 day</div>
    <div class="row"><span>Party Package A × 1</span><span>₱2,200</span></div>
    <div class="row"><span>Extra monobloc chairs × 20 at ₱10</span><span>₱200</span></div>
    <div class="row"><span>Videoke set × 1</span><span>₱1,000</span></div>
    <div class="row sub"><span>Items subtotal</span><span>₱3,400</span></div>
    <div class="row minus"><span>Promo FIESTA10 (10%, up to ₱300)</span><span>−₱300</span></div>
    <div class="row minus"><span>Manual discount (suki)</span><span>−₱100</span></div>
    <div class="row"><span>Delivery charge</span><span>+₱200</span></div>
    <div class="row total"><span>Total</span><span>₱3,200</span></div>
    <div class="row note-row"><span>Downpayment needed to confirm (50%)</span><span>₱1,600</span></div>
    <div class="row minus"><span>Paid by GCash</span><span>−₱1,600</span></div>
    <div class="row total"><span>Balance (collect on delivery)</span><span>₱1,600</span></div>
  </div>
  ${steps([
    [1, 'Line price', '= quantity × (1st-day price + extra-day price × extra days). A blank extra-day price means every day costs the 1st-day price. Example: 50 chairs for 3 days at ₱10 for the 1st day and ₱5 for extra days = 50 × (₱10 + ₱5 + ₱5) = ₱1,000.'],
    [2, 'Promo code:', 'at most one per booking. It comes off the items subtotal, and only if the code is active, within its dates, the order reaches its minimum amount, and it has uses left.'],
    [3, 'Manual discount:', 'given by an admin (₱ or %) with a reason. It comes off after the promo.'],
    [4, 'Discounts only reduce item prices.', 'They never reduce delivery, damage, loss or late charges. To waive one of those, edit the charge itself.'],
    [5, 'Rounding:', 'percentage discounts round down to the peso (₱299.25 → ₱299). Percentage downpayments round up (₱1,600.50 → ₱1,601).'],
    [6, 'Frozen prices:', 'a booking keeps the prices from when the request was sent. Changing a price later doesn’t affect it unless you press “Refresh prices” on a pending request.'],
    [7, 'Paid too much?', 'The booking shows “Refund due ₱X”.'],
  ], 'The rules')}`);

const partB = `<div class="part part-b"><div class="part-kicker">PART B</div><div class="part-title">Inventory module</div><div class="part-sub">How the system keeps count of what you own and what is promised.</div></div>`;

const b1 = section('B1', 'How the system checks availability',
  `${partB}This check runs every time someone asks “can we rent this?”. It runs separately for every item in the cart.`,
  `${fig(b1Svg())}
  ${steps([
    [1, 'Count usable units.', 'Only units in service count; units in repair never do. For chairs that’s the “in service” number; for videoke it’s how many machines are marked in service.'],
    [2, 'Find the bookings that overlap.', 'Only confirmed and out bookings hold stock. Requests don’t.'],
    [3, 'Find the busiest moment.', 'Within the requested time, the system finds the moment when the most units are already in use. See the example in B2.'],
    [4, 'Free = usable − busiest moment.', ''],
    [5, 'Add up the cart.', 'A package counts as its contents. If the cart has Package A (50 chairs) plus 20 extra chairs, the chair need is 70.'],
    [6, 'Enough for every item?', 'Yes: it can be reserved. No: the system shows “Only X left” and the busiest time, so you know what to change.'],
  ])}
  ${callout('info', 'Good to know', `<ul class="plain">
    <li><b>Late items count as out.</b> If items weren’t checked in after their time ended, the system treats them as still out until someone checks them in. It never assumes they came back.</li>
    <li><b>Back-to-back is fine.</b> A booking that frees items at 8:00 AM doesn’t overlap one that starts at 8:00 AM.</li>
    <li><b>Repair doesn’t count</b>, even if the item might be fixed before the event. When it’s fixed, mark it “back from repair” and it counts again.</li>
  </ul>`)}`);

const b2 = section('B2', 'Example: finding the busiest moment',
  'You own 100 chairs. Two bookings are already confirmed, and a new request asks for 20 chairs.',
  `${fig(busiestSvg(), 'The shaded band is the new request’s time. The blue shape shows how many chairs are in use at each moment.')}
  <ul class="plain">
    <li>During the new request’s time (Oct 10, 12 PM → Oct 11, 12 PM), the most chairs in use at once is <b>90</b>: from Oct 10, 2 PM to Oct 11, 8 AM, when bookings A and B overlap.</li>
    <li>So only <b>100 − 90 = 10</b> chairs are free for the whole period. The request for 20 can’t be confirmed, and the system says “Only 10 left”.</li>
    <li>If the customer starts at <b>Oct 11, 8:00 AM</b> instead, booking A has ended and only B (30 chairs) is still out until 2 PM. Then 70 are free and 20 fits.</li>
  </ul>
  ${callout('info', 'Why the busiest moment?', '<p>Chairs don’t come back in the middle of a rental. The request is only safe if there are enough chairs at <b>every</b> moment of its time, so the tightest moment decides.</p>')}`);

const b3 = section('B3', 'Stock states',
  'Every item is in one of a few states. Counted items are tracked as numbers; tracked units are followed one by one.',
  `<h3>Counted items (e.g. chairs, tables)</h3>
  ${fig(countedStatesSvg())}
  <h3>Tracked units (e.g. videoke VK-01)</h3>
  ${fig(unitStatesSvg())}
  ${callout('good', '“Held” is not a place', '<p>A confirmed booking holds items for a period of time on the calendar. The items stay <b>in service</b>; they are just promised. That’s why confirming a booking never changes your stock numbers. Only real-life events do: repairs, losses, and new stock.</p>')}
  ${callout('info', 'Good to know', `<ul class="plain">
    <li>For chairs, “out with the customer” isn’t a separate count. They are still yours and in service, just promised to a booking.</li>
    <li>A unit can’t be retired while it is out with a customer. Check it in first.</li>
    <li>A unit can also be retired straight from the shop, for example if you sell it.</li>
  </ul>`)}`);

const b4 = section('B4', 'Pickup and check-in (returns)',
  'Check-in is your “check and test” step. It is where the inventory gets updated and extra charges are added.',
  `${fig(b4Svg())}
  ${steps([
    [1, 'Pick up.', 'The run list shows each pickup time, for example 6:00 AM (2 hours before the next start). Bring everything back to the shop.'],
    [2, 'Check-in.', 'Open the booking and tap “Check-in”. For each item, count how many are good, damaged or missing. Test videoke units one by one and use the inclusions checklist. The counts must add up to what went out.'],
    [3, 'Damaged?', 'The damaged quantity (or unit) moves to IN REPAIR and can’t be rented until fixed. Enter a damage charge; the replacement cost is shown as a guide.'],
    [4, 'Missing?', 'The missing quantity (or unit) is written off from stock. The system adds a charge equal to the replacement cost, and you can change it.'],
    [5, 'Late?', 'If check-in happens more than 1 hour after the pickup time, the system suggests a late charge: the extra-day price for each started day late. Waive it if the delay wasn’t the customer’s fault.'],
    [6, 'Released.', 'The hold ends, and the items are free for new bookings from now.'],
    [7, 'Balance ₱0?', 'Yes: the booking is COMPLETED. No: it stays RETURNED until the customer pays; record the payment and it completes automatically.'],
  ])}
  ${callout('info', 'Good to know', '<p>Everything comes back in one check-in. If a missing item turns up later, add it back with a count correction (B5) and adjust the charge.</p>')}`);

const b5 = section('B5', 'Recording inventory changes',
  'Stock is never edited directly. Every change is an action with a reason, so “why do we have 180 chairs instead of 200?” always has an answer.',
  `${fig(b5Svg())}
  <table>
    <tr><th>Action</th><th>When to use it</th><th>Counted item (chairs)</th><th>Tracked unit (videoke)</th></tr>
    <tr><td><b>Add stock</b></td><td>You bought more</td><td>In service goes up</td><td>Add new units with codes</td></tr>
    <tr><td><b>Send to repair</b></td><td>Something broke at the shop</td><td>In service ↓, in repair ↑</td><td>Unit → in repair</td></tr>
    <tr><td><b>Back from repair</b></td><td>It’s fixed</td><td>In repair ↓, in service ↑</td><td>Unit → in service</td></tr>
    <tr><td><b>Write off</b></td><td>Lost or broken for good</td><td>In service (or in repair) ↓</td><td>Unit → retired (not while out)</td></tr>
    <tr><td><b>Count correction</b></td><td>A physical count doesn’t match</td><td>In service set to the counted number</td><td>—</td></tr>
  </table>
  ${steps([
    [1, 'Pick the action', 'in Inventory.'],
    [2, 'Enter the details:', 'the quantity (or the unit code) and the reason. A reason is required for write-offs and corrections.'],
    [3, 'Saved and logged:', 'who did it, when and why.'],
    [4, 'Re-check:', 'the system checks every upcoming confirmed booking against the new stock.'],
    [5, 'Still enough?', 'If not, a SHORT alert shows the item, the time, how many are missing, and which bookings are affected. Fix it by repairing faster, swapping units, renting from a partner, or calling the customer to adjust.'],
  ])}
  ${callout('warn', 'The change is always saved', '<p>It already happened in real life, so the system records it even if it causes a shortage. The SHORT alert makes sure you see the effect on upcoming bookings in time.</p>')}`);

const b6 = section('B6', 'Daily alerts',
  'Three alerts on the dashboard tell you what needs attention today.',
  `<table class="alerts">
    <tr><th>Alert</th><th>What it means</th><th>Why it happens</th><th>What to do</th></tr>
    <tr><td><span class="pill p-red">OVERDUE</span></td><td>Items should have been picked up and checked in, but weren’t (more than 1 hour past the pickup time).</td><td>The customer wasn’t home, the pickup ran late, or someone forgot to tap Check-in.</td><td>Pick up the items, or tap Check-in if they’re already back. Until then they count as still out.</td></tr>
    <tr><td><span class="pill p-amber">SHORT</span></td><td>A confirmed booking can no longer be fully covered.</td><td>Items went to repair, got lost, or came back late.</td><td>Repair, swap units, rent from a partner, or call the customer to adjust.</td></tr>
    <tr><td><span class="pill p-blue">WAITING</span></td><td>Requests waiting for your review, oldest first. Flagged if starting within 48 hours.</td><td>New requests from customers.</td><td>Review and confirm quickly; requests don’t hold stock.</td></tr>
  </table>`);

const c1 = section('C1', 'Settings that change these flows',
  'All of these are adjustable in the admin panel. Changes apply to new bookings; existing bookings keep what they were made with.',
  `<table>
    <tr><th>Setting</th><th>Default</th><th>What it changes</th></tr>
    <tr><td>Customer start times</td><td>8:00 AM – 5:00 PM</td><td>Which start times customers can pick (whole hours). Pickups then fall between 6:00 AM and 3:00 PM.</td></tr>
    <tr><td>Buffer</td><td>2 hours</td><td>Time between pickup and the next start, for checking and testing.</td></tr>
    <tr><td>Minimum notice</td><td>24 hours</td><td>How soon a customer’s rental can start.</td></tr>
    <tr><td>Book up to</td><td>365 days ahead</td><td>How far ahead customers can book.</td></tr>
    <tr><td>Maximum days</td><td>30</td><td>The longest booking, including extensions.</td></tr>
    <tr><td>Open requests per customer</td><td>3</td><td>How many unconfirmed requests one customer can have.</td></tr>
    <tr><td>Late grace</td><td>60 minutes</td><td>After this, a check-in counts as late and the Overdue alert appears.</td></tr>
    <tr><td>Downpayment</td><td>50%</td><td>How much is needed to confirm (a % of the total or a fixed amount).</td></tr>
    <tr><td>Payment methods</td><td>Cash, GCash, Bank transfer</td><td>What you can pick when recording a payment.</td></tr>
    <tr><td>Payment instructions, policies</td><td>(your text)</td><td>What customers see about paying, cancelling and refunds.</td></tr>
    <tr><td>Notifications</td><td>All on</td><td>Each notification in C2 can be turned on or off.</td></tr>
  </table>`);

const c2 = section('C2', 'Who gets notified',
  'Notifications appear in the app (a bell with a pop-up) and as phone push notifications for people who allowed them.',
  `<table>
    <tr><th>When this happens</th><th>Who is notified</th></tr>
    <tr><td>A customer sends a request</td><td>Admins</td></tr>
    <tr><td>A customer cancels a request</td><td>Admins</td></tr>
    <tr><td>A booking is confirmed</td><td>The customer</td></tr>
    <tr><td>A request is declined</td><td>The customer</td></tr>
    <tr><td>An admin cancels a booking</td><td>The customer</td></tr>
    <tr><td>A request expires</td><td>The customer</td></tr>
    <tr><td>A payment is recorded</td><td>The customer</td></tr>
    <tr><td>The booking is out for delivery</td><td>The customer</td></tr>
  </table>
  ${callout('info', 'Privacy', '<p>Phone notifications only say things like “Booking KSB-7Q4M confirmed. Tap to view.” They never include addresses, amounts or other personal details.</p>')}`);

const CSS = `
@page { size: A4; margin: 16mm 15mm 17mm 15mm;
  @top-left { content: "Kasoundbox · Reservation & Inventory Process Flow"; font: 500 7.5pt Inter, 'Segoe UI', Arial, sans-serif; color: #868e96; }
  @top-right { content: "${VERSION}"; font: 500 7.5pt Inter, 'Segoe UI', Arial, sans-serif; color: #868e96; }
  @bottom-center { content: "Page " counter(page) " of " counter(pages); font: 500 7.5pt Inter, 'Segoe UI', Arial, sans-serif; color: #868e96; }
}
@page :first { margin: 0; @top-left { content: ""; } @top-right { content: ""; } @bottom-center { content: ""; } }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: Inter, 'Segoe UI', Arial, sans-serif; font-size: 10pt; line-height: 1.5; color: #1b2433; }
p { margin: 0 0 2.5mm; }
h2 { font-size: 16pt; line-height: 1.25; margin: 0 0 2mm; display: flex; align-items: center; gap: 3mm; }
h2 .code { display: inline-flex; align-items: center; justify-content: center; min-width: 11mm; height: 8mm; padding: 0 2mm; border-radius: 2mm; background: #1b2433; color: #fff; font-size: 11pt; }
h3 { font-size: 11pt; margin: 4mm 0 2mm; color: #1b2433; }
.sec { break-before: page; }
.lead { color: #495057; font-size: 10.5pt; margin-bottom: 3mm; }
figure.diagram { margin: 2mm 0 3mm; break-inside: avoid; }
figure.diagram svg { display: block; width: 100%; height: auto; max-height: 200mm; }
figure.fig-sm svg { max-height: 108mm; }
figcaption { font-size: 8.5pt; color: #6b7280; margin-top: 1.5mm; text-align: center; }
svg .lbl { font: 500 12px Inter, 'Segoe UI', Arial, sans-serif; }
svg .strong { font-weight: 700; }
svg .tag { font: 700 8.5px Inter, 'Segoe UI', Arial, sans-serif; letter-spacing: .09em; }
svg .elabel { font: 700 10.5px Inter, 'Segoe UI', Arial, sans-serif; fill: #343a40; paint-order: stroke; stroke: #fff; stroke-width: 4px; stroke-linejoin: round; }
svg .badge-t { font: 700 10px Inter, 'Segoe UI', Arial, sans-serif; fill: #fff; }
svg .hdr { font: 800 10.5px Inter, 'Segoe UI', Arial, sans-serif; letter-spacing: .12em; fill: #495057; }
svg .axis { font: 600 10.5px Inter, 'Segoe UI', Arial, sans-serif; fill: #343a40; }
svg .small { font: 500 11px Inter, 'Segoe UI', Arial, sans-serif; }
ol.steps { list-style: none; padding: 0; margin: 0 0 3mm; }
ol.steps li { display: grid; grid-template-columns: 7mm 1fr; column-gap: 2mm; margin: 0 0 2mm; break-inside: avoid; }
ol.steps .steps-title { grid-column: 1 / -1; margin: 3mm 0 2mm; }
.badge { width: 5.4mm; height: 5.4mm; border-radius: 50%; background: #1b2433; color: #fff; font-size: 8pt; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; margin-top: .3mm; }
ul.plain { margin: 0 0 2.5mm; padding-left: 5mm; }
ul.plain li { margin: 0 0 1.2mm; }
.callout { border-left: 1.2mm solid #1864ab; background: #f1f7ff; padding: 2.5mm 4mm; border-radius: 1.5mm; margin: 3mm 0; break-inside: avoid; }
.callout p, .callout ul { margin-bottom: 0; }
.callout-title { font-weight: 700; margin-bottom: 1mm; }
.callout.warn { border-color: #e67700; background: #fff8e6; }
.callout.good { border-color: #2f9e44; background: #f0fbf2; }
table { width: 100%; border-collapse: collapse; font-size: 9pt; margin: 2mm 0 3mm; break-inside: auto; }
tr { break-inside: avoid; }
th { text-align: left; background: #f1f3f5; font-weight: 700; }
th, td { padding: 1.8mm 2.2mm; border-bottom: .3mm solid #e9ecef; vertical-align: top; }
table.kw td:first-child { font-weight: 700; white-space: nowrap; width: 38mm; }
.cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; margin-bottom: 2mm; }
.card { border-radius: 2mm; padding: 3mm; font-size: 9pt; border: .35mm solid; }
.card-tag { font-weight: 800; font-size: 7.5pt; letter-spacing: .1em; margin-bottom: 1mm; }
.c-cust { background: #e3fafc; border-color: #0c8599; } .c-cust .card-tag { color: #0b7285; }
.c-admin { background: #ebfbee; border-color: #2f9e44; } .c-admin .card-tag { color: #2b8a3e; }
.c-sys { background: #f3f0ff; border-color: #7048e8; } .c-sys .card-tag { color: #5f3dc4; }
.part { border-radius: 2.5mm; padding: 4mm 5mm; margin: 0 0 4mm; background: linear-gradient(135deg, #1864ab, #0c8599); color: #fff; }
.part-b { background: linear-gradient(135deg, #5f3dc4, #7048e8); }
.part-kicker { font-size: 8pt; font-weight: 800; letter-spacing: .15em; opacity: .85; }
.part-title { font-size: 15pt; font-weight: 800; }
.part-sub { font-size: 9.5pt; opacity: .9; }
.receipt { width: 125mm; margin: 2mm auto 4mm; border: .35mm solid #dee2e6; border-radius: 2.5mm; padding: 4mm 5mm; font-variant-numeric: tabular-nums; background: #fcfcfd; break-inside: avoid; }
.r-head { font-weight: 700; font-size: 9pt; color: #495057; margin-bottom: 2mm; }
.row { display: flex; justify-content: space-between; gap: 4mm; padding: 1.3mm 0; border-bottom: .25mm dashed #e9ecef; font-size: 9.5pt; }
.row.sub { font-weight: 700; }
.row.minus span:last-child { color: #2b8a3e; }
.row.total { font-weight: 800; font-size: 10.5pt; border-top: .5mm solid #1b2433; border-bottom: none; margin-top: 1mm; }
.row.note-row { color: #1864ab; font-weight: 600; }
.pill { display: inline-block; padding: .6mm 2mm; border-radius: 3mm; font-size: 7.5pt; font-weight: 800; letter-spacing: .08em; color: #fff; }
.p-red { background: #e03131; } .p-amber { background: #e67700; } .p-blue { background: #1864ab; }
.toc-list { list-style: none; padding: 0; margin: 4mm 0 0; font-size: 11pt; }
.toc-list li { padding: 1.6mm 0; border-bottom: .25mm solid #f1f3f5; }
.toc-list b { display: inline-block; width: 12mm; color: #1864ab; }
.toc-list .toc-part { font-weight: 800; color: #495057; border-bottom: none; padding-top: 4mm; font-size: 9pt; letter-spacing: .08em; text-transform: uppercase; }
.cover { height: 297mm; padding: 0; display: flex; flex-direction: column; }
.cover-band { background: linear-gradient(135deg, #0b3d6e 0%, #1864ab 55%, #0c8599 100%); color: #fff; padding: 40mm 22mm 26mm; }
.kicker { font-size: 9pt; font-weight: 800; letter-spacing: .2em; opacity: .85; margin-bottom: 6mm; }
.cover h1 { font-size: 34pt; line-height: 1.1; margin: 0 0 6mm; }
.cover-sub { font-size: 12pt; line-height: 1.5; max-width: 150mm; opacity: .95; margin: 0; }
.journey { display: flex; align-items: center; gap: 2.5mm; padding: 14mm 22mm 6mm; flex-wrap: wrap; }
.j { padding: 2.5mm 4.5mm; border-radius: 6mm; font-weight: 700; font-size: 10.5pt; border: .4mm solid; }
.j1 { background: #fff3bf; border-color: #e67700; color: #6b3500; }
.j2 { background: #d0ebff; border-color: #1864ab; color: #0b3d6e; }
.j3 { background: #c5f6fa; border-color: #0c8599; color: #084c55; }
.j4 { background: #e5dbff; border-color: #7048e8; color: #3b1f99; }
.j5 { background: #d3f9d8; border-color: #2b8a3e; color: #1b5e2a; }
.arrow { color: #868e96; font-weight: 700; }
.cover-meta { margin-top: auto; padding: 0 22mm 22mm; font-size: 9.5pt; color: #495057; }
.cover-meta div { display: grid; grid-template-columns: 26mm 1fr; padding: 2mm 0; border-top: .25mm solid #e9ecef; overflow-wrap: anywhere; }
.cover-meta span { font-weight: 700; color: #1b2433; }
`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Kasoundbox — Reservation & Inventory Process Flow</title>
<style>${CSS}</style>
</head>
<body>
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#495057"/>
    </marker>
  </defs>
</svg>
${cover}
${contents}
${howToRead}
${keyWords}
${bigPicture}
${rule22}
${a1}
${a2}
${a3}
${a4}
${a5}
${a6}
${a7}
${b1}
${b2}
${b3}
${b4}
${b5}
${b6}
${c1}
${c2}
</body>
</html>`;

writeFileSync(OUT_HTML, html, 'utf8');
console.log(`HTML → ${OUT_HTML}`);

// ─── Print to PDF ────────────────────────────────────────────────────────────

function findBrowser() {
  const candidates = [
    process.env.BROWSER,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].filter(Boolean);
  return candidates.find((p) => existsSync(p));
}

const browser = findBrowser();
if (!browser) {
  console.error('No Chromium-based browser found. Set BROWSER=/path/to/chrome and rerun, or print the HTML to PDF manually.');
  process.exit(1);
}
// On Windows the browser launcher can return before the print job finishes, so
// wait for a fresh, size-stable PDF before removing the temporary profile.
rmSync(OUT_PDF, { force: true });
const profile = mkdtempSync(join(tmpdir(), 'ksb-pdf-'));
try {
  execFileSync(browser, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${profile}`,
    '--no-pdf-header-footer',
    `--print-to-pdf=${OUT_PDF}`,
    pathToFileURL(OUT_HTML).href,
  ], { stdio: 'inherit' });
  const deadline = Date.now() + 60_000;
  let lastSize = -1;
  while (Date.now() < deadline) {
    const size = existsSync(OUT_PDF) ? statSync(OUT_PDF).size : -1;
    if (size > 0 && size === lastSize) break;
    lastSize = size;
    execFileSync(process.execPath, ['-e', 'setTimeout(() => {}, 500)']);
  }
} finally {
  // The browser's helper processes can keep a file in the profile locked (EBUSY) for a
  // moment after printing. Retry, and never fail the build over a leftover temp folder.
  try {
    rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  } catch (err) {
    console.warn(`Note: could not remove temp profile ${profile} (${err.code ?? err.message}).`);
  }
}
if (!existsSync(OUT_PDF)) {
  console.error('The browser did not produce a PDF. Open the HTML in Edge/Chrome and print it to PDF (A4, background graphics on).');
  process.exit(1);
}
console.log(`PDF  → ${OUT_PDF} (${Math.round(statSync(OUT_PDF).size / 1024)} KB)`);
