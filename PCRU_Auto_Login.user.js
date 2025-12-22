// ==UserScript==
// @name         PCRU Auto Auth
// @namespace    http://tampermonkey.net/
// @version      14.3
// @description  Automatic Internet Authentication for PCRU
// @author       Banjong Surin
// @include      *://*.pcru.ac.th*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @updateURL    https://raw.githubusercontent.com/omaga03/tampermonkey/main/PCRU_Auto_Login.user.js
// @downloadURL  https://raw.githubusercontent.com/omaga03/tampermonkey/main/PCRU_Auto_Login.user.js
// ==/UserScript==

(function () {
    'use strict';

    // === 0. Scheduled Logout (ทำงานทุกหน้า) ===
    setInterval(function () {
        var now = new Date();
        var h = now.getHours();
        var m = now.getMinutes();
        var s = now.getSeconds();

        if ((h === 8 || h === 15) && m === 0 && s < 5) {
            var logoutLinks = document.querySelectorAll("a.btn.btn-danger");
            for (var i = 0; i < logoutLinks.length; i++) {
                if (logoutLinks[i].innerText.indexOf("ออกจากระบบ") > -1 || logoutLinks[i].href.indexOf("logout") > -1) {
                    logoutLinks[i].click();
                    break;
                }
            }
        }
    }, 1000);

    // === 1. Stealth Check (ตรวจสอบเป้าหมาย) ===
    var currentHost = window.location.hostname;
    if (currentHost.indexOf("login") === -1) {
        return;
    }

    // === [ย้ายมาตรงนี้] เมนูตั้งค่า (ให้ใช้งานได้ทุกหน้า) ===
    GM_registerMenuCommand("⚙️ เปลี่ยนรหัสผ่าน / ตั้งค่าใหม่", function () {
        if (confirm("ต้องการลบข้อมูลเดิมและตั้งค่าใหม่ใช่หรือไม่?")) {
            GM_deleteValue("pcru_username");
            GM_deleteValue("pcru_password");

            // ถ้าอยู่หน้า keepalive ให้เด้งกลับไปหน้า login เพื่อตั้งค่าใหม่
            if (window.location.href.indexOf("keepalive") > -1) {
                window.location.href = "https://login.pcru.ac.th:1003/";
            } else {
                window.location.reload();
            }
        }
    });



    // === 2. ตรวจสอบหน้า Keepalive ===
    // ถ้าเป็นหน้า keepalive ให้หยุดโหลด UI ส่วนอื่น (หน้าจะโล่งๆ เหมือนเดิม)
    if (window.location.href.indexOf("keepalive") > -1) {
        return;
    }

    // === ตั้งค่าตัวแปร ===
    var delayTime = 10;
    var maxRetries = 10;
    var retryCount = 0;

    var storedUser = GM_getValue("pcru_username", "");
    var storedPass = GM_getValue("pcru_password", "");

    // === UI Style ===
    function addStyles() {
        var style = document.createElement('style');
        style.innerHTML = `
            .pcru-box {
                position: fixed; top: 20px; right: 20px; z-index: 99999;
                padding: 15px; background-color: rgba(0, 0, 0, 0.9);
                color: white; border-radius: 8px; border: 2px solid #00ff00;
                font-family: sans-serif; box-shadow: 0 0 10px rgba(0,0,0,0.8);
                font-size: 16px; max-width: 300px; text-align: center;
            }
            .pcru-input {
                display: block; width: 90%; margin: 8px auto; padding: 5px;
                border-radius: 4px; border: 1px solid #ccc; color: black;
            }
            .pcru-btn {
                background: #00ff00; color: black; border: none; padding: 8px;
                border-radius: 4px; cursor: pointer; font-weight: bold; width: 100%; margin-top: 5px;
            }
            .pcru-btn:hover { background: #00cc00; }
        `;
        document.head.appendChild(style);
    }
    addStyles();

    // === Setup UI ===
    function showSetupUI() {
        var hasLoginForm = document.querySelector("input[name='username']");
        if (!hasLoginForm) return;

        var setupBox = document.createElement('div');
        setupBox.className = 'pcru-box';
        setupBox.style.borderColor = '#ffcc00';
        setupBox.innerHTML = `
            <h3 style="margin:0 0 5px 0; color:#ffcc00;">⚙️ ตั้งค่า (Auth Setup)</h3>
            <div style="font-size:13px; margin-bottom:5px;">กรอกรหัสอินเทอร์เน็ต (ครั้งเดียว)</div>
            <input type="text" id="pcru_set_user" class="pcru-input" placeholder="Username">
            <input type="password" id="pcru_set_pass" class="pcru-input" placeholder="Password">
            <button id="pcru_save_btn" class="pcru-btn">บันทึก</button>
        `;
        document.body.appendChild(setupBox);

        document.getElementById('pcru_save_btn').addEventListener('click', function () {
            var u = document.getElementById('pcru_set_user').value.trim();
            var p = document.getElementById('pcru_set_pass').value.trim();
            if (u && p) {
                GM_setValue("pcru_username", u);
                GM_setValue("pcru_password", p);
                window.location.reload();
            } else { alert("กรุณากรอกข้อมูลให้ครบ"); }
        });
    }

    if (!storedUser || !storedPass) {
        setTimeout(showSetupUI, 1000);
        return;
    }

    // === Status Box ===
    var statusBox = document.createElement('div');
    statusBox.className = 'pcru-box';
    statusBox.innerHTML = '⏳ PCRU Auth: เริ่มตรวจสอบ...';

    var appendBoxInterval = setInterval(function () {
        if (document.body) {
            document.body.appendChild(statusBox);
            clearInterval(appendBoxInterval);
        }
    }, 100);

    function updateStatus(msg, color) {
        if (statusBox) {
            statusBox.innerHTML = msg;
            statusBox.style.color = color || '#ffffff';
            statusBox.style.borderColor = color || '#ffffff';
        }
    }

    function startCountdown(seconds, message, color, onComplete) {
        var counter = seconds;
        updateStatus(message + " " + counter + " วินาที...", color);
        var interval = setInterval(function () {
            counter--;
            updateStatus(message + " " + counter + " วินาที...", color);
            if (counter <= 0) {
                clearInterval(interval);
                onComplete();
            }
        }, 1000);
    }

    // === Logic หน้า Logout ===
    if (window.location.href.indexOf("logout") > -1) {
        startCountdown(3, "👋 ออกจากระบบแล้ว<br>รีเฟรชใน", "orange", function () {
            window.location.reload();
        });
        return;
    }



    // === Logic หน้าเข้าสู่ระบบ ===
    var checkExist = setInterval(function () {

        var userInput = document.querySelector("input[name='username']");
        var passInput = document.querySelector("input[name='password']");
        var loginBtn = document.querySelector("input[type='submit']");

        if (userInput && passInput && loginBtn) {
            clearInterval(checkExist);

            userInput.value = storedUser;
            passInput.value = storedPass;

            userInput.dispatchEvent(new Event('input', { bubbles: true }));
            userInput.dispatchEvent(new Event('change', { bubbles: true }));
            passInput.dispatchEvent(new Event('change', { bubbles: true }));

            startCountdown(delayTime, "📝 พบช่องกรอกข้อมูล!<br>ดำเนินการใน", "#00ffff", function () {
                updateStatus("🚀 กำลังยืนยันตัวตน...", "#00ff00");
                loginBtn.click();
            });

        } else {
            retryCount++;

            if (document.body && statusBox) {
                updateStatus("🔍 กำลังค้นหา... (" + retryCount + "/" + maxRetries + ")", "yellow");
            }

            if (retryCount >= maxRetries) {
                clearInterval(checkExist);
                if (statusBox) {
                    statusBox.remove();
                }
            }
        }
    }, 1000);

})();
