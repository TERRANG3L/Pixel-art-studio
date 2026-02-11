/**
 * Pixel Art Studio Pro++ — Enhanced Application Logic
 * Features: Undo/Redo, Keyboard Shortcuts, Toast Notifications,
 *           Coordinate Tracking, Improved Touch, Zoom Slider
 */

// ==================== State Management ====================

let lastValidState = { rows: 16, cols: 16 };

const MAX_HISTORY = 50;

const state = {
    currentColor: '#ff0000',
    currentTool: 'brush',
    gridVisible: true,
    isDrawing: false,
    currentZoom: 1,
    deleteQueue: null,
    mirrorMode: { active: false, type: 'vertical' },
    paletas: JSON.parse(localStorage.getItem('paletas')) || {
        'default': ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00',
            '#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd']
    },
    currentPalette: 'default',
    history: [],
    historyIndex: -1,
};

// ==================== DOM References ====================

const dom = {};

function cacheDom() {
    dom.grid = document.getElementById('grid');
    dom.colorInput = document.getElementById('colorInput');
    dom.colorHexInput = document.getElementById('colorHexInput');
    dom.colorPreview = document.getElementById('colorPreview');
    dom.confirmDialog = document.getElementById('confirmDialog');
    dom.dialogOverlay = document.getElementById('dialogOverlay');
    dom.paletteSelector = document.getElementById('paletteSelector');
    dom.zoomLevel = document.getElementById('zoomLevel');
    dom.confirmYes = document.getElementById('confirmYes');
    dom.confirmNo = document.getElementById('confirmNo');
    dom.newPaletteBtn = document.getElementById('newPaletteBtn');
    dom.addToPaletteBtn = document.getElementById('addToPaletteBtn');
    dom.toggleMirrorBtn = document.getElementById('toggleMirrorBtn');
    dom.toggleGridBtn = document.getElementById('toggleGridBtn');
    dom.clearGridBtn = document.getElementById('clearGridBtn');
    dom.saveArtBtn = document.getElementById('saveArtBtn');
    dom.imageLoader = document.getElementById('imageLoader');
    dom.mirrorTypeSelector = document.getElementById('mirrorTypeSelector');
    dom.undoBtn = document.getElementById('undoBtn');
    dom.redoBtn = document.getElementById('redoBtn');
    dom.zoomInBtn = document.getElementById('zoomInBtn');
    dom.zoomOutBtn = document.getElementById('zoomOutBtn');
    dom.zoomSlider = document.getElementById('zoomSlider');
    dom.cursorCoords = document.getElementById('cursorCoords');
    dom.toastContainer = document.getElementById('toastContainer');
    dom.shortcutsPanel = document.getElementById('shortcutsPanel');
    dom.shortcutsBtn = document.getElementById('shortcutsBtn');
    dom.closeShortcuts = document.getElementById('closeShortcuts');
    dom.updateGridBtn = document.getElementById('updateGridBtn');
    dom.gridContainer = document.getElementById('gridContainer');

    // Mobile-specific elements
    dom.mobilePanelToggle = document.getElementById('mobilePanelToggle');
    dom.toolPanel = document.getElementById('toolPanel');
    dom.mobilePanelOverlay = document.getElementById('mobilePanelOverlay');
    dom.mobileToolbar = document.getElementById('mobileToolbar');
    dom.mobileColorPreview = document.getElementById('mobileColorPreview');
    dom.mobileUndoBtn = document.getElementById('mobileUndoBtn');
    dom.mobileRedoBtn = document.getElementById('mobileRedoBtn');
    dom.mobileSaveBtn = document.getElementById('mobileSaveBtn');
}

// ==================== Toast Notifications ====================

