/**
 * Gerenciador de Estado Local (Versão Web de Validação - Sem comunicação com LMS)
 * Sistema Cresol - Governança de TI, Segurança e Gestão de Acessos
 */
(function (window) {
  'use strict';

  var ScormManager = {
    isConnected: false,
    storageKey: 'CRESOL_WEB_VALIDATION_STATE_V1',

    init: function () {
      return false;
    },

    loadState: function () {
      var defaultState = {
        completedLessons: {},
        videoProgress: {},
        scenarioAnswers: {},
        currentView: 'welcome',
        currentLessonIndex: 0,
        activeQuizModuleIdx: null,
        quizAnswers: {},
        quizSubmitted: false,
        quizScore: null,
        moduleQuizScores: {},
        examAnswers: {},
        examEssays: {},
        examEssayValidated: {},
        examSubmitted: false,
        examScore: null,
        collapsedModules: {},
        notes: {}
      };

      try {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var parsed = JSON.parse(raw);
          return Object.assign({}, defaultState, parsed);
        }
      } catch (e) {}

      return defaultState;
    },

    saveState: function (state) {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(state));
      } catch (e) {}
    },

    finish: function () {},

    getLearnerName: function () {
      return 'Colaborador(a) Cresol';
    },

    notifyStatus: function () {}
  };

  window.ScormManager = ScormManager;
})(window);
