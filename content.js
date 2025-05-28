(function() {
    'use strict';

    // 配置
    const HOTKEY = {ctrl: true, shift: true, key: 'T'}; // Ctrl+Shift+T 呼出
    const MAX_HISTORY = 10;

    let enabled = true;
    let history = JSON.parse(localStorage.getItem('jxtrans_history') || '[]');
    let activeInput = null;
    let lastDialog = null;

    // 语言判断
    function isChinese(text) { return /[\u4e00-\u9fa5]/.test(text); }
    function isEnglish(text) { return /^[\x00-\x7F\s.,?!'"“”‘’\-—]+$/.test(text) && /[a-zA-Z]/.test(text);}
    function autoDetectLang(text) {
        if (isChinese(text)) return {sl: 'zh-CN', tl: 'en'};
        if (isEnglish(text)) return {sl: 'en', tl: 'zh-CN'};
        return {sl: 'zh-CN', tl: 'en'};
    }

    // 翻译
    async function translate(text, sl, tl) {
        const res = await fetch(
            `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`
        );
        const data = await res.json();
        return data[0].map(item => item[0]).join('');
    }

    // 历史
    function addHistory(origin, result) {
        history.unshift({origin, result, time: Date.now()});
        if(history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
        localStorage.setItem('jxtrans_history', JSON.stringify(history));
    }

    // 主按钮
    function createToggleButton() {
        if(document.getElementById('cn2en_toggle_btn')) return;
        const btn = document.createElement('button');
        btn.id = 'cn2en_toggle_btn';
        btn.textContent = "佳鑫翻译：开";
        btn.title = "点击开关插件，Ctrl+Shift+T 弹出翻译框";
        Object.assign(btn.style, {
            position: "fixed",
            right: "30px",
            bottom: "30px",
            zIndex: 999999,
            padding: "14px 24px",
            background: "linear-gradient(90deg, #16e6ff 0%, #388bfc 100%)",
            color: "#fff",
            border: "none",
            borderRadius: "12px",
            fontSize: "18px",
            letterSpacing: "2px",
            cursor: "pointer",
            boxShadow: "0 4px 24px rgba(30,144,255,0.25)",
            fontWeight: "bold"
        });
        btn.onclick = function() {
            enabled = !enabled;
            btn.textContent = enabled ? "佳鑫翻译：开" : "佳鑫翻译：关";
            btn.style.background = enabled ? "linear-gradient(90deg, #16e6ff 0%, #388bfc 100%)" : "#888";
        };
        document.body.appendChild(btn);
        // 可拖动
        let isDown = false, offsetX = 0, offsetY = 0;
        btn.onmousedown = function(e){isDown=true;offsetX=e.clientX-btn.offsetLeft;offsetY=e.clientY-btn.offsetTop;};
        document.onmousemove = function(e){if(isDown){btn.style.left=(e.clientX-offsetX)+"px";btn.style.top=(e.clientY-offsetY)+"px";btn.style.right="auto";btn.style.bottom="auto";}};
        document.onmouseup = function(){isDown=false;};
    }

    // 划词按钮
    function createSelBtn(x, y, text) {
        removeSelBtn();
        const btn = document.createElement('button');
        btn.id = 'jxtrans_selbtn';
        btn.textContent = "翻译";
        Object.assign(btn.style, {
            position: "fixed",
            left: x+"px",
            top: y+"px",
            zIndex: 2147483647,
            background: "#ffecb3",
            color: "#1e8fff",
            fontWeight: "bold",
            border: "1.5px solid #ffc200",
            borderRadius: "7px",
            padding: "4px 12px",
            fontSize: "14px",
            cursor: "pointer",
            boxShadow: "0 2px 10px #eee"
        });
        btn.onclick = async function(){
            const {sl, tl} = autoDetectLang(text);
            showEditDialog(text, await translate(text, sl, tl));
            removeSelBtn();
        };
        document.body.appendChild(btn);
    }
    function removeSelBtn() {
        let b = document.getElementById('jxtrans_selbtn');
        if(b) b.remove();
    }

    function showEditDialog(original = '', translated = '') {
        // 若已存在弹窗，复用，不重复生成
        if (lastDialog) {
            lastDialog.remove();
            let mask = document.getElementById('cn2en_mask');
            if(mask) mask.remove();
        }

        let mask = document.createElement('div');
        mask.id = 'cn2en_mask';
        Object.assign(mask.style, {
            position: 'fixed',
            left: '0', top: '0',
            width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.18)',
            zIndex: 100010
        });
        mask.onclick = function(e) {
            if(e.target===mask){dialog.remove();mask.remove(); lastDialog = null;}
        };
        document.body.appendChild(mask);

        const dialog = document.createElement('div');
        lastDialog = dialog;
        dialog.id = 'cn2en_dialog';
        Object.assign(dialog.style, {
            position: 'fixed',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'linear-gradient(135deg,#fafdff 70%,#e8f7ff 100%)',
            border: '2.5px solid #37a5ff',
            borderRadius: '18px',
            padding: '0 26px 20px 26px',
            zIndex: 100100,
            boxShadow: '0 8px 42px 0 rgba(30,144,255,0.26)',
            fontFamily: 'Segoe UI,Arial,sans-serif',
            minWidth: '290px',
            maxWidth: '92vw'
        });
        dialog.innerHTML = `
            <div id="cn2en_drag_header" style="user-select:none;cursor:move;padding-top:20px;padding-bottom:10px;text-align:center;">
                <span style="font-size:22px;font-weight:bold;color:#1e8fff;letter-spacing:2px;text-shadow:0 2px 10px #c4f1ff;">佳鑫·中英互译助手</span>
            </div>
            <div style="margin-bottom:6px;margin-top:2px;color:#333;font-size:15px;">原文：</div>
            <input id="cn2en_origin" style="background:#f5fafd;padding:10px 10px;border-radius:7px;margin-bottom:10px;border:none;width:99%;font-size:16px;color:#8591a6;" readonly />
            <div style="margin-bottom:4px;font-weight:bold;color:#2d6cb5;">翻译结果（可编辑）：</div>
            <textarea id="cn2en_result" style="width:99%;height:60px;font-size:16px;padding:7px 10px;margin-bottom:8px;border-radius:7px;border:1.5px solid #b2d6ff;resize:vertical;box-sizing:border-box;background:#fafdff;transition:border 0.2s;outline:none;"></textarea>
            <div style="display:flex;align-items:center;margin-bottom:12px;gap:14px;flex-wrap:wrap;">
                <button id="copy_en" class="jx_btn jx_btn_light">复制翻译</button>
                <button id="swap_lang" class="jx_btn jx_btn_yellow">反向翻译</button>
                <button id="show_hist" class="jx_btn jx_btn_orange">翻译历史</button>
            </div>
            <div id="en2cn_result" style="margin:8px 0 14px 0;color:#237a42;display:none;background:#f9ffe7;padding:6px 10px;border-radius:5px;font-size:14px;box-shadow:0 1px 3px #e7efc5;"></div>
            <div id="cn2en_history" style="display:none;margin-bottom:10px;"></div>
            <div style="text-align:center;">
                <button id="cn2en_ok" class="jx_btn jx_btn_main">发送</button>
                <button id="cn2en_cancel" class="jx_btn jx_btn_gray">关闭</button>
            </div>
            <div style="margin-top:14px;text-align:right;color:#b6c7d1;font-size:13px;letter-spacing:1px;">
                佳鑫工具 2025
            </div>
        `;
        document.body.appendChild(dialog);

        // 按钮样式
        if(!document.getElementById('jxtrans_css')){
            const style = document.createElement('style');
            style.id = 'jxtrans_css';
            style.innerHTML = `
            .jx_btn{border:none; outline:none; padding:8px 18px; border-radius:7px;
                font-size:15px; font-weight:bold; cursor:pointer; transition:all 0.18s;
                box-shadow:0 2px 7px #eaf6ff;}
            .jx_btn_main{ background:linear-gradient(90deg,#37a5ff 0%,#51cbff 100%); color:#fff; margin-right:20px;}
            .jx_btn_main:hover{ background:linear-gradient(90deg,#388bfc,#16e6ff);}
            .jx_btn_gray{ background:#bfc3c7; color:#fff;}
            .jx_btn_gray:hover{ background:#888;}
            .jx_btn_light{ background:#e4f1ff; color:#1e90ff;}
            .jx_btn_light:hover{ background:#c1e6ff;}
            .jx_btn_yellow{ background:#fff7d1; color:#b8860b; border:1px solid #ffe58f;}
            .jx_btn_yellow:hover{ background:#ffe58f;}
            .jx_btn_orange{ background:#ffdbb3; color:#e48a29; border:1px solid #ffb980;}
            .jx_btn_orange:hover{ background:#ffb980;}
            `;
            document.head.appendChild(style);
        }

        // 填充内容
        dialog.querySelector('#cn2en_origin').value = original;
        const enInput = dialog.querySelector('#cn2en_result');
        enInput.value = translated;
        enInput.focus();
        enInput.select();

        // 拖动弹窗
        makeDraggable(dialog, dialog.querySelector('#cn2en_drag_header'));

        // 复制翻译
        dialog.querySelector('#copy_en').onclick = function() {
            const en = enInput.value;
            navigator.clipboard.writeText(en);
            this.textContent = '已复制！';
            this.disabled = true;
            setTimeout(()=>{
                this.textContent = '复制翻译';
                this.disabled = false;
            },1000);
        };

        // 反向翻译
        dialog.querySelector('#swap_lang').onclick = async function() {
            const src = enInput.value;
            const {sl, tl} = autoDetectLang(src);
            const r = dialog.querySelector('#en2cn_result');
            r.style.display = 'block';
            r.textContent = '正在翻译...';
            const cn = await translate(src, sl, tl === 'en' ? 'zh-CN' : 'en');
            r.textContent = '翻译结果：' + cn;
        };

        // 历史
        dialog.querySelector('#show_hist').onclick = function() {
            const box = dialog.querySelector('#cn2en_history');
            if(box.style.display==='block'){box.style.display='none';return;}
            box.style.display='block';
            box.innerHTML = '<div style="font-weight:bold;color:#2d6cb5;margin-bottom:6px;">最近翻译历史：</div>'+(history.length === 0 ? '<span style="color:#888;">暂无历史</span>' :
                history.map(h=>`<div style="margin-bottom:7px;background:#fafdff;padding:5px 8px;border-radius:7px;">
                <div style="color:#888;margin-bottom:2px;">原文：${h.origin}</div>
                <div style="color:#1e90ff;font-weight:bold;">翻译：${h.result}</div>
                </div>`).join(''));
        };

        // 发送（写回输入框并派发input事件，不自动提交，保留弹窗）
        dialog.querySelector('#cn2en_ok').onclick = sendToInput;
        dialog.onkeydown = function(e) {
            if (e.key === 'Escape') {
                dialog.remove(); mask.remove(); lastDialog = null;
            } else if ((e.key === 'Enter') && (document.activeElement === enInput) && !e.shiftKey) {
                e.preventDefault();
                sendToInput();
            }
        };

        function sendToInput() {
            if (!activeInput) return;
            const val = enInput.value;
            // 写回输入框并派发事件（兼容所有主流网站/组件库）
            if (activeInput.value !== undefined) {
                activeInput.value = val;
                activeInput.dispatchEvent(new Event('input', { bubbles: true }));
                activeInput.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                activeInput.innerText = val;
                activeInput.dispatchEvent(new Event('input', { bubbles: true }));
                activeInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
            // 聚焦并选中全部文本
            activeInput.focus();
            if (activeInput.setSelectionRange) {
                activeInput.setSelectionRange(0, val.length);
            } else if (activeInput.select) {
                activeInput.select();
            }
            addHistory(dialog.querySelector('#cn2en_origin').value, val);
            // 保持弹窗常驻，用户可继续操作
        }

        // 关闭
        dialog.querySelector('#cn2en_cancel').onclick = function() {
            dialog.remove(); mask.remove(); lastDialog = null;
        };
    }

    // 拖动弹窗
    function makeDraggable(dialog, header) {
        let isDown = false, offsetX = 0, offsetY = 0;
        header.style.cursor = "move";
        header.onmousedown = function(e) {
            isDown = true;
            offsetX = e.clientX - dialog.offsetLeft;
            offsetY = e.clientY - dialog.offsetTop;
            document.body.style.userSelect = "none";
        };
        document.onmousemove = function(e) {
            if (!isDown) return;
            let left = e.clientX - offsetX;
            let top = e.clientY - offsetY;
            left = Math.max(16, Math.min(left, window.innerWidth - dialog.offsetWidth - 16));
            top = Math.max(16, Math.min(top, window.innerHeight - dialog.offsetHeight - 16));
            dialog.style.left = left + "px";
            dialog.style.top = top + "px";
            dialog.style.transform = "none";
        };
        document.onmouseup = function() {
            isDown = false;
            document.body.style.userSelect = "";
        };
    }

    // 主输入框回车自动翻译（只做一次弹窗/翻译，不自动发送）
    document.body.addEventListener('keydown', async function(e) {
        if(!enabled) return;
        if(e.ctrlKey === HOTKEY.ctrl && e.shiftKey === HOTKEY.shift && e.key.toUpperCase() === HOTKEY.key) {
            e.preventDefault();
            activeInput = null;
            showEditDialog();
            return;
        }
        // 只处理没有jxTransSend标记的事件，防止递归
        if(e.key === 'Enter' && !e.shiftKey && !e.jxTransSend) {
            const el = e.target;
            if(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable) {
                let text = el.value !== undefined ? el.value : el.innerText;
                if(!text || text.trim()==='') return;
                const {sl, tl} = autoDetectLang(text);
                if(sl!==tl) {
                    e.preventDefault();
                    activeInput = el;
                    const translated = await translate(text, sl, tl);
                    showEditDialog(text, translated);
                }
            }
        }
    }, true);

    // 划词翻译
    document.body.addEventListener('mouseup', function(e){
        if(!enabled) {removeSelBtn();return;}
        let sel = window.getSelection().toString().trim();
        if(sel.length > 0 && sel.length < 200) {
            const x = e.clientX+8, y = e.clientY+8;
            createSelBtn(x, y, sel);
        } else removeSelBtn();
    });
    document.body.addEventListener('mousedown', removeSelBtn);

    // 初始化
    createToggleButton();

})();