// ==UserScript==
// @name         PCRU Auto Login
// @namespace    http://tampermonkey.net/
// @version      10.0
// @description  Auto login with GUI Settings test
// @author       Banjong Surin
// @match        *://login.pcru.ac.th:1003/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @updateURL    https://raw.githubusercontent.com/omaga03/tampermonkey/main/PCRU_Auto_Login.user.js
// @downloadURL  https://raw.githubusercontent.com/omaga03/tampermonkey/main/PCRU_Auto_Login.user.js
// ==/UserScript==

(function() {
    'use strict';

    // === ตั้งค่าพื้นฐาน ===
    var delayTime = 5; // เวลานับถอยหลัง (วินาที)

    // ดึงค่า User/Pass จากระบบบันทึกของ Tampermonkey
    var storedUser = GM_getValue("pcru_username", "");
    var storedPass = GM_getValue("pcru_password", "");

    // เพิ่มเมนูใน Tampermonkey เพื่อให้กด Reset ได้
    GM_registerMenuCommand("⚙️ เปลี่ยนรหัสผ่าน / ตั้งค่าใหม่", function() {
        if(confirm("ต้องการลบข้อมูล User/Pass เดิมและตั้งค่าใหม่ใช่หรือไม่?")) {
            GM_deleteValue("pcru_username");
            GM_deleteValue("pcru_password");
            window.location.reload();
        }
    });

    // === ส่วนตรวจสอบหน้า Keepalive ===
    if (window.location.href.indexOf("keepalive") > -1) {
        return;
    }

    // === สร้าง Style สำหรับ UI ===
    function addStyles() {
        var style = document.createElement('style');
        style.innerHTML = `
            .pcru-box {
                position: fixed; top: 20px; right: 20px; z-index: 99999;
                padding: 20px; background-color: rgba(0, 0, 0, 0.9);
                color: white; border-radius: 10px; border: 2px solid #00ff00;
                font-family: sans-serif; box-shadow: 0 0 15px rgba(0,0,0,0.8);
                font-size: 16px; max-width: 300px; text-align: center;
            }
            .pcru-input {
                display: block; width: 90%; margin: 10px auto; padding: 8px;
                border-radius: 5px; border: 1px solid #ccc; color: black;
            }
            .pcru-btn {
                background: #00ff00; color: black; border: none; padding: 10px 20px;
                border-radius: 5px; cursor: pointer; font-weight: bold; width: 100%;
            }
            .pcru-btn:hover { background: #00cc00; }
        `;
        document.head.appendChild(style);
    }
    addStyles();

    // === ฟังก์ชันแสดงหน้าต่างตั้งค่า (ถ้ายังไม่มี User/Pass) ===
    function showSetupUI() {
        var setupBox = document.createElement('div');
        setupBox.className = 'pcru-box';
        setupBox.style.borderColor = '#ffcc00'; // สีเหลืองสำหรับการตั้งค่า

        setupBox.innerHTML = `
            <h3 style="margin:0 0 10px 0; color:#ffcc00;">⚙️ ตั้งค่า Auto Login</h3>
            <div style="font-size:14px; margin-bottom:10px;">กรุณากรอกรหัสอินเทอร์เน็ตของท่าน (บันทึกครั้งเดียว)</div>
            <input type="text" id="pcru_set_user" class="pcru-input" placeholder="Username (เช่น banchong)">
            <input type="password" id="pcru_set_pass" class="pcru-input" placeholder="Password">
            <button id="pcru_save_btn" class="pcru-btn">บันทึกและเริ่มใช้งาน</button>
        `;
        document.body.appendChild(setupBox);

        // ดักจับการกดปุ่มบันทึก
        document.getElementById('pcru_save_btn').addEventListener('click', function() {
            var u = document.getElementById('pcru_set_user').value.trim();
            var p = document.getElementById('pcru_set_pass').value.trim();

            if(u && p) {
                GM_setValue("pcru_username", u);
                GM_setValue("pcru_password", p);
                alert("บันทึกเรียบร้อย! ระบบจะรีเฟรชเพื่อเริ่มทำงาน");
                window.location.reload();
            } else {
                alert("กรุณากรอกข้อมูลให้ครบถ้วน");
            }
        });
    }

    // === ถ้ายังไม่มีข้อมูล ให้แสดงหน้า Setup และจบการทำงาน ===
    if (!storedUser || !storedPass) {
        // รอหน้าเว็บโหลดสักนิดค่อยแสดงฟอร์ม
        setTimeout(showSetupUI, 1000);
        return;
    }

    // =========================================================
    // === ด้านล่างนี้คือ Logic เดิม (ทำงานเมื่อมี User/Pass แล้ว) ===
    // =========================================================

    // สร้างกล่องแสดงสถานะ
    var statusBox = document.createElement('div');
    statusBox.className = 'pcru-box';
    statusBox.innerHTML = '⏳ PCRU Script: เริ่มทำงาน...';

    var appendBoxInterval = setInterval(function() {
        if(document.body) {
            document.body.appendChild(statusBox);
            clearInterval(appendBoxInterval);
        }
    }, 100);

    function updateStatus(msg, color) {
        statusBox.innerHTML = msg;
        statusBox.style.color = color || '#ffffff';
        statusBox.style.borderColor = color || '#ffffff';
    }

    function startCountdown(seconds, message, color, onComplete) {
        var counter = seconds;
        updateStatus(message + " " + counter + " วินาที...", color);
        var interval = setInterval(function() {
            counter--;
            updateStatus(message + " " + counter + " วินาที...", color);
            if (counter <= 0) {
                clearInterval(interval);
                onComplete();
            }
        }, 1000);
    }

    // 1. กรณีอยู่หน้า Logout -> Auto F5
    if (window.location.href.indexOf("logout") > -1) {
        startCountdown(delayTime, "👋 ออกจากระบบแล้ว<br>จะรีเฟรช (F5) ในอีก", "orange", function() {
            updateStatus("🔄 กำลังรีเฟรชหน้าจอ...", "orange");
            window.location.reload();
        });
        return;
    }

    // 2. กรณีอยู่หน้า Login -> Auto Login
    var checkExist = setInterval(function() {
        var userInput = document.querySelector("input[name='username']");
        var passInput = document.querySelector("input[name='password']");
        var loginBtn = document.querySelector("input[type='submit']");

        if (userInput && passInput && loginBtn) {
            clearInterval(checkExist);

            userInput.value = storedUser; // ใช้ค่าที่ดึงมาจาก Storage
            passInput.value = storedPass; // ใช้ค่าที่ดึงมาจาก Storage

            userInput.dispatchEvent(new Event('input', { bubbles: true }));
            userInput.dispatchEvent(new Event('change', { bubbles: true }));
            passInput.dispatchEvent(new Event('input', { bubbles: true }));
            passInput.dispatchEvent(new Event('change', { bubbles: true }));

            startCountdown(delayTime, "📝 พบหน้า Login! ("+storedUser+")<br>เข้าสู่ระบบในอีก", "#00ffff", function() {
                updateStatus("🚀 กำลังกดปุ่มเข้าสู่ระบบ...", "#00ff00");
                loginBtn.click();
            });
        }
    }, 500);

})();
