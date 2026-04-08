/**
 * OLLAMA EXPLORER v14.0 - PAGINATION SCROLL HYBRID
 * ✅ Detecta enlaces de paginación en la página
 * ✅ Fetchea cada página sin recargar
 * ✅ Acumula todos los modelos en memoria
 * ✅ Funciona en /search con paginación real
 */
(async function() {
    const LOG = (m,s="") => console.log(`%c${m}`, `color:#00e5ff;${s}`);
    const WARN = (m) => console.warn(`%c⚠️ ${m}`, "color:#ffa726;");
    const ERR = (m) => console.error(`%c❌ ${m}`, "color:#ff5252;");

    console.clear();
    LOG("🦙 OLLAMA EXPLORER v14.0 - PAGINATION MODE", "font-weight:bold;background:#000;padding:5px;border-radius:3px;");

    // ========================================
    // CONFIGURACIÓN
    // ========================================
    const CONFIG = {
        baseUrl: window.location.origin + '/search',
        delayMs: 600,
        storageKey: 'ollama_backup_v14'
    };

    // ========================================
    // DETECTAR PÁGINAS DISPONIBLES DESDE EL DOM
    // ========================================
    function detectPagesFromDOM() {
        const pages = new Set([1]); // Siempre incluir página 1
        
        // Buscar enlaces de paginación en el footer/nav
        const pageLinks = document.querySelectorAll('a[href*="page="], nav a, [class*="pagination"] a');
        
        pageLinks.forEach(link => {
            const href = link.href || link.getAttribute('href') || '';
            const match = href.match(/[?&]page=(\d+)/);
            if (match) {
                pages.add(parseInt(match[1]));
            }
        });
        
        // También buscar números de página en texto
        const pageTexts = document.querySelectorAll('[class*="page"], [class*="pagination"]');
        pageTexts.forEach(el => {
            const text = el.innerText;
            const matches = text.match(/Page\s*(\d+)/gi) || text.match(/\b(\d{1,2})\b/g) || [];
            matches.forEach(m => {
                const num = parseInt(m.replace(/\D/g,''));
                if (num > 1 && num < 100) pages.add(num);
            });
        });
        
        // Convertir a array ordenado
        const pageArray = Array.from(pages).sort((a,b) => a-b);
        
        // Si no detectamos nada, usar rango por defecto (1-15)
        if (pageArray.length <= 1) {
            WARN("No se detectaron enlaces de paginación. Usando rango por defecto (1-15)");
            for (let i=1; i<=15; i++) pages.add(i);
            return Array.from(pages);
        }
        
        // Asegurar que tenemos un rango continuo
        const maxPage = Math.max(...pageArray);
        for (let i=1; i<=maxPage; i++) pages.add(i);
        
        LOG(`📄 Páginas detectadas: ${Array.from(pages).sort((a,b)=>a-b).join(', ')}`);
        return Array.from(pages).sort((a,b) => a-b);
    }

    // ========================================
    // PARSEAR MODELOS DESDE HTML STRING
    // ========================================
    function parseModelsFromHTML(html, pageNum) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const models = [];
        const seen = new Set();
        
        // Estrategia 1: Por cards con h2
        const cards = doc.querySelectorAll('li:has(h2), [class*="group"]:has(h2), article:has(h2), .relative:has(h2)');
        
        if (cards.length > 0) {
            cards.forEach(card => {
                const text = card.innerText;
                const nameEl = card.querySelector('h2, h3, strong, [class*="font-semibold"]');
                let name = nameEl?.innerText?.trim() || text.split('\n')[0]?.trim();
                if (!name || name.length > 50 || name.length < 2) return;
                
                const cleanName = name.replace(/\*\*/g,'').split('\n')[0].trim();
                if (seen.has(cleanName.toLowerCase())) return;
                
                const pullsMatch = text.match(/([\d.]+[KMB]?)\s*Pulls?/i);
                const paramsMatch = text.match(/\b(\d+(\.\d+)?[bBmMkK])\b/g);
                const validParams = paramsMatch?.filter(p => !/pull/i.test(text)) || [];
                
                seen.add(cleanName.toLowerCase());
                models.push({
                    MODEL: cleanName,
                    PARAMS: validParams.length ? validParams[validParams.length-1].toLowerCase() : "—",
                    PULLS: pullsMatch ? pullsMatch[1] + " Pulls" : "0 Pulls",
                    PAGE: pageNum
                });
            });
        }
        
        // Estrategia 2: Fallback por patrones de texto
        if (models.length === 0) {
            const text = doc.body.innerText;
            const lines = text.split('\n').map(l=>l.trim()).filter(l=>l);
            
            for (let i=0; i<lines.length; i++) {
                const line = lines[i];
                if (/^[a-z][a-z0-9.\-_]{2,40}$/i.test(line) && !seen.has(line.toLowerCase())) {
                    let pulls="0 Pulls", params="—";
                    for (let j=1; j<=8 && i+j<lines.length; j++) {
                        const next = lines[i+j];
                        const pm = next.match(/([\d.]+[KMB]?)\s*Pulls?/i);
                        if (pm) pulls = pm[1] + " Pulls";
                        if (!/pull/i.test(next)) {
                            const pa = next.match(/\b(\d+(\.\d+)?[bBmMkK])\b/);
                            if (pa) params = pa[1].toLowerCase();
                        }
                    }
                    seen.add(line.toLowerCase());
                    models.push({ MODEL: line, PARAMS: params, PULLS: pulls, PAGE: pageNum });
                }
            }
        }
        
        return models.filter(m => 
            m.MODEL && 
            m.MODEL.length > 2 && 
            m.MODEL.length < 50 &&
            !/^(pulls|tags|updated|popular|newest|sort|cloud|vision|tools)$/i.test(m.MODEL)
        );
    }

    // ========================================
    // FETCH DE UNA PÁGINA
    // ========================================
    async function fetchPage(pageNum) {
        const url = `${CONFIG.baseUrl}?page=${pageNum}`;
        const res = await fetch(url, { 
            headers: { 
                'Accept': 'text/html',
                'User-Agent': navigator.userAgent
            } 
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.text();
    }

    // ========================================
    // EXPORTACIÓN
    // ========================================
    const exportData = (data = window.ollamaData) => {
        if (!data?.length) { WARN("No hay datos para exportar"); return; }
        
        const choice = prompt("📥 Formato:\n1. CSV\n2. JSON\n3. Markdown\n\nNúmero:");
        let content="", ext="", mime="";
        
        if (choice==="1") {
            content = "Model,Params,Pulls,Page\n" + 
                     data.map(r => `"${r.MODEL}","${r.PARAMS}","${r.PULLS}","${r.PAGE||''}"`).join("\n");
            ext="csv"; mime="text/csv";
        } else if (choice==="2") {
            const clean = data.map(({MODEL,PARAMS,PULLS,PAGE}) => ({MODEL,PARAMS,PULLS,PAGE}));
            content = JSON.stringify(clean, null, 2);
            ext="json"; mime="application/json";
        } else if (choice==="3") {
            content = "| Model | Params | Pulls | Page |\n| :--- | :--- | :--- | :--- |\n" + 
                     data.map(r => `| ${r.MODEL} | ${r.PARAMS} | ${r.PULLS} | ${r.PAGE||'-'} |`).join("\n");
            ext="md"; mime="text/markdown";
        } else { LOG("✅ Cancelado"); return; }
        
        const blob = new Blob([content], {type:`${mime};charset=utf-8;`});
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `ollama_export_${new Date().toISOString().slice(0,10)}.${ext}`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        LOG(`✅ Exportado: ${link.download} (${data.length} modelos)`);
    };

    // Backup/Restore
    const saveBackup = (data) => {
        try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(data)); } catch(e) {}
    };
    const loadBackup = () => {
        try { const raw = localStorage.getItem(CONFIG.storageKey); return raw ? JSON.parse(raw) : null; } catch(e) { return null; } }

    Object.defineProperty(window, 'download', { get: () => exportData(), configurable: true });
    Object.defineProperty(window, 'resume', { 
        get: () => { 
            const backup = loadBackup();
            if (backup?.length) { LOG(`📦 Backup: ${backup.length} modelos`); window.ollamaData = backup; console.table(backup.slice(0,30)); return backup; }
            WARN("No hay backup"); 
        }, configurable: true 
    });

    // ========================================
    // EJECUCIÓN PRINCIPAL
    // ========================================
    try {
        // Paso 1: Detectar páginas desde el DOM actual
        LOG("🔍 Detectando páginas de paginación...");
        const pages = detectPagesFromDOM();
        const totalPages = pages.length;
        
        if (totalPages === 0) { ERR("No se detectaron páginas"); return; }
        
        LOG(`📄 ${totalPages} páginas encontradas (1 a ${Math.max(...pages)})`);
        
        // Confirmar si son muchas
        if (totalPages > 10) {
            const confirmRun = confirm(`⚠️ Vas a fetchear ${totalPages} páginas.\nTiempo estimado: ~${Math.round(totalPages*CONFIG.delayMs/1000)}s\n\n¿Continuar?`);
            if (!confirmRun) return;
        }

        // Acumulador
        let allModels = [];
        const uniqueNames = new Set();

        // Fetchear cada página
        for (const page of pages) {
            LOG(`📥 Página ${page}/${Math.max(...pages)}...`);
            
            try {
                const html = await fetchPage(page);
                const models = parseModelsFromHTML(html, page);
                
                // Deduplicar por nombre
                let newCount = 0;
                models.forEach(m => {
                    const key = m.MODEL.toLowerCase();
                    if (!uniqueNames.has(key)) {
                        uniqueNames.add(key);
                        allModels.push(m);
                        newCount++;
                    }
                });
                
                LOG(`✅ +${newCount} nuevos (total: ${allModels.length})`);
                saveBackup(allModels);
                
            } catch (e) {
                WARN(`Error página ${page}: ${e.message}`);
            }
            
            // Delay entre peticiones
            if (page < Math.max(...pages)) {
                await new Promise(r => setTimeout(r, CONFIG.delayMs));
            }
        }

        // Resultados
        if (!allModels.length) { ERR("❌ No se extrajeron modelos"); return; }

        window.ollamaData = allModels;
        
        console.clear();
        LOG("🦙 OLLAMA EXPLORER v14.0 - COMPLETADO", "background:#000;color:#00ff9d;font-weight:bold;padding:8px;border-radius:5px;");
        LOG(`✅ ${allModels.length} modelos únicos de ${totalPages} página(s)`);
        LOG(`💡 Escribe 'download' para exportar | 'resume' para backup`, "background:#ff4081;color:#fff;padding:4px 8px;border-radius:3px;");
        
        const withParams = allModels.filter(r=>r.PARAMS!=="—").length;
        const withPulls = allModels.filter(r=>r.PULLS!=="0 Pulls").length;
        LOG(`📊 ${withParams}/${allModels.length} con params | ${withPulls}/${allModels.length} con pulls`, "color:#aaa;font-size:12px;");
        
        console.table(allModels.slice(0,40));
        if (allModels.length > 40) LOG(`... + ${allModels.length-40} más`, "color:#888;");
        
        localStorage.removeItem(CONFIG.storageKey);
        
    } catch (e) {
        ERR(`Error: ${e.message}`);
        console.error(e);
    }
})();
