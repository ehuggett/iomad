YUI.add('moodle-mod_quiz-quizquestionbank', function (Y, NAME) {

// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.


/**
 * Add questions from question bank functionality for a popup in quiz editing page.
 *
 * @package   mod_quiz
 * @copyright 2014 The Open University
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */


var CSS = {
        QBANKLOADING: 'div.questionbankloading',
        ADDQUESTIONLINKS: 'ul.menu a.questionbank',
        ADDTOQUIZCONTAINER: 'td.addtoquizaction'
};

var PARAMS = {
    PAGE: 'addonpage',
    HEADER: 'header'
};

var POPUP = function() {
    POPUP.superclass.constructor.apply(this, arguments);
};

Y.extend(POPUP, Y.Base, {
    loadingDiv: '',
    dialogue: null,
    addonpage: 0,

    create_dialogue: function() {
        // Create a dialogue on the page and hide it.
        config = {
            headerContent : '',
            bodyContent : Y.one(CSS.QBANKLOADING),
            draggable : true,
            modal : true,
            centered: true,
            width: null,
            visible: false,
            postmethod: 'form',
            footerContent: null,
            extraClasses: ['mod_quiz_qbank_dialogue']
        };
        this.dialogue = new M.core.dialogue(config);
        this.dialogue.bodyNode.delegate('click', this.link_clicked, 'a[href]', this);
        this.dialogue.hide();

        this.loadingDiv = this.dialogue.bodyNode.getHTML();

        Y.later(100, this, function() {this.load_content(window.location.search);});
    },

    initializer : function() {
        if (!Y.one(CSS.QBANKLOADING)) {
            return;
        }
        this.create_dialogue();
        Y.one('body').delegate('click', this.display_dialogue, CSS.ADDQUESTIONLINKS, this);
    },

    display_dialogue : function (e) {
        e.preventDefault();
        this.dialogue.set('headerContent', e.currentTarget.getData(PARAMS.HEADER));

        this.addonpage = e.currentTarget.getData(PARAMS.PAGE);
        var controlsDiv = this.dialogue.bodyNode.one('.modulespecificbuttonscontainer');
        if (controlsDiv) {
            var hidden = controlsDiv.one('input[name=addonpage]');
            if (!hidden) {
                hidden = controlsDiv.appendChild('<input type="hidden" name="addonpage">');
            }
            hidden.set('value', this.addonpage);
        }

        this.dialogue.show();
    },

    load_content : function(queryString) {
        Y.log('Starting load.');
        this.dialogue.bodyNode.append(this.loadingDiv);

        // If to support old IE.
        if (window.history.replaceState) {
            window.history.replaceState(null, '', M.cfg.wwwroot + '/mod/quiz/edit.php' + queryString);
        }

        Y.io(M.cfg.wwwroot + '/mod/quiz/questionbank.ajax.php' + queryString, {
            method: 'GET',
            on: {
                success: this.load_done,
                failure: this.load_failed
            },
            context: this
        });

        Y.log('Load started.');
    },

    load_done: function(transactionid, response) {
        var result = JSON.parse(response.responseText);
        if (!result.status || result.status !== 'OK') {
            // Because IIS is useless, Moodle can't send proper HTTP response
            // codes, so we have to detect failures manually.
            this.load_failed(transactionid, response);
            return;
        }

        Y.log('Load completed.');

        this.dialogue.bodyNode.setHTML(result.contents);
        Y.use('moodle-question-chooser', function() {M.question.init_chooser({});});
        this.dialogue.bodyNode.one('form').delegate('change', this.options_changed, '.searchoptions', this);

        if (this.dialogue.visible) {
            Y.later(0, this.dialogue, this.dialogue.centerDialogue);
        }
        M.question.qbankmanager.init();
    },

    load_failed: function() {
        Y.log('Load failed.');
    },

    link_clicked: function(e) {
        if (e.currentTarget.ancestor(CSS.ADDTOQUIZCONTAINER)) {
            // These links need to work like normal, after we modify the URL.
            e.currentTarget.set('href', e.currentTarget.get('href') + '&addonpage=' + this.addonpage);
            return;
        }
        e.preventDefault();
        this.load_content(e.currentTarget.get('search'));
    },

    options_changed: function(e) {
        e.preventDefault();
        this.load_content('?' + Y.IO.stringify(e.currentTarget.get('form')));
    }
});

M.mod_quiz = M.mod_quiz || {};
M.mod_quiz.quizquestionbank = M.mod_quiz.quizquestionbank || {};
M.mod_quiz.quizquestionbank.init = function() {
    return new POPUP();
};


}, '@VERSION@', {"requires": ["base", "event", "node", "io", "io-form", "yui-later", "moodle-question-qbankmanager"]});