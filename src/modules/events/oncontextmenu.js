/**
 * 
 * @param {AceAjax.Editor} editor 
 * @param {Object} controls 
 * @param {HTMLElement} container 
 */
function textControl(editor, controls, container) {
    const $content = container.querySelector('.ace_scroller');
    $content.addEventListener('contextmenu', function (e) {
        oncontextmenu(e, editor, controls, container, $content);
    });
    $content.addEventListener('click', function (e) {
        if (controls.callBeforeContextMenu) controls.callBeforeContextMenu();
        enableSingleMode(editor, controls, container, $content);
    });
}
/**
 * @param {MouseEvent} e 
 * @param {AceAjax.Editor} editor 
 * @param {Object} controls 
 * @param {HTMLElement} controls.start
 * @param {HTMLElement} controls.end
 * @param {HTMLElement} controls.menu
 * @param {HTMLElement} container
 * @param {HTMLElement} $content
 */
function oncontextmenu(e, editor, controls, container, $content) {
    e.preventDefault();
    editor.focus();

    if (controls.callBeforeContextMenu) controls.callBeforeContextMenu();

    const MouseEvent = ace.require('ace/mouse/mouse_event').MouseEvent;
    const ev = new MouseEvent(e, editor);
    const pos = ev.getDocumentPosition();

    editor.gotoLine(parseInt(pos.row + 1), parseInt(pos.column + 1));
    editor.textInput.getElement().dispatchEvent(new KeyboardEvent('keydown', {
        keyCode: 68,
        ctrlKey: true
    }));

    enableDoubleMode(editor, controls, container, $content);
}

/**
 * 
 * @param {AceAjax.Editor} editor 
 * @param {Controls} controls 
 * @param {HTMLElement} container 
 * @param {HTMLElement} $content 
 */
