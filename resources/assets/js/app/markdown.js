'use strict';

import { Converter } from 'showdown';

const hljs = require('highlight.js/lib/common');
hljs.configure({ ignoreUnescapedHTML: true });
hljs.safeMode();

const converter = new Converter({
    requireSpaceBeforeHeadingText: true,
    tables: true
});

/**
 * Escapes HTML special characters in a string
 * Source: https://stackoverflow.com/questions/1787322
 *
 * @param {string} text Raw text
 * @returns string Escaped HTML
 */
function escapeHtml(text) {
    var map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };

    return text.replace(/[&<>"']/g, function (m) { return map[m]; });
}

function convertMarkdownToHtml(text) {
    // add ending code block tags when missing
    let code_block_count = (text.match(/```/g) || []).length;
    if (code_block_count % 2 !== 0) {
        text += "\n```";
    }

    // HTML-escape parts of text that are not inside ticks.
    // This prevents <?php from turning into a comment tag
    let escaped_parts = [];
    let code_parts = text.split("`");
    for (let i = 0; i < code_parts.length; i++) {
        if (i % 2 === 0) {
            escaped_parts.push(escapeHtml(code_parts[i]));
        } else {
            escaped_parts.push(code_parts[i]);
        }
    }
    let escaped_message = escaped_parts.join("`");

    // Convert Markdown to HTML
    let formatted_message = "";
    let code_blocks = escaped_message.split("```");
    for (let i = 0; i < code_blocks.length; i++) {
        if (i % 2 === 0) {
            // add two spaces in the end of every line
            // for non-codeblocks so that one-per-line lists
            // without markdown can be generated
            formatted_message += converter.makeHtml(
                code_blocks[i].trim().replace(/\n/g, "  \n")
            );
        } else {
            // convert Markdown code blocks to HTML
            formatted_message += converter.makeHtml(
                "```" + code_blocks[i] + "```"
            );
        }
    }

    return formatted_message;
}

export function markdownToHtml(text) {
    let html = convertMarkdownToHtml(text);

    let el = document.createElement('div');
    el.innerHTML = html;

    el.querySelectorAll('pre code').forEach((el) => {
        let text = el.innerText.trim();
        let h = hljs.highlightAuto(text);

        el.innerHTML = h.value;

        let lang = document.createElement('span');
        lang.classList.add('lang');
        lang.innerText = h.language;

        el.closest('pre').append(lang);
    });

    el.querySelectorAll('pre').forEach((el) => {
        let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute('fill', 'none');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.innerHTML = '<rect cx="56" width="100%" height="100%" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4" rx="8" ry="8" />';

        el.appendChild(svg);
    });

    return el.innerHTML;
}