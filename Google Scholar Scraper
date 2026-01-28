// ==UserScript==
// @name         Google Scholar Scraper V.12 (Clean Dashboard + Warning Restored)
// @namespace    http://tampermonkey.net/
// @version      12.0
// @description  ดึงทุกคน -> แดชบอร์ดเรียบง่าย (มีคำเตือน) -> สรุปผลเขียวแดง
// @author       Gemini
// @match        https://scholar.google.com/citations?*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    // --- Config ---
    const DELAY_MIN = 2000;
    const DELAY_MAX = 5000;

    let isPaused = false;
    let isStopped = false;

    // ตัวแปรเก็บยอดรวม (ยังเก็บไว้เพื่อใช้สรุปตอนจบ)
    let globalStats = {
        processedAuthors: 0,
        totalAuthors: 0,
        totalMatches: 0,
        totalMismatches: 0
    };

    window.addEventListener('load', () => {
        createUI();
    });

    function createUI() {
        const btn = document.createElement('button');
        btn.innerText = '🛡️ เริ่มดึงข้อมูล (V.12)';
        btn.style.position = 'fixed';
        btn.style.bottom = '20px';
        btn.style.right = '20px';
        btn.style.zIndex = '9999';
        btn.style.padding = '15px 25px';
        btn.style.backgroundColor = '#2c3e50';
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.style.borderRadius = '50px';
        btn.style.cursor = 'pointer';
        btn.style.fontWeight = 'bold';
        btn.style.fontSize = '16px';
        btn.style.boxShadow = '0 4px 15px rgba(0,0,0,0.4)';

        btn.onclick = startGrandProcess;
        document.body.appendChild(btn);
    }

    // --- Dashboard UI (แก้ไข: ลบ Realtime Stats / คืนค่าคำเตือน) ---
    function createDashboard() {
        const old = document.getElementById('gs-dashboard');
        if (old) old.remove();

        const dash = document.createElement('div');
        dash.id = 'gs-dashboard';
        Object.assign(dash.style, {
            position: 'fixed', top: '10px', right: '10px', width: '300px',
            backgroundColor: 'rgba(0,0,0,0.9)', color: '#fff', padding: '15px',
            borderRadius: '10px', zIndex: '10000', fontSize: '14px',
            boxShadow: '0 5px 15px rgba(0,0,0,0.5)', fontFamily: 'Sarabun, sans-serif'
        });

        dash.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <h3 style="margin:0; color:#f1c40f;">⚡ Scraper Status</h3>
                <span id="gs-timer" style="font-size:12px; color:#aaa;">Processing</span>
            </div>

            <div id="gs-author-info" style="font-weight:bold; color:#fff; margin-bottom:5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                รอเริ่มทำงาน...
            </div>

            <div id="gs-article-info" style="font-size:12px; color:#ccc; margin-bottom:15px;">
                -
            </div>

            <div style="display:flex; gap:10px; margin-bottom:10px;">
                <button id="gs-btn-pause" style="flex:1; padding:8px; cursor:pointer; background:#e67e22; border:none; color:white; font-weight:bold; border-radius:4px;">⏸ พัก (Pause)</button>
                <button id="gs-btn-stop" style="flex:1; padding:8px; cursor:pointer; background:#c0392b; border:none; color:white; font-weight:bold; border-radius:4px;">⏹ หยุด (Stop)</button>
            </div>

            <div style="font-size:12px; color:#aaa; text-align:center; border-top:1px solid #444; padding-top:5px;">
                *หากเจอ CAPTCHA ให้กดพัก แก้แล้วกดทำต่อ
            </div>
        `;

        document.body.appendChild(dash);

        // Bind Events
        document.getElementById('gs-btn-pause').onclick = function() {
            isPaused = !isPaused;
            this.innerText = isPaused ? "▶ ทำต่อ (Resume)" : "⏸ พัก (Pause)";
            this.style.background = isPaused ? "#27ae60" : "#e67e22";
        };

        document.getElementById('gs-btn-stop').onclick = function() {
            if(confirm("ต้องการหยุดและสรุปผลทันทีหรือไม่?")) {
                isStopped = true;
                isPaused = false;
            }
        };
    }

    // ฟังก์ชันอัปเดตหน้าจอ Dashboard (ลบส่วนอัปเดต Stats ออก)
    function updateDashboardUI(currentAuthorName, currentArticleTitle, artIndex, artTotal) {
        const authorEl = document.getElementById('gs-author-info');
        const articleEl = document.getElementById('gs-article-info');

        if(authorEl) {
            // [1/10] 👤 Name
            authorEl.innerHTML = `[${globalStats.processedAuthors}/${globalStats.totalAuthors}] 👤 ${currentAuthorName}`;
        }
        if(articleEl && currentArticleTitle) {
            articleEl.innerText = `📄 [${artIndex}/${artTotal}] ตรวจสอบ: "${currentArticleTitle.substring(0, 30)}..."`;
        }
    }

    async function smartSleep() {
        while (isPaused) {
            await new Promise(r => setTimeout(r, 1000));
        }
        const ms = Math.floor(Math.random() * (DELAY_MAX - DELAY_MIN + 1) + DELAY_MIN);
        await new Promise(r => setTimeout(r, ms));
    }

    // --- Main Process ---
    async function startGrandProcess() {
        createDashboard();
        isPaused = false;
        isStopped = false;

        globalStats = { processedAuthors: 0, totalAuthors: 0, totalMatches: 0, totalMismatches: 0 };

        const authorItems = document.querySelectorAll('.gs_ai_name a');
        if (authorItems.length === 0) {
            alert("❌ ไม่พบรายชื่อนักวิจัย");
            return;
        }

        globalStats.totalAuthors = authorItems.length;
        let masterData = [];

        for (let i = 0; i < authorItems.length; i++) {
            if (isStopped) break;

            globalStats.processedAuthors = i + 1;
            const item = authorItems[i];
            const authorName = item.innerText;

            updateDashboardUI(authorName, "กำลังดึงรายการบทความ...", "-", "-");

            let profileUrl = item.getAttribute('href');
            if (profileUrl && !profileUrl.startsWith('http')) profileUrl = 'https://scholar.google.com' + profileUrl;
            const userId = getParameterByName('user', profileUrl);

            const articlesList = await fetchAllArticlesList(userId);

            if (isStopped) break;

            let detailedArticles = [];
            for (let j = 0; j < articlesList.length; j++) {
                if (isStopped) break;

                const art = articlesList[j];

                updateDashboardUI(authorName, art.title, j + 1, articlesList.length);

                await smartSleep();

                const authorsInArticle = await fetchArticleDeepDetail(art.url);
                const isMatch = checkNameMatch(authorName, authorsInArticle);

                // ยังคงเก็บสถิติไว้คำนวณตอนจบ
                if (isMatch) globalStats.totalMatches++;
                else globalStats.totalMismatches++;

                // อัปเดตแค่ชื่อบทความ ไม่ต้องอัปเดตตัวเลข Stats บน Dashboard
                updateDashboardUI(authorName, art.title, j + 1, articlesList.length);

                detailedArticles.push({
                    title: art.title,
                    url: art.url,
                    authorsInArticle: authorsInArticle,
                    isMatch: isMatch
                });
            }

            masterData.push({
                authorName: authorName,
                profileUrl: profileUrl,
                articles: detailedArticles
            });

            await smartSleep();
        }

        document.getElementById('gs-dashboard').remove();
        showGrandResultModal(masterData);
    }

    // --- Helper Functions ---
    async function fetchAllArticlesList(userId) {
        let allArticles = [];
        let cstart = 0;
        let pageSize = 100;
        let hasMore = true;
        while (hasMore && !isStopped) {
            let targetUrl = `https://scholar.google.com/citations?user=${userId}&hl=th&cstart=${cstart}&pagesize=${pageSize}&view_op=list_works&sortby=pubdate`;
            try {
                await smartSleep();
                const doc = await fetchHTML(targetUrl);
                const links = doc.querySelectorAll('.gsc_a_t .gsc_a_at');
                if (links.length === 0) { hasMore = false; break; }
                links.forEach(link => {
                    let u = link.getAttribute('href');
                    if (u && !u.startsWith('http')) u = 'https://scholar.google.com' + u;
                    allArticles.push({ title: link.innerText, url: u });
                });
                const moreBtn = doc.getElementById('gsc_bpf_more');
                if (!moreBtn || moreBtn.disabled || moreBtn.classList.contains('gs_btn_dis') || links.length < pageSize) hasMore = false;
                else cstart += pageSize;
            } catch (e) { hasMore = false; }
        }
        return allArticles;
    }

    function fetchArticleDeepDetail(url) {
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "GET", url: url,
                onload: function(response) {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(response.responseText, "text/html");
                    const fields = doc.querySelectorAll('.gs_scl');
                    let foundData = "ไม่ระบุ";
                    for (let row of fields) {
                        const labelDiv = row.querySelector('.gsc_oci_field');
                        const valueDiv = row.querySelector('.gsc_oci_value');
                        if (labelDiv && valueDiv) {
                            const label = labelDiv.innerText.trim().toLowerCase();
                            if (['ผู้เขียน', 'authors', 'ผู้คิดค้น', 'inventors'].includes(label)) {
                                foundData = valueDiv.innerText.trim();
                                break;
                            }
                        }
                    }
                    resolve(foundData);
                },
                onerror: () => resolve("Error Fetching")
            });
        });
    }

    function checkNameMatch(mainAuthor, articleAuthors) {
        if (!articleAuthors || articleAuthors === "ไม่ระบุ") return false;
        const cleanMain = normalizeName(mainAuthor);
        const cleanArticleAuths = normalizeName(articleAuthors);
        return cleanArticleAuths.includes(cleanMain);
    }

    function normalizeName(name) {
        if (!name) return "";
        let n = name.toLowerCase();
        const prefixes = /^(mr\.|mrs\.|ms\.|dr\.|prof\.|asst\.|assoc\.|นาย|นาง|นางสาว|ดร\.|ผศ\.|รศ\.|ศ\.|อาจารย์|พล\.?t\.?|pol\.?)\s*/i;
        n = n.replace(prefixes, '');
        n = n.replace(/[.,]/g, '');
        n = n.replace(/\s+/g, ' ');
        return n.trim();
    }

    function fetchHTML(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET", url: url,
                onload: (res) => resolve(new DOMParser().parseFromString(res.responseText, "text/html")),
                onerror: reject
            });
        });
    }

    function getParameterByName(name, url) {
        if (!url) url = window.location.href;
        name = name.replace(/[\[\]]/g, '\\$&');
        var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'), results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, ' '));
    }

    // --- Result UI (คงไว้ตาม V.11) ---
    function showGrandResultModal(masterData) {
        const modal = document.createElement('div');
        Object.assign(modal.style, {
            position: 'fixed', top: '2%', left: '2%', width: '96%', height: '96%',
            backgroundColor: 'white', border: '1px solid #ccc', zIndex: '10001',
            padding: '0', display: 'flex', flexDirection: 'column',
            boxShadow: '0 0 25px rgba(0,0,0,0.5)', borderRadius: '8px', overflow: 'hidden'
        });

        const header = document.createElement('div');
        header.style.padding = '20px';
        header.style.backgroundColor = '#f1f3f4';
        header.style.borderBottom = '1px solid #ddd';
        header.innerHTML = `
            <h2 style="margin:0 0 10px 0;">สรุปผลการดึงข้อมูล</h2>
            <div>
                รวม: <b>${globalStats.totalMatches + globalStats.totalMismatches}</b> บทความ |
                <span style="color:green;">✅ ตรงกัน: <b>${globalStats.totalMatches}</b></span> |
                <span style="color:red;">❌ ไม่ตรง: <b>${globalStats.totalMismatches}</b></span>
            </div>
        `;

        const listContainer = document.createElement('div');
        listContainer.style.flex = '1';
        listContainer.style.overflowY = 'auto';
        listContainer.style.padding = '10px';
        listContainer.style.backgroundColor = '#fafafa';

        masterData.forEach((person, pIdx) => {
            const localMatch = person.articles.filter(a => a.isMatch).length;
            const localMismatch = person.articles.length - localMatch;

            const personHeader = document.createElement('div');
            personHeader.style.padding = '12px';
            personHeader.style.backgroundColor = '#e8eaed';
            personHeader.style.marginTop = '20px';
            personHeader.style.borderRadius = '5px';
            personHeader.style.fontWeight = 'bold';
            personHeader.style.border = '1px solid #ccc';

            personHeader.innerHTML = `
                👤 ${pIdx+1}. ${person.authorName} (${person.articles.length} เรื่อง)
                <span style="margin-left:15px; font-weight:normal; font-size:14px;">
                    | <span style="color:green">✅ ตรงกัน: <b>${localMatch}</b></span>
                    | <span style="color:red">❌ ไม่ตรง: <b>${localMismatch}</b></span>
                </span>
            `;
            listContainer.appendChild(personHeader);

            person.articles.forEach((item, idx) => {
                const row = document.createElement('div');
                row.style.borderBottom = '1px solid #eee';
                row.style.padding = '8px 10px';
                row.style.marginLeft = '10px';
                row.style.backgroundColor = item.isMatch ? '#e6fffa' : '#fff5f5';

                const icon = item.isMatch ? '✅' : '❌';
                const titleStyle = item.isMatch ? '' : 'color: red; font-weight:bold;';

                row.innerHTML = `
                    <div style="font-size:14px; ${titleStyle}">
                        ${icon} ${idx+1}. ${item.title}
                    </div>
                    <div style="margin-left: 25px; color: #555; font-size: 13px;">
                        ผู้เขียน: ${item.authorsInArticle}
                    </div>
                `;
                listContainer.appendChild(row);
            });
        });

        const footer = document.createElement('div');
        footer.style.padding = '15px';
        footer.style.backgroundColor = '#f1f3f4';
        footer.style.borderTop = '1px solid #ddd';
        footer.style.display = 'flex';
        footer.style.justifyContent = 'space-between';

        const btnClose = document.createElement('button');
        btnClose.innerText = 'ปิดหน้าต่าง';
        btnClose.style.padding = '10px 20px';
        btnClose.onclick = () => modal.remove();

        const btnCsv = document.createElement('button');
        btnCsv.innerText = '📥 Download CSV';
        btnCsv.style.padding = '10px 20px';
        btnCsv.style.backgroundColor = '#00796b';
        btnCsv.style.color = 'white';
        btnCsv.style.border = 'none';
        btnCsv.style.fontWeight = 'bold';

        btnCsv.onclick = () => {
            let csv = "data:text/csv;charset=utf-8,\uFEFF";
            csv += "Author Name,Article Title,Authors/Inventors (Fetched),Match Status,URL\n";
            masterData.forEach(p => {
                p.articles.forEach(a => {
                    csv += `"${p.authorName}","${a.title.replace(/"/g, '""')}","${a.authorsInArticle.replace(/"/g, '""')}","${a.isMatch ? 'Yes' : 'No'}","${a.url}"\n`;
                });
            });
            const link = document.createElement("a");
            link.href = encodeURI(csv);
            link.download = `scholar_result_v12.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        footer.appendChild(btnClose);
        footer.appendChild(btnCsv);
        modal.appendChild(header);
        modal.appendChild(listContainer);
        modal.appendChild(footer);
        document.body.appendChild(modal);
    }

})();