function enableDoubleMode(editor, controls, container, $content) {
    const MouseEvent = ace.require('ace/mouse/mouse_event').MouseEvent;
    const lineHeight = editor.renderer.lineHeight;
    const $cm = controls.menu;
    const $cursor = editor.container.querySelector('.ace_cursor-layer>.ace_cursor');
    const initialScroll = {
        top: 0,
        left: 0
    };
    let cpos = {
        start: {
            x: 0,
            y: 0
        },
        end: {
            x: 0,
            y: 0
        }
    }
    controls.update = updateControls;
    controls.callBeforeContextMenu = containerOnClick;
    controls.end.onclick = null;
    $content.addEventListener('click', containerOnClick);
    editor.session.on('changeScrollTop', updatePosition);
    editor.session.on('changeScrollLeft', updatePosition);
    editor.selection.on('changeCursor', onchange);
    // editor.on('change', onchange);

    controls.start.ontouchstart = function (e) {
        touchStart.call(this, e, 'start');
    };

    controls.end.ontouchstart = function (e) {
        touchStart.call(this, e, 'end');
    };

    setTimeout(() => {
        container.append(controls.start, controls.end, $cm);
        updateControls();
    }, 0);

    function touchStart(e, action) {
        const el = this;

        document.ontouchmove = function (e) {
            e.clientY = e.touches[0].clientY - 28;
            e.clientX = e.touches[0].clientX;
            const ev = new MouseEvent(e, editor);
            const pos = ev.getDocumentPosition();
            const range = editor.selection.getRange();

            if (action === 'start') {
                if (pos.row > range.end.row && pos.column >= range.end.column) pos.column = range.end.column - 1;
                if (pos.row > range.end.row) pos.row = range.end.row;
                editor.selection.setSelectionAnchor(pos.row, pos.column);
            } else {
                if (pos.row < range.start.row && pos.column <= range.start.column) pos.column = range.start.column + 1;
                if (pos.row < range.start.row) pos.row = range.start.row;
                editor.selection.moveCursorToPosition(pos);
            }

            editor.renderer.scrollCursorIntoView(pos);
            if (action === 'start') {
                updateControls(action);
            }
        }

        document.ontouchend = function () {
            document.ontouchmove = null;
            document.ontouchend = null;
            el.touchStart = null;
            container.appendChild($cm);
        }
    }

    function updatePosition() {
        const scrollTop = editor.renderer.getScrollTop() - initialScroll.top;
        const scrollLeft = editor.renderer.getScrollLeft() - initialScroll.left;
        // controls.start.style.marginLeft = controls.end.style.marginLeft = $gutter.style.width;

        update(-scrollLeft, -scrollTop);
    }

    function onchange() {
        setTimeout(() => {
            updateControls('end');
        }, 0);
    }

    function updateControls(mode) {
        const selected = editor.getCopyText();
        if (!selected) {
            return containerOnClick();
        }

        const $singleMode = editor.container.querySelector('.ace_marker-layer>.ace_selection.ace_br15');
        const cursor = $cursor.getBoundingClientRect();
        const scrollTop = editor.renderer.getScrollTop();
        const scrollLeft = editor.renderer.getScrollLeft();

        if ($singleMode) {
            const singleMode = $singleMode.getBoundingClientRect();

            if (mode && typeof mode === 'string') {
                if (mode === 'start') {
                    cpos.start.x = singleMode.left;
                    cpos.start.y = singleMode.bottom;
                    cpos.end.x -= scrollLeft - initialScroll.left;
                    cpos.end.y -= scrollTop - initialScroll.top;
                } else {
                    cpos.start.x -= scrollLeft - initialScroll.left;
                    cpos.start.y -= scrollTop - initialScroll.top;
                    cpos.end.x = singleMode.right;
                    cpos.end.y = singleMode.bottom;
                }
            } else {
                cpos.start.x = singleMode.left;
                cpos.end.x = singleMode.right;
                cpos.end.y = cpos.start.y = singleMode.bottom;
            }
        } else {
            const $clientStart = editor.container.querySelector('.ace_marker-layer>.ace_selection.ace_br1.ace_start');
            const $clientEnd = editor.container.querySelector('.ace_marker-layer>.ace_selection.ace_br12');

            if ($clientStart && $clientEnd) {
                const clientStart = $clientStart.getBoundingClientRect();
                const clientEnd = $clientEnd.getBoundingClientRect();

                if (mode && typeof mode === 'string') {
                    if (mode === 'start') {
                        cpos.start.x = clientStart.left;
                        cpos.start.y = clientStart.bottom;
                        cpos.end.x -= scrollLeft - initialScroll.left;
                        cpos.end.y -= scrollTop - initialScroll.top;
                    } else {
                        cpos.start.x -= scrollLeft - initialScroll.left;
                        cpos.start.y -= scrollTop - initialScroll.top;
                        cpos.end.x = clientEnd.right;
                        cpos.end.y = clientEnd.bottom;
                    }

                } else {
                    cpos.start.x = clientStart.left;
                    cpos.end.x = clientEnd.right;
                    cpos.start.y = clientStart.bottom;
                    cpos.end.y = clientEnd.bottom;
                }
            } else {
                cpos.start.x = cursor.left;
                cpos.end.x = cursor.right;
                cpos.start.y = cpos.end.y = cursor.bottom;
            }
        }

        initialScroll.top = scrollTop;
        initialScroll.left = scrollLeft;
        update();
    }

    function update(left = 0, top = 0) {
        controls.start.style.transform = `translate3d(${cpos.start.x + 2 + left}px, ${cpos.start.y + top}px, 0) rotate(-45deg)`;
        controls.end.style.transform = `translate3d(${cpos.end.x + 2 + left}px, ${cpos.end.y + top}px, 0) rotate(45deg)`;

        const cm = {
            left: cpos.end.x + left,
            top: cpos.end.y - (40 + lineHeight) + top
        };

        $cm.style.transform = `translate3d(${cm.left}px, ${cm.top}px, 0)`;

        const cmClient = $cm.getBoundingClientRect();
        if (cmClient.right + 10 > innerWidth) {
            cm.left = innerWidth - cmClient.width - 10;
        }

        if (cmClient.left < 10) {
            cm.left = 10;
        }

        if (cmClient.top < 0) {
            cm.top = 50;
        }

        $cm.style.transform = `translate3d(${cm.left}px, ${cm.top}px, 0)`;
    }

    function containerOnClick() {
        controls.start.remove();
        controls.end.remove();
        $cm.remove();

        $content.removeEventListener('click', containerOnClick);
        editor.session.off('changeScrollTop', updatePosition);
        editor.session.off('changeScrollLeft', updatePosition);
        editor.selection.off('changeCursor', onchange);
        // editor.off('change', onchange);
        controls.start.ontouchstart = null;
        controls.end.ontouchstart = null;
    }
}