function showToast(message, type = 'info') {
    const icons = {
        success: '✅',
        warning: '⚠️',
        error: '❌',
        info: 'ℹ️'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || ''}</span> ${message}`;
    dom.toastContainer.appendChild(toast);

    setTimeout(() => {
        if (toast.parentElement) toast.remove();
    }, 3000);
}

// ==================== History (Undo/Redo) ====================

function getGridState() {
    const pixels = dom.grid.querySelectorAll('.pixel');
    return Array.from(pixels).map(p => p.style.backgroundColor || '#ffffff');
}

function setGridState(stateArr) {
    const pixels = dom.grid.querySelectorAll('.pixel');
    stateArr.forEach((color, i) => {
        if (pixels[i]) pixels[i].style.backgroundColor = color;
    });
}

function pushHistory() {
    const currentState = getGridState();

    // Remove future states if we're in the middle of history
    if (state.historyIndex < state.history.length - 1) {
        state.history = state.history.slice(0, state.historyIndex + 1);
    }

    state.history.push(currentState);

    // Keep history manageable
    if (state.history.length > MAX_HISTORY) {
        state.history.shift();
    }

    state.historyIndex = state.history.length - 1;
    updateHistoryButtons();
}

function undo() {
    if (state.historyIndex > 0) {
        state.historyIndex--;
        setGridState(state.history[state.historyIndex]);
        updateHistoryButtons();
        showToast('Acción deshecha', 'info');
    }
}

function redo() {
    if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        setGridState(state.history[state.historyIndex]);
        updateHistoryButtons();
        showToast('Acción rehecha', 'info');
    }
}

function updateHistoryButtons() {
    if (dom.undoBtn) dom.undoBtn.disabled = state.historyIndex <= 0;
    if (dom.redoBtn) dom.redoBtn.disabled = state.historyIndex >= state.history.length - 1;
}

function getPixelSize() {
    return getComputedStyle(document.documentElement).getPropertyValue('--pixel-size').trim() || '20px';
}

function safeUpdateGrid() {
    try {
        const rows = Math.max(8, Math.min(64, parseInt(document.getElementById('rows').value) || 16));
        const cols = Math.max(8, Math.min(64, parseInt(document.getElementById('cols').value) || 16));
        const pixelSize = getPixelSize();

        dom.grid.style.gridTemplateColumns = `repeat(${cols}, ${pixelSize})`;
        dom.grid.className = state.gridVisible ? 'grid-visible' : '';

        const fragment = document.createDocumentFragment();
        for (let i = 0; i < rows * cols; i++) {
            fragment.appendChild(createPixel());
        }

        dom.grid.innerHTML = '';
        dom.grid.appendChild(fragment);
        state.isDrawing = false;

        lastValidState = { rows, cols };

        // Initialize history with the blank state
        state.history = [getGridState()];
        state.historyIndex = 0;
        updateHistoryButtons();

    } catch (error) {
        console.error('Error al actualizar la cuadrícula:', error);
        showToast('Error al actualizar la cuadrícula', 'error');
        document.getElementById('rows').value = lastValidState.rows;
        document.getElementById('cols').value = lastValidState.cols;
        safeUpdateGrid();
    }
}

function createPixel() {
    const pixel = document.createElement('div');
    pixel.className = 'pixel';
    pixel.draggable = false;
    return pixel;
}

// ==================== Drawing ====================

let drawingTimeout = null;

function startDrawing(e) {
    e.preventDefault();
    state.isDrawing = true;
    const target = e.target.classList.contains('pixel') ? e.target : null;
    if (target) {
        pushHistory(); // Save state before drawing
        applyColor(target);
        if (state.mirrorMode.active) applyMirrorEffect(target);
    }
}

function handleDrawing(pixel) {
    if (!state.isDrawing || !pixel?.classList?.contains('pixel')) return;
    applyColor(pixel);
    if (state.mirrorMode.active) applyMirrorEffect(pixel);
}

function handleTouchDrawing(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const pixel = document.elementFromPoint(touch.clientX, touch.clientY);
    if (pixel?.classList?.contains('pixel')) {
        handleDrawing(pixel);
    }
}

function stopDrawing() {
    state.isDrawing = false;
}

function applyColor(pixel) {
    if (!pixel) return;

    switch (state.currentTool) {
        case 'brush':
            pixel.style.backgroundColor = state.currentColor;
            break;
        case 'eraser':
            pixel.style.backgroundColor = '#ffffff';
            break;
        case 'fill':
            floodFill(pixel);
            break;
        case 'picker':
            const pickedColor = rgbToHex(pixel.style.backgroundColor);
            state.currentColor = pickedColor;
            dom.colorInput.value = pickedColor;
            dom.colorHexInput.value = pickedColor.toUpperCase();
            updateColorPreview();
            showToast(`Color seleccionado: ${pickedColor}`, 'success');
            break;
    }
}

function applyMirrorEffect(originalPixel) {
    const index = Array.from(dom.grid.children).indexOf(originalPixel);
    const cols = parseInt(document.getElementById('cols').value);
    const rows = parseInt(document.getElementById('rows').value);
    const mirrorIndices = [];

    switch (state.mirrorMode.type) {
        case 'vertical':
            mirrorIndices.push(Math.floor(index / cols) * cols + (cols - 1 - (index % cols)));
            break;
        case 'horizontal':
            mirrorIndices.push((rows - 1 - Math.floor(index / cols)) * cols + (index % cols));
            break;
        case 'diagonal':
            mirrorIndices.push(
                Math.floor(index / cols) * cols + (cols - 1 - (index % cols)),
                (rows - 1 - Math.floor(index / cols)) * cols + (index % cols)
            );
            break;
    }

    mirrorIndices.forEach(idx => {
        if (dom.grid.children[idx]) {
            applyColor(dom.grid.children[idx]);
        }
    });
}

function floodFill(startPixel) {
    const targetColor = startPixel.style.backgroundColor;
    if (targetColor === state.currentColor) return;

    const queue = [startPixel];
    const visited = new Set();
    const cols = parseInt(document.getElementById('cols').value);

    while (queue.length > 0) {
        const current = queue.shift();
        if (!visited.has(current) && current.style.backgroundColor === targetColor) {
            current.style.backgroundColor = state.currentColor;
            visited.add(current);

            const index = Array.from(dom.grid.children).indexOf(current);
            const neighbors = [];

            if (index % cols > 0) neighbors.push(index - 1);
            if (index % cols < cols - 1) neighbors.push(index + 1);
            if (index >= cols) neighbors.push(index - cols);
            if (index < dom.grid.children.length - cols) neighbors.push(index + cols);

            neighbors.forEach(idx => {
                if (!visited.has(dom.grid.children[idx])) {
                    queue.push(dom.grid.children[idx]);
                }
            });
        }
    }
}

// ==================== Color Management ====================

function updateColorPreview() {
    dom.colorPreview.style.backgroundColor = state.currentColor;
    updateMobileColorPreview();
}

function addToPalette() {
    const hexColor = state.currentColor.toLowerCase();
    if (!state.paletas[state.currentPalette].includes(hexColor)) {
        state.paletas[state.currentPalette].push(hexColor);
        renderPalette();
        savePalettes();
        showToast('Color añadido a la paleta', 'success');
    } else {
        showToast('El color ya existe en la paleta', 'warning');
    }
}

function deleteColor(colorElement) {
    const colorStyle = colorElement.querySelector('.color-swatch').style.backgroundColor;
    state.deleteQueue = {
        element: colorElement,
        color: rgbToHex(colorStyle)
    };
    dom.confirmDialog.style.display = 'block';
    dom.dialogOverlay.style.display = 'block';
    dom.confirmDialog.setAttribute('aria-hidden', 'false');
}

function handleConfirm(response) {
    dom.confirmDialog.style.display = 'none';
    dom.dialogOverlay.style.display = 'none';
    dom.confirmDialog.setAttribute('aria-hidden', 'true');

    if (response && state.deleteQueue) {
        const colorToDelete = state.deleteQueue.color;
        const palette = state.paletas[state.currentPalette];
        const colorIndex = palette.findIndex(c => c.toLowerCase() === colorToDelete.toLowerCase());

        if (colorIndex > -1) {
            palette.splice(colorIndex, 1);
            state.deleteQueue.element.remove();
            savePalettes();
            showToast('Color eliminado', 'success');
        }
    }
    state.deleteQueue = null;
}

function rgbToHex(rgb) {
    if (!rgb || rgb === 'rgba(0, 0, 0, 0)') return '#ffffff';
    if (rgb.startsWith('#')) return rgb.toLowerCase();
    const values = rgb.match(/\d+/g)?.map(Number) || [0, 0, 0];
    return '#' + values.map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

function selectColor(color) {
    state.currentColor = color;
    dom.colorInput.value = color;
    dom.colorHexInput.value = color.toUpperCase();
    updateColorPreview();
}

// ==================== Grid Controls ====================

function toggleGrid() {
    state.gridVisible = !state.gridVisible;
    dom.grid.classList.toggle('grid-visible', state.gridVisible);
    dom.toggleGridBtn.classList.toggle('active', state.gridVisible);
    showToast(state.gridVisible ? 'Grid visible' : 'Grid oculto', 'info');
}

function toggleMirrorMode() {
    state.mirrorMode.active = !state.mirrorMode.active;
    dom.toggleMirrorBtn.classList.toggle('active');
    showToast(state.mirrorMode.active ? 'Modo espejo activado' : 'Modo espejo desactivado', 'info');
}

function changeMirrorType(type) {
    state.mirrorMode.type = type;
}

function clearGrid() {
    pushHistory();
    document.querySelectorAll('.pixel').forEach(pixel => {
        pixel.style.backgroundColor = '#ffffff';
    });
    showToast('Cuadrícula limpiada', 'info');
}

// ==================== Zoom ====================

function adjustZoom(amount) {
    state.currentZoom = Math.max(0.5, Math.min(3, state.currentZoom + amount));
    applyZoom();
}

function setZoom(value) {
    state.currentZoom = Math.max(0.5, Math.min(3, value));
    applyZoom();
}

function applyZoom() {
    dom.gridContainer.style.transform = `scale(${state.currentZoom})`;
    dom.zoomLevel.textContent = `${Math.round(state.currentZoom * 100)}%`;
    if (dom.zoomSlider) dom.zoomSlider.value = Math.round(state.currentZoom * 100);
}

// ==================== Save / Load ====================

function saveArt() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const scale = 20;
    const cols = parseInt(document.getElementById('cols').value);
    const rows = parseInt(document.getElementById('rows').value);

    canvas.width = cols * scale;
    canvas.height = rows * scale;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    document.querySelectorAll('.pixel').forEach((pixel, index) => {
        const x = (index % cols) * scale;
        const y = Math.floor(index / cols) * scale;

        const pixelColor = pixel.style.backgroundColor;

        if (!pixelColor || pixelColor.toLowerCase() === 'rgb(255, 255, 255)' || pixelColor.toLowerCase() === '#ffffff') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        } else {
            ctx.fillStyle = pixelColor;
        }

        ctx.fillRect(x, y, scale, scale);
    });

    const link = document.createElement('a');
    link.download = `pixel-art-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Arte guardado como PNG', 'success');
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.src = e.target.result;
        img.onload = function () {
            loadImageToGrid(img);
            showToast('Imagen cargada correctamente', 'success');
        };
    };
    reader.readAsDataURL(file);
}

