/**
 * CBT ANTI-CHEAT & EXAM ENGINE
 * SMK Diponegoro Tumpang - Pemeliharaan Komputer & Jaringan
 * PIN Guru Keamanan: 230587
 */

(function(window) {
  'use strict';

  const TEACHER_PIN = "230587";
  let examTimer = null;
  let timeRemaining = 0; // in seconds
  let activeQuestions = [];
  let userAnswers = {};
  let violationCount = 0;
  let violationLogs = [];
  let isExamActive = false;
  let examMetadata = {};
  let gracePeriodUntil = 0;
  let lastViolationTime = 0;

  // Utility: Fisher-Yates Shuffle Algorithm
  function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Generate Digital Verification Hash
  function generateIntegrityToken(name, score, violations) {
    const str = `${name}_${score}_${violations}_${Date.now()}_TKJ_SMKDIP`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return 'TKJ-' + Math.abs(hash).toString(16).toUpperCase();
  }

  // Anti-Cheat: Event Listeners
  function enableProtectionListeners() {
    document.addEventListener('contextmenu', blockEvent);
    document.addEventListener('copy', blockEvent);
    document.addEventListener('cut', blockEvent);
    document.addEventListener('paste', blockEvent);
    window.addEventListener('keydown', handleKeyGuard);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
  }

  function disableProtectionListeners() {
    document.removeEventListener('contextmenu', blockEvent);
    document.removeEventListener('copy', blockEvent);
    document.removeEventListener('cut', blockEvent);
    document.removeEventListener('paste', blockEvent);
    window.removeEventListener('keydown', handleKeyGuard);
    window.removeEventListener('blur', handleWindowBlur);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }

  function blockEvent(e) {
    if (isExamActive) {
      e.preventDefault();
      return false;
    }
  }

  function handleKeyGuard(e) {
    if (!isExamActive || Date.now() < gracePeriodUntil) return;

    // Block F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+C, Ctrl+V, Ctrl+S, Ctrl+P
    if (
      e.keyCode === 123 || // F12
      (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) || // Ctrl+Shift+I/J/C
      (e.ctrlKey && (e.keyCode === 85 || e.keyCode === 83 || e.keyCode === 80 || e.keyCode === 67 || e.keyCode === 86)) // Ctrl+U/S/P/C/V
    ) {
      e.preventDefault();
      recordViolation("Mencoba menggunakan tombol inspeksi / shortcut terlarang");
      return false;
    }
  }

  function handleWindowBlur() {
    if (!isExamActive || Date.now() < gracePeriodUntil) return;
    
    // Only record if document is truly hidden / blurred to another window
    setTimeout(() => {
      if (isExamActive && (document.hidden || !document.hasFocus()) && Date.now() >= gracePeriodUntil) {
        recordViolation("Meninggalkan jendela ujian (Alt+Tab / Split Screen / Membuka App Lain)");
      }
    }, 300);
  }

  function handleVisibilityChange() {
    if (!isExamActive || Date.now() < gracePeriodUntil) return;

    if (document.hidden) {
      recordViolation("Berpindah tab browser atau meminimalkan browser");
    }
  }

  function handleFullscreenChange() {
    if (!isExamActive || Date.now() < gracePeriodUntil) return;

    if (!document.fullscreenElement) {
      recordViolation("Keluar dari Mode Fullscreen Layar Penuh");
    }
  }

  // Record Violation & Strike System with Debounce
  function recordViolation(reason) {
    if (!isExamActive || Date.now() < gracePeriodUntil) return;

    // Debounce multiple events within 2.5 seconds
    if (Date.now() - lastViolationTime < 2500) return;
    lastViolationTime = Date.now();

    violationCount++;
    const now = new Date().toLocaleTimeString('id-ID');
    violationLogs.push(`[${now}] Pelanggaran #${violationCount}: ${reason}`);

    updateStrikeDots();

    if (violationCount >= 3) {
      lockExamScreen();
    } else {
      showWarningPopup(reason);
    }
  }

  function updateStrikeDots() {
    const dots = document.querySelectorAll('.strike-dot');
    dots.forEach((dot, idx) => {
      if (idx < violationCount) {
        dot.classList.add('violation');
      } else {
        dot.classList.remove('violation');
      }
    });
  }

  function showWarningPopup(reason) {
    const popup = document.getElementById('cbtWarningPopup');
    if (!popup) return;

    document.getElementById('cbtWarningReason').textContent = reason;
    document.getElementById('cbtStrikeCountText').textContent = violationCount;
    popup.classList.add('active');
  }

  window.dismissWarning = function() {
    const popup = document.getElementById('cbtWarningPopup');
    if (popup) popup.classList.remove('active');

    // Add brief grace period after dismissing warning
    gracePeriodUntil = Date.now() + 2000;

    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  function lockExamScreen() {
    const lock = document.getElementById('cbtLockScreen');
    if (lock) {
      lock.classList.add('active');
      document.getElementById('cbtLockLog').innerHTML = violationLogs.join('<br>');
    }
  }

  window.teacherUnlockExam = function() {
    const pin = document.getElementById('teacherUnlockPinInput').value;
    if (pin === TEACHER_PIN) {
      const lock = document.getElementById('cbtLockScreen');
      if (lock) lock.classList.remove('active');
      document.getElementById('teacherUnlockPinInput').value = '';
      violationCount = 0; // reset strike after teacher unlock
      updateStrikeDots();
      gracePeriodUntil = Date.now() + 3000; // 3 sec grace
      alert('✓ Ujian berhasil dibuka kembali oleh Guru Pengawas. Harap lanjutkan dengan jujur!');
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      alert('✕ PIN Guru salah! Silakan panggil guru pengawas ruang.');
    }
  };

  // Main CBT Engine Class
  window.CBTEngine = {
    init: function(config) {
      examMetadata = config;
      this.renderCbtBox(config);
    },

    renderCbtBox: function(config) {
      const container = document.getElementById(config.containerId || 'cbtAppArea');
      if (!container) return;

      container.innerHTML = `
        <div class="cbt-container">
          <div class="cbt-header">
            <div>
              <div class="cbt-badge-shield">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                SISTEM CBT ANTI-CURANG AKTIF
              </div>
              <h3 style="font-family:var(--font-heading); font-size:20px; color:#fff; margin-top:8px;">${config.title}</h3>
              <p style="font-size:13px; color:var(--text-sub); margin-top:4px;">Durasi: <b>${config.durationMinutes || 30} Menit</b> &middot; Jumlah: <b>${config.questions.length} Soal (Diacak Otomatis)</b> &middot; KKM: <b>75</b></p>
            </div>
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
              <input type="text" id="cbtStudentNameInput" class="custom-input" placeholder="Masukkan Nama Siswa..." style="width:220px; padding:8px 12px; font-size:12.5px;">
              <button type="button" class="btn-action" onclick="CBTEngine.startExam()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Mulai Ulangan Harian
              </button>
            </div>
          </div>

          <div style="background:rgba(3,7,18,0.6); border:1px solid var(--panel-border); border-radius:12px; padding:16px;">
            <div style="font-family:var(--font-mono); font-size:11px; color:var(--cyan); font-weight:700; margin-bottom:6px;">TATA TERTIB &amp; ATURAN KEAMANAN UJIAN:</div>
            <ul style="font-size:12.5px; color:var(--text-sub); padding-left:18px; line-height:1.6;">
              <li>Ketik nama lengkap Anda pada kolom di atas sebelum menekan tombol <b>Mulai Ulangan Harian</b>.</li>
              <li>Ujian akan berjalan otomatis dalam <b>Mode Fullscreen Layar Penuh</b>.</li>
              <li>Dilarang berpindah tab browser, membuka Google/ChatGPT/WhatsApp, atau melakukan Alt+Tab. Sistem akan mendeteksi dan memberi <b>Peringatan Pelanggaran</b>.</li>
              <li><b>3x Pelanggaran</b> akan membuat lembar ujian <b>TERKUNCI</b> dan hanya bisa dibuka dengan PIN Guru (<code>230587</code>).</li>
              <li>Soal dan urutan opsi pilihan (A/B/C/D) <b>diacak otomatis (randomized)</b> untuk setiap siswa.</li>
            </ul>
          </div>

          <!-- Result Area -->
          <div id="cbtResultBox" class="cbt-result-box"></div>
        </div>

        <!-- Fullscreen Active Exam Modal Overlay -->
        <div id="cbtModalOverlay" class="cbt-modal-overlay">
          <div class="cbt-exam-box">
            <div class="cbt-exam-topbar">
              <div>
                <div style="font-family:var(--font-mono); font-size:11px; color:var(--cyan);">${config.subject || 'Pemeliharaan Komputer & Jaringan'} &middot; Kelas X TKJ</div>
                <div style="font-family:var(--font-heading); font-size:16px; font-weight:700; color:#fff;" id="cbtStudentNameHeader">Peserta Ujian</div>
              </div>
              <div style="display:flex; align-items:center; gap:16px;">
                <div class="cbt-strike-bar">
                  <span>Pelanggaran:</span>
                  <div class="strike-dot"></div>
                  <div class="strike-dot"></div>
                  <div class="strike-dot"></div>
                </div>
                <div class="cbt-timer" id="cbtTimerDisplay">00:00</div>
              </div>
            </div>

            <div class="cbt-exam-body">
              <form id="cbtExamForm"></form>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:24px; padding-top:18px; border-top:1px solid rgba(255,255,255,0.1);">
                <span style="font-size:12px; color:var(--text-muted);">Pastikan semua nomor telah dijawab sebelum klik Selesai.</span>
                <button type="button" class="btn-action" style="background:linear-gradient(135deg, #10b981, #00f0ff);" onclick="CBTEngine.submitExam(false)">
                  Kumpulkan Jawaban &amp; Selesai
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Warning Popup -->
        <div id="cbtWarningPopup" class="cbt-warning-popup">
          <div style="font-size:38px; margin-bottom:8px;">⚠️</div>
          <h3 style="font-family:var(--font-heading); font-size:18px; color:#ef4444; margin-bottom:8px;">PERINGATAN PELANGGARAN!</h3>
          <p style="font-size:13px; color:#fca5a5; margin-bottom:12px;" id="cbtWarningReason">Terdeteksi berpindah tab browser.</p>
          <div style="font-family:var(--font-mono); font-size:12px; color:#fff; margin-bottom:16px;">
            Pelanggaran Ke: <b id="cbtStrikeCountText" style="color:#ef4444; font-size:16px;">1</b> / 3 (Maksimal 3 Strike)
          </div>
          <button type="button" class="btn-action" style="background:#ef4444; color:#fff; width:100%;" onclick="dismissWarning()">
            Saya Mengerti &amp; Kembali ke Ujian
          </button>
        </div>

        <!-- Teacher Lock Screen Modal -->
        <div id="cbtLockScreen" class="cbt-lock-screen">
          <div style="max-width:440px; background:#180b0e; border:2px solid #ef4444; border-radius:18px; padding:28px; box-shadow:0 0 50px rgba(239,68,68,0.5);">
            <div style="font-size:42px; margin-bottom:8px;">🔒</div>
            <h2 style="font-family:var(--font-heading); font-size:22px; color:#ef4444; margin-bottom:8px;">UJIAN TERKUNCI!</h2>
            <p style="font-size:13px; color:#fca5a5; margin-bottom:14px;">Siswa telah melakukan 3x pelanggaran sistem anti-curang. Lembar ujian telah dikunci secara otomatis.</p>
            <div style="background:rgba(0,0,0,0.5); border-radius:8px; padding:10px; font-family:var(--font-mono); font-size:11px; color:#f87171; text-align:left; max-height:100px; overflow-y:auto; margin-bottom:16px;" id="cbtLockLog"></div>
            
            <div style="margin-bottom:16px;">
              <label style="font-family:var(--font-mono); font-size:11px; color:#fca5a5; display:block; margin-bottom:6px;">MASUKKAN PIN GURU PENGAWAS UNTUK MEMBUKA:</label>
              <input type="password" id="teacherUnlockPinInput" class="custom-input" placeholder="Masukkan 6 Digit PIN..." maxlength="6" style="text-align:center; font-size:16px; letter-spacing:4px;">
            </div>
            <button type="button" class="btn-action" style="background:linear-gradient(135deg, #ef4444, #8b5cf6); color:#fff; width:100%;" onclick="teacherUnlockExam()">
              Buka Kunci Lembar Ujian
            </button>
          </div>
        </div>
      `;
    },

    startExam: function() {
      let studentName = document.getElementById('cbtStudentNameInput') ? document.getElementById('cbtStudentNameInput').value.trim() : '';
      if (!studentName) {
        studentName = prompt("Masukkan Nama Lengkap Siswa:", "");
        if (!studentName || studentName.trim() === "") {
          alert("Nama siswa wajib diisi untuk memulai ujian!");
          return;
        }
      }

      examMetadata.studentName = studentName.trim();
      document.getElementById('cbtStudentNameHeader').textContent = studentName.trim();

      // Reset state
      violationCount = 0;
      violationLogs = [];
      userAnswers = {};
      lastViolationTime = 0;
      updateStrikeDots();

      // 4 SECONDS STARTUP GRACE PERIOD (Prevents false positive blur on start/fullscreen transition)
      gracePeriodUntil = Date.now() + 4000;

      // Shuffle Questions & Options (RANDOMIZED SOAL & OPSI)
      const rawQuestions = examMetadata.questions;
      activeQuestions = shuffleArray(rawQuestions).map((q, qIndex) => {
        const indexedOptions = q.options.map((opt, optIndex) => ({
          text: opt,
          isCorrect: optIndex === q.correctIndex
        }));
        const shuffledOptions = shuffleArray(indexedOptions);
        return {
          id: qIndex + 1,
          question: q.question,
          options: shuffledOptions,
          explanation: q.explanation
        };
      });

      // Render Questions Form
      this.renderQuestions();

      // Set Timer
      timeRemaining = (examMetadata.durationMinutes || 30) * 60;
      this.updateTimerDisplay();

      // Show Overlay First
      document.getElementById('cbtModalOverlay').classList.add('active');
      isExamActive = true;

      // Request Fullscreen
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      }

      enableProtectionListeners();

      // Start Countdown Timer
      clearInterval(examTimer);
      examTimer = setInterval(() => {
        timeRemaining--;
        this.updateTimerDisplay();
        if (timeRemaining <= 0) {
          clearInterval(examTimer);
          alert('⏰ WAKTU UJIAN SELESAI! Jawaban Anda akan dikumpulkan secara otomatis.');
          this.submitExam(true);
        }
      }, 1000);
    },

    renderQuestions: function() {
      const form = document.getElementById('cbtExamForm');
      let html = '';

      activeQuestions.forEach((q, idx) => {
        let optsHtml = '';
        const letters = ['A', 'B', 'C', 'D', 'E'];

        q.options.forEach((opt, oIdx) => {
          optsHtml += `
            <label class="cbt-option" id="optLabel_${idx}_${oIdx}">
              <input type="radio" name="q_${idx}" value="${oIdx}" onchange="CBTEngine.selectAnswer(${idx}, ${oIdx})">
              <span><b>${letters[oIdx]}.</b> ${opt.text}</span>
            </label>
          `;
        });

        html += `
          <div class="cbt-q-card">
            <div class="cbt-q-text"><b>Soal Nomor ${idx + 1}:</b><br>${q.question}</div>
            <div class="cbt-options-group">${optsHtml}</div>
          </div>
        `;
      });

      form.innerHTML = html;
    },

    selectAnswer: function(qIdx, oIdx) {
      userAnswers[qIdx] = oIdx;
      const qCard = document.getElementsByClassName('cbt-q-card')[qIdx];
      if (qCard) {
        const labels = qCard.querySelectorAll('.cbt-option');
        labels.forEach((lbl, i) => {
          if (i === oIdx) lbl.classList.add('selected');
          else lbl.classList.remove('selected');
        });
      }
    },

    updateTimerDisplay: function() {
      const m = String(Math.floor(timeRemaining / 60)).padStart(2, '0');
      const s = String(timeRemaining % 60).padStart(2, '0');
      const el = document.getElementById('cbtTimerDisplay');
      if (el) el.textContent = `${m}:${s}`;
    },

    submitExam: function(isForce) {
      if (!isForce) {
        const answeredCount = Object.keys(userAnswers).length;
        const total = activeQuestions.length;
        if (answeredCount < total) {
          const confirmSubmit = confirm(`Anda baru menjawab ${answeredCount} dari ${total} soal. Yakin ingin mengumpulkan sekarang?`);
          if (!confirmSubmit) return;
        } else {
          const confirmSubmit = confirm("Yakin ingin menyelesaikan dan mengumpulkan lembar jawaban ujian?");
          if (!confirmSubmit) return;
        }
      }

      // Stop Timer & Protection
      clearInterval(examTimer);
      isExamActive = false;
      disableProtectionListeners();

      // Exit Fullscreen
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }

      // Hide modal
      document.getElementById('cbtModalOverlay').classList.remove('active');

      // Calculate Score
      this.evaluateScore();
    },

    evaluateScore: function() {
      let correctCount = 0;
      let totalQuestions = activeQuestions.length;

      activeQuestions.forEach((q, idx) => {
        const userChoiceIndex = userAnswers[idx];
        if (userChoiceIndex !== undefined && q.options[userChoiceIndex] && q.options[userChoiceIndex].isCorrect) {
          correctCount++;
        }
      });

      const rawScore = Math.round((correctCount / totalQuestions) * 100);
      const penalty = violationCount * 5; // -5 per violation strike
      const finalScore = Math.max(0, rawScore - penalty);

      let grade = 'D (Kurang)';
      let gradeColor = 'var(--red, #ef4444)';
      let kkmStatus = 'TIDAK LULUS KKM (Minimal 75)';
      if (finalScore >= 90) { grade = 'A (Sangat Baik / Mahir)'; gradeColor = '#00f0ff'; kkmStatus = 'LULUS KKM DENGAN PUJIAN'; }
      else if (finalScore >= 75) { grade = 'B (Baik / Kompeten)'; gradeColor = '#10b981'; kkmStatus = 'LULUS KKM (KOMPETEN)'; }
      else if (finalScore >= 60) { grade = 'C (Cukup)'; gradeColor = 'var(--amber, #f59e0b)'; kkmStatus = 'REMIDIAL DIANJURKAN'; }

      const token = generateIntegrityToken(examMetadata.studentName, finalScore, violationCount);
      const integrityStatus = violationCount === 0 ? "100% JUJUR (Nol Pelanggaran)" : `${violationCount}x Pelanggaran Tercatat (Penalti -${penalty} Poin)`;

      // Auto-save submission for Teacher Export Panel
      try {
        const historyKey = 'bh_cbt_all_submissions';
        const existing = JSON.parse(localStorage.getItem(historyKey)) || [];
        existing.push({
          timestamp: new Date().toISOString(),
          formattedDate: new Date().toLocaleString('id-ID'),
          studentName: examMetadata.studentName || 'Peserta Didik',
          moduleTitle: examMetadata.title || 'Modul Pembelajaran',
          rawScore: rawScore,
          finalScore: finalScore,
          grade: grade,
          violations: violationCount,
          token: token,
          correct: correctCount,
          total: totalQuestions
        });
        localStorage.setItem(historyKey, JSON.stringify(existing));
      } catch (err) {
        console.warn('[CBT] Could not save submission to history:', err);
      }

      // Render Result Card
      const resBox = document.getElementById('cbtResultBox');
      resBox.style.display = 'block';
      resBox.innerHTML = `
        <div class="cbt-score-display">
          <div>
            <div style="font-family:var(--font-mono); font-size:12px; color:var(--text-sub);">NAMA PESERTA: <b style="color:#fff;">${examMetadata.studentName}</b></div>
            <div style="font-family:var(--font-mono); font-size:12px; color:var(--text-sub); margin-top:4px;">MATERI: <b style="color:#fff;">${examMetadata.title}</b></div>
            <div style="font-family:var(--font-mono); font-size:12px; color:var(--text-sub); margin-top:4px;">INTEGRITAS: <b style="color:${violationCount===0?'#10b981':'#ef4444'};">${integrityStatus}</b></div>
            <div style="font-family:var(--font-mono); font-size:11px; color:var(--text-muted); margin-top:4px;">TOKEN VERIFIKASI: <b style="color:#00f0ff;">${token}</b></div>
          </div>
          <div style="text-align:right;">
            <div style="font-family:var(--font-mono); font-size:11px; color:var(--text-muted);">SKOR AKHIR:</div>
            <div class="score-big" style="color:${gradeColor};">${finalScore} <span style="font-size:18px; color:var(--text-muted);">/ 100</span></div>
            <div style="font-family:var(--font-mono); font-size:12px; font-weight:700; color:${gradeColor};">${kkmStatus}</div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin-bottom:20px;">
          <div style="background:rgba(3,7,18,0.7); border:1px solid var(--panel-border); border-radius:10px; padding:12px; text-align:center;">
            <div style="font-family:var(--font-mono); font-size:11px; color:var(--text-muted);">BENAR</div>
            <div style="font-family:var(--font-heading); font-size:22px; font-weight:800; color:#10b981;">${correctCount} / ${totalQuestions}</div>
          </div>
          <div style="background:rgba(3,7,18,0.7); border:1px solid var(--panel-border); border-radius:10px; padding:12px; text-align:center;">
            <div style="font-family:var(--font-mono); font-size:11px; color:var(--text-muted);">SALAH / KOSONG</div>
            <div style="font-family:var(--font-heading); font-size:22px; font-weight:800; color:#ef4444;">${totalQuestions - correctCount}</div>
          </div>
          <div style="background:rgba(3,7,18,0.7); border:1px solid var(--panel-border); border-radius:10px; padding:12px; text-align:center;">
            <div style="font-family:var(--font-mono); font-size:11px; color:var(--text-muted);">PREDIKAT</div>
            <div style="font-family:var(--font-heading); font-size:20px; font-weight:800; color:${gradeColor};">${grade}</div>
          </div>
          <div style="background:rgba(3,7,18,0.7); border:1px solid var(--panel-border); border-radius:10px; padding:12px; text-align:center;">
            <div style="font-family:var(--font-mono); font-size:11px; color:var(--text-muted);">PELANGGARAN</div>
            <div style="font-family:var(--font-heading); font-size:22px; font-weight:800; color:${violationCount===0?'#10b981':'#ef4444'};">${violationCount}x</div>
          </div>
        </div>

        <!-- Teacher Action Toolbar -->
        <div style="background:rgba(139,92,246,0.1); border:1px solid rgba(139,92,246,0.3); border-radius:12px; padding:16px; margin-bottom:16px;">
          <div style="font-family:var(--font-mono); font-size:12px; font-weight:700; color:#c4b5fd; margin-bottom:10px;">📋 PANEL PENILAIAN GURU (PINTASAN CEPAT):</div>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button type="button" class="btn-action" style="font-size:12px;" onclick="CBTEngine.copyScoreSummary('${examMetadata.studentName}', ${finalScore}, '${grade}', ${violationCount}, '${token}')">
              📋 Salin Rekap Nilai Siswa (Clipboard)
            </button>
            <button type="button" class="btn-action" style="font-size:12px; background:linear-gradient(135deg, #10b981, #00f0ff);" onclick="CBTEngine.printReport('${examMetadata.studentName}', ${finalScore}, ${correctCount}, ${totalQuestions}, '${grade}', ${violationCount}, '${token}')">
              🖨️ Cetak Berita Acara Nilai Resmi A4
            </button>
            <button type="button" class="btn-action" style="font-size:12px; background:rgba(255,255,255,0.1); color:#fff;" onclick="CBTEngine.revealAnswerKey()">
              🔑 Kunci Jawaban &amp; Pembahasan (Guru)
            </button>
          </div>
        </div>

        <!-- Hidden Teacher Answer Analysis Area -->
        <div id="cbtTeacherAnalysisArea" style="display:none; background:rgba(15,23,42,0.8); border:1px solid var(--panel-border); border-radius:12px; padding:18px;">
          <h4 style="font-family:var(--font-heading); color:#00f0ff; margin-bottom:12px;">Analisis Butir Soal &amp; Lembar Kunci Jawaban Lengkap:</h4>
          <div id="cbtAnalysisList"></div>
        </div>
      `;

      resBox.scrollIntoView({ behavior: 'smooth' });
    },

    copyScoreSummary: function(name, score, grade, violations, token) {
      const text = `[REKAP NILAI CBT TKJ]
Nama Siswa: ${name}
Materi: ${examMetadata.title}
Skor Akhir: ${score} / 100 (${grade})
Status KKM: ${score >= 75 ? 'LULUS KKM' : 'REMIDIAL'}
Pelanggaran Anti-Curang: ${violations === 0 ? '0 (JUJUR)' : violations + 'x Terdeteksi'}
Token Integritas: ${token}
Waktu Selesai: ${new Date().toLocaleString('id-ID')}`;

      navigator.clipboard.writeText(text).then(() => {
        alert('✓ Format rekap nilai berhasil disalin ke clipboard! Siap dipaste ke Excel / WhatsApp Guru.');
      }).catch(() => {
        prompt('Salin teks rekap berikut:', text);
      });
    },

    printReport: function(name, score, correct, total, grade, violations, token) {
      const printWin = window.open('', '_blank');
      printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Berita Acara Nilai CBT - ${name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #000; font-size: 13px; line-height: 1.6; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px; }
            .header h2 { margin: 0; font-size: 16px; font-weight: bold; }
            .header h3 { margin: 4px 0 0; font-size: 13px; font-weight: normal; }
            table { width: 100%; border-collapse: collapse; margin: 16px 0; }
            table td { padding: 6px 8px; vertical-align: top; }
            .score-box { border: 2px solid #000; padding: 14px; text-align: center; margin: 20px 0; border-radius: 6px; }
            .score-val { font-size: 32px; font-weight: bold; }
            .footer { margin-top: 40px; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>SMK DIPONEGORO TUMPANG</h2>
            <h3>LEMBAR HASIL ULANGAN HARIAN CBT (ANTI-CHEAT VERIFIED)</h3>
            <p style="margin:4px 0 0; font-size:11px;">Mata Pelajaran: Pemeliharaan Komputer & Jaringan (Kelas X TKJ)</p>
          </div>

          <table>
            <tr><td width="180"><b>Nama Peserta:</b></td><td>${name}</td></tr>
            <tr><td><b>Materi Pembelajaran:</b></td><td>${examMetadata.title}</td></tr>
            <tr><td><b>Tanggal Pelaksanaan:</b></td><td>${new Date().toLocaleDateString('id-ID', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</td></tr>
            <tr><td><b>Jumlah Soal:</b></td><td>${total} Butir (Diacak Sistem)</td></tr>
            <tr><td><b>Jawaban Benar:</b></td><td>${correct} Butir</td></tr>
            <tr><td><b>Status Pelanggaran:</b></td><td>${violations === 0 ? '0 (100% JUJUR TANPA KECURANGAN)' : violations + 'x Pelanggaran Terdeteksi'}</td></tr>
            <tr><td><b>Token Integritas:</b></td><td><b>${token}</b></td></tr>
          </table>

          <div class="score-box">
            <div>SKOR AKHIR ULANGAN HARIAN:</div>
            <div class="score-val">${score} / 100</div>
            <div><b>PREDIKAT: ${grade} &middot; STATUS: ${score >= 75 ? 'LULUS KKM' : 'REMIDIAL'}</b></div>
          </div>

          <div class="footer">
            <div>Peserta Ujian,<br><br><br><br><b>(${name})</b></div>
            <div>Guru Pengampu TKJ,<br><br><br><br><b>Wahyu Prihanto</b><br>NIP. -</div>
          </div>
        </body>
        </html>
      `);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => printWin.print(), 300);
    },

    revealAnswerKey: function() {
      const pin = prompt("Masukkan PIN Guru Pengawas (6 Digit):");
      if (pin === TEACHER_PIN) {
        const area = document.getElementById('cbtTeacherAnalysisArea');
        const list = document.getElementById('cbtAnalysisList');
        let html = '';

        activeQuestions.forEach((q, idx) => {
          const userChoice = userAnswers[idx];
          const correctOpt = q.options.find(o => o.isCorrect);
          const isUserCorrect = userChoice !== undefined && q.options[userChoice] && q.options[userChoice].isCorrect;

          html += `
            <div style="background:rgba(3,7,18,0.7); border:1px solid ${isUserCorrect?'#10b981':'#ef4444'}; border-radius:8px; padding:12px; margin-bottom:10px;">
              <div style="font-size:13px; color:#fff; margin-bottom:6px;"><b>Soal ${idx+1}:</b> ${q.question}</div>
              <div style="font-size:12px; color:${isUserCorrect?'#6ee7b7':'#fca5a5'};">
                Jawaban Siswa: <b>${userChoice !== undefined ? q.options[userChoice].text : '(Tidak Dijawab)'}</b> ${isUserCorrect?'✓':'✕'}
              </div>
              <div style="font-size:12px; color:#67e8f9; margin-top:2px;">
                Kunci Jawaban: <b>${correctOpt ? correctOpt.text : '-'}</b>
              </div>
              <div style="font-size:11.5px; color:var(--text-muted); margin-top:4px; font-style:italic;">
                Penjelasan: ${q.explanation}
              </div>
            </div>
          `;
        });

        list.innerHTML = html;
        area.style.display = 'block';
        area.scrollIntoView({ behavior: 'smooth' });
      } else {
        alert('✕ PIN Guru salah!');
      }
    }
  };

})(window);
