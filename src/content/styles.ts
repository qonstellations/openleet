export const STYLES = `
:host{all:initial;color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif}
*{box-sizing:border-box}
button,select{font:inherit}
.launcher{position:fixed;right:20px;bottom:20px;z-index:2147483646;border:1px solid #6ee7b7;background:#111827;color:#ecfdf5;border-radius:999px;padding:11px 16px;font-size:13px;font-weight:700;box-shadow:0 12px 35px #0008;cursor:pointer}
.launcher:hover{background:#172033}
.panel{position:fixed;top:0;right:0;width:min(430px,100vw);height:100vh;z-index:2147483647;background:#0b1020;color:#e5eaf3;border-left:1px solid #29344b;box-shadow:-18px 0 50px #0008;display:flex;flex-direction:column}
.panel.collapsed{height:auto;top:14px;right:14px;border:1px solid #29344b;border-radius:12px;width:min(390px,calc(100vw - 28px))}
.panel.collapsed .body{display:none}
.header{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid #202a40;background:#0e1528}
.brand{font-size:15px;font-weight:800;letter-spacing:.2px;color:#f3f7ff}.mark{color:#6ee7b7}
.header-actions{margin-left:auto;display:flex;gap:4px}
.icon{border:0;background:transparent;color:#aab4c6;width:30px;height:30px;border-radius:7px;cursor:pointer}.icon:hover{background:#202a40;color:#fff}
.body{padding:16px;overflow:auto;display:flex;flex-direction:column;gap:14px}
.meta{padding:12px;background:#111a2e;border:1px solid #26324a;border-radius:10px;display:grid;gap:5px}
.problem{font-size:14px;font-weight:700;color:#fff}.sub{font-size:12px;color:#9eabc0}
.row{display:flex;align-items:center;gap:8px}.row>*{min-width:0}
select{flex:1;background:#111a2e;color:#e5eaf3;border:1px solid #35435e;border-radius:8px;padding:9px}
.primary,.secondary{border-radius:8px;padding:9px 12px;font-weight:700;cursor:pointer}
.primary{border:0;background:#34d399;color:#052e22}.primary:hover{background:#6ee7b7}.primary:disabled{opacity:.5;cursor:not-allowed}
.secondary{border:1px solid #3b4964;background:#151e31;color:#dce4f2}.secondary:hover{background:#202a40}
.card{border:1px solid #27334a;background:#10182a;border-radius:11px;padding:13px;display:grid;gap:10px}
.card h3{margin:0;color:#f5f7fb;font-size:13px}.card h4{margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#8fa0ba}
.card p{margin:0;color:#c2cada;font-size:12.5px;line-height:1.5;white-space:pre-wrap}
.metrics{display:grid;grid-template-columns:1fr 1fr;gap:8px}.metric{background:#0b1221;border-radius:8px;padding:9px}.value{font-size:14px;font-weight:800;color:#6ee7b7;margin-top:3px;overflow-wrap:anywhere}
.badge{display:inline-flex;width:max-content;border-radius:999px;background:#27334a;color:#c9d4e6;padding:4px 8px;font-size:11px;text-transform:capitalize}
.notice,.error{border-radius:9px;padding:12px;font-size:12.5px;line-height:1.45}.notice{background:#172238;color:#c4d2e8}.error{background:#391d28;border:1px solid #713146;color:#fecdd3}
.spinner{width:16px;height:16px;border:2px solid #244234;border-top-color:#6ee7b7;border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
.loading{display:flex;align-items:center;gap:9px;color:#c6d0e0;font-size:13px}
.graph{width:100%;height:auto;background:#0a1120;border-radius:8px}.axis{stroke:#3a465d;stroke-width:1}.expected{stroke:#6ee7b7;stroke-width:2.5;fill:none}.user{stroke:#60a5fa;stroke-width:2.5;fill:none;stroke-dasharray:6 4}
.legend{display:flex;gap:14px;color:#aeb9ca;font-size:11px}.dot{display:inline-block;width:9px;height:3px;margin-right:5px;vertical-align:middle}.dot.expected{background:#6ee7b7}.dot.user{background:#60a5fa}
.graph-note{font-size:11px;color:#8593a9}.footer{font-size:11px;color:#7d8aa1}
`;
