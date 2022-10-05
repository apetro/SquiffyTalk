// Created with Squiffy 5.0.0
// https://github.com/textadventures/squiffy

(function(){
/* jshint quotmark: single */
/* jshint evil: true */

var squiffy = {};

(function () {
    'use strict';

    squiffy.story = {};

    var initLinkHandler = function () {
        var handleLink = function (link) {
            if (link.hasClass('disabled')) return;
            var passage = link.data('passage');
            var section = link.data('section');
            var rotateAttr = link.attr('data-rotate');
            var sequenceAttr = link.attr('data-sequence');
            if (passage) {
                disableLink(link);
                squiffy.set('_turncount', squiffy.get('_turncount') + 1);
                passage = processLink(passage);
                if (passage) {
                    currentSection.append('<hr/>');
                    squiffy.story.passage(passage);
                }
                var turnPassage = '@' + squiffy.get('_turncount');
                if (turnPassage in squiffy.story.section.passages) {
                    squiffy.story.passage(turnPassage);
                }
            }
            else if (section) {
                currentSection.append('<hr/>');
                disableLink(link);
                section = processLink(section);
                squiffy.story.go(section);
            }
            else if (rotateAttr || sequenceAttr) {
                var result = rotate(rotateAttr || sequenceAttr, rotateAttr ? link.text() : '');
                link.html(result[0].replace(/&quot;/g, '"').replace(/&#39;/g, '\''));
                var dataAttribute = rotateAttr ? 'data-rotate' : 'data-sequence';
                link.attr(dataAttribute, result[1]);
                if (!result[1]) {
                    disableLink(link);
                }
                if (link.attr('data-attribute')) {
                    squiffy.set(link.attr('data-attribute'), result[0]);
                }
                squiffy.story.save();
            }
        };

        squiffy.ui.output.on('click', 'a.squiffy-link', function () {
            handleLink(jQuery(this));
        });

        squiffy.ui.output.on('keypress', 'a.squiffy-link', function (e) {
            if (e.which !== 13) return;
            handleLink(jQuery(this));
        });

        squiffy.ui.output.on('mousedown', 'a.squiffy-link', function (event) {
            event.preventDefault();
        });
    };

    var disableLink = function (link) {
        link.addClass('disabled');
        link.attr('tabindex', -1);
    }
    
    squiffy.story.begin = function () {
        if (!squiffy.story.load()) {
            squiffy.story.go(squiffy.story.start);
        }
    };

    var processLink = function(link) {
        var sections = link.split(',');
        var first = true;
        var target = null;
        sections.forEach(function (section) {
            section = section.trim();
            if (startsWith(section, '@replace ')) {
                replaceLabel(section.substring(9));
            }
            else {
                if (first) {
                    target = section;
                }
                else {
                    setAttribute(section);
                }
            }
            first = false;
        });
        return target;
    };

    var setAttribute = function(expr) {
        var lhs, rhs, op, value;
        var setRegex = /^([\w]*)\s*=\s*(.*)$/;
        var setMatch = setRegex.exec(expr);
        if (setMatch) {
            lhs = setMatch[1];
            rhs = setMatch[2];
            if (isNaN(rhs)) {
                squiffy.set(lhs, rhs);
            }
            else {
                squiffy.set(lhs, parseFloat(rhs));
            }
        }
        else {
            var incDecRegex = /^([\w]*)\s*([\+\-])=\s*(.*)$/;
            var incDecMatch = incDecRegex.exec(expr);
            if (incDecMatch) {
                lhs = incDecMatch[1];
                op = incDecMatch[2];
                rhs = parseFloat(incDecMatch[3]);
                value = squiffy.get(lhs);
                if (value === null) value = 0;
                if (op == '+') {
                    value += rhs;
                }
                if (op == '-') {
                    value -= rhs;
                }
                squiffy.set(lhs, value);
            }
            else {
                value = true;
                if (startsWith(expr, 'not ')) {
                    expr = expr.substring(4);
                    value = false;
                }
                squiffy.set(expr, value);
            }
        }
    };

    var replaceLabel = function(expr) {
        var regex = /^([\w]*)\s*=\s*(.*)$/;
        var match = regex.exec(expr);
        if (!match) return;
        var label = match[1];
        var text = match[2];
        if (text in squiffy.story.section.passages) {
            text = squiffy.story.section.passages[text].text;
        }
        else if (text in squiffy.story.sections) {
            text = squiffy.story.sections[text].text;
        }
        var stripParags = /^<p>(.*)<\/p>$/;
        var stripParagsMatch = stripParags.exec(text);
        if (stripParagsMatch) {
            text = stripParagsMatch[1];
        }
        var $labels = squiffy.ui.output.find('.squiffy-label-' + label);
        $labels.fadeOut(1000, function() {
            $labels.html(squiffy.ui.processText(text));
            $labels.fadeIn(1000, function() {
                squiffy.story.save();
            });
        });
    };

    squiffy.story.go = function(section) {
        squiffy.set('_transition', null);
        newSection();
        squiffy.story.section = squiffy.story.sections[section];
        if (!squiffy.story.section) return;
        squiffy.set('_section', section);
        setSeen(section);
        var master = squiffy.story.sections[''];
        if (master) {
            squiffy.story.run(master);
            squiffy.ui.write(master.text);
        }
        squiffy.story.run(squiffy.story.section);
        // The JS might have changed which section we're in
        if (squiffy.get('_section') == section) {
            squiffy.set('_turncount', 0);
            squiffy.ui.write(squiffy.story.section.text);
            squiffy.story.save();
        }
    };

    squiffy.story.run = function(section) {
        if (section.clear) {
            squiffy.ui.clearScreen();
        }
        if (section.attributes) {
            processAttributes(section.attributes);
        }
        if (section.js) {
            section.js();
        }
    };

    squiffy.story.passage = function(passageName) {
        var passage = squiffy.story.section.passages[passageName];
        if (!passage) return;
        setSeen(passageName);
        var masterSection = squiffy.story.sections[''];
        if (masterSection) {
            var masterPassage = masterSection.passages[''];
            if (masterPassage) {
                squiffy.story.run(masterPassage);
                squiffy.ui.write(masterPassage.text);
            }
        }
        var master = squiffy.story.section.passages[''];
        if (master) {
            squiffy.story.run(master);
            squiffy.ui.write(master.text);
        }
        squiffy.story.run(passage);
        squiffy.ui.write(passage.text);
        squiffy.story.save();
    };

    var processAttributes = function(attributes) {
        attributes.forEach(function (attribute) {
            if (startsWith(attribute, '@replace ')) {
                replaceLabel(attribute.substring(9));
            }
            else {
                setAttribute(attribute);
            }
        });
    };

    squiffy.story.restart = function() {
        if (squiffy.ui.settings.persist && window.localStorage) {
            var keys = Object.keys(localStorage);
            jQuery.each(keys, function (idx, key) {
                if (startsWith(key, squiffy.story.id)) {
                    localStorage.removeItem(key);
                }
            });
        }
        else {
            squiffy.storageFallback = {};
        }
        if (squiffy.ui.settings.scroll === 'element') {
            squiffy.ui.output.html('');
            squiffy.story.begin();
        }
        else {
            location.reload();
        }
    };

    squiffy.story.save = function() {
        squiffy.set('_output', squiffy.ui.output.html());
    };

    squiffy.story.load = function() {
        var output = squiffy.get('_output');
        if (!output) return false;
        squiffy.ui.output.html(output);
        currentSection = jQuery('#' + squiffy.get('_output-section'));
        squiffy.story.section = squiffy.story.sections[squiffy.get('_section')];
        var transition = squiffy.get('_transition');
        if (transition) {
            eval('(' + transition + ')()');
        }
        return true;
    };

    var setSeen = function(sectionName) {
        var seenSections = squiffy.get('_seen_sections');
        if (!seenSections) seenSections = [];
        if (seenSections.indexOf(sectionName) == -1) {
            seenSections.push(sectionName);
            squiffy.set('_seen_sections', seenSections);
        }
    };

    squiffy.story.seen = function(sectionName) {
        var seenSections = squiffy.get('_seen_sections');
        if (!seenSections) return false;
        return (seenSections.indexOf(sectionName) > -1);
    };
    
    squiffy.ui = {};

    var currentSection = null;
    var screenIsClear = true;
    var scrollPosition = 0;

    var newSection = function() {
        if (currentSection) {
            disableLink(jQuery('.squiffy-link', currentSection));
        }
        var sectionCount = squiffy.get('_section-count') + 1;
        squiffy.set('_section-count', sectionCount);
        var id = 'squiffy-section-' + sectionCount;
        currentSection = jQuery('<div/>', {
            id: id,
        }).appendTo(squiffy.ui.output);
        squiffy.set('_output-section', id);
    };

    squiffy.ui.write = function(text) {
        screenIsClear = false;
        scrollPosition = squiffy.ui.output.height();
        currentSection.append(jQuery('<div/>').html(squiffy.ui.processText(text)));
        squiffy.ui.scrollToEnd();
    };

    squiffy.ui.clearScreen = function() {
        squiffy.ui.output.html('');
        screenIsClear = true;
        newSection();
    };

    squiffy.ui.scrollToEnd = function() {
        var scrollTo, currentScrollTop, distance, duration;
        if (squiffy.ui.settings.scroll === 'element') {
            scrollTo = squiffy.ui.output[0].scrollHeight - squiffy.ui.output.height();
            currentScrollTop = squiffy.ui.output.scrollTop();
            if (scrollTo > currentScrollTop) {
                distance = scrollTo - currentScrollTop;
                duration = distance / 0.4;
                squiffy.ui.output.stop().animate({ scrollTop: scrollTo }, duration);
            }
        }
        else {
            scrollTo = scrollPosition;
            currentScrollTop = Math.max(jQuery('body').scrollTop(), jQuery('html').scrollTop());
            if (scrollTo > currentScrollTop) {
                var maxScrollTop = jQuery(document).height() - jQuery(window).height();
                if (scrollTo > maxScrollTop) scrollTo = maxScrollTop;
                distance = scrollTo - currentScrollTop;
                duration = distance / 0.5;
                jQuery('body,html').stop().animate({ scrollTop: scrollTo }, duration);
            }
        }
    };

    squiffy.ui.processText = function(text) {
        function process(text, data) {
            var containsUnprocessedSection = false;
            var open = text.indexOf('{');
            var close;
            
            if (open > -1) {
                var nestCount = 1;
                var searchStart = open + 1;
                var finished = false;
             
                while (!finished) {
                    var nextOpen = text.indexOf('{', searchStart);
                    var nextClose = text.indexOf('}', searchStart);
         
                    if (nextClose > -1) {
                        if (nextOpen > -1 && nextOpen < nextClose) {
                            nestCount++;
                            searchStart = nextOpen + 1;
                        }
                        else {
                            nestCount--;
                            searchStart = nextClose + 1;
                            if (nestCount === 0) {
                                close = nextClose;
                                containsUnprocessedSection = true;
                                finished = true;
                            }
                        }
                    }
                    else {
                        finished = true;
                    }
                }
            }
            
            if (containsUnprocessedSection) {
                var section = text.substring(open + 1, close);
                var value = processTextCommand(section, data);
                text = text.substring(0, open) + value + process(text.substring(close + 1), data);
            }
            
            return (text);
        }

        function processTextCommand(text, data) {
            if (startsWith(text, 'if ')) {
                return processTextCommand_If(text, data);
            }
            else if (startsWith(text, 'else:')) {
                return processTextCommand_Else(text, data);
            }
            else if (startsWith(text, 'label:')) {
                return processTextCommand_Label(text, data);
            }
            else if (/^rotate[: ]/.test(text)) {
                return processTextCommand_Rotate('rotate', text, data);
            }
            else if (/^sequence[: ]/.test(text)) {
                return processTextCommand_Rotate('sequence', text, data);   
            }
            else if (text in squiffy.story.section.passages) {
                return process(squiffy.story.section.passages[text].text, data);
            }
            else if (text in squiffy.story.sections) {
                return process(squiffy.story.sections[text].text, data);
            }
            return squiffy.get(text);
        }

        function processTextCommand_If(section, data) {
            var command = section.substring(3);
            var colon = command.indexOf(':');
            if (colon == -1) {
                return ('{if ' + command + '}');
            }

            var text = command.substring(colon + 1);
            var condition = command.substring(0, colon);

            var operatorRegex = /([\w ]*)(=|&lt;=|&gt;=|&lt;&gt;|&lt;|&gt;)(.*)/;
            var match = operatorRegex.exec(condition);

            var result = false;

            if (match) {
                var lhs = squiffy.get(match[1]);
                var op = match[2];
                var rhs = match[3];

                if (op == '=' && lhs == rhs) result = true;
                if (op == '&lt;&gt;' && lhs != rhs) result = true;
                if (op == '&gt;' && lhs > rhs) result = true;
                if (op == '&lt;' && lhs < rhs) result = true;
                if (op == '&gt;=' && lhs >= rhs) result = true;
                if (op == '&lt;=' && lhs <= rhs) result = true;
            }
            else {
                var checkValue = true;
                if (startsWith(condition, 'not ')) {
                    condition = condition.substring(4);
                    checkValue = false;
                }

                if (startsWith(condition, 'seen ')) {
                    result = (squiffy.story.seen(condition.substring(5)) == checkValue);
                }
                else {
                    var value = squiffy.get(condition);
                    if (value === null) value = false;
                    result = (value == checkValue);
                }
            }

            var textResult = result ? process(text, data) : '';

            data.lastIf = result;
            return textResult;
        }

        function processTextCommand_Else(section, data) {
            if (!('lastIf' in data) || data.lastIf) return '';
            var text = section.substring(5);
            return process(text, data);
        }

        function processTextCommand_Label(section, data) {
            var command = section.substring(6);
            var eq = command.indexOf('=');
            if (eq == -1) {
                return ('{label:' + command + '}');
            }

            var text = command.substring(eq + 1);
            var label = command.substring(0, eq);

            return '<span class="squiffy-label-' + label + '">' + process(text, data) + '</span>';
        }

        function processTextCommand_Rotate(type, section, data) {
            var options;
            var attribute = '';
            if (section.substring(type.length, type.length + 1) == ' ') {
                var colon = section.indexOf(':');
                if (colon == -1) {
                    return '{' + section + '}';
                }
                options = section.substring(colon + 1);
                attribute = section.substring(type.length + 1, colon);
            }
            else {
                options = section.substring(type.length + 1);
            }
            var rotation = rotate(options.replace(/"/g, '&quot;').replace(/'/g, '&#39;'));
            if (attribute) {
                squiffy.set(attribute, rotation[0]);
            }
            return '<a class="squiffy-link" data-' + type + '="' + rotation[1] + '" data-attribute="' + attribute + '" role="link">' + rotation[0] + '</a>';
        }

        var data = {
            fulltext: text
        };
        return process(text, data);
    };

    squiffy.ui.transition = function(f) {
        squiffy.set('_transition', f.toString());
        f();
    };

    squiffy.storageFallback = {};

    squiffy.set = function(attribute, value) {
        if (typeof value === 'undefined') value = true;
        if (squiffy.ui.settings.persist && window.localStorage) {
            localStorage[squiffy.story.id + '-' + attribute] = JSON.stringify(value);
        }
        else {
            squiffy.storageFallback[attribute] = JSON.stringify(value);
        }
        squiffy.ui.settings.onSet(attribute, value);
    };

    squiffy.get = function(attribute) {
        var result;
        if (squiffy.ui.settings.persist && window.localStorage) {
            result = localStorage[squiffy.story.id + '-' + attribute];
        }
        else {
            result = squiffy.storageFallback[attribute];
        }
        if (!result) return null;
        return JSON.parse(result);
    };

    var startsWith = function(string, prefix) {
        return string.substring(0, prefix.length) === prefix;
    };

    var rotate = function(options, current) {
        var colon = options.indexOf(':');
        if (colon == -1) {
            return [options, current];
        }
        var next = options.substring(0, colon);
        var remaining = options.substring(colon + 1);
        if (current) remaining += ':' + current;
        return [next, remaining];
    };

    var methods = {
        init: function (options) {
            var settings = jQuery.extend({
                scroll: 'body',
                persist: true,
                restartPrompt: true,
                onSet: function (attribute, value) {}
            }, options);

            squiffy.ui.output = this;
            squiffy.ui.restart = jQuery(settings.restart);
            squiffy.ui.settings = settings;

            if (settings.scroll === 'element') {
                squiffy.ui.output.css('overflow-y', 'auto');
            }

            initLinkHandler();
            squiffy.story.begin();
            
            return this;
        },
        get: function (attribute) {
            return squiffy.get(attribute);
        },
        set: function (attribute, value) {
            squiffy.set(attribute, value);
        },
        restart: function () {
            if (!squiffy.ui.settings.restartPrompt || confirm('Are you sure you want to restart?')) {
                squiffy.story.restart();
            }
        }
    };

    jQuery.fn.squiffy = function (methodOrOptions) {
        if (methods[methodOrOptions]) {
            return methods[methodOrOptions]
                .apply(this, Array.prototype.slice.call(arguments, 1));
        }
        else if (typeof methodOrOptions === 'object' || ! methodOrOptions) {
            return methods.init.apply(this, arguments);
        } else {
            jQuery.error('Method ' +  methodOrOptions + ' does not exist');
        }
    };
})();

var get = squiffy.get;
var set = squiffy.set;


squiffy.story.start = '_default';
squiffy.story.id = 'b251910cf7';
squiffy.story.sections = {
	'_default': {
		'text': "<h1 id=\"got-covid-19-\">Got COVID-19?</h1>\n<p>(Based on <a href=\"https://publichealthmdc.com/coronavirus/what-to-do-if-you-are-sick-or-possibly-exposed\">Public Health Madison Dane County website</a> as of 2022-10-04.\nThis is an example of implementing a simple expert system in Squiffy,\nnot a tool for real medical advice.)</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue1\" role=\"link\" tabindex=\"0\">So, I tested positive for COVID-19.</a></p>",
		'passages': {
		},
	},
	'_continue1': {
		'text': "<p>Sorry to hear that.</p>\n<p>Did you <a class=\"squiffy-link link-section\" data-section=\"experience symptoms\" role=\"link\" tabindex=\"0\">experience symptoms</a>, or <a class=\"squiffy-link link-section\" data-section=\"not experience symptoms\" role=\"link\" tabindex=\"0\">not experience symptoms</a>?</p>\n<p>You have experienced symptoms if you have experienced symptoms <strong>at any time</strong>,\neven if symptoms developed only days after your positive test.</p>\n<p>(<a href=\"https://www.cdc.gov/coronavirus/2019-ncov/symptoms-testing/symptoms.html\">Symptoms of COVID-19</a> can include</p>\n<ul>\n<li>fever or chills,</li>\n<li>cough,</li>\n<li>shortness of breath,</li>\n<li>difficulty breathing,</li>\n<li>fatigue,</li>\n<li>muscle aches,</li>\n<li>body aches,</li>\n<li>headache,</li>\n<li>new loss of taste or smell,</li>\n<li>sore throat,</li>\n<li>congestion,</li>\n<li>runny nose,</li>\n<li>nausea,</li>\n<li>vomiting, or</li>\n<li>diarrhea.)</li>\n</ul>",
		'passages': {
		},
	},
	'experience symptoms': {
		'text': "<p><strong>Day 0 of isolation is the day your symptoms started</strong>, regardless of when you tested positive.\nDay 1 is the first full day after the day your symptoms started.</p>\n<ul>\n<li>Today is <a class=\"squiffy-link link-section\" data-section=\"isolate\" role=\"link\" tabindex=\"0\">within days 0 through 5</a>.</li>\n<li>Today is <a class=\"squiffy-link link-section\" data-section=\"check symptom severity day 6 to 10\" role=\"link\" tabindex=\"0\">within days 6 through 10</a>.</li>\n<li>Today is <a class=\"squiffy-link link-section\" data-section=\"check for severe illness after day 10\" role=\"link\" tabindex=\"0\">day 11 or later</a>.</li>\n</ul>",
		'passages': {
		},
	},
	'check symptom severity day 6 to 10': {
		'text': "<p>Choose the first of these that is true for you.</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"doctor mediated isolation\" role=\"link\" tabindex=\"0\">I have a weakened immune system</a></li>\n<li>This bout of COVID-19 has made me <a class=\"squiffy-link link-section\" data-section=\"doctor mediated isolation\" role=\"link\" tabindex=\"0\">severely ill</a></li>\n<li>This bout of COVOID-19 has made me <a class=\"squiffy-link link-section\" data-section=\"isolate\" role=\"link\" tabindex=\"0\">moderately ill, with shortness of breath or difficulty breathing</a></li>\n<li><a class=\"squiffy-link link-section\" data-section=\"check for improving symptoms\" role=\"link\" tabindex=\"0\">I was or am mildly ill with COVID-19</a></li>\n</ul>",
		'passages': {
		},
	},
	'doctor mediated isolation': {
		'text': "<p>You should isolate for at least 10 days. <strong>Talk to your doctor before ending isolation.</strong></p>",
		'passages': {
		},
	},
	'check for severe illness after day 10': {
		'text': "<p>Choose the first of these that is true for you.</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"doctor mediated isolation\" role=\"link\" tabindex=\"0\">I have a weakened immune system</a>.</li>\n<li>This bout of COVID-19 has made me <a class=\"squiffy-link link-section\" data-section=\"doctor mediated isolation\" role=\"link\" tabindex=\"0\">severely ill</a>.</li>\n<li><a class=\"squiffy-link link-section\" data-section=\"check for improving symptoms after day 10\" role=\"link\" tabindex=\"0\">None of the above</a>.</li>\n</ul>",
		'passages': {
		},
	},
	'check for improving symptoms': {
		'text': "<p>Are your symptoms <a class=\"squiffy-link link-section\" data-section=\"check for fever\" role=\"link\" tabindex=\"0\">improving</a> or <a class=\"squiffy-link link-section\" data-section=\"isolate\" role=\"link\" tabindex=\"0\">not yet improving</a>?</p>",
		'passages': {
		},
	},
	'check for improving symptoms after day 10': {
		'text': "<p>Are your symptoms <a class=\"squiffy-link link-section\" data-section=\"check for fever after day 10\" role=\"link\" tabindex=\"0\">improving</a> or <a class=\"squiffy-link link-section\" data-section=\"isolate\" role=\"link\" tabindex=\"0\">not yet improving</a>?</p>",
		'passages': {
		},
	},
	'check for fever': {
		'text': "<p>Within the last 24 hours, have you</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"isolate\" role=\"link\" tabindex=\"0\">had a fever</a></li>\n<li><a class=\"squiffy-link link-section\" data-section=\"isolate\" role=\"link\" tabindex=\"0\">not had a fever, using fever-reducing medication</a></li>\n<li><a class=\"squiffy-link link-section\" data-section=\"take precautions\" role=\"link\" tabindex=\"0\">not had a fever, without using fever-reducing medication</a></li>\n</ul>",
		'passages': {
		},
	},
	'check for fever after day 10': {
		'text': "<p>Within the last 24 hours, have you</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"isolate\" role=\"link\" tabindex=\"0\">had a fever</a></li>\n<li><a class=\"squiffy-link link-section\" data-section=\"isolate\" role=\"link\" tabindex=\"0\">not had a fever, using fever-reducing medication</a></li>\n<li><a class=\"squiffy-link link-section\" data-section=\"routine care\" role=\"link\" tabindex=\"0\">not had a fever, without using fever-reducing medication</a></li>\n</ul>",
		'passages': {
		},
	},
	'not experience symptoms': {
		'text': "<p><strong>Day 0 is the day you were tested</strong> (not the day you received your positive test result).\nDay 1 is the first full day following the day you were tested.</p>\n<p>Select the first of these that is true:</p>\n<ul>\n<li>I have <a class=\"squiffy-link link-section\" data-section=\"developed symptoms\" role=\"link\" tabindex=\"0\">developed symptoms</a>.\n(<a href=\"https://www.cdc.gov/coronavirus/2019-ncov/symptoms-testing/symptoms.html\">Symptoms of COVID-19</a> can include\nfever or chills,\ncough,\nshortness of breath,\ndifficulty breathing,\nfatigue,\nmuscle aches,\nbody aches,\nheadache,\nnew loss of taste or smell,\nsore throat,\ncongestion,\nrunny nose,\nnausea,\nvomiting, or\ndiarrhea.)</li>\n<li>Now is within <a class=\"squiffy-link link-section\" data-section=\"isolate\" role=\"link\" tabindex=\"0\">day 0 through 5 of my isolation</a>, and I have not developed symptoms of COVID-19.</li>\n<li>Now is within <a class=\"squiffy-link link-section\" data-section=\"take precautions\" role=\"link\" tabindex=\"0\">day 6 through 10 of my isolation</a>, and I have not developed symptoms of COVID-19.</li>\n<li>Now is <a class=\"squiffy-link link-section\" data-section=\"routine care\" role=\"link\" tabindex=\"0\">day 11 of my isolation or later</a>, and I have not developed symptoms of COVID-19.</li>\n</ul>",
		'passages': {
		},
	},
	'developed symptoms': {
		'text': "<p>So sorry to hear that you have developed symptoms of COVID-19.</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"experience symptoms\" role=\"link\" tabindex=\"0\">Your isolation period restarts</a> with the day your symptoms started as your new day 0.</p>",
		'passages': {
		},
	},
	'isolate': {
		'text': "<p>You should keep isolating.</p>\n<p>You can use this tool again tomorrow to see if you should keep isolating then.</p>",
		'passages': {
		},
	},
	'take precautions': {
		'text': "<p>Are you <a class=\"squiffy-link link-section\" data-section=\"end isolation\" role=\"link\" tabindex=\"0\">able to wear a mask</a>, or <a class=\"squiffy-link link-section\" data-section=\"isolate\" role=\"link\" tabindex=\"0\">not able to use a mask</a>?\n(Children under 2 are considered <a class=\"squiffy-link link-section\" data-section=\"isolate\" role=\"link\" tabindex=\"0\">not able to wear a mask</a>.)</p>",
		'passages': {
		},
	},
	'end isolation': {
		'text': "<p>You may end isolation.</p>\n<p>You can still spread COVID-19, so continue to take precautions.</p>\n<ul>\n<li>Wear a high-quality mask any time you are around others inside your home or in public.</li>\n<li>Do not travel.</li>\n<li>Avoid being around people who are more likely to get very sick from COVID-19.</li>\n</ul>",
		'passages': {
		},
	},
	'routine care': {
		'text': "<p>Congratulations!</p>\n<p>You have completed isolation and additional precautions followup on your COVID-19 illness.</p>",
		'passages': {
		},
	},
}
})();