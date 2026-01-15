// ==UserScript==
// @name          PCRU Auto Auth (Universal)
// @namespace     http://tampermonkey.net/
// @version       15.0
// @description   Automatic Internet Authentication for PCRU (Support Domain & IP)
// @author        Banjong Surin / Gemini
// @include       *://*.pcru.ac.th*
// @include       *://20.20.20.1:1003*
// @grant         GM_setValue
// @grant         GM_getValue
// @grant         GM_deleteValue
// @grant         GM_registerMenuCommand
// ==/UserScript==

(function () {
    'use strict';

    // === 1. Scheduled Logout (ทำงานเฉพาะหน้าที่มีคำว่า keepalive) ===
    setInterval(function () {
        if (window.location.href.indexOf("keepalive") === -1) return;

        var now = new Date();
        var h = now.getHours();
        var m = now.getMinutes();
        var s = now.getSeconds();

        // ตั้งเวลาเตะออกตอน 08:00 และ 15:00
        if ((h === 8 || h === 15) && m === 0 && s < 5) {
            var logoutBtn = document.querySelector("a.btn.btn-danger, a[href*='logout']");
            if (logoutBtn) logoutBtn.click();
        }
    }, 1000);

    // === 2. เมนูตั้งค่า (แสดงผลใน Tampermonkey ทุกหน้า) ===
    GM_registerMenuCommand("⚙️ เปลี่ยนรหัสผ่าน / ตั้งค่าใหม่", function () {
        if (confirm("ต้องการลบข้อมูลเดิมและตั้งค่าใหม่ใช่หรือไม่?")) {
            GM_deleteValue("pcru_username");
            GM_deleteValue("pcru_password");
            // รีโหลดไปหน้า Login เพื่อให้ UI ตั้งค่าปรากฏ
            window.location.href = window.location.origin + "/login";
        }
    });

    GM_registerMenuCommand("🚪 ออกจากระบบทันที", function () {
        var logoutBtn = document.querySelector("a.btn.btn-danger, a[href*='logout']");
        if (logoutBtn) {
            logoutBtn.click();
        } else {
            alert("ไม่พบปุ่มออกจากระบบในหน้านี้ (คุณอาจจะยังไม่ได้เข้าระบบ)");
        }
    });

    // === 3. ตรวจสอบเป้าหมาย (Stealth Check) ===
    var currentUrl = window.location.href;

    // ถ้าเป็นหน้า Keepalive ไม่ต้องแสดง UI ของ Auto Login (ให้หน้าโล่งๆ)
    if (currentUrl.indexOf("keepalive") > -1) return;

    // ตรวจสอบว่าเป็นหน้า Login หรือไม่ (เช็คจากพอร์ต 1003 หรือคำว่า login)
    var isLoginPage = currentUrl.indexOf(":1003") > -1 || currentUrl.indexOf("login") > -1;
    if (!isLoginPage) return;

    // === 4. ตั้งค่าตัวแปร & Encryption ===
    var delayTime = 5; // หน่วงเวลา 5 วินาทีก่อนกด (ปรับลดได้)
    function encode(str) { try { return btoa(str); } catch (e) { return str; } }
    function decode(str) { try { return atob(str); } catch (e) { return str; } }

    var storedUser = decode(GM_getValue("pcru_username", ""));
    var storedPass = decode(GM_getValue("pcru_password", ""));

    // === 5. UI Styles ===
    var style = document.createElement('style');
    style.innerHTML = `
        .pcru-box {
            position: fixed; top: 20px; right: 20px; z-index: 999999;
            padding: 15px; background-color: rgba(0, 0, 0, 0.9);
            color: white; border-radius: 8px; border: 2px solid #00ff00;
            font-family: sans-serif; box-shadow: 0 0 15px rgba(0,0,0,0.5);
            font-size: 14px; width: 250px; text-align: center;
        }
        .pcru-input {
            display: block; width: 90%; margin: 8px auto; padding: 6px;
            border-radius: 4px; border: 1px solid #ccc; color: black;
        }
        .pcru-btn {
            background: #00ff00; color: black; border: none; padding: 8px;
            border-radius: 4px; cursor: pointer; font-weight: bold; width: 100%;
        }
    `;
    document.head.appendChild(style);

    // === 6. Setup UI (แสดงเมื่อยังไม่มีข้อมูล) ===
    if (!storedUser || !storedPass) {
        var setupBox = document.createElement('div');
        setupBox.className = 'pcru-box';
        setupBox.style.borderColor = '#ffcc00';
        setupBox.innerHTML = `
            <b style="color:#ffcc00;">⚙️ PCRU Auth Setup</b>
            <input type="text" id="pcru_u" class="pcru-input" placeholder="Username">
            <input type="password" id="pcru_p" class="pcru-input" placeholder="Password">
            <button id="pcru_save" class="pcru-btn">บันทึกข้อมูล</button>
        `;
        document.body.appendChild(setupBox);

        document.getElementById('pcru_save').onclick = function () {
            var u = document.getElementById('pcru_u').value.trim();
            var p = document.getElementById('pcru_p').value.trim();
            if (u && p) {
                GM_setValue("pcru_username", encode(u));
                GM_setValue("pcru_password", encode(p));
                window.location.reload();
            } else { alert("กรุณากรอกข้อมูลให้ครบ"); }
        };
        return;
    }

    // === 7. Status Box & Auto Login Logic ===
    var statusBox = document.createElement('div');
    statusBox.className = 'pcru-box';
    document.body.appendChild(statusBox);

    function updateStatus(msg, color) {
        statusBox.innerHTML = msg;
        statusBox.style.borderColor = color;
    }

    // ฟังก์ชันช่วยรีเฟรชหน้าแบบนับถอยหลังตัวเลข
    function forceReload(msg) {
        var count = 5;
        var reloadTimer = setInterval(function() {
            updateStatus(msg + "<br>กำลังรีเฟรชใน " + count + " วินาที...", "orange");
            count--;
            if (count < 0) {
                clearInterval(reloadTimer);
                window.location.reload();
            }
        }, 1000);
    }

    // ตรวจสอบหน้า Logout โดยเฉพาะ
    if (window.location.href.indexOf("logout") > -1) {
        forceReload("👋 ออกจากระบบเรียบร้อย");
        return; // หยุดการทำงานส่วนอื่น
    }

    var retryCount = 0;
    var checkExist = setInterval(function () {
        var userInp = document.querySelector("input[name='username']");
        var passInp = document.querySelector("input[name='password']");
        var btnInp = document.querySelector("input[type='submit'], button[type='submit'], .btn-primary");

        if (userInp && passInp && btnInp) {
            clearInterval(checkExist);
            userInp.value = storedUser;
            passInp.value = storedPass;

            userInp.dispatchEvent(new Event('change', { bubbles: true }));
            passInp.dispatchEvent(new Event('change', { bubbles: true }));

            var count = delayTime;
            var timer = setInterval(function () {
                updateStatus("🚀 ตรวจพบฟอร์ม!<br>จะเข้าสู่ระบบใน " + count + " วินาที", "#00ffff");
                count--;
                if (count < 0) {
                    clearInterval(timer);
                    updateStatus("⌛ กำลังส่งข้อมูล...", "#00ff00");
                    btnInp.click();
                }
            }, 1000);
        } else {
            retryCount++;
            updateStatus("🔍 กำลังค้นหาช่อง Login... (" + retryCount + "/10)", "yellow");

            if (retryCount >= 10) {
                clearInterval(checkExist);
                // เรียกใช้ฟังก์ชันนับถอยหลังที่แก้ไขใหม่
                forceReload("❌ ไม่พบช่อง Login");
            }
        }
    }, 1000);

})();
