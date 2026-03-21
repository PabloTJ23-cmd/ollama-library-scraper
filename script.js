/**
 * Ollama Explorer Pro v10.0
 * Fast, reliable, and clean script to explore and export the Ollama Library.
 */
(async function() {
    console.log("%c ⏳ Starting scan... ", "background: #222; color: #00e5ff; padding: 5px;");

    async function smartScroll() {
        let lastHeight = 0;
        while (lastHeight !== document.body.scrollHeight) {
            lastHeight = document.body.scrollHeight;
            window.scrollTo(0, lastHeight);
            await new Promise(r => setTimeout(r, 400)); 
        }
    }
    await smartScroll();

    const elements = document.querySelectorAll('li.py-6');
    window.ollamaData = Array.from(elements).map(model => {
        const text = model.innerText;
        const name = model.querySelector('h2 span')?.innerText.trim() || "N/A";
        const pulls = model.querySelector('span.flex.items-center')?.innerText.trim() || "0";
        const paramsMatch = text.match(/\b(\d+(\.\d+)?[bB])\b/);

        return {
            "MODEL": name,
            "PARAMS": paramsMatch ? paramsMatch[0].toLowerCase() : "—",
            "PULLS": pulls
        };
    });

    const exportData = () => {
        const choice = prompt(
            "Select download format:\n\n" +
            "1. CSV (Excel / Sheets)\n" +
            "2. JSON (Raw Data)\n" +
            "3. Markdown (Table for GitHub/Notion)\n\n" +
            "Type the number (1, 2, or 3):"
        );

        let content = "", ext = "", mime = "";
        if (choice === "1") {
            content = "Model,Params,Pulls\n" + window.ollamaData.map(r => `"${r.MODEL}","${r.PARAMS}","${r.PULLS}"`).join("\n");
            ext = "csv"; mime = "text/csv";
        } else if (choice === "2") {
            content = JSON.stringify(window.ollamaData, null, 2);
            ext = "json"; mime = "application/json";
        } else if (choice === "3") {
            content = "| Model | Params | Pulls |\n| :--- | :--- | :--- |\n" + window.ollamaData.map(r => `| ${r.MODEL} | ${r.PARAMS} | ${r.PULLS} |`).join("\n");
            ext = "md"; mime = "text/markdown";
        } else { return console.warn("❌ Download cancelled."); }

        const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `ollama_library.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    Object.defineProperty(window, 'download', { get: exportData });

    console.clear();
    console.log("%c 🦙 OLLAMA EXPLORER v10.0 ", "background: #000; color: #00ff00; font-size: 20px; font-weight: bold; padding: 10px; border: 2px solid #00ff00;");
    console.table(window.ollamaData);
    console.log("%c Type 'download' and press Enter to export. ", "background: #ff4081; color: #fff; padding: 5px; font-weight: bold;");
})();