/**
 * @param {MouseEvent} e 
 * @param {AceAjax.Editor} editor 
 * @param {Object} controls 
 * @param {HTMLElement} controls.start
 * @param {HTMLElement} controls.end
 * @param {HTMLElement} controls.menu
 * @param {HTMLElement} container
 * @param {HTMLElement} $content
 */
function enableSingleMode(editor, controls, container, $content) {
    const selectedText = editor.getCopyText();
    if (selectedText) return;
    const $cursor = editor.container.querySelector('.ace_cursor-layer>.ace_cursor');
    const $cm = controls.menu;
    const lineHeight = editor.renderer.lineHeight;
    const MouseEvent = ace.require('ace/mouse/mouse_event').MouseEvent;
    const cpos = {
        x: 0,
        y: 0
    }
    $cm.innerHTML = '<span action="paste">paste</span><span action="select all">select all<span>';
    editorManager.activeFile.controls = true;
    controls.update = updateEnd;
    controls.callBeforeContextMenu = callBeforeContextMenu;

    editor.session.on('changeScrollTop', hide);
    editor.session.on('changeScrollLeft', hide);
    editor.selection.on('changeCursor', onchange);
    // editor.on('change', onchage);

    controls.end.style.display = 'none';
    container.append(controls.end);
    controls.end.ontouchstart = function (e) {
        touchStart.call(this, e);
    };
    controls.end.onclick = function (e) {
        editor.focus();
    };

    const timeout = setTimeout(() => {
        updateEnd();
        container.append(controls.end);
    }, 0)

    function touchStart() {
        const el = this;

        document.ontouchmove = function (e) {
            e.clientY = e.touches[0].clientY - 28;
            e.clientX = e.touches[0].clientX;
            const ev = new MouseEvent(e, editor);
            const pos = ev.getDocumentPosition();

            editor.selection.moveCursorToPosition(pos);
            editor.selection.setSelectionAnchor(pos.row, pos.column);
            editor.renderer.scrollCursorIntoView(pos);
        }

        document.ontouchend = function () {
            document.ontouchmove = null;
            document.ontouchend = null;
            el.touchStart = null;
            if (!$cm.isConnected) {
                container.appendChild($cm);
                updateCm();
            } else {
                $cm.remove();
            }
        }
    }

    function onchange() {
        setTimeout(updateEnd, 0);
    }

    function updateEnd() {
        if (!editorManager.activeFile.controls) return controls.end.remove();
        const cursor = $cursor.getBoundingClientRect();

        cpos.x = cursor.right - 5;
        cpos.y = cursor.bottom;

        update();
    }

    function update(left = 0, top = 0) {
        controls.end.style.transform = `translate3d(${cpos.x + 2 + left}px, ${cpos.y + top}px, 0) rotate(45deg)`;
        controls.end.style.display = 'block';
    }

    function updateCm() {
        const cm = {
            left: cpos.x,
            top: cpos.y - (40 + lineHeight)
        };

        $cm.style.transform = `translate3d(${cm.left}px, ${cm.top}px, 0)`;

        const cmClient = $cm.getBoundingClientRect();
        if (cmClient.right + 10 > innerWidth) {
            cm.left = innerWidth - cmClient.width - 10;
        }

        if (cmClient.left < 10) {
            cm.left = 10;
        }

        if (cmClient.top < 0) {
            cm.top = 50;
        }

        $cm.style.transform = `translate3d(${cm.left}px, ${cm.top}px, 0)`;
    }

    function callBeforeContextMenu() {
        if (timeout) clearTimeout(timeout);
        controls.end.remove();
        $cm.remove();
        $cm.innerHTML = controls.fullContent;
        editor.session.off('changeScrollTop', hide);
        editor.session.off('changeScrollLeft', hide);
        editor.selection.off('changeCursor', onchange);
        // editor.off('change', onchage);
        controls.end.ontouchstart = null;
    }

    function hide() {
        const end = controls.end;
        if (end.isConnected) end.remove();
        if ($cm.isConnected) $cm.remove();
    }
}
export default textControl;