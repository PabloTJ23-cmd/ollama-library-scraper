# 🦙 Ollama Explorer Pro

A fast and reliable browser console script to scan, list, and export the entire [Ollama Library](https://ollama.com).

## ✨ Features
- **Auto-Scroll:** Automatically loads all models using smart lazy-loading detection.
- **Data Extraction:** Captures Model Name, Parameters (e.g., 7b, 70b), and Popularity (Pulls).
- **Multi-Format Export:** Save data in **CSV**, **JSON**, or **Markdown** tables.
- **Easy Command:** Trigger the export menu by simply typing `download`.

## 🚀 How to use
1. Open [://ollama.com](https://ollama.com) in Chrome/Edge.
2. Press `F12` to open the **Developer Console**.
3. Copy and paste the code from [script.js](./script.js) and press `Enter`.
5. Wait for the automatic scan to finish.
6. Type **`download`** (without quotes) and press `Enter`.
7. Select your preferred format (1, 2, or 3).
## 📜 Source Code

To use the script, copy the code below. GitHub provides a **Copy button** in the top right corner of the box.

### 📄 script.js
```javascript
/**
 * Ollama Explorer Pro v10.0
 * Run this on https://ollama.com
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
            "PARAMS": paramsMatch ? paramsMatch.toLowerCase() : "—",
            "PULLS": pulls
        };
    });

    const exportData = () => {
        const choice = prompt("1. CSV | 2. JSON | 3. Markdown\nEnter number:");
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
        } else { return console.warn("Cancelled."); }

        const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `ollama_export.${ext}`;
        link.click();
    };

    Object.defineProperty(window, 'download', { get: exportData });

    console.clear();
    console.log("%c 🦙 OLLAMA EXPLORER v10.0 ", "background: #000; color: #00ff00; font-size: 20px; font-weight: bold; padding: 10px;");
    console.table(window.ollamaData);
    console.log("%c Type 'download' to export data. ", "background: #ff4081; color: #fff; padding: 5px; font-weight: bold;");
})();


## 📄 License
MIT