function loadImageToGrid(image) {
    const cols = parseInt(document.getElementById('cols').value);
    const rows = parseInt(document.getElementById('rows').value);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = cols;
    canvas.height = rows;
    ctx.drawImage(image, 0, 0, cols, rows);

    const imageData = ctx.getImageData(0, 0, cols, rows);
    const pixels = imageData.data;

    dom.grid.innerHTML = '';

    for (let i = 0; i < pixels.length; i += 4) {
        const pixel = createPixel();
        const color = `rgba(${pixels[i]}, ${pixels[i + 1]}, ${pixels[i + 2]}, ${pixels[i + 3] / 255})`;
        pixel.style.backgroundColor = color;
        dom.grid.appendChild(pixel);
    }

    state.history = [getGridState()];
    state.historyIndex = 0;
    updateHistoryButtons();
}

// ==================== Palette Management ====================

function initPalettes() {
    dom.paletteSelector.innerHTML = Object.keys(state.paletas).map(p =>
        `<option ${p === state.currentPalette ? 'selected' : ''}>${p}</option>`
    ).join('');
    renderPalette();
}

function newPalette() {
    const name = prompt('Nombre de la nueva paleta:');
    if (name && !state.paletas[name]) {
        state.paletas[name] = [];
        state.currentPalette = name;
        initPalettes();
        savePalettes();
        showToast(`Paleta "${name}" creada`, 'success');
    } else if (state.paletas[name]) {
        showToast('Ya existe una paleta con ese nombre', 'warning');
    }
}

