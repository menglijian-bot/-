(function() {
    'use strict';

    // ===== 多语言字典 =====
    const I18N = {
        'zh-CN': {
            title: "佳鑫·多国语翻译助手",
            origin: "原文",
            result: "翻译结果（可编辑）",
            copy: "复制翻译",
            copied: "已复制！",
            swap: "反向翻译",
            history: "翻译历史",
            send: "发送",
            cancel: "关闭",
            toLang: "目标语言",
            selectLang: "界面语言",
            auto: "自动检测",
            tip: "翻译成功，请确认后再次回车发送",
            sendSwitch: "发送翻译",
            setTitle: "设置",
            setUILang: "界面语言",
            setTargetLang: "目标语言"
        },
        'en': {
            title: "Jiaxin · Multilingual Translator",
            origin: "Original",
            result: "Translation (editable)",
            copy: "Copy",
            copied: "Copied!",
            swap: "Reverse Translate",
            history: "History",
            send: "Send",
            cancel: "Cancel",
            toLang: "Target Language",
            selectLang: "UI Language",
            auto: "Auto Detect",
            tip: "Translation successful, press Enter again to send",
            sendSwitch: "Send Translation",
            setTitle: "Settings",
            setUILang: "UI Language",
            setTargetLang: "Target Language"
        },
        'my': {
            title: "Jiaxin · ဘာသာစကားအတူတူတင်ပြ",
            origin: "မူရင်းစာသား",
            result: "ဘာသာပြန်ရလဒ် (တည်းဖြတ်နိုင်သည်)",
            copy: "ကူးယူပါ",
            copied: "ကူးယူပြီး!",
            swap: "ပြန်လည်ဘာသာပြန်ပါ",
            history: "မှတ်တမ်း",
            send: "ပို့ပါ",
            cancel: "ပိတ်ပါ",
            toLang: "ရည်ရွယ်သောဘာသာစကား",
            selectLang: "UI ဘာသာစကား",
            auto: "အလိုအလျောက်",
            tip: "ဘာသာပြန်ပြီးပြီ၊ ထပ်မံ Enter နှိပ်၍ ပို့ပါ",
            sendSwitch: "ဘာသာပြန်ချက်ပို့ရန်",
            setTitle: "ဆက်တင်များ",
            setUILang: "UI ဘာသာစကား",
            setTargetLang: "ရည်ရွယ်သောဘာသာစကား"
        }
    };

    // ===== 支持的目标语言 =====
    const LANGUAGES = [
        { code: "zh-CN", name: "中文简体" },
        { code: "en",    name: "English" },
        { code: "my",    name: "မြန်မာစာ (Myanmar)" },
        { code: "ja",    name: "日本語" },
        { code: "ko",    name: "한국어" },
        { code: "fr",    name: "Français" },
        { code: "es",    name: "Español" },
        { code: "de",    name: "Deutsch" },
        { code: "ru",    name: "Русский" },
        { code: "it",    name: "Italiano" },
        { code: "pt",    name: "Português" },
        { code: "vi",    name: "Tiếng Việt" },
        { code: "id",    name: "Bahasa Indonesia" },
        { code: "th",    name: "ไทย" },
        { code: "ar",    name: "العربية" },
        { code: "tr",    name: "Türkçe" }
    ];

    const HOTKEY = {ctrl: true, shift: true, key: 'T'};
    const MAX_HISTORY = 10;
    let enabled = true;
    let enterQuickEnabled = true;
    let skipEnterOnce = false;
    let history = JSON.parse(localStorage.getItem('jxtrans_history') || '[]');
    let activeInput = null;
    let lastDialog = null;
    let pendingTranslateInput = null;
    let uiLang = localStorage.getItem('jxtrans_uiLang') || 'zh-CN';
    let targetLang = localStorage.getItem('jxtrans_targetLang') || 'en';
    window.jxtrans_send_switch = false;

    // 自动检测语言
    async function detectLangGoogle(text) {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            return data[2] || autoDetectLang(text);
        } catch {
            return autoDetectLang(text);
        }
    }
    function autoDetectLang(text) {
        if (/[\u4e00-\u9fa5]/.test(text)) return 'zh-CN';
        if (/[\u1000-\u109F]/.test(text)) return 'my';
        if (/[\u3040-\u30ff]/.test(text)) return 'ja';
        if (/[\u3130-\u318F\uAC00-\uD7A3]/.test(text)) return 'ko';
        if (/[\u0400-\u04FF]/.test(text)) return 'ru';
        if (/^[a-zA-Z0-9\s.,?!'"“”‘’\-—]+$/.test(text) && /[a-zA-Z]/.test(text)) return 'en';
        return 'auto';
    }
    async function translate(text, sl, tl) {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
        const res = await fetch(url);
        const data = await res.json();
        return data[0].map(item => item[0]).join('');
    }
    function addHistory(origin, result) {
        history.unshift({origin, result, time: Date.now()});
        if(history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
        localStorage.setItem('jxtrans_history', JSON.stringify(history));
    }

    // 设置面板
    function createSettingsPanel() {
        if (document.getElementById('jxtrans_settings_panel')) return;
        const dict = I18N[uiLang] || I18N['zh-CN'];
        const panel = document.createElement('div');
        panel.id = 'jxtrans_settings_panel';
        Object.assign(panel.style, {
            position: "fixed",
            right: "30px",
            bottom: "140px",
            zIndex: 999999,
            background: "#fff",
            border: "1.5px solid #e7f2ff",
            borderRadius: "14px",
            boxShadow: "0 4px 32px #e0e9f9",
            padding: "18px 26px 18px 26px",
            minWidth: "210px"
        });
        panel.innerHTML = `
            <div style="font-size:16px;font-weight:bold;color:#3899ec;text-align:center;margin-bottom:18px;">${dict.setTitle}</div>
            <div style="margin-bottom:14px;">
                <label style="font-size:14px;font-weight:500;color:#888;">${dict.setUILang}：</label>
                <select id="jxtrans_uiLang_select_panel" style="border-radius:6px;padding:3px 12px;font-size:14px;">${
                    Object.entries(I18N).map(([code, d]) => `<option value="${code}"${code===uiLang?' selected':''}>${d.selectLang||code}</option>`).join('')
                }</select>
            </div>
            <div style="margin-bottom:14px;">
                <label style="font-size:14px;font-weight:500;color:#888;">${dict.setTargetLang}：</label>
                <select id="jxtrans_targetLang_select_panel" style="border-radius:6px;padding:3px 12px;font-size:14px;">${
                    LANGUAGES.map(l=>`<option value="${l.code}"${l.code===targetLang?' selected':''}>${l.name}</option>`).join('')
                }</select>
            </div>
        `;
        document.body.appendChild(panel);
        document.getElementById('jxtrans_uiLang_select_panel').onchange = function(e) {
            uiLang = e.target.value;
            localStorage.setItem('jxtrans_uiLang', uiLang);
            panel.remove();
        };
        document.getElementById('jxtrans_targetLang_select_panel').onchange = function(e) {
            targetLang = e.target.value;
            localStorage.setItem('jxtrans_targetLang', targetLang);
            panel.remove();
        };
        panel.onclick = e => e.stopPropagation();
        setTimeout(()=>{
            document.body.addEventListener('mousedown', function closePanel(ev){
                if(!panel.contains(ev.target)) {
                    panel.remove();
                    document.body.removeEventListener('mousedown', closePanel);
                }
            });
        }, 50);
    }

    // ====== 美观翻译提示条，2秒自动消失 ======
    function showTranslateTip(targetInput, uiLang, autoSendEnabled) {
        removeTranslateTip();
        const dict = I18N[uiLang] || I18N['zh-CN'];
        const tip = document.createElement('div');
        tip.id = 'jxtrans_translate_tip';
        tip.innerHTML = `
            <span style="color:#d67e00;font-weight:bold;font-size:15px;vertical-align:middle;display:block;">
                ${dict.tip}
            </span>
            <label style="display:inline-flex;align-items:center;margin-left:0;cursor:pointer;font-size:14px;">
                <input type="checkbox" id="jxtrans_send_switch" ${autoSendEnabled ? 'checked' : ''} style="accent-color:#3899ec;margin-right:4px;">
                <span style="color:#3899ec;font-weight:bold;">${dict.sendSwitch}</span>
            </label>
        `;
        Object.assign(tip.style, {
            position: "absolute",
            left: "0",
            right: "0",
            top: (targetInput.offsetTop - 36) + "px",
            margin: "auto",
            width: "fit-content",
            zIndex: "999999",
            background: "#fff6e1",
            border: "1.5px solid #ffb871",
            borderRadius: "8px",
            padding: "8px 24px",
            boxShadow: "0 2px 16px #ffe6b3aa",
            textAlign: "center",
            fontFamily: "inherit",
            transition: "all 0.25s cubic-bezier(.4,2,.3,1)"
        });
        let parent = targetInput.parentElement;
        parent = parent && parent.offsetParent ? parent : document.body;
        parent.appendChild(tip);
        tip.querySelector('#jxtrans_send_switch').onchange = e => {
            window.jxtrans_send_switch = e.target.checked;
        };
        // 2秒后自动消失
        setTimeout(removeTranslateTip, 2000);
    }

    function removeTranslateTip() {
        document.getElementById('jxtrans_translate_tip')?.remove();
    }

    // 划词按钮
    function createSelBtn(x, y, text) {
        removeSelBtn();
        const btn = document.createElement('button');
        btn.id = 'jxtrans_selbtn';
        btn.textContent = I18N[uiLang].copy || "翻译";
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
            const detected = await detectLangGoogle(text);
            showEditDialog(text, await translate(text, detected, targetLang), detected, targetLang);
            removeSelBtn();
        };
        document.body.appendChild(btn);
    }
    function removeSelBtn() {
        let b = document.getElementById('jxtrans_selbtn');
        if(b) b.remove();
    }

    // 划词弹窗（仅供划词用）
    // ...（此处与前述代码一致，省略）

    // 主输入框三步逻辑（翻译后自动关闭0.1秒再自动开启Enter翻译，skipEnterOnce机制保证原生发送）
    document.body.addEventListener('keydown', async function(e) {
        if(e.ctrlKey && e.key === 'Enter') {
            enterQuickEnabled = !enterQuickEnabled;
            updateEnterBtnUI();
            removeTranslateTip();
            return;
        }
        if(!enabled) return;
        if(e.ctrlKey === HOTKEY.ctrl && e.shiftKey === HOTKEY.shift && e.key.toUpperCase() === HOTKEY.key) {
            e.preventDefault();
            activeInput = null;
            showEditDialog();
            return;
        }

        // 跳过一次插件拦截，让原生发送
        if(skipEnterOnce && e.key === 'Enter' && !e.shiftKey) {
            skipEnterOnce = false;
            enterQuickEnabled = true;
            updateEnterBtnUI();
            return;
        }

        if(!enterQuickEnabled) return;

        if(e.key === 'Enter' && !e.shiftKey && !e.jxTransSend) {
            const el = e.target;
            if(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable) {
                let text = el.value !== undefined ? el.value : el.innerText;
                if(!text || text.trim()==='') return;
                if(!pendingTranslateInput) {
                    e.preventDefault();
                    activeInput = el;
                    const detected = await detectLangGoogle(text);
                    const translated = await translate(text, detected, targetLang);
                    pendingTranslateInput = el;
                    el.value !== undefined ? el.value = translated : el.innerText = translated;
                    removeTranslateTip();
                    window.jxtrans_send_switch = false;
                    showTranslateTip(el, uiLang, window.jxtrans_send_switch);

                    // 关闭插件Enter拦截并跳过下一次
                    enterQuickEnabled = false;
                    skipEnterOnce = true;
                    updateEnterBtnUI();

                    // 保险：0.3秒后自动恢复开关
                    setTimeout(()=>{
                        enterQuickEnabled = true;
                        updateEnterBtnUI();
                    }, 300);

                } else if (pendingTranslateInput === el) {
                    e.preventDefault();
                    removeTranslateTip();
                    let submitBtn = el.closest('form')?.querySelector('button[type=submit], .send-btn-class');
                    if (window.jxtrans_send_switch && submitBtn) submitBtn.click();
                    pendingTranslateInput = null;
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

    // 按钮样式
    if(!document.getElementById('jxtrans_css')){
        const style = document.createElement('style');
        style.id = 'jxtrans_css';
        style.innerHTML = `
        .jx_btn{border:none; outline:none; padding:8px 20px; border-radius:9px;
            font-size:15px; font-weight:600; cursor:pointer; transition:all 0.15s;
            box-shadow:0 2px 7px #f0f4fa;}
        .jx_btn_main{ background:linear-gradient(90deg,#3899ec 0%,#6bd3ff 100%); color:#fff; margin-right:20px;}
        .jx_btn_main:hover{ background:linear-gradient(90deg,#348fff,#e8fffa);}
        .jx_btn_gray{ background:#bec6ce; color:#fff;}
        .jx_btn_gray:hover{ background:#989ca0;}
        .jx_btn_light{ background:#f0f8ff; color:#3899ec;}
        .jx_btn_light:hover{ background:#d6eaff;}
        .jx_btn_yellow{ background:#fff7d1; color:#e48a29; border:1px solid #ffe58f;}
        .jx_btn_yellow:hover{ background:#ffe58f;}
        .jx_btn_orange{ background:#ffdbb3; color:#e48a29; border:1px solid #ffb980;}
        .jx_btn_orange:hover{ background:#ffb980;}
        #jxtrans_translate_tip{animation:fadeinTip 0.6s;}
        @keyframes fadeinTip{from{opacity:0;transform:translateY(-15px);} to{opacity:1;transform:translateY(0);}}
        `;
        document.head.appendChild(style);
    }

    // 主按钮+设置按钮
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

        const enterBtn = document.createElement('button');
        enterBtn.id = 'cn2en_enter_btn';
        enterBtn.textContent = enterQuickEnabled ? "Enter翻译：开" : "Enter翻译：关";
        enterBtn.title = "Ctrl+Enter 切换输入框Enter快捷翻译";
        Object.assign(enterBtn.style, {
            position: "fixed",
            right: "30px",
            bottom: "80px",
            zIndex: 999999,
            padding: "10px 18px",
            background: enterQuickEnabled ? "#fff7d1" : "#bfc3c7",
            color: enterQuickEnabled ? "#b8860b" : "#fff",
            border: "1px solid #ffe58f",
            borderRadius: "12px",
            fontSize: "15px",
            letterSpacing: "1px",
            cursor: "pointer",
            fontWeight: "bold",
            boxShadow: "0 2px 8px #ffe58f"
        });
        enterBtn.onclick = function() {
            enterQuickEnabled = !enterQuickEnabled;
            updateEnterBtnUI();
        };
        document.body.appendChild(enterBtn);

        const setBtn = document.createElement('button');
        setBtn.id = 'jxtrans_settings_btn_float';
        setBtn.title = I18N[uiLang].setTitle;
        setBtn.textContent = "⚙️";
        Object.assign(setBtn.style, {
            position: "fixed",
            right: "30px",
            bottom: "130px",
            zIndex: 999999,
            padding: "9px 14px",
            background: "#eaf7ff",
            color: "#3899ec",
            border: "1px solid #d2ebff",
            borderRadius: "11px",
            fontSize: "18px",
            cursor: "pointer",
            boxShadow: "0 2px 8px #e6f4ff"
        });
        setBtn.onclick = function() {
            createSettingsPanel();
        };
        document.body.appendChild(setBtn);

        let isDown = false, offsetX = 0, offsetY = 0;
        btn.onmousedown = function(e){isDown=true;offsetX=e.clientX-btn.offsetLeft;offsetY=e.clientY-btn.offsetTop;};
        document.onmousemove = function(e){if(isDown){btn.style.left=(e.clientX-offsetX)+"px";btn.style.top=(e.clientY-offsetY)+"px";btn.style.right="auto";btn.style.bottom="auto";}};
        document.onmouseup = function(){isDown=false;};
    }

    function updateEnterBtnUI() {
        const enterBtn = document.getElementById('cn2en_enter_btn');
        if(enterBtn) {
            enterBtn.textContent = enterQuickEnabled ? "Enter翻译：开" : "Enter翻译：关";
            enterBtn.style.background = enterQuickEnabled ? "#fff7d1" : "#bfc3c7";
            enterBtn.style.color = enterQuickEnabled ? "#b8860b" : "#fff";
        }
    }

    // 启动入口
    createToggleButton();

})();