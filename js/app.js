/**
 * Aplicação Interativa SCORM 1.2 - Sistema CRESOL
 * Governança de TI, Segurança e Gestão de Acessos
 */
(function () {
  'use strict';

  var course = window.COURSE_DATA;
  var state = null;
  var activeTab = 'summary'; // 'summary' | 'notes' | 'quiz'
  var saveTimeout = null;
  var essaySaveTimeout = null;
  var progressSaveTime = 0;
  var liveDurations = {};
  var COMPLETION_THRESHOLD_PCT = 85; // Marca a aula como concluída automaticamente aos 85%

  // Ícones SVG em linha fina (2px) e pontas arredondadas (Padrão Brandbook CRESOL Pág. 26)
  var ICONS = {
    check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    play: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>',
    book: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>',
    edit: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>',
    award: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>',
    shield: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>',
    arrowLeft: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>',
    arrowRight: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>',
    download: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
    printer: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>',
    alert: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
    flip: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>',
    compass: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>'
  };

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showToast(msg) {
    var toast = document.getElementById('cresol-toast');
    var textEl = document.getElementById('cresol-toast-text');
    if (!toast || !textEl) return;
    textEl.textContent = msg;
    toast.classList.add('show');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(function () {
      toast.classList.remove('show');
    }, 3800);
  }

  function hasFinalExam() {
    return !!(course.final_exam && course.final_exam.questions && course.final_exam.questions.length);
  }

  function getActiveQuizObject() {
    if (course.is_full_course && course.modules && course.modules.length) {
      var modIdx = typeof state.activeQuizModuleIdx === 'number' ? state.activeQuizModuleIdx : 0;
      var mod = course.modules[modIdx] || course.modules[0];
      return {
        modIdx: modIdx,
        modNumber: mod.module_number,
        shortTitle: mod.short_title,
        questions: mod.quiz || []
      };
    }
    return {
      modIdx: 0,
      modNumber: course.module_number || 1,
      shortTitle: course.short_title,
      questions: course.quiz || []
    };
  }

  function getLessonWatchPct(code) {
    if (state.completedLessons && state.completedLessons[code]) {
      var saved = (state.videoProgress && state.videoProgress[code]) ? state.videoProgress[code] : 100;
      return Math.max(COMPLETION_THRESHOLD_PCT, saved);
    }
    return (state.videoProgress && typeof state.videoProgress[code] === 'number')
      ? state.videoProgress[code]
      : 0;
  }

  function getCompletedLessonsCount() {
    if (!course.lessons || !course.lessons.length) return 0;
    var count = 0;
    course.lessons.forEach(function (l) {
      if (state.completedLessons && state.completedLessons[l.code]) count++;
    });
    return count;
  }

  function areAllLessonsCompleted() {
    if (!course.lessons || !course.lessons.length) return true;
    return getCompletedLessonsCount() === course.lessons.length;
  }

  function isQuizPassed(modIdx) {
    if (course.is_full_course && typeof modIdx === 'number') {
      var s = state.moduleQuizScores && state.moduleQuizScores[modIdx];
      return typeof s === 'number' && s >= 70;
    }
    return state.quizSubmitted && typeof state.quizScore === 'number' && state.quizScore >= 70;
  }

  function isFinalExamPassed() {
    return !!(state.examSubmitted && typeof state.examScore === 'number');
  }

  function evaluateEssayRubric(q, text) {
    var raw = String(text || '').toLowerCase();
    var criteria = q.rubric_criteria || [];
    var matchedCount = 0;
    var details = criteria.map(function (c) {
      var hit = (c.keywords || []).some(function (kw) {
        return raw.indexOf(kw.toLowerCase()) !== -1;
      });
      if (hit) matchedCount++;
      return {
        label: c.label,
        desc: c.desc,
        covered: hit
      };
    });
    return {
      matchedCount: matchedCount,
      totalCriteria: criteria.length || 4,
      details: details
    };
  }

  function isExamQuestionAnswered(q) {
    if (q.type === 'essay') {
      var txt = (state.examEssays && state.examEssays[q.id]) ? String(state.examEssays[q.id]).trim() : '';
      return txt.length >= 30 || !!(state.examEssayValidated && state.examEssayValidated[q.id]);
    }
    return state.examAnswers && typeof state.examAnswers[q.id] === 'number';
  }

  function getExamAnsweredCount() {
    if (!hasFinalExam()) return 0;
    var count = 0;
    course.final_exam.questions.forEach(function (q) {
      if (isExamQuestionAnswered(q)) count++;
    });
    return count;
  }

  function isModuleFullyCompleted() {
    if (course.is_exam_only) {
      return isFinalExamPassed();
    }
    if (hasFinalExam()) {
      return areAllLessonsCompleted() && isFinalExamPassed();
    }
    return areAllLessonsCompleted() && isQuizPassed();
  }

  function calculateOverallProgress() {
    if (course.is_exam_only && hasFinalExam()) {
      var totalExamQ = course.final_exam.questions.length;
      var ansExamQ = getExamAnsweredCount();
      if (isFinalExamPassed()) return 100;
      return Math.min(95, Math.round((ansExamQ / totalExamQ) * 90));
    }

    var totalLessons = (course.lessons || []).length;
    var doneLessons = getCompletedLessonsCount();

    if (hasFinalExam()) {
      var lessonWeight = 70;
      var quizWeight = 10;
      var examWeight = 20;
      var lPct = totalLessons > 0 ? (doneLessons / totalLessons) * lessonWeight : 0;
      var qPct = 0;
      if (course.is_full_course && course.modules) {
        var passedQuizzes = 0;
        course.modules.forEach(function (_, idx) {
          if (isQuizPassed(idx)) passedQuizzes++;
        });
        qPct = (passedQuizzes / course.modules.length) * quizWeight;
      } else {
        qPct = isQuizPassed() ? quizWeight : (state.quizSubmitted ? 5 : 0);
      }
      var ePct = isFinalExamPassed() ? examWeight : (state.examSubmitted ? 10 : (getExamAnsweredCount() / 12) * 10);
      return Math.min(100, Math.round(lPct + qPct + ePct));
    }

    var stdLessonWeight = 80;
    var stdLessonPct = totalLessons > 0 ? (doneLessons / totalLessons) * stdLessonWeight : 0;
    var stdQuizPct = isQuizPassed() ? 20 : (state.quizSubmitted ? 10 : 0);
    return Math.min(100, Math.round(stdLessonPct + stdQuizPct));
  }

  function getEffectiveLmsScore() {
    if (hasFinalExam() && typeof state.examScore === 'number') {
      return state.examScore;
    }
    return state.quizScore;
  }

  function persistState() {
    var loc = 'LESSON_' + state.currentLessonIndex;
    if (state.currentView === 'welcome') loc = 'WELCOME';
    if (state.currentView === 'quiz') loc = 'QUIZ';
    if (state.currentView === 'final_exam') loc = 'FINAL_EXAM';
    var completed = isModuleFullyCompleted();
    window.ScormManager.saveState(state, loc, completed, getEffectiveLmsScore());
    updateHeaderProgress();
    renderPrintNotebook();
  }

  function updateHeaderProgress() {
    var pct = calculateOverallProgress();
    var bar = document.getElementById('header-progress-fill');
    var label = document.getElementById('header-progress-pct');
    var countEl = document.getElementById('sidebar-completed-counter');
    if (bar) bar.style.width = pct + '%';
    if (label) label.textContent = pct + '%';
    if (countEl) {
      if (course.is_exam_only && hasFinalExam()) {
        countEl.textContent = getExamAnsweredCount() + ' de ' + course.final_exam.questions.length + ' questões';
      } else {
        countEl.textContent = getCompletedLessonsCount() + ' de ' + course.lessons.length + ' aulas';
      }
    }
  }

  function renderLessonButtonHtml(lesson, idx) {
    var isCompleted = !!(state.completedLessons && state.completedLessons[lesson.code]);
    var isActive = (state.currentView === 'lesson' && state.currentLessonIndex === idx);
    var classes = 'lesson-nav-item' + (isActive ? ' active' : '') + (isCompleted ? ' completed' : '');
    var iconContent = isCompleted ? ICONS.check : (idx + 1);

    return (
      '<li role="listitem">' +
        '<button type="button" class="' + classes + '" data-lesson-idx="' + idx + '">' +
          '<span class="lesson-status-icon">' + iconContent + '</span>' +
          '<div class="lesson-nav-info">' +
            '<div class="lesson-nav-code">' +
              '<span>Aula ' + escapeHtml(lesson.code) + '</span>' +
              '<span class="lesson-nav-duration">' + escapeHtml(lesson.duration) + '</span>' +
            '</div>' +
            '<div class="lesson-nav-title">' + escapeHtml(lesson.title) + '</div>' +
          '</div>' +
        '</button>' +
      '</li>'
    );
  }

  function renderFinalExamSidebarCardHtml() {
    if (!hasFinalExam()) return '';
    var examActive = (state.currentView === 'final_exam');
    var examPassed = isFinalExamPassed();
    var examClasses = 'exam-nav-card' + (examActive ? ' active' : '') + (examPassed ? ' passed' : '');
    var ansCount = getExamAnsweredCount();
    var totalQ = course.final_exam.questions.length;

    var subText = examPassed
      ? ('Concluída • Nota arquivada (' + Math.round(state.examScore) + '%)')
      : (ansCount > 0
          ? (ansCount + '/' + totalQ + ' respondidas • Boas práticas')
          : '12 Exercícios • Correção e Boas Práticas');

    return (
      '<li role="listitem">' +
        '<button type="button" class="' + examClasses + '" id="sidebar-final-exam-btn">' +
          '<span class="lesson-status-icon" style="background:' + (examActive ? 'var(--cresol-orange)' : 'var(--cresol-green)') + ';color:#fff;border:none;">' +
            (examPassed ? ICONS.check : ICONS.award) +
          '</span>' +
          '<div class="lesson-nav-info">' +
            '<div class="lesson-nav-code" style="color:' + (examActive ? '#FFD9B8' : 'var(--cresol-orange)') + ';">' +
              '<span>Consolidação da Trilha</span>' +
            '</div>' +
            '<div class="lesson-nav-title">Avaliação Final (Mód. 1 a 4)</div>' +
            '<div style="font-size:11px;color:' + (examActive ? 'rgba(255,255,255,0.85)' : 'var(--cresol-gray-medium)') + ';margin-top:2px;">' +
              escapeHtml(subText) +
            '</div>' +
          '</div>' +
        '</button>' +
      '</li>'
    );
  }

  function renderSidebar() {
    var listEl = document.getElementById('sidebar-lesson-list');
    if (!listEl) return;

    var html = '';

    // Modo 1: Pacote Exclusivo da Prova Final
    if (course.is_exam_only && hasFinalExam()) {
      var modGroups = [
        { num: 1, title: 'Módulo 1: Governança e Ameaças', codes: ['1.1', '1.2', '1.3'] },
        { num: 2, title: 'Módulo 2: IAM, Privilégios e Zero Trust', codes: ['2.1', '2.2', '2.3'] },
        { num: 3, title: 'Módulo 3: Recertificação e Offboarding', codes: ['3.1', '3.2', '3.3'] },
        { num: 4, title: 'Módulo 4: Cultura e Workshop', codes: ['4.1', '4.2', '4.3'] }
      ];
      html += renderFinalExamSidebarCardHtml();
      modGroups.forEach(function (mg) {
        html +=
          '<li role="listitem" style="margin-top:6px;">' +
            '<button type="button" class="sidebar-mod-group-header" data-scroll-mod="' + mg.num + '">' +
              '<span>' + escapeHtml(mg.title) + '</span>' +
              '<span class="sidebar-mod-group-badge">3 questões</span>' +
            '</button>' +
          '</li>';
      });
      listEl.innerHTML = html;
      var scrollBtns = listEl.querySelectorAll('[data-scroll-mod]');
      scrollBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var mNum = btn.getAttribute('data-scroll-mod');
          var target = document.getElementById('exam-mod-section-' + mNum);
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          closeMobileSidebar();
        });
      });
      updateHeaderProgress();
      return;
    }

    // Modo 2: Curso Completo Unificado (4 Módulos + 21 Aulas + Quizzes + Avaliação Final)
    if (course.is_full_course && course.modules && course.modules.length) {
      var welcomeActive = (state.currentView === 'welcome');
      html +=
        '<li role="listitem">' +
          '<button type="button" class="welcome-nav-card' + (welcomeActive ? ' active' : '') + '" id="sidebar-welcome-btn">' +
            '<span class="lesson-status-icon" style="background:' + (welcomeActive ? 'var(--cresol-orange)' : 'var(--cresol-green)') + ';color:#fff;border:none;">' +
              ICONS.compass +
            '</span>' +
            '<div class="lesson-nav-info">' +
              '<div class="lesson-nav-code" style="color:' + (welcomeActive ? '#FFD9B8' : 'var(--cresol-orange)') + ';">' +
                '<span>Início da Jornada</span>' +
              '</div>' +
              '<div class="lesson-nav-title">Boas-Vindas &amp; Guia do Curso</div>' +
            '</div>' +
          '</button>' +
        '</li>';

      var globalLessonIdx = 0;
      course.modules.forEach(function (mod, mIdx) {
        var modLessons = mod.lessons || [];
        var doneInMod = 0;
        modLessons.forEach(function (l) {
          if (state.completedLessons && state.completedLessons[l.code]) doneInMod++;
        });
        var isCollapsed = !!(state.collapsedModules && state.collapsedModules[mIdx]);

        html +=
          '<li role="listitem">' +
            '<button type="button" class="sidebar-mod-group-header" data-toggle-mod="' + mIdx + '">' +
              '<span>' + (isCollapsed ? '▸ ' : '▾ ') + 'Módulo ' + mod.module_number + ' — ' + escapeHtml(mod.short_title.replace(/^Módulo \d+:\s*/i, '')) + '</span>' +
              '<span class="sidebar-mod-group-badge">' + doneInMod + '/' + modLessons.length + '</span>' +
            '</button>' +
          '</li>';

        modLessons.forEach(function (lesson) {
          var lIdx = globalLessonIdx++;
          if (!isCollapsed) {
            html += renderLessonButtonHtml(lesson, lIdx);
          }
        });

        if (!isCollapsed) {
          var mQuizActive = (state.currentView === 'quiz' && state.activeQuizModuleIdx === mIdx);
          var mQuizPassed = isQuizPassed(mIdx);
          var mQuizScore = state.moduleQuizScores && state.moduleQuizScores[mIdx];
          var mQuizClasses = 'quiz-nav-card' + (mQuizActive ? ' active' : '') + (mQuizPassed ? ' passed' : '');
          var mQuizSub = mQuizPassed
            ? ('Aprovado (' + Math.round(mQuizScore) + '%)')
            : (typeof mQuizScore === 'number' ? ('Nota: ' + Math.round(mQuizScore) + '% • Refazer') : '5 Questões de Fixação');

          html +=
            '<li role="listitem">' +
              '<button type="button" class="' + mQuizClasses + '" data-mod-quiz="' + mIdx + '" style="margin-bottom:6px;">' +
                '<span class="lesson-status-icon" style="background:' + (mQuizPassed ? 'var(--cresol-green)' : 'var(--cresol-orange)') + ';color:#fff;border:none;">' +
                  (mQuizPassed ? ICONS.check : ICONS.award) +
                '</span>' +
                '<div class="lesson-nav-info">' +
                  '<div class="lesson-nav-code" style="color:' + (mQuizPassed ? 'var(--cresol-green)' : 'var(--cresol-orange)') + ';">' +
                    '<span>Fixação • Módulo ' + mod.module_number + '</span>' +
                  '</div>' +
                  '<div class="lesson-nav-title">Quiz do Módulo ' + mod.module_number + '</div>' +
                  '<div style="font-size:11px;color:var(--cresol-gray-medium);margin-top:1px;">' + escapeHtml(mQuizSub) + '</div>' +
                '</div>' +
              '</button>' +
            '</li>';
        }
      });

      html += renderFinalExamSidebarCardHtml();
    } else {
      // Modo 3: Módulo Individual (Módulos 1 a 4)
      course.lessons.forEach(function (lesson, idx) {
        html += renderLessonButtonHtml(lesson, idx);
      });

      var quizActive = (state.currentView === 'quiz');
      var quizPassed = isQuizPassed();
      var quizClasses = 'quiz-nav-card' + (quizActive ? ' active' : '') + (quizPassed ? ' passed' : '');
      var quizBadgeText = quizPassed
        ? ('Aprovado (' + Math.round(state.quizScore) + '%)')
        : (state.quizSubmitted ? ('Nota: ' + Math.round(state.quizScore) + '% • Refazer') : '5 Questões • Nota mín. 70%');

      html +=
        '<li role="listitem">' +
          '<button type="button" class="' + quizClasses + '" id="sidebar-quiz-btn">' +
            '<span class="lesson-status-icon" style="background:' + (quizPassed ? 'var(--cresol-green)' : 'var(--cresol-orange)') + ';color:#fff;border:none;">' +
              (quizPassed ? ICONS.check : ICONS.award) +
            '</span>' +
            '<div class="lesson-nav-info">' +
              '<div class="lesson-nav-code" style="color:' + (quizPassed ? 'var(--cresol-green)' : 'var(--cresol-orange)') + ';">' +
                '<span>Avaliação do Módulo</span>' +
              '</div>' +
              '<div class="lesson-nav-title">Quiz Interativo de Fixação</div>' +
              '<div style="font-size:11.5px;color:var(--cresol-gray-medium);margin-top:2px;">' + escapeHtml(quizBadgeText) + '</div>' +
            '</div>' +
          '</button>' +
        '</li>';

      // No Módulo 4, exibe também a Prova Final logo abaixo do Quiz do Módulo 4
      html += renderFinalExamSidebarCardHtml();
    }

    listEl.innerHTML = html;

    var toggleModBtns = listEl.querySelectorAll('[data-toggle-mod]');
    toggleModBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mIdx = parseInt(btn.getAttribute('data-toggle-mod'), 10);
        if (!state.collapsedModules) state.collapsedModules = {};
        state.collapsedModules[mIdx] = !state.collapsedModules[mIdx];
        renderSidebar();
      });
    });

    var lessonBtns = listEl.querySelectorAll('[data-lesson-idx]');
    lessonBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-lesson-idx'), 10);
        selectLesson(idx);
        closeMobileSidebar();
      });
    });

    var modQuizBtns = listEl.querySelectorAll('[data-mod-quiz]');
    modQuizBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mIdx = parseInt(btn.getAttribute('data-mod-quiz'), 10);
        openQuizView(mIdx);
        closeMobileSidebar();
      });
    });

    var quizBtn = document.getElementById('sidebar-quiz-btn');
    if (quizBtn) {
      quizBtn.addEventListener('click', function () {
        openQuizView(0);
        closeMobileSidebar();
      });
    }

    var welcomeBtn = document.getElementById('sidebar-welcome-btn');
    if (welcomeBtn) {
      welcomeBtn.addEventListener('click', function () {
        openWelcomeView();
        closeMobileSidebar();
      });
    }

    var finalExamBtn = document.getElementById('sidebar-final-exam-btn');
    if (finalExamBtn) {
      finalExamBtn.addEventListener('click', function () {
        openFinalExamView();
        closeMobileSidebar();
      });
    }

    updateHeaderProgress();
  }

  function closeMobileSidebar() {
    var sb = document.getElementById('course-sidebar');
    if (sb) sb.classList.remove('open');
  }

  function openWelcomeView() {
    state.currentView = 'welcome';
    persistState();
    renderSidebar();
    renderStage(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function getModuleIndexForLesson(lessonIdx) {
    if (!course.is_full_course || !course.modules) return 0;
    var acc = 0;
    for (var i = 0; i < course.modules.length; i++) {
      var len = (course.modules[i].lessons || []).length;
      if (lessonIdx < acc + len) return i;
      acc += len;
    }
    return 0;
  }

  function selectLesson(idx) {
    if (!course.lessons || idx < 0 || idx >= course.lessons.length) return;
    var lessonChanged = (state.currentView !== 'lesson' || state.currentLessonIndex !== idx);
    state.currentView = 'lesson';
    state.currentLessonIndex = idx;
    state.activeQuizModuleIdx = getModuleIndexForLesson(idx);
    if (activeTab === 'quiz') activeTab = 'summary';
    persistState();
    renderSidebar();
    renderStage(lessonChanged);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openQuizView(modIdx) {
    state.currentView = 'quiz';
    if (typeof modIdx === 'number') {
      state.activeQuizModuleIdx = modIdx;
    } else if (typeof state.activeQuizModuleIdx !== 'number') {
      state.activeQuizModuleIdx = getModuleIndexForLesson(state.currentLessonIndex || 0);
    }
    activeTab = 'quiz';
    persistState();
    renderSidebar();
    renderStage(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openFinalExamView() {
    if (!hasFinalExam()) return;
    state.currentView = 'final_exam';
    persistState();
    renderSidebar();
    renderStage(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function markLessonCompletedAutomatically(lesson) {
    if (!lesson || state.completedLessons[lesson.code]) return;
    state.completedLessons[lesson.code] = true;
    if (!state.videoProgress) state.videoProgress = {};
    if ((state.videoProgress[lesson.code] || 0) < COMPLETION_THRESHOLD_PCT) {
      state.videoProgress[lesson.code] = COMPLETION_THRESHOLD_PCT;
    }
    persistState();
    renderSidebar();
    updateLessonActionUI();

    if (isModuleFullyCompleted()) {
      showToast('Parabéns! Aula ' + lesson.code + ' concluída e curso 100% finalizado!');
    } else if (areAllLessonsCompleted()) {
      showToast('Aula ' + lesson.code + ' concluída (85% atingido)! Realize agora a avaliação.');
    } else {
      showToast('Aula ' + lesson.code + ' concluída automaticamente ao atingir 85% do vídeo!');
    }
  }

  function updateLessonActionUI() {
    if (!course.lessons || !course.lessons.length) return;
    var lesson = course.lessons[state.currentLessonIndex];
    if (!lesson) return;
    var isDone = !!state.completedLessons[lesson.code];
    var pct = getLessonWatchPct(lesson.code);

    var topPill = document.getElementById('stage-lesson-pill');
    if (topPill) {
      topPill.className = 'lesson-status-pill' + (isDone ? ' completed' : '');
      topPill.innerHTML = isDone
        ? (ICONS.check + ' <span>Aula Concluída</span>')
        : (ICONS.play + ' <span>Em andamento (' + pct + '%)</span>');
    }

    var boxEl = document.getElementById('auto-progress-box');
    var iconEl = document.getElementById('auto-progress-icon');
    var titleEl = document.getElementById('auto-progress-title');
    var pctLabelEl = document.getElementById('auto-progress-pct-label');
    var fillEl = document.getElementById('auto-progress-fill');
    var subEl = document.getElementById('auto-progress-sub');

    if (boxEl) {
      boxEl.className = 'auto-progress-box' + (isDone ? ' is-done' : '');
    }
    if (iconEl) {
      iconEl.innerHTML = isDone ? ICONS.check : (pct + '%');
    }
    if (titleEl) {
      titleEl.textContent = isDone
        ? 'Aula concluída automaticamente'
        : 'Progresso de visualização do vídeo';
    }
    if (pctLabelEl) {
      pctLabelEl.textContent = pct + '%';
    }
    if (fillEl) {
      fillEl.style.width = Math.min(100, pct) + '%';
    }
    if (subEl) {
      subEl.textContent = isDone
        ? 'Meta de ' + COMPLETION_THRESHOLD_PCT + '% atingida • Conclusão registrada no módulo'
        : 'A aula é marcada como concluída automaticamente ao atingir ' + COMPLETION_THRESHOLD_PCT + '% do vídeo';
    }
  }

  function renderWelcomeStage(container) {
    var learnerName = window.ScormManager ? window.ScormManager.getLearnerName() : 'Colaborador(a) CRESOL';
    var doneCount = getCompletedLessonsCount();
    var totalLessons = (course.lessons || []).length;
    var resumeIdx = state.currentLessonIndex || 0;
    if (doneCount > 0 && doneCount < totalLessons) {
      for (var i = 0; i < totalLessons; i++) {
        if (!state.completedLessons[course.lessons[i].code]) {
          resumeIdx = i;
          break;
        }
      }
    }
    var resumeLesson = (course.lessons && course.lessons[resumeIdx]) ? course.lessons[resumeIdx] : null;
    var ctaLabel = (doneCount > 0 && resumeLesson)
      ? ('Continuar Aprendizagem (Aula ' + resumeLesson.code + ')')
      : 'Iniciar Jornada de Aprendizagem (Aula 1.1)';

    var modulesCardsHtml = '';
    var startLessonAcc = 0;
    (course.modules || []).forEach(function (mod, mIdx) {
      var modLessons = mod.lessons || [];
      var firstLessonIdx = startLessonAcc;
      startLessonAcc += modLessons.length;
      var modDone = 0;
      modLessons.forEach(function (l) {
        if (state.completedLessons && state.completedLessons[l.code]) modDone++;
      });
      var modPct = modLessons.length > 0 ? Math.round((modDone / modLessons.length) * 100) : 0;

      modulesCardsHtml +=
        '<div class="welcome-module-card">' +
          '<div>' +
            '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">' +
              '<span class="question-num-badge" style="margin-bottom:0;">Módulo ' + mod.module_number + '</span>' +
              '<span style="font-size:12px;font-weight:700;color:var(--cresol-green);">' + modDone + ' de ' + modLessons.length + ' aulas (' + modPct + '%)</span>' +
            '</div>' +
            '<h3 style="font-size:16px;font-weight:800;color:var(--cresol-green-deep);margin-bottom:6px;line-height:1.3;">' +
              escapeHtml(mod.short_title.replace(/^Módulo \d+:\s*/i, '')) +
            '</h3>' +
            '<p style="font-size:13px;color:var(--cresol-gray-dark);line-height:1.55;">' +
              escapeHtml(modLessons.map(function (l) { return l.code + ' ' + l.title; }).join(' • ')) +
            '</p>' +
          '</div>' +
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:10px;border-top:1px solid var(--cresol-gray-border);">' +
            '<button type="button" class="btn btn-outline" style="padding:7px 14px;font-size:12.5px;" data-welcome-start-lesson="' + firstLessonIdx + '">' +
              ICONS.play + ' <span>Acessar Módulo ' + mod.module_number + '</span>' +
            '</button>' +
            '<button type="button" class="btn btn-ghost" style="padding:7px 12px;font-size:12px;" data-welcome-mod-quiz="' + mIdx + '">' +
              ICONS.award + ' <span>Quiz</span>' +
            '</button>' +
          '</div>' +
        '</div>';
    });

    container.innerHTML =
      '<div class="welcome-hero">' +
        '<div class="welcome-greeting-pill">' +
          ICONS.shield + ' <span>Educação Corporativa • Sistema CRESOL</span>' +
        '</div>' +
        '<h1 class="welcome-hero-title">' +
          'Olá, ' + escapeHtml(learnerName) + '! Seja muito bem-vindo(a) à nossa trilha de Governança de TI, Segurança e Gestão de Acessos.' +
        '</h1>' +
        '<p class="welcome-hero-desc">' +
          'Na CRESOL, a confiança dos nossos cooperados é o nosso maior patrimônio. Preparamos este curso interativo para que você compreenda, de forma leve, prática e conectada ao nosso dia a dia, como protegemos dados, identidades e sistemas em toda a cooperativa.' +
        '</p>' +
        '<div class="welcome-stats-row">' +
          '<div class="welcome-stat-chip"><strong>4</strong> Módulos Temáticos</div>' +
          '<div class="welcome-stat-chip"><strong>21</strong> Videoaulas Curtas</div>' +
          '<div class="welcome-stat-chip"><strong>85%</strong> Conclusão Automática por Vídeo</div>' +
          '<div class="welcome-stat-chip"><strong>63</strong> Flashcards 3D &amp; 21 Cenários</div>' +
          '<div class="welcome-stat-chip"><strong>12</strong> Exercícios de Consolidação Final</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;position:relative;z-index:1;">' +
          '<button type="button" id="btn-welcome-start" class="btn btn-primary" style="padding:12px 24px;font-size:14.5px;">' +
            ICONS.play + ' <span>' + escapeHtml(ctaLabel) + '</span>' +
          '</button>' +
          '<button type="button" id="btn-welcome-glossary" class="btn" style="background:rgba(255,255,255,0.14);color:#fff;border-color:rgba(255,255,255,0.3);">' +
            ICONS.book + ' <span>Explorar Glossário da Trilha</span>' +
          '</button>' +
        '</div>' +
      '</div>' +

      '<h2 class="section-heading" style="margin-bottom:6px;padding-left:4px;">' +
        ICONS.compass + ' <span>Como Funciona Sua Experiência de Aprendizagem</span>' +
      '</h2>' +
      '<p style="font-size:13.8px;color:var(--cresol-gray-medium);margin-bottom:16px;padding-left:4px;">' +
        'Conheça os recursos interativos que preparamos em cada aula para tornar seu estudo dinâmico e aplicável:' +
      '</p>' +

      '<div class="welcome-elements-grid">' +
        '<div class="welcome-element-card">' +
          '<div class="welcome-element-icon">' + ICONS.play + '</div>' +
          '<div class="welcome-element-title">1. Videoaulas com Conclusão Automática</div>' +
          '<p class="welcome-element-desc">Assista às 21 videoaulas no seu ritmo. Ao atingir <strong>85% de visualização</strong> de cada vídeo, a aula é marcada como concluída automaticamente no menu lateral.</p>' +
        '</div>' +
        '<div class="welcome-element-card">' +
          '<div class="welcome-element-icon">' + ICONS.flip + '</div>' +
          '<div class="welcome-element-title">2. Flashcards 3D de Fixação Rápida</div>' +
          '<p class="welcome-element-desc">Abaixo do vídeo, clique nos <strong>cartões 3D interativos</strong> para girá-los e revisar rapidamente os conceitos-chave e siglas de cada aula.</p>' +
        '</div>' +
        '<div class="welcome-element-card">' +
          '<div class="welcome-element-icon">' + ICONS.compass + '</div>' +
          '<div class="welcome-element-title">3. Desafio "O que você faria na CRESOL?"</div>' +
          '<p class="welcome-element-desc">Vivencie situações reais do cotidiano das agências e da TI (Sentinela, Colmeia, VPN, Break-Glass e LGPD) com feedback imediato sobre riscos e boas práticas.</p>' +
        '</div>' +
        '<div class="welcome-element-card">' +
          '<div class="welcome-element-icon">' + ICONS.edit + '</div>' +
          '<div class="welcome-element-title">4. Caderno de Estudos Exportável (.PDF / .TXT)</div>' +
          '<p class="welcome-element-desc">Na guia <strong>Minhas Anotações</strong>, registre seus insights com salvamento automático e exporte um caderno completo para imprimir ou salvar em PDF.</p>' +
        '</div>' +
        '<div class="welcome-element-card">' +
          '<div class="welcome-element-icon">' + ICONS.book + '</div>' +
          '<div class="welcome-element-title">5. Glossário Rápido Sempre à Mão</div>' +
          '<p class="welcome-element-desc">Surgiu dúvida sobre CIDA, IAM, RBAC, PAM ou Zero Trust? Clique no botão <strong>Glossário Rápido</strong> no topo da tela para pesquisar qualquer termo na hora.</p>' +
        '</div>' +
        '<div class="welcome-element-card">' +
          '<div class="welcome-element-icon">' + ICONS.award + '</div>' +
          '<div class="welcome-element-title">6. Quizzes &amp; Avaliação Final de Boas Práticas</div>' +
          '<p class="welcome-element-desc">Pratique nos quizzes de cada módulo e encerre a trilha na <strong>Avaliação Final</strong> focada em boas práticas e correção comentada (sua nota fica apenas arquivada para histórico).</p>' +
        '</div>' +
      '</div>' +

      '<h2 class="section-heading" style="margin-bottom:14px;padding-left:4px;">' +
        ICONS.book + ' <span>Mapa da Sua Jornada (4 Módulos + Avaliação Final)</span>' +
      '</h2>' +
      '<div class="welcome-modules-grid">' +
        modulesCardsHtml +
      '</div>' +

      '<div class="summary-card" style="display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;background:linear-gradient(135deg,#FFF8F1 0%,#FFFFFF 100%);border-color:rgba(245,130,32,0.4);">' +
        '<div style="max-width:680px;">' +
          '<span class="question-num-badge" style="margin-bottom:6px;">Etapa Final da Trilha</span>' +
          '<h3 style="font-size:17.5px;font-weight:800;color:var(--cresol-green-deep);margin-bottom:4px;">Avaliação Final — Consolidação de Boas Práticas (Módulos 1 a 4)</h3>' +
          '<p style="font-size:13.5px;color:var(--cresol-gray-dark);">12 exercícios integradores (8 de múltipla escolha e 4 reflexões abertas) com sugestões de correção e boas práticas recomendadas.</p>' +
        '</div>' +
        '<button type="button" id="btn-welcome-exam" class="btn btn-green">' +
          ICONS.award + ' <span>Visualizar Avaliação Final</span>' +
        '</button>' +
      '</div>';

    var startBtn = document.getElementById('btn-welcome-start');
    if (startBtn) {
      startBtn.onclick = function () { selectLesson(resumeIdx); };
    }
    var glosBtn = document.getElementById('btn-welcome-glossary');
    if (glosBtn) {
      glosBtn.onclick = function () { toggleGlossaryDrawer(true); };
    }
    var examBtn = document.getElementById('btn-welcome-exam');
    if (examBtn) {
      examBtn.onclick = function () { openFinalExamView(); };
    }
    var startLessonBtns = container.querySelectorAll('[data-welcome-start-lesson]');
    startLessonBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-welcome-start-lesson'), 10);
        selectLesson(idx);
      });
    });
    var modQuizBtns = container.querySelectorAll('[data-welcome-mod-quiz]');
    modQuizBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mIdx = parseInt(btn.getAttribute('data-welcome-mod-quiz'), 10);
        openQuizView(mIdx);
      });
    });
  }

  function renderStage(reloadVideo) {
    var container = document.getElementById('main-stage-content');
    if (!container) return;

    if (course.is_full_course && state.currentView === 'welcome') {
      renderWelcomeStage(container);
      return;
    }

    if (course.is_exam_only || state.currentView === 'final_exam') {
      renderFinalExamStage(container);
      return;
    }

    if (state.currentView === 'quiz') {
      renderQuizStage(container);
      return;
    }

    var lesson = course.lessons[state.currentLessonIndex];
    var isDone = !!state.completedLessons[lesson.code];
    var pct = getLessonWatchPct(lesson.code);
    var hasPrev = state.currentLessonIndex > 0;
    var hasNext = state.currentLessonIndex < course.lessons.length - 1;
    var curModIdx = getModuleIndexForLesson(state.currentLessonIndex);
    var curModTitle = (course.is_full_course && course.modules && course.modules[curModIdx])
      ? course.modules[curModIdx].short_title
      : course.short_title;

    var existingIframe = document.getElementById('panda-player-iframe');
    var expectedSrc = lesson.video_player;

    var videoSectionHtml =
      '<div class="stage-top-bar">' +
        '<div>' +
          '<div class="lesson-breadcrumb">' +
            '<span>' + escapeHtml(curModTitle) + '</span>' +
            '<span>•</span>' +
            '<span>Aula ' + escapeHtml(lesson.code) + ' (' + (state.currentLessonIndex + 1) + ' de ' + course.lessons.length + ')</span>' +
            '<span>•</span>' +
            '<span>' + escapeHtml(lesson.duration) + '</span>' +
          '</div>' +
          '<h1 class="stage-lesson-title">' + escapeHtml(lesson.code + ' — ' + lesson.title) + '</h1>' +
        '</div>' +
        '<div id="stage-lesson-pill" class="lesson-status-pill' + (isDone ? ' completed' : '') + '">' +
          (isDone
            ? (ICONS.check + ' <span>Aula Concluída</span>')
            : (ICONS.play + ' <span>Em andamento (' + pct + '%)</span>')) +
        '</div>' +
      '</div>' +

      '<div class="video-card">' +
        '<div class="video-aspect-box" id="video-mount-point">' +
          '<iframe id="panda-player-iframe" src="' + escapeHtml(expectedSrc) + '" ' +
            'allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture" ' +
            'allowfullscreen title="' + escapeHtml(lesson.title) + '"></iframe>' +
        '</div>' +
        '<div class="video-action-bar">' +
          '<div class="video-watch-tracker">' +
            '<div id="auto-progress-box" class="auto-progress-box' + (isDone ? ' is-done' : '') + '">' +
              '<div id="auto-progress-icon" class="auto-progress-icon">' +
                (isDone ? ICONS.check : (pct + '%')) +
              '</div>' +
              '<div class="auto-progress-details">' +
                '<div class="auto-progress-top">' +
                  '<span id="auto-progress-title">' +
                    (isDone ? 'Aula concluída automaticamente' : 'Progresso de visualização do vídeo') +
                  '</span>' +
                  '<span id="auto-progress-pct-label" class="auto-progress-pct-label">' + pct + '%</span>' +
                '</div>' +
                '<div class="auto-progress-track">' +
                  '<div id="auto-progress-fill" class="auto-progress-fill" style="width:' + Math.min(100, pct) + '%;"></div>' +
                '</div>' +
                '<div id="auto-progress-sub" class="auto-progress-sub">' +
                  (isDone
                    ? ('Meta de ' + COMPLETION_THRESHOLD_PCT + '% atingida • Conclusão registrada no módulo')
                    : ('A aula é marcada como concluída automaticamente ao atingir ' + COMPLETION_THRESHOLD_PCT + '% do vídeo')) +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="nav-arrows">' +
            (hasPrev
              ? '<button type="button" id="btn-prev-lesson" class="btn btn-ghost">' + ICONS.arrowLeft + ' <span>Aula Anterior</span></button>'
              : '') +
            (hasNext
              ? '<button type="button" id="btn-next-lesson" class="btn btn-primary"><span>Próxima Aula</span> ' + ICONS.arrowRight + '</button>'
              : (hasFinalExam()
                  ? '<button type="button" id="btn-go-final-exam" class="btn btn-primary">' + ICONS.award + ' <span>Ir para a Prova Final</span></button>'
                  : '<button type="button" id="btn-go-quiz" class="btn btn-primary">' + ICONS.award + ' <span>Ir para o Quiz de Fixação</span></button>')) +
          '</div>' +
        '</div>' +
      '</div>';

    var notesCount = Object.keys(state.notes || {}).filter(function (k) {
      return state.notes[k] && String(state.notes[k]).trim().length > 0;
    }).length;

    var tabsHtml =
      '<div class="content-tabs-nav" role="tablist">' +
        '<button type="button" class="tab-btn' + (activeTab === 'summary' ? ' active' : '') + '" data-tab="summary">' +
          ICONS.book + ' <span>Resumo &amp; Conceitos da Aula</span>' +
        '</button>' +
        '<button type="button" class="tab-btn' + (activeTab === 'notes' ? ' active' : '') + '" data-tab="notes">' +
          ICONS.edit + ' <span>Minhas Anotações</span>' +
          (notesCount > 0 ? '<span class="tab-badge">' + notesCount + '</span>' : '') +
        '</button>' +
        '<button type="button" class="tab-btn" data-tab="quiz">' +
          ICONS.award + ' <span>' + (course.is_full_course ? ('Quiz do Módulo ' + (curModIdx + 1)) : 'Quiz de Fixação do Módulo') + '</span>' +
          '<span class="tab-badge">' + (isQuizPassed(curModIdx) ? 'Aprovado' : '5 questões') + '</span>' +
        '</button>' +
      '</div>' +
      '<div id="lesson-tab-panel">' +
        (activeTab === 'notes' ? getNotesPanelHtml(lesson) : getSummaryPanelHtml(lesson)) +
      '</div>';

    if (!reloadVideo && existingIframe && existingIframe.getAttribute('src') === expectedSrc) {
      var tabNav = container.querySelector('.content-tabs-nav');
      var tabPanel = document.getElementById('lesson-tab-panel');
      if (tabNav && tabPanel) {
        var temp = document.createElement('div');
        temp.innerHTML = tabsHtml;
        tabNav.replaceWith(temp.querySelector('.content-tabs-nav'));
        tabPanel.replaceWith(temp.querySelector('#lesson-tab-panel'));
        bindLessonEvents(lesson);
        return;
      }
    }

    container.innerHTML = videoSectionHtml + tabsHtml;
    bindLessonEvents(lesson);
  }

  function getFlashcardsHtml(lesson) {
    var cards = lesson.flashcards || [];
    if (!cards.length) return '';

    var itemsHtml = '';
    cards.forEach(function (fc, idx) {
      itemsHtml +=
        '<div class="flip-card" tabindex="0" role="button" aria-label="Flashcard ' + (idx + 1) + ': ' + escapeHtml(fc.front_question) + ' (Clique para virar)">' +
          '<div class="flip-card-inner">' +
            '<div class="flip-card-front">' +
              '<span class="flip-tag">' + escapeHtml(fc.front_tag) + '</span>' +
              '<p class="flip-question">' + escapeHtml(fc.front_question) + '</p>' +
              '<div class="flip-hint">' +
                '<span>Clique para revelar</span>' +
                ICONS.flip +
              '</div>' +
            '</div>' +
            '<div class="flip-card-back">' +
              '<span class="flip-tag">' + escapeHtml(fc.front_tag) + '</span>' +
              '<div>' +
                '<div class="flip-answer-title">' + escapeHtml(fc.back_title) + '</div>' +
                '<p class="flip-answer-desc">' + escapeHtml(fc.back_answer) + '</p>' +
              '</div>' +
              '<div class="flip-hint">' +
                '<span>Clique para voltar</span>' +
                ICONS.flip +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
    });

    return (
      '<h2 class="section-heading" style="margin-bottom:6px;padding-left:4px;">' +
        ICONS.flip + ' <span>Flashcards 3D de Fixação Rápida</span>' +
      '</h2>' +
      '<p style="font-size:13.5px;color:var(--cresol-gray-medium);margin-bottom:14px;padding-left:4px;">' +
        'Teste sua memória ativa: clique em cada cartão abaixo para girar e conferir a resposta prática.' +
      '</p>' +
      '<div class="flashcards-grid">' + itemsHtml + '</div>'
    );
  }

  function getScenarioHtml(lesson) {
    var sc = lesson.scenario;
    if (!sc) return '';

    var selectedIdx = (state.scenarioAnswers && typeof state.scenarioAnswers[lesson.code] === 'number')
      ? state.scenarioAnswers[lesson.code]
      : null;
    var hasAnswered = (selectedIdx !== null);
    var isCorrect = (hasAnswered && selectedIdx === sc.correct);
    var letters = ['A', 'B', 'C'];

    var optsHtml = '';
    sc.options.forEach(function (optText, idx) {
      var btnClass = 'option-btn';
      if (hasAnswered) {
        if (isCorrect && idx === sc.correct) {
          btnClass += ' correct-choice';
        } else if (!isCorrect && idx === selectedIdx) {
          btnClass += ' wrong-choice';
        }
      }
      optsHtml +=
        '<button type="button" class="' + btnClass + '" data-scenario-opt="' + idx + '">' +
          '<span class="option-letter">' + letters[idx] + '</span>' +
          '<span>' + escapeHtml(optText) + '</span>' +
        '</button>';
    });

    var feedbackHtml = '';
    if (hasAnswered) {
      var specificFeedback = (sc.feedbacks && sc.feedbacks[selectedIdx])
        ? sc.feedbacks[selectedIdx]
        : (sc.feedback || '');
      feedbackHtml =
        '<div class="feedback-box ' + (isCorrect ? 'correct' : 'wrong') + '">' +
          (isCorrect ? ICONS.check : ICONS.alert) +
          '<div>' +
            '<strong>' + (isCorrect ? 'Decisão Acertada! ' : 'Por que essa escolha traz risco: ') + '</strong>' +
            escapeHtml(specificFeedback) +
          '</div>' +
        '</div>';
    }

    return (
      '<div class="scenario-card' + (isCorrect ? ' solved' : '') + '" id="lesson-scenario-card">' +
        '<div class="scenario-badge">' +
          ICONS.compass + ' <span>Desafio Prático • O que você faria na CRESOL?</span>' +
        '</div>' +
        '<div class="scenario-situation-box">' +
          '<strong>Situação Real:</strong> ' + escapeHtml(sc.situation) +
        '</div>' +
        '<h3 class="scenario-question">' + escapeHtml(sc.question) + '</h3>' +
        '<div class="scenario-options">' + optsHtml + '</div>' +
        feedbackHtml +
      '</div>'
    );
  }

  function getSummaryPanelHtml(lesson) {
    var kpHtml = '';
    (lesson.key_points || []).forEach(function (kp, i) {
      kpHtml +=
        '<div class="keypoint-card">' +
          '<div class="keypoint-num">0' + (i + 1) + '</div>' +
          '<h3 class="keypoint-title">' + escapeHtml(kp.title) + '</h3>' +
          '<p class="keypoint-desc">' + escapeHtml(kp.desc) + '</p>' +
        '</div>';
    });

    var bpHtml = '';
    (lesson.best_practices || []).forEach(function (bp) {
      bpHtml += '<li>' + ICONS.check + ' <span>' + escapeHtml(bp) + '</span></li>';
    });

    return (
      '<div class="summary-card">' +
        '<h2 class="section-heading">' + ICONS.book + ' <span>Síntese Conceitual da Aula ' + escapeHtml(lesson.code) + '</span></h2>' +
        '<p class="summary-lead">' + escapeHtml(lesson.summary) + '</p>' +
      '</div>' +

      getFlashcardsHtml(lesson) +

      getScenarioHtml(lesson) +

      '<h2 class="section-heading" style="margin-bottom:14px;padding-left:4px;">' +
        ICONS.shield + ' <span>Pilares Essenciais da Aula</span>' +
      '</h2>' +
      '<div class="keypoints-grid">' + kpHtml + '</div>' +

      '<div class="cresol-context-banner">' +
        '<div class="cresol-context-tag">Aplicação Prática • Sistema CRESOL</div>' +
        '<h3 style="font-size:18px;font-weight:800;margin-bottom:8px;position:relative;z-index:1;">Como este tema funciona no nosso dia a dia</h3>' +
        '<p class="cresol-context-text">' + escapeHtml(lesson.cresol_context) + '</p>' +
      '</div>' +

      '<div class="summary-card">' +
        '<h2 class="section-heading">' + ICONS.check + ' <span>Boas Práticas Recomendadas</span></h2>' +
        '<ul class="practices-list">' + bpHtml + '</ul>' +
      '</div>'
    );
  }

  function getNotesPanelHtml(lesson) {
    var currentNote = (state.notes && state.notes[lesson.code]) ? state.notes[lesson.code] : '';
    var otherNotesHtml = '';

    course.lessons.forEach(function (l) {
      var txt = (state.notes && state.notes[l.code]) ? String(state.notes[l.code]).trim() : '';
      if (txt) {
        otherNotesHtml +=
          '<div class="saved-note-item">' +
            '<h5>Aula ' + escapeHtml(l.code) + ' — ' + escapeHtml(l.title) + '</h5>' +
            '<p>' + escapeHtml(txt) + '</p>' +
          '</div>';
      }
    });

    return (
      '<div class="notes-container">' +
        '<div class="notes-header-row">' +
          '<div>' +
            '<h2 class="section-heading" style="margin-bottom:4px;">' +
              ICONS.edit + ' <span>Caderno de Anotações — Aula ' + escapeHtml(lesson.code) + '</span>' +
            '</h2>' +
            '<p style="font-size:13.5px;color:var(--cresol-gray-medium);">' +
              'Registre seus insights, dúvidas ou pontos de atenção. Suas anotações ficam salvas automaticamente neste módulo.' +
            '</p>' +
          '</div>' +
          '<span class="notes-autosave-badge" id="notes-save-indicator">' +
            ICONS.check + ' <span>Salvo automaticamente</span>' +
          '</span>' +
        '</div>' +

        '<textarea id="lesson-note-textarea" class="notes-textarea" ' +
          'placeholder="Digite aqui suas anotações sobre a Aula ' + escapeHtml(lesson.code) + ' (' + escapeHtml(lesson.title) + ')...">' +
          escapeHtml(currentNote) +
        '</textarea>' +

        '<div class="notes-actions-row">' +
          '<div style="font-size:12.5px;color:var(--cresol-gray-medium);">' +
            'Você pode exportar todas as suas anotações junto com o resumo oficial:' +
          '</div>' +
          '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
            '<button type="button" id="btn-export-txt" class="btn btn-outline">' +
              ICONS.download + ' <span>Baixar Caderno (.TXT)</span>' +
            '</button>' +
            '<button type="button" id="btn-export-pdf" class="btn btn-green">' +
              ICONS.printer + ' <span>Salvar / Imprimir Caderno (.PDF)</span>' +
            '</button>' +
          '</div>' +
        '</div>' +

        (otherNotesHtml
          ? '<div class="all-notes-preview">' +
              '<h4 style="font-size:13px;text-transform:uppercase;letter-spacing:0.06em;color:var(--cresol-gray-medium);">Todas as anotações registradas</h4>' +
              otherNotesHtml +
            '</div>'
          : '') +
      '</div>'
    );
  }

  function bindLessonEvents(lesson) {
    var prevBtn = document.getElementById('btn-prev-lesson');
    if (prevBtn) {
      prevBtn.onclick = function () { selectLesson(state.currentLessonIndex - 1); };
    }

    var nextBtn = document.getElementById('btn-next-lesson');
    if (nextBtn) {
      nextBtn.onclick = function () {
        selectLesson(state.currentLessonIndex + 1);
      };
    }

    var goQuizBtn = document.getElementById('btn-go-quiz');
    if (goQuizBtn) {
      goQuizBtn.onclick = function () {
        openQuizView(getModuleIndexForLesson(state.currentLessonIndex));
      };
    }

    var goExamBtn = document.getElementById('btn-go-final-exam');
    if (goExamBtn) {
      goExamBtn.onclick = function () { openFinalExamView(); };
    }

    var tabBtns = document.querySelectorAll('.content-tabs-nav [data-tab]');
    tabBtns.forEach(function (btn) {
      btn.onclick = function () {
        var t = btn.getAttribute('data-tab');
        if (t === 'quiz') {
          openQuizView(getModuleIndexForLesson(state.currentLessonIndex));
        } else {
          activeTab = t;
          renderStage(false);
        }
      };
    });

    // Bind 3D Flip Cards
    var flipCards = document.querySelectorAll('.flip-card');
    flipCards.forEach(function (card) {
      card.addEventListener('click', function () {
        card.classList.toggle('flipped');
      });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.classList.toggle('flipped');
        }
      });
    });

    // Bind Scenario Options ("O que você faria na CRESOL?")
    var scenarioBtns = document.querySelectorAll('[data-scenario-opt]');
    scenarioBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var optIdx = parseInt(btn.getAttribute('data-scenario-opt'), 10);
        if (!state.scenarioAnswers) state.scenarioAnswers = {};
        state.scenarioAnswers[lesson.code] = optIdx;
        persistState();

        var scenarioContainer = document.getElementById('lesson-scenario-card');
        if (scenarioContainer) {
          var temp = document.createElement('div');
          temp.innerHTML = getScenarioHtml(lesson);
          scenarioContainer.replaceWith(temp.firstElementChild);
          bindLessonEvents(lesson);
        }
      });
    });

    var noteArea = document.getElementById('lesson-note-textarea');
    if (noteArea) {
      noteArea.addEventListener('input', function () {
        if (!state.notes) state.notes = {};
        state.notes[lesson.code] = noteArea.value;
        var badge = document.getElementById('notes-save-indicator');
        if (badge) badge.innerHTML = '<span>Salvando...</span>';
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(function () {
          persistState();
          if (badge) badge.innerHTML = ICONS.check + ' <span>Salvo automaticamente</span>';
        }, 400);
      });
    }

    var btnTxt = document.getElementById('btn-export-txt');
    if (btnTxt) {
      btnTxt.onclick = exportNotesAsTxt;
    }

    var btnPdf = document.getElementById('btn-export-pdf');
    if (btnPdf) {
      btnPdf.onclick = function () {
        renderPrintNotebook();
        window.print();
      };
    }
  }

  // ==========================================================================
  // VIEW DO QUIZ DE FIXAÇÃO DO MÓDULO
  // ==========================================================================
  function renderQuizStage(container) {
    var activeQuiz = getActiveQuizObject();
    var quizQuestions = activeQuiz.questions;
    var totalQ = quizQuestions.length;
    var answeredCount = 0;
    quizQuestions.forEach(function (q) {
      if (state.quizAnswers && typeof state.quizAnswers[q.id] === 'number') answeredCount++;
    });

    var allLessonsDone = areAllLessonsCompleted();
    var currentQuizScore = course.is_full_course
      ? (state.moduleQuizScores && state.moduleQuizScores[activeQuiz.modIdx])
      : state.quizScore;
    var passed = typeof currentQuizScore === 'number' && currentQuizScore >= 70;

    var resultBannerHtml = '';
    if (typeof currentQuizScore === 'number') {
      var score = Math.round(currentQuizScore);
      var correctCount = Math.round((score / 100) * totalQ);
      var bannerClass = 'quiz-result-banner' + (passed ? '' : ' needs-retry');

      resultBannerHtml =
        '<div class="' + bannerClass + '">' +
          '<div class="score-circle">' + score + '%</div>' +
          '<h2 style="font-size:22px;font-weight:800;color:' + (passed ? 'var(--cresol-green-deep)' : 'var(--cresol-orange-hover)') + ';margin-bottom:8px;">' +
            (passed
              ? 'Parabéns! Você foi aprovado no Quiz de Fixação!'
              : 'Você acertou ' + correctCount + ' de ' + totalQ + ' questões (' + score + '%).') +
          '</h2>' +
          '<p style="font-size:14.5px;color:var(--cresol-gray-dark);max-width:640px;margin:0 auto 20px;">' +
            (passed
              ? ('Você acertou ' + correctCount + ' de ' + totalQ + ' questões (mínimo 70%). ' +
                 (hasFinalExam()
                   ? 'Siga agora para os próximos módulos ou realize a Prova Final Integradora!'
                   : (allLessonsDone
                       ? 'Seu resultado neste módulo já foi registrado com sucesso.'
                       : 'Continue assistindo às videoaulas do módulo até atingir 85% de visualização em cada uma.')))
              : 'Para aprovação é necessário atingir no mínimo 70% de acerto (4 de 5 questões). Revise os comentários abaixo e clique em Refazer Quiz.') +
          '</p>' +
          '<div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;">' +
            '<button type="button" id="btn-retry-quiz" class="btn ' + (passed ? 'btn-outline' : 'btn-primary') + '">' +
              '<span>Refazer Quiz</span>' +
            '</button>' +
            (hasFinalExam() && passed
              ? '<button type="button" id="btn-quiz-to-final-exam" class="btn btn-primary">' +
                  ICONS.award + ' <span>Ir para a Prova Final Integradora</span>' +
                '</button>'
              : '') +
            (!allLessonsDone
              ? '<button type="button" id="btn-back-pending-lessons" class="btn btn-green">' +
                  '<span>Ir para Aulas Pendentes (' + (course.lessons.length - getCompletedLessonsCount()) + ')</span>' +
                '</button>'
              : '') +
          '</div>' +
        '</div>';
    }

    var questionsHtml = '';
    var letters = ['A', 'B', 'C', 'D', 'E'];

    quizQuestions.forEach(function (q, qIdx) {
      var selectedOpt = (state.quizAnswers && typeof state.quizAnswers[q.id] === 'number')
        ? state.quizAnswers[q.id]
        : null;
      var hasAnswered = (selectedOpt !== null);
      var isCorrect = (hasAnswered && selectedOpt === q.correct);

      var cardClass = 'quiz-question-card';
      if (hasAnswered) {
        cardClass += isCorrect ? ' answered-correct' : ' answered-wrong';
      }

      var optsHtml = '';
      q.options.forEach(function (optText, optIdx) {
        var btnClass = 'option-btn';
        if (hasAnswered) {
          if (optIdx === q.correct) {
            btnClass += ' correct-choice';
          } else if (optIdx === selectedOpt && selectedOpt !== q.correct) {
            btnClass += ' wrong-choice';
          }
        } else if (selectedOpt === optIdx) {
          btnClass += ' selected';
        }

        optsHtml +=
          '<button type="button" class="' + btnClass + '" data-qid="' + q.id + '" data-opt="' + optIdx + '">' +
            '<span class="option-letter">' + letters[optIdx] + '</span>' +
            '<span>' + escapeHtml(optText) + '</span>' +
          '</button>';
      });

      var feedbackHtml = '';
      if (hasAnswered) {
        var cleanExplanation = String(q.explanation || '').replace(/^(Correto!|Perfeito!|Exato!|Muito bem!|Parabéns!)\s*/i, '');
        feedbackHtml =
          '<div class="feedback-box ' + (isCorrect ? 'correct' : 'wrong') + '">' +
            (isCorrect ? ICONS.check : ICONS.alert) +
            '<div>' +
              '<strong>' +
                (isCorrect
                  ? 'Resposta Correta! '
                  : ('Resposta Incorreta (a opção correta é a ' + letters[q.correct] + '): ')) +
              '</strong>' +
              escapeHtml(cleanExplanation) +
            '</div>' +
          '</div>';
      }

      questionsHtml +=
        '<div class="' + cardClass + '">' +
          '<div class="question-num-badge">Questão ' + (qIdx + 1) + ' de ' + totalQ + '</div>' +
          '<h3 class="question-title">' + escapeHtml(q.question) + '</h3>' +
          '<div class="options-list">' + optsHtml + '</div>' +
          feedbackHtml +
        '</div>';
    });

    container.innerHTML =
      '<div class="quiz-hero">' +
        '<div class="sidebar-module-tag">Avaliação de Fixação • Sistema CRESOL</div>' +
        '<h1 style="font-size:26px;font-weight:800;margin-bottom:8px;position:relative;z-index:1;">' +
          'Quiz de Fixação — ' + escapeHtml(activeQuiz.shortTitle) +
        '</h1>' +
        '<p style="font-size:15px;color:rgba(255,255,255,0.9);max-width:760px;position:relative;z-index:1;">' +
          'Responda às ' + totalQ + ' questões a seguir com base nas videoaulas deste módulo. Você receberá feedback imediato em cada questão.' +
        '</p>' +
      '</div>' +

      resultBannerHtml +
      questionsHtml +

      '<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:24px;padding:20px 24px;background:var(--cresol-white);border-radius:var(--radius-md);border:1px solid var(--cresol-gray-border);flex-wrap:wrap;">' +
        '<button type="button" id="btn-quiz-back-lesson" class="btn btn-ghost">' +
          ICONS.arrowLeft + ' <span>Voltar para as Videoaulas</span>' +
        '</button>' +
        '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">' +
          '<span style="font-size:13.5px;font-weight:700;color:var(--cresol-gray-dark);">' +
            answeredCount + ' de ' + totalQ + ' questões respondidas' +
          '</span>' +
          '<button type="button" id="btn-submit-quiz" class="btn btn-primary">' +
            ICONS.check + ' <span>Finalizar Quiz do Módulo</span>' +
          '</button>' +
          (hasFinalExam()
            ? '<button type="button" id="btn-bottom-to-exam" class="btn btn-green">' +
                ICONS.award + ' <span>Ir para a Prova Final</span>' +
              '</button>'
            : '') +
        '</div>' +
      '</div>';

    var optBtns = container.querySelectorAll('[data-qid]');
    optBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var qid = btn.getAttribute('data-qid');
        var optIdx = parseInt(btn.getAttribute('data-opt'), 10);
        if (!state.quizAnswers) state.quizAnswers = {};
        state.quizAnswers[qid] = optIdx;

        var allModAnswered = quizQuestions.every(function (q) {
          return typeof state.quizAnswers[q.id] === 'number';
        });
        if (allModAnswered) {
          computeAndSaveQuizScore(activeQuiz, false);
        } else {
          persistState();
        }
        renderQuizStage(container);
        renderSidebar();
      });
    });

    var submitBtn = document.getElementById('btn-submit-quiz');
    if (submitBtn) {
      submitBtn.onclick = function () {
        var allModAnswered = quizQuestions.every(function (q) {
          return state.quizAnswers && typeof state.quizAnswers[q.id] === 'number';
        });
        if (!allModAnswered) {
          showToast('Responda todas as ' + totalQ + ' questões antes de finalizar o Quiz.');
          return;
        }
        computeAndSaveQuizScore(activeQuiz, true);
        renderQuizStage(container);
        renderSidebar();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };
    }

    var retryBtn = document.getElementById('btn-retry-quiz');
    if (retryBtn) {
      retryBtn.onclick = function () {
        quizQuestions.forEach(function (q) {
          if (state.quizAnswers) delete state.quizAnswers[q.id];
        });
        if (course.is_full_course) {
          if (state.moduleQuizScores) delete state.moduleQuizScores[activeQuiz.modIdx];
        } else {
          state.quizSubmitted = false;
          state.quizScore = null;
        }
        persistState();
        renderQuizStage(container);
        renderSidebar();
      };
    }

    var toExamBtn = document.getElementById('btn-quiz-to-final-exam');
    if (toExamBtn) toExamBtn.onclick = openFinalExamView;

    var bottomToExamBtn = document.getElementById('btn-bottom-to-exam');
    if (bottomToExamBtn) bottomToExamBtn.onclick = openFinalExamView;

    var pendingBtn = document.getElementById('btn-back-pending-lessons');
    if (pendingBtn) {
      pendingBtn.onclick = function () {
        var firstPending = 0;
        for (var i = 0; i < course.lessons.length; i++) {
          if (!state.completedLessons[course.lessons[i].code]) {
            firstPending = i;
            break;
          }
        }
        selectLesson(firstPending);
      };
    }

    var backBtn = document.getElementById('btn-quiz-back-lesson');
    if (backBtn) {
      backBtn.onclick = function () {
        selectLesson(state.currentLessonIndex || 0);
      };
    }
  }

  function computeAndSaveQuizScore(activeQuiz, showNotification) {
    var correct = 0;
    var questions = activeQuiz.questions;
    questions.forEach(function (q) {
      if (state.quizAnswers && state.quizAnswers[q.id] === q.correct) {
        correct++;
      }
    });
    var score = Math.round((correct / questions.length) * 100);
    if (course.is_full_course) {
      if (!state.moduleQuizScores) state.moduleQuizScores = {};
      state.moduleQuizScores[activeQuiz.modIdx] = score;
    }
    state.quizScore = score;
    state.quizSubmitted = true;
    persistState();

    if (showNotification) {
      if (score >= 70) {
        showToast('Aprovado no Quiz (' + score + '%)!');
      } else {
        showToast('Nota obtida: ' + score + '%. Revise o feedback e tente novamente para atingir 70%.');
      }
    }
  }

  // ==========================================================================
  // VIEW DA AVALIAÇÃO FINAL (12 EXERCÍCIOS: 8 OBJETIVAS A-E + 4 ABERTAS DE BOAS PRÁTICAS)
  // ==========================================================================
  function computeFinalExamScore(showNotification) {
    if (!hasFinalExam()) return 0;
    var questions = course.final_exam.questions;
    var totalPoints = 0;

    questions.forEach(function (q) {
      if (q.type === 'multiple_choice') {
        if (state.examAnswers && state.examAnswers[q.id] === q.correct) {
          totalPoints += 1;
        }
      } else if (q.type === 'essay') {
        var txt = (state.examEssays && state.examEssays[q.id]) ? String(state.examEssays[q.id]).trim() : '';
        if (txt.length >= 20) {
          var rub = evaluateEssayRubric(q, txt);
          if (rub.matchedCount >= 2 || txt.length >= 120) {
            totalPoints += 1;
          } else {
            totalPoints += 0.7 + (0.08 * rub.matchedCount);
          }
          if (!state.examEssayValidated) state.examEssayValidated = {};
          state.examEssayValidated[q.id] = true;
        }
      }
    });

    var score = Math.round((totalPoints / questions.length) * 100);
    state.examScore = score;
    state.examSubmitted = true;
    persistState();

    if (showNotification) {
      showToast('Atividade concluída! Sua nota (' + score + '%) foi arquivada no histórico do curso.');
    }
    return score;
  }

  function renderEssayCardBodyHtml(q) {
    var essayTxt = (state.examEssays && state.examEssays[q.id]) ? state.examEssays[q.id] : '';
    var isValidated = !!(state.examEssayValidated && state.examEssayValidated[q.id]) || !!state.examSubmitted;
    var rubricEval = evaluateEssayRubric(q, essayTxt);
    var charCount = String(essayTxt || '').trim().length;

    var pillarsHtml = '';
    rubricEval.details.forEach(function (p) {
      var isCov = p.covered || (isValidated && charCount >= 160);
      pillarsHtml +=
        '<div class="rubric-pillar-item' + (isCov ? ' covered' : '') + '">' +
          '<span class="rubric-pillar-check">' + (isCov ? '✓' : '•') + '</span>' +
          '<div>' +
            '<div style="font-weight:800;margin-bottom:2px;">' + escapeHtml(p.label) + '</div>' +
            '<div style="font-size:11.8px;opacity:0.9;">' + escapeHtml(p.desc) + '</div>' +
          '</div>' +
        '</div>';
    });

    var idealHtml = '';
    if (isValidated && q.ideal_answer) {
      var ptsHtml = '';
      (q.ideal_answer.points || []).forEach(function (pt) {
        ptsHtml += '<li>' + ICONS.check + ' <span>' + escapeHtml(pt) + '</span></li>';
      });
      idealHtml =
        '<div class="ideal-answer-box">' +
          '<div class="ideal-answer-badge">' + ICONS.shield + ' <span>Sugestão de Correção • Boas Práticas Recomendadas</span></div>' +
          '<div class="ideal-answer-intro">' + escapeHtml(q.ideal_answer.intro) + '</div>' +
          '<div style="font-size:12.5px;font-weight:800;color:var(--cresol-green-deep);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em;">' +
            escapeHtml(q.ideal_answer.points_title) +
          '</div>' +
          '<ul class="ideal-answer-list">' + ptsHtml + '</ul>' +
        '</div>';
    }

    return (
      '<textarea class="essay-textarea" data-essay-id="' + q.id + '" placeholder="' + escapeHtml(q.placeholder || 'Digite sua reflexão sobre o cenário proposto...') + '">' +
        escapeHtml(essayTxt) +
      '</textarea>' +

      '<div class="rubric-pillars-box" id="rubric-box-' + q.id + '">' +
        '<div class="rubric-pillars-title">' +
          '<span>Pontos de Boas Práticas para Abordar na Resposta</span>' +
          '<span id="rubric-count-' + q.id + '" style="color:var(--cresol-orange);">' +
            (isValidated && charCount >= 160 ? 4 : rubricEval.matchedCount) + ' de ' + rubricEval.totalCriteria + ' pontos abordados no texto' +
          '</span>' +
        '</div>' +
        '<div class="rubric-grid" id="rubric-grid-' + q.id + '">' + pillarsHtml + '</div>' +
      '</div>' +

      '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">' +
        '<span id="essay-status-' + q.id + '" style="font-size:12px;color:var(--cresol-gray-medium);font-weight:600;">' +
          (charCount > 0 ? (charCount + ' caracteres redigidos • Salvo automaticamente') : 'Escreva sua reflexão acima e clique ao lado para conferir a sugestão de correção e boas práticas.') +
        '</span>' +
        '<button type="button" class="btn ' + (isValidated ? 'btn-outline' : 'btn-green') + '" data-validate-essay="' + q.id + '">' +
          ICONS.check + ' <span>' + (isValidated ? 'Atualizar Resposta &amp; Ver Correção' : 'Conferir Correção &amp; Boas Práticas') + '</span>' +
        '</button>' +
      '</div>' +
      idealHtml
    );
  }

  function renderFinalExamStage(container) {
    if (!hasFinalExam()) return;
    var exam = course.final_exam;
    var questions = exam.questions;
    var totalQ = questions.length;
    var ansCount = getExamAnsweredCount();

    var resultBannerHtml = '';
    if (state.examSubmitted && typeof state.examScore === 'number') {
      var score = Math.round(state.examScore);

      resultBannerHtml =
        '<div class="quiz-result-banner">' +
          '<div class="score-circle">' + score + '%</div>' +
          '<h2 style="font-size:22px;font-weight:800;color:var(--cresol-green-deep);margin-bottom:8px;">' +
            'Atividade Final Concluída! Obrigado pela sua participação!' +
          '</h2>' +
          '<p style="font-size:14.5px;color:var(--cresol-gray-dark);max-width:700px;margin:0 auto 20px;">' +
            'Sua participação e sua nota (' + score + '%) foram arquivadas apenas como registro de conclusão do treinamento. O foco desta etapa é consolidar as boas práticas de Governança e Segurança no nosso dia a dia — aproveite para revisar os comentários e sugestões de correção abaixo sempre que quiser!' +
          '</p>' +
          '<div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;">' +
            '<button type="button" id="btn-print-exam-pdf" class="btn btn-green">' +
              ICONS.printer + ' <span>Salvar / Imprimir Atividade e Boas Práticas (.PDF)</span>' +
            '</button>' +
            '<button type="button" id="btn-export-exam-txt" class="btn btn-outline">' +
              ICONS.download + ' <span>Baixar Respostas (.TXT)</span>' +
            '</button>' +
            '<button type="button" id="btn-retry-exam" class="btn btn-ghost">' +
              '<span>Refazer Exercícios</span>' +
            '</button>' +
          '</div>' +
        '</div>';
    }

    var questionsHtml = '';
    var letters = ['A', 'B', 'C', 'D', 'E'];
    var lastModuleRef = '';
    var modCounter = 0;

    questions.forEach(function (q, qIdx) {
      if (q.module_ref !== lastModuleRef) {
        lastModuleRef = q.module_ref;
        modCounter++;
        questionsHtml +=
          '<div class="exam-module-divider" id="exam-mod-section-' + modCounter + '">' +
            '<h2>' + escapeHtml(q.module_ref) + '</h2>' +
            '<span>2 Múltipla Escolha + 1 Reflexão Prática</span>' +
          '</div>';
      }

      if (q.type === 'multiple_choice') {
        var selectedOpt = (state.examAnswers && typeof state.examAnswers[q.id] === 'number')
          ? state.examAnswers[q.id]
          : null;
        var hasAnswered = (selectedOpt !== null);
        var isCorrect = (hasAnswered && selectedOpt === q.correct);

        var cardClass = 'quiz-question-card';
        if (hasAnswered) {
          cardClass += isCorrect ? ' answered-correct' : ' answered-wrong';
        }

        var optsHtml = '';
        q.options.forEach(function (optText, optIdx) {
          var btnClass = 'option-btn';
          if (hasAnswered) {
            if (optIdx === q.correct) {
              btnClass += ' correct-choice';
            } else if (optIdx === selectedOpt && selectedOpt !== q.correct) {
              btnClass += ' wrong-choice';
            }
          }
          optsHtml +=
            '<button type="button" class="' + btnClass + '" data-exam-qid="' + q.id + '" data-exam-opt="' + optIdx + '">' +
              '<span class="option-letter">' + letters[optIdx] + '</span>' +
              '<span>' + escapeHtml(optText) + '</span>' +
            '</button>';
        });

        var feedbackHtml = '';
        if (hasAnswered) {
          feedbackHtml =
            '<div class="feedback-box ' + (isCorrect ? 'correct' : 'wrong') + '">' +
              (isCorrect ? ICONS.check : ICONS.alert) +
              '<div>' +
                '<strong>' +
                  (isCorrect
                    ? 'Muito bem! Resposta Correta (' + letters[q.correct] + '): '
                    : ('Ponto de Atenção (a melhor prática é a opção ' + letters[q.correct] + '): ')) +
                '</strong>' +
                escapeHtml(q.explanation) +
              '</div>' +
            '</div>';
        }

        questionsHtml +=
          '<div class="' + cardClass + '" id="exam-card-' + q.id + '">' +
            '<div style="margin-bottom:12px;">' +
              '<span class="question-num-badge" style="margin-bottom:0;">' + escapeHtml(q.code) + ' • Questão ' + (qIdx + 1) + ' de ' + totalQ + '</span>' +
              '<span class="question-type-tag">Múltipla Escolha (A–E)</span>' +
            '</div>' +
            '<h3 class="question-title" style="white-space:pre-line;">' + escapeHtml(q.question) + '</h3>' +
            '<div class="options-list">' + optsHtml + '</div>' +
            feedbackHtml +
          '</div>';
      } else {
        // Questão Aberta de Reflexão e Boas Práticas (Essay)
        var isVal = !!(state.examEssayValidated && state.examEssayValidated[q.id]) || !!state.examSubmitted;
        var essayCardClass = 'quiz-question-card' + (isVal ? ' answered-correct' : '');

        questionsHtml +=
          '<div class="' + essayCardClass + '" id="exam-card-' + q.id + '">' +
            '<div style="margin-bottom:12px;">' +
              '<span class="question-num-badge" style="margin-bottom:0;">' + escapeHtml(q.code) + ' • Questão ' + (qIdx + 1) + ' de ' + totalQ + '</span>' +
              '<span class="question-type-tag essay-tag">Questão Aberta • Reflexão e Boas Práticas</span>' +
            '</div>' +
            '<h3 class="question-title" style="white-space:pre-line;">' + escapeHtml(q.question) + '</h3>' +
            '<div id="essay-body-' + q.id + '">' +
              renderEssayCardBodyHtml(q) +
            '</div>' +
          '</div>';
      }
    });

    container.innerHTML =
      '<div class="quiz-hero">' +
        '<div class="sidebar-module-tag">Consolidação de Aprendizado • Sistema CRESOL</div>' +
        '<h1 style="font-size:26px;font-weight:800;margin-bottom:8px;position:relative;z-index:1;">' +
          escapeHtml(exam.title) +
        '</h1>' +
        '<p style="font-size:15px;color:rgba(255,255,255,0.92);max-width:840px;position:relative;z-index:1;">' +
          escapeHtml(exam.subtitle) + ' Nas questões abertas, escreva sua reflexão e clique em "Conferir Correção & Boas Práticas" para ver os comentários e recomendações de cada caso.' +
        '</p>' +
      '</div>' +

      resultBannerHtml +
      questionsHtml +

      '<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:24px;padding:20px 24px;background:var(--cresol-white);border-radius:var(--radius-md);border:1px solid var(--cresol-gray-border);flex-wrap:wrap;">' +
        (!course.is_exam_only
          ? '<button type="button" id="btn-exam-back-lesson" class="btn btn-ghost">' +
              ICONS.arrowLeft + ' <span>Voltar para as Videoaulas</span>' +
            '</button>'
          : '<div></div>') +
        '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">' +
          '<span id="exam-footer-counter" style="font-size:13.5px;font-weight:700;color:var(--cresol-gray-dark);">' +
            ansCount + ' de ' + totalQ + ' exercícios respondidos' +
          '</span>' +
          '<button type="button" id="btn-submit-final-exam" class="btn btn-primary">' +
            ICONS.check + ' <span>Concluir Atividade Final</span>' +
          '</button>' +
        '</div>' +
      '</div>';

    bindFinalExamEvents(container);
  }

  function bindFinalExamEvents(container) {
    var mcBtns = container.querySelectorAll('[data-exam-qid]');
    mcBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var qid = btn.getAttribute('data-exam-qid');
        var optIdx = parseInt(btn.getAttribute('data-exam-opt'), 10);
        if (!state.examAnswers) state.examAnswers = {};
        state.examAnswers[qid] = optIdx;
        persistState();
        renderFinalExamStage(container);
        renderSidebar();
      });
    });

    var essayAreas = container.querySelectorAll('[data-essay-id]');
    essayAreas.forEach(function (area) {
      area.addEventListener('input', function () {
        var qid = area.getAttribute('data-essay-id');
        if (!state.examEssays) state.examEssays = {};
        state.examEssays[qid] = area.value;

        var qObj = null;
        course.final_exam.questions.forEach(function (item) {
          if (item.id === qid) qObj = item;
        });

        if (qObj) {
          var rub = evaluateEssayRubric(qObj, area.value);
          var countEl = document.getElementById('rubric-count-' + qid);
          if (countEl) {
            countEl.textContent = rub.matchedCount + ' de ' + rub.totalCriteria + ' pontos abordados no texto';
          }
          var gridEl = document.getElementById('rubric-grid-' + qid);
          if (gridEl) {
            var pHtml = '';
            rub.details.forEach(function (p) {
              pHtml +=
                '<div class="rubric-pillar-item' + (p.covered ? ' covered' : '') + '">' +
                  '<span class="rubric-pillar-check">' + (p.covered ? '✓' : '•') + '</span>' +
                  '<div>' +
                    '<div style="font-weight:800;margin-bottom:2px;">' + escapeHtml(p.label) + '</div>' +
                    '<div style="font-size:11.8px;opacity:0.9;">' + escapeHtml(p.desc) + '</div>' +
                  '</div>' +
                '</div>';
            });
            gridEl.innerHTML = pHtml;
          }
          var statusEl = document.getElementById('essay-status-' + qid);
          var len = String(area.value || '').trim().length;
          if (statusEl) {
            statusEl.textContent = len + ' caracteres redigidos • Salvando automaticamente...';
          }
        }

        clearTimeout(essaySaveTimeout);
        essaySaveTimeout = setTimeout(function () {
          persistState();
          var statusEl2 = document.getElementById('essay-status-' + qid);
          var len2 = String(area.value || '').trim().length;
          if (statusEl2 && len2 > 0) {
            statusEl2.textContent = len2 + ' caracteres redigidos • Salvo automaticamente';
          }
          var footerCounter = document.getElementById('exam-footer-counter');
          if (footerCounter) {
            footerCounter.textContent = getExamAnsweredCount() + ' de ' + course.final_exam.questions.length + ' exercícios respondidos';
          }
          renderSidebar();
        }, 450);
      });
    });

    var validateBtns = container.querySelectorAll('[data-validate-essay]');
    validateBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var qid = btn.getAttribute('data-validate-essay');
        var txt = (state.examEssays && state.examEssays[qid]) ? String(state.examEssays[qid]).trim() : '';
        if (txt.length < 20) {
          showToast('Escreva uma breve resposta antes de conferir a sugestão de correção e boas práticas.');
          return;
        }
        if (!state.examEssayValidated) state.examEssayValidated = {};
        state.examEssayValidated[qid] = true;
        persistState();

        var qObj = null;
        course.final_exam.questions.forEach(function (item) {
          if (item.id === qid) qObj = item;
        });
        if (qObj) {
          var bodyEl = document.getElementById('essay-body-' + qid);
          var cardEl = document.getElementById('exam-card-' + qid);
          if (bodyEl) bodyEl.innerHTML = renderEssayCardBodyHtml(qObj);
          if (cardEl) cardEl.classList.add('answered-correct');
          bindFinalExamEvents(container);
          renderSidebar();
          showToast('Confira abaixo a sugestão de correção e boas práticas recomendadas!');
        }
      });
    });

    var submitExamBtn = document.getElementById('btn-submit-final-exam');
    if (submitExamBtn) {
      submitExamBtn.onclick = function () {
        var ans = getExamAnsweredCount();
        var total = course.final_exam.questions.length;
        if (ans < total) {
          showToast('Você respondeu ' + ans + ' de ' + total + ' exercícios. Complete os restantes para concluir e arquivar.');
          return;
        }
        computeFinalExamScore(true);
        renderFinalExamStage(container);
        renderSidebar();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };
    }

    var retryExamBtn = document.getElementById('btn-retry-exam');
    if (retryExamBtn) {
      retryExamBtn.onclick = function () {
        state.examAnswers = {};
        state.examEssayValidated = {};
        state.examSubmitted = false;
        state.examScore = null;
        persistState();
        renderFinalExamStage(container);
        renderSidebar();
      };
    }

    var printExamBtn = document.getElementById('btn-print-exam-pdf');
    if (printExamBtn) {
      printExamBtn.onclick = function () {
        renderPrintNotebook();
        window.print();
      };
    }

    var txtExamBtn = document.getElementById('btn-export-exam-txt');
    if (txtExamBtn) {
      txtExamBtn.onclick = exportNotesAsTxt;
    }

    var backLessonBtn = document.getElementById('btn-exam-back-lesson');
    if (backLessonBtn) {
      backLessonBtn.onclick = function () {
        selectLesson(state.currentLessonIndex || 0);
      };
    }
  }

  // ==========================================================================
  // GLOSSÁRIO RÁPIDO INTERATIVO E EXPORTAÇÃO (.TXT / .PDF)
  // ==========================================================================
  function renderGlossaryList(filterQuery) {
    var listEl = document.getElementById('glossary-items-list');
    if (!listEl) return;
    var terms = course.glossary || [];
    var q = String(filterQuery || '').trim().toLowerCase();

    var filtered = terms.filter(function (item) {
      if (!q) return true;
      return (
        item.term.toLowerCase().indexOf(q) !== -1 ||
        item.category.toLowerCase().indexOf(q) !== -1 ||
        item.desc.toLowerCase().indexOf(q) !== -1
      );
    });

    if (!filtered.length) {
      listEl.innerHTML = '<p style="text-align:center;color:var(--cresol-gray-medium);padding:24px 0;font-size:13.5px;">Nenhum termo encontrado para "' + escapeHtml(filterQuery) + '".</p>';
      return;
    }

    var html = '';
    filtered.forEach(function (item) {
      html +=
        '<div class="glossary-item">' +
          '<div class="glossary-item-top">' +
            '<span class="glossary-term-name">' + escapeHtml(item.term) + '</span>' +
            '<span class="glossary-term-cat">' + escapeHtml(item.category) + '</span>' +
          '</div>' +
          '<p class="glossary-term-desc">' + escapeHtml(item.desc) + '</p>' +
        '</div>';
    });
    listEl.innerHTML = html;
  }

  function toggleGlossaryDrawer(open) {
    var drawer = document.getElementById('glossary-drawer');
    var backdrop = document.getElementById('glossary-backdrop');
    var input = document.getElementById('glossary-search-input');
    if (!drawer || !backdrop) return;
    if (open) {
      drawer.classList.add('open');
      backdrop.classList.add('open');
      renderGlossaryList(input ? input.value : '');
      if (input) setTimeout(function () { input.focus(); }, 150);
    } else {
      drawer.classList.remove('open');
      backdrop.classList.remove('open');
    }
  }

  function exportNotesAsTxt() {
    var lines = [];
    lines.push('======================================================================');
    lines.push('SISTEMA CRESOL — CADERNO DE ESTUDOS E PROVA FINAL');
    lines.push('Trilha: Governança de TI, Segurança e Gestão de Acessos');
    lines.push(course.title);
    lines.push('Data de Exportação: ' + new Date().toLocaleDateString('pt-BR'));
    lines.push('======================================================================');
    lines.push('');

    (course.lessons || []).forEach(function (l) {
      var done = state.completedLessons[l.code] ? '[CONCLUÍDA]' : '[PENDENTE]';
      lines.push('----------------------------------------------------------------------');
      lines.push('AULA ' + l.code + ' — ' + l.title + ' (' + l.duration + ') ' + done);
      lines.push('----------------------------------------------------------------------');
      lines.push('Resumo: ' + l.summary);
      lines.push('');
      var userNote = (state.notes && state.notes[l.code]) ? String(state.notes[l.code]).trim() : '';
      lines.push('Minhas Anotações da Aula ' + l.code + ':');
      lines.push(userNote ? ('  ' + userNote.replace(/\n/g, '\n  ')) : '  (Nenhuma anotação registrada nesta aula)');
      lines.push('');
    });

    if (hasFinalExam()) {
      var letters = ['A', 'B', 'C', 'D', 'E'];
      lines.push('======================================================================');
      lines.push('AVALIAÇÃO FINAL — RESPOSTAS E BOAS PRÁTICAS RECOMENDADAS');
      if (typeof state.examScore === 'number') {
        lines.push('Nota Arquivada: ' + Math.round(state.examScore) + '%');
      }
      lines.push('======================================================================');
      lines.push('');
      course.final_exam.questions.forEach(function (q) {
        lines.push(q.code + ' (' + q.module_ref + ')');
        lines.push('Enunciado: ' + q.question);
        if (q.type === 'multiple_choice') {
          var sel = (state.examAnswers && typeof state.examAnswers[q.id] === 'number') ? state.examAnswers[q.id] : null;
          lines.push('Sua Resposta: ' + (sel !== null ? (letters[sel] + ') ' + q.options[sel]) : '(Não respondida)'));
          lines.push('Gabarito Recomendado: ' + letters[q.correct] + ') ' + q.options[q.correct]);
          lines.push('Comentário: ' + q.explanation);
        } else {
          var essayTxt = (state.examEssays && state.examEssays[q.id]) ? String(state.examEssays[q.id]).trim() : '';
          lines.push('Sua Reflexão:');
          lines.push(essayTxt ? ('  ' + essayTxt.replace(/\n/g, '\n  ')) : '  (Não respondida)');
          if (q.ideal_answer) {
            lines.push('Sugestão de Correção e Boas Práticas:');
            lines.push('  ' + q.ideal_answer.intro.replace(/\n/g, '\n  '));
            (q.ideal_answer.points || []).forEach(function (pt) {
              lines.push('  • ' + pt);
            });
          }
        }
        lines.push('----------------------------------------------------------------------');
      });
    }

    var blob = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = course.slug + '_Caderno_e_Prova_Final.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Arquivo .TXT baixado com sucesso!');
  }

  function renderPrintNotebook() {
    var printEl = document.getElementById('print-notebook-container');
    if (!printEl) return;

    var html =
      '<div class="print-header">' +
        '<div>' +
          '<img src="assets/cresol-logo.svg" alt="CRESOL" style="height:32px;margin-bottom:6px;">' +
          '<div style="font-size:11px;color:#727176;text-transform:uppercase;letter-spacing:0.12em;">Governança de TI, Segurança e Gestão de Acessos</div>' +
        '</div>' +
        '<div style="text-align:right;font-size:12px;color:#4D4D4F;">' +
          '<strong>' + escapeHtml(course.short_title) + '</strong><br>' +
          'Exportado em ' + new Date().toLocaleDateString('pt-BR') +
        '</div>' +
      '</div>' +
      '<h1 style="font-size:20px;color:#005C46;margin-bottom:8px;">' + escapeHtml(course.title) + '</h1>' +
      '<p style="font-size:13px;color:#4D4D4F;margin-bottom:20px;">' + escapeHtml(course.overview || '') + '</p>';

    (course.lessons || []).forEach(function (l) {
      var noteTxt = (state.notes && state.notes[l.code]) ? String(state.notes[l.code]).trim() : '';
      html +=
        '<div class="print-lesson-block">' +
          '<h3>Aula ' + escapeHtml(l.code) + ' — ' + escapeHtml(l.title) + ' (' + escapeHtml(l.duration) + ')</h3>' +
          '<p style="font-size:12.5px;color:#181D1B;margin-bottom:6px;">' + escapeHtml(l.summary) + '</p>' +
          '<p style="font-size:12px;color:#005C46;"><strong>Sistema CRESOL:</strong> ' + escapeHtml(l.cresol_context) + '</p>' +
          '<div class="print-note-box">' +
            '<strong>Minhas Anotações:</strong>\n' +
            (noteTxt ? escapeHtml(noteTxt) : 'Sem anotações registradas nesta aula.') +
          '</div>' +
        '</div>';
    });

    if (hasFinalExam()) {
      var letters = ['A', 'B', 'C', 'D', 'E'];
      html +=
        '<h2 style="font-size:18px;color:#005C46;margin:28px 0 14px;border-bottom:2px solid #F58220;padding-bottom:6px;">' +
          'Prova Final Integradora — Registro de Respostas' +
          (typeof state.examScore === 'number' ? (' (Nota: ' + Math.round(state.examScore) + '%)') : '') +
        '</h2>';

      course.final_exam.questions.forEach(function (q) {
        if (q.type === 'multiple_choice') {
          var sel = (state.examAnswers && typeof state.examAnswers[q.id] === 'number') ? state.examAnswers[q.id] : null;
          html +=
            '<div class="print-lesson-block">' +
              '<h3>' + escapeHtml(q.code + ' — ' + q.module_ref) + ' (Múltipla Escolha)</h3>' +
              '<p style="font-size:12.5px;margin-bottom:6px;white-space:pre-line;">' + escapeHtml(q.question) + '</p>' +
              '<p style="font-size:12px;"><strong>Sua Resposta:</strong> ' +
                (sel !== null ? escapeHtml(letters[sel] + ') ' + q.options[sel]) : 'Não respondida') +
              '</p>' +
              '<p style="font-size:12px;color:#005C46;"><strong>Gabarito Oficial:</strong> ' +
                escapeHtml(letters[q.correct] + ') ' + q.options[q.correct]) +
              '</p>' +
            '</div>';
        } else {
          var essayTxt = (state.examEssays && state.examEssays[q.id]) ? String(state.examEssays[q.id]).trim() : '';
          html +=
            '<div class="print-lesson-block">' +
              '<h3>' + escapeHtml(q.code + ' — ' + q.module_ref) + ' (Dissertativa)</h3>' +
              '<p style="font-size:12.5px;margin-bottom:6px;white-space:pre-line;">' + escapeHtml(q.question) + '</p>' +
              '<div class="print-note-box">' +
                '<strong>Sua Resposta Dissertativa:</strong>\n' +
                (essayTxt ? escapeHtml(essayTxt) : 'Não respondida.') +
              '</div>' +
            '</div>';
        }
      });
    }

    printEl.innerHTML = html;
  }

  function handleVideoProgressUpdate(lesson, currentTime, duration) {
    if (!lesson || !(duration > 0) || currentTime < 0) return;
    var pct = Math.min(100, Math.max(0, Math.round((currentTime / duration) * 100)));
    if (!state.videoProgress) state.videoProgress = {};
    var prevPct = state.videoProgress[lesson.code] || 0;

    if (pct > prevPct) {
      state.videoProgress[lesson.code] = pct;
      var now = Date.now();
      if (now - progressSaveTime > 4000) {
        progressSaveTime = now;
        persistState();
      }
    }

    if (pct >= COMPLETION_THRESHOLD_PCT && !state.completedLessons[lesson.code]) {
      markLessonCompletedAutomatically(lesson);
    } else {
      updateLessonActionUI();
    }
  }

  // Listener oficial da API de Player do Panda Video (postMessage: panda_allData, panda_timeupdate e panda_ended)
  window.addEventListener('message', function (event) {
    if (!event || !event.data) return;
    var data = event.data;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch (e) { return; }
    }
    if (!data || !data.message) return;

    if (!course.lessons || !course.lessons.length) return;
    var currentLesson = course.lessons[state.currentLessonIndex];
    if (!currentLesson || state.currentView !== 'lesson') return;

    if (data.video && currentLesson.external_id && data.video !== currentLesson.external_id) {
      return;
    }

    if (data.message === 'panda_allData' && data.playerData) {
      var pd = data.playerData;
      if (pd.duration && pd.duration > 0) {
        liveDurations[currentLesson.code] = parseFloat(pd.duration);
      }
      if (!pd.paused && typeof pd.currentTime === 'number') {
        var durAll = liveDurations[currentLesson.code] || currentLesson.length_sec || 0;
        handleVideoProgressUpdate(currentLesson, parseFloat(pd.currentTime), durAll);
      }
    } else if (data.message === 'panda_timeupdate') {
      if (data.isMutedIndicator) return;
      var ct = parseFloat(data.currentTime || 0);
      var dur = parseFloat(data.duration || liveDurations[currentLesson.code] || currentLesson.length_sec || 0);
      handleVideoProgressUpdate(currentLesson, ct, dur);
    } else if (data.message === 'panda_ended') {
      if (!state.videoProgress) state.videoProgress = {};
      state.videoProgress[currentLesson.code] = 100;
      markLessonCompletedAutomatically(currentLesson);
      updateLessonActionUI();
    }
  });

  window.onScormStatusUpdate = function (info) {
    var badge = document.getElementById('lms-status-badge');
    if (!badge) return;
    if (info.connected) {
      badge.className = 'lms-badge connected';
      badge.innerHTML = '<span class="dot"></span> <span>LMS Conectado (SCORM 1.2)</span>';
    } else {
      badge.className = 'lms-badge';
      badge.innerHTML = '<span class="dot"></span> <span>Modo Local • Progresso Salvo</span>';
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    window.ScormManager.init();
    state = window.ScormManager.loadState();

    var mobileBtn = document.getElementById('mobile-menu-toggle');
    if (mobileBtn) {
      mobileBtn.addEventListener('click', function () {
        var sb = document.getElementById('course-sidebar');
        if (sb) sb.classList.toggle('open');
      });
    }

    var openGlossaryBtn = document.getElementById('btn-open-glossary');
    if (openGlossaryBtn) {
      openGlossaryBtn.addEventListener('click', function () {
        toggleGlossaryDrawer(true);
      });
    }
    var closeGlossaryBtn = document.getElementById('btn-close-glossary');
    if (closeGlossaryBtn) {
      closeGlossaryBtn.addEventListener('click', function () {
        toggleGlossaryDrawer(false);
      });
    }
    var glossaryBackdrop = document.getElementById('glossary-backdrop');
    if (glossaryBackdrop) {
      glossaryBackdrop.addEventListener('click', function () {
        toggleGlossaryDrawer(false);
      });
    }
    var glossarySearch = document.getElementById('glossary-search-input');
    if (glossarySearch) {
      glossarySearch.addEventListener('input', function () {
        renderGlossaryList(glossarySearch.value);
      });
    }

    renderSidebar();
    renderStage(true);
    renderPrintNotebook();
  });
})();