function changePalette(name) {
    state.currentPalette = name;
    renderPalette();
}

function renderPalette() {
    const container = document.getElementById('colorPalette');
    container.innerHTML = state.paletas[state.currentPalette].map(color => `
        <div class="color-swatch-container">
            <div
                class="color-swatch"
                style="background: ${color}"
                onclick="selectColor('${color}')"
                title="${color}"
            ></div>
            <div class="delete-color" onclick="deleteColor(this.parentElement)"></div>
        </div>
    `).join('');
}

function savePalettes() {
    localStorage.setItem('paletas', JSON.stringify(state.paletas));
}

// ==================== Coordinate Tracking ====================

function updateCursorCoords(e) {
    const pixel = e.target;
    if (!pixel?.classList?.contains('pixel')) return;

    const index = Array.from(dom.grid.children).indexOf(pixel);
    const cols = parseInt(document.getElementById('cols').value);
    const x = index % cols;
    const y = Math.floor(index / cols);
    dom.cursorCoords.textContent = `${x}, ${y}`;
}

// ==================== Keyboard Shortcuts ====================

function handleKeyboard(e) {
    // Don't trigger shortcuts when typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

    const key = e.key.toLowerCase();

    if (e.ctrlKey || e.metaKey) {
        switch (key) {
            case 'z':
                e.preventDefault();
                undo();
                return;
            case 'y':
                e.preventDefault();
                redo();
                return;
            case 's':
                e.preventDefault();
                saveArt();
                return;
        }
    }

    switch (key) {
        case 'b':
            selectTool('brush');
            break;
        case 'e':
            selectTool('eraser');
            break;
        case 'f':
            selectTool('fill');
            break;
        case 'i':
            selectTool('picker');
            break;
        case 'g':
            toggleGrid();
            break;
        case 'm':
            toggleMirrorMode();
            break;
        case '+':
        case '=':
            adjustZoom(0.1);
            break;
        case '-':
            adjustZoom(-0.1);
            break;
    }
}

