export const STYLES = `
:host{all:initial;color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif}
:host([data-openleet-tool-button]){position:relative;z-index:2;display:inline-flex;align-self:stretch;vertical-align:middle;height:auto;min-height:0;pointer-events:auto}
*{box-sizing:border-box}
button,select{font:inherit}
.tool-button-root{display:flex;align-items:center;height:100%;min-height:0}
.result-tab{height:32px;min-height:32px;display:inline-flex;align-items:center;gap:7px;border:0;background:#7c3aed12;color:#c4b5fd;padding:0 14px;margin:0 8px;border-radius:999px;font-size:13px;font-weight:700;line-height:1;white-space:nowrap;cursor:pointer;box-shadow:0 0 10px #8b5cf64d,inset 0 0 8px #8b5cf61f}
.result-tab:hover{color:#ede9fe;background:#8b5cf624;box-shadow:0 0 14px #8b5cf66b,inset 0 0 10px #8b5cf62e}.result-tab.active{color:#f5f3ff;background:#7c3aed30;box-shadow:0 0 16px #8b5cf680,inset 0 0 10px #a78bfa33}
.sparkle{color:#a78bfa;font-size:16px;filter:drop-shadow(0 0 6px #8b5cf699)}
.panel{position:fixed;width:360px;overflow:hidden;background:linear-gradient(155deg,#171126 0%,#100d1b 54%,#0c0b12 100%);color:#f4f1ff;border:1px solid #7c3aed66;border-radius:16px;box-shadow:0 24px 70px #000a,0 0 34px #7c3aed20;display:flex;flex-direction:column;animation:appear .16s ease-out}
.panel.interacting,.panel.no-animation{animation:none}
@keyframes appear{from{opacity:0;transform:translateY(7px) scale(.985)}to{opacity:1;transform:none}}
.header{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid #8b5cf633;background:linear-gradient(105deg,#271744,#181126);cursor:grab;touch-action:none;user-select:none;flex:none}
.header:active{cursor:grabbing}
.brand{font-size:14px;font-weight:800;letter-spacing:.2px;color:#faf8ff}.mark{color:#c084fc}
.header-actions{margin-left:auto;display:flex;gap:3px}
.icon{border:0;background:transparent;color:#aaa1bd;width:29px;height:29px;border-radius:8px;cursor:pointer}.icon:hover{background:#a78bfa1f;color:#fff}.icon:disabled{opacity:.45;cursor:not-allowed}
.body{padding:11px;overflow-x:hidden;overflow-y:auto;display:flex;flex-direction:column;gap:8px;min-height:0}
.resize-handle{height:8px;flex:none;cursor:ns-resize;touch-action:none;position:relative}
.resize-handle::after{content:"";position:absolute;left:calc(50% - 20px);bottom:2px;width:40px;height:2px;border-radius:2px;background:#8b5cf655}
.meta{padding:11px;background:#ffffff08;border:1px solid #ffffff10;border-radius:11px;display:grid;gap:4px}
.problem{font-size:13px;font-weight:700;color:#fff}.sub{font-size:11px;color:#a69db5}
.row{display:flex;align-items:center;gap:8px}.row>*{min-width:0}
select{flex:1;background:#171222;color:#eee9f8;border:1px solid #5b4575;border-radius:9px;padding:8px}
.primary,.secondary{border-radius:9px;padding:8px 11px;font-weight:700;cursor:pointer}
.primary{border:0;background:linear-gradient(105deg,#7c3aed,#a855f7);color:#fff;box-shadow:0 6px 18px #7c3aed38}.primary:hover{filter:brightness(1.12)}.primary:disabled{opacity:.45;cursor:not-allowed}
.secondary{border:1px solid #6d4e8d;background:#21162e;color:#e9ddf7}.secondary:hover{background:#2c1c3d}
.result-tab:focus-visible,.icon:focus-visible,.primary:focus-visible,.secondary:focus-visible,.eye-toggle:focus-visible,select:focus-visible{outline:2px solid #c084fc;outline-offset:2px}
.summary-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.summary{min-width:0;border:1px solid #8b5cf633;background:linear-gradient(155deg,#241536,#15101f);border-radius:12px;padding:11px;display:grid;grid-template-columns:1fr 1fr;gap:9px 6px}
.expected-summary,.implemented-match{border-color:#22c55e;box-shadow:inset 0 0 0 1px #22c55e24,0 0 17px #22c55e26}
.implemented-mismatch{border-color:#ef4444;box-shadow:inset 0 0 0 1px #ef444424,0 0 17px #ef444426}
.implemented-unknown{border-color:#8b5cf666;box-shadow:inset 0 0 0 1px #8b5cf61f}
.summary-heading{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:6px}.summary h3{margin:0;color:#f7f2ff;font-size:12px}
.summary>div:last-child{grid-column:1/-1}
.eye-toggle{width:25px;height:22px;padding:0;display:flex;align-items:center;justify-content:center;line-height:0;border:1px solid #7c3aed55;border-radius:7px;background:#0e0a16;color:#c4b5fd;cursor:pointer}.eye-toggle:hover{background:#7c3aed24;color:#fff}.eye-toggle svg{display:block;flex:none;width:15px;height:12px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}.eye-toggle.concealed{color:#8f829e}.approach-hidden p{color:#9587a8;letter-spacing:.14em}
.card{border:1px solid #8b5cf633;background:#ffffff08;border-radius:12px;padding:11px;display:grid;gap:9px}
.graph-card{padding:9px;gap:7px}
.card h3,.summary h3{margin:0;color:#f7f2ff;font-size:12px}.card h4,.summary h4{margin:0 0 3px;font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#a69ab8}
.card p,.summary p{margin:0;color:#ece5f5;font-size:12px;line-height:1.35;white-space:pre-wrap}
.metric{min-width:0}.value{font-size:14px;font-weight:800;color:#c084fc;overflow-wrap:anywhere}
.notice,.error{border-radius:9px;padding:10px;font-size:12px;line-height:1.4}.notice{background:#8b5cf614;color:#cec5dc}.error{background:#3b1729;border:1px solid #7f294b;color:#fecdd3}
.spinner{width:15px;height:15px;border:2px solid #513369;border-top-color:#c084fc;border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
.loading{display:flex;align-items:center;gap:8px;color:#d7cfdf;font-size:12px}
.graph{display:block;width:100%;height:106px;background:linear-gradient(180deg,#0e0b16,#15101e);border-radius:8px}.axis{stroke:#51465f;stroke-width:1}.expected{stroke:#c084fc;stroke-width:2.5;fill:none;stroke-dasharray:3.5 4;filter:drop-shadow(0 0 3px #c084fc66)}.user{stroke:#7c3aed;stroke-width:2.5;fill:none}
.legend{display:flex;flex-wrap:wrap;gap:6px 11px;color:#b9afc7;font-size:9px}.dot{display:inline-block;width:10px;height:3px;margin-right:4px;vertical-align:middle}.dot.expected{background:repeating-linear-gradient(90deg,#c084fc 0 3px,transparent 3px 5px)}.dot.user{background:#7c3aed}
.graph-note{font-size:10px;color:#95899f}
@media (max-width:460px){.summary-grid{grid-template-columns:1fr}.graph{height:100px}}
`;