function selectTool(toolName) {
    state.currentTool = toolName;
    document.querySelectorAll('.tool-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.tool === toolName);
    });
    syncMobileToolButtons(toolName);
}

// ==================== Shortcuts Panel ====================

function toggleShortcutsPanel() {
    dom.shortcutsPanel.classList.toggle('open');
}

// ==================== Event Listeners ====================

function setupEventListeners() {
    // Color input
    dom.colorInput.addEventListener('input', e => {
        state.currentColor = e.target.value;
        dom.colorHexInput.value = e.target.value.toUpperCase();
        updateColorPreview();
    });

    // Hex input
    dom.colorHexInput.addEventListener('input', e => {
        let val = e.target.value;
        if (!val.startsWith('#')) val = '#' + val;
        if (/^#[0-9a-fA-F]{6}$/.test(val)) {
            state.currentColor = val;
            dom.colorInput.value = val;
            updateColorPreview();
        }
    });

    // Confirm dialog
    dom.confirmYes.addEventListener('click', () => handleConfirm(true));
    dom.confirmNo.addEventListener('click', () => handleConfirm(false));
    dom.dialogOverlay.addEventListener('click', () => handleConfirm(false));

    // Panel buttons
    dom.newPaletteBtn.addEventListener('click', newPalette);
    dom.addToPaletteBtn.addEventListener('click', addToPalette);
    dom.toggleMirrorBtn.addEventListener('click', toggleMirrorMode);
    dom.toggleGridBtn.addEventListener('click', toggleGrid);
    dom.clearGridBtn.addEventListener('click', clearGrid);
    dom.saveArtBtn.addEventListener('click', saveArt);
    dom.imageLoader.addEventListener('change', handleImageUpload);

    // History
    dom.undoBtn.addEventListener('click', undo);
    dom.redoBtn.addEventListener('click', redo);

    // Zoom
    dom.zoomInBtn.addEventListener('click', () => adjustZoom(0.1));
    dom.zoomOutBtn.addEventListener('click', () => adjustZoom(-0.1));
    dom.zoomSlider.addEventListener('input', e => setZoom(parseInt(e.target.value) / 100));

    // Grid update
    dom.updateGridBtn.addEventListener('click', safeUpdateGrid);

    // Shortcuts panel
    dom.shortcutsBtn.addEventListener('click', toggleShortcutsPanel);
    dom.closeShortcuts.addEventListener('click', toggleShortcutsPanel);

    // Mirror type
    dom.mirrorTypeSelector.addEventListener('change', e => changeMirrorType(e.target.value));

    // Palette selector
    dom.paletteSelector.addEventListener('change', e => changePalette(e.target.value));

    // Tool buttons
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            selectTool(this.dataset.tool);
        });
    });

    // Drawing — Mouse
    document.addEventListener('mousedown', function (e) {
        if (e.target.classList.contains('pixel')) {
            state.isDrawing = true;
            pushHistory();
            handleDrawing(e.target);
        }
    });

    document.addEventListener('mousemove', function (e) {
        if (state.isDrawing && e.target.classList.contains('pixel')) {
            handleDrawing(e.target);
        }
        updateCursorCoords(e);
    });

    document.addEventListener('mouseup', stopDrawing);

    // Drawing — Touch
    dom.grid.addEventListener('touchstart', function (e) {
        const touch = e.touches[0];
        const pixel = document.elementFromPoint(touch.clientX, touch.clientY);
        if (pixel?.classList?.contains('pixel')) {
            e.preventDefault();
            state.isDrawing = true;
            pushHistory();
            handleDrawing(pixel);
        }
    }, { passive: false });

    dom.grid.addEventListener('touchmove', function (e) {
        e.preventDefault();
        const touch = e.touches[0];
        const pixel = document.elementFromPoint(touch.clientX, touch.clientY);
        if (pixel?.classList?.contains('pixel')) {
            handleDrawing(pixel);
        }
    }, { passive: false });

    document.addEventListener('touchend', stopDrawing);

    // Prevent text selection while drawing
    document.addEventListener('selectstart', function (e) {
        if (e.target.classList.contains('pixel')) {
            e.preventDefault();
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);

    // Mouse wheel zoom on canvas
    document.getElementById('mainArea').addEventListener('wheel', function (e) {
        if (e.ctrlKey) {
            e.preventDefault();
            adjustZoom(e.deltaY > 0 ? -0.1 : 0.1);
        }
    }, { passive: false });

    // Grid config enter key
    document.getElementById('rows').addEventListener('keydown', e => {
        if (e.key === 'Enter') safeUpdateGrid();
    });
    document.getElementById('cols').addEventListener('keydown', e => {
        if (e.key === 'Enter') safeUpdateGrid();
    });

    // ---- Mobile-specific listeners ----
    setupMobileListeners();
}

// ==================== Mobile Support ====================

function isMobile() {
    return window.matchMedia('(max-width: 768px)').matches;
}

function toggleMobilePanel() {
    const isOpen = dom.toolPanel.classList.toggle('open');
    dom.mobilePanelOverlay.classList.toggle('visible', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
}

function closeMobilePanel() {
    dom.toolPanel.classList.remove('open');
    dom.mobilePanelOverlay.classList.remove('visible');
    document.body.style.overflow = '';
}

function syncMobileToolButtons(toolName) {
    // Sync mobile toolbar buttons
    if (dom.mobileToolbar) {
        dom.mobileToolbar.querySelectorAll('.mobile-tool-btn[data-tool]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === toolName);
        });
    }
    // Sync sidebar buttons
    document.querySelectorAll('.tool-btn[data-tool]').forEach(b => {
        b.classList.toggle('active', b.dataset.tool === toolName);
    });
}

function updateMobileColorPreview() {
    if (dom.mobileColorPreview) {
        dom.mobileColorPreview.style.backgroundColor = state.currentColor;
    }
}

function setupMobileListeners() {
    // Panel toggle
    if (dom.mobilePanelToggle) {
        dom.mobilePanelToggle.addEventListener('click', toggleMobilePanel);
    }

    // Overlay closes panel
    if (dom.mobilePanelOverlay) {
        dom.mobilePanelOverlay.addEventListener('click', closeMobilePanel);
    }

    // Mobile toolbar tool buttons
    if (dom.mobileToolbar) {
        dom.mobileToolbar.querySelectorAll('.mobile-tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', function () {
                selectTool(this.dataset.tool);
                syncMobileToolButtons(this.dataset.tool);
            });
        });
    }

    // Mobile undo/redo/save
    if (dom.mobileUndoBtn) dom.mobileUndoBtn.addEventListener('click', undo);
    if (dom.mobileRedoBtn) dom.mobileRedoBtn.addEventListener('click', redo);
    if (dom.mobileSaveBtn) dom.mobileSaveBtn.addEventListener('click', saveArt);

    // Mobile color preview opens color picker (via sidebar)
    if (dom.mobileColorPreview) {
        dom.mobileColorPreview.addEventListener('click', () => {
            toggleMobilePanel();
        });
    }

    // Close panel when selecting a tool from sidebar on mobile
    document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
        btn.addEventListener('click', function () {
            if (isMobile()) {
                syncMobileToolButtons(this.dataset.tool);
            }
        });
    });

    // Pinch zoom support for mobile
    let lastPinchDist = 0;
    dom.grid.addEventListener('touchstart', function (e) {
        if (e.touches.length === 2) {
            e.preventDefault();
            lastPinchDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
        }
    }, { passive: false });

    dom.grid.addEventListener('touchmove', function (e) {
        if (e.touches.length === 2) {
            e.preventDefault();
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const delta = dist - lastPinchDist;
            if (Math.abs(delta) > 5) {
                adjustZoom(delta > 0 ? 0.05 : -0.05);
                lastPinchDist = dist;
            }
        }
    }, { passive: false });
}

// ==================== Initialization ====================

function refreshGridSize() {
    const pixelSize = getPixelSize();
    const cols = parseInt(document.getElementById('cols').value) || 16;
    dom.grid.style.gridTemplateColumns = `repeat(${cols}, ${pixelSize})`;
}

let resizeTimer;
function handleResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(refreshGridSize, 150);
}

function init() {
    cacheDom();
    setupEventListeners();
    safeUpdateGrid();
    updateColorPreview();
    updateMobileColorPreview();
    initPalettes();

    // Set initial grid toggle state
    dom.toggleGridBtn.classList.toggle('active', state.gridVisible);

    // Re-adjust grid on resize / orientation change
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => setTimeout(refreshGridSize, 300));

    showToast('¡Bienvenido a Pixel Art Studio Pro++!', 'info');
}

document.addEventListener('DOMContentLoaded', init);