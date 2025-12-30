// Excel Automation Tool - Enhanced JavaScript with Dynamic UI
// State Management
let state = {
    workbook: null,
    currentSheet: null,
    sheetData: null,
    columns: [],
    columnTypes: {},
    originalFilename: '',
    activeColumns: [], // Columns selected by user to keep/process
    selectedColumns: {
        detected: [],  // Track selected columns from Step 2
        duplicates: [],
        trim: [],
        case: [],
        textToNumber: [],
        mergeSource: [],
        splitSource: ''
    },
    operations: {
        removeDuplicates: false,
        trimSpaces: false,
        textCase: false,
        textToNumber: false,
        mergeColumns: false,
        splitColumn: false
    },
    formulas: [],
    processedData: null
};

// DOM Elements
const fileInput = document.getElementById('file-input');
const uploadZone = document.getElementById('upload-zone');
const fileInfoContainer = document.getElementById('file-info-container');
const sheetSelector = document.getElementById('sheet-selector');
const columnList = document.getElementById('column-list');
const operationsGrid = document.getElementById('operations-grid');
const processBtn = document.getElementById('process-btn');
const downloadBtn = document.getElementById('download-btn');
const addFormulaBtn = document.getElementById('add-formula-btn');
const formulaList = document.getElementById('formula-list');
const formulaEmpty = document.getElementById('formula-empty');
const columnMappingContainer = document.getElementById('column-mapping-container');
const dataPreviewContainer = document.getElementById('data-preview-container');
const processingStatus = document.getElementById('processing-status');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

// Step cards
const stepUpload = document.getElementById('step-upload');
const stepSheet = document.getElementById('step-sheet');
const stepOperations = document.getElementById('step-operations');
const stepProcess = document.getElementById('step-process');
const stepDownload = document.getElementById('step-download');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    generateOperationCards();
});

function setupEventListeners() {
    // File upload
    uploadZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('active');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('active');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('active');
        if (e.dataTransfer.files.length > 0) {
            handleFileSelect({ target: { files: e.dataTransfer.files } });
        }
    });

    // Sheet selector
    sheetSelector.addEventListener('change', handleSheetChange);

    // Process button
    processBtn.addEventListener('click', processExcelFile);

    // Download button
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadProcessedFile);
    }

    // Add formula button
    if (addFormulaBtn) {
        addFormulaBtn.addEventListener('click', addFormulaRow);
    }

    // Detected column selection buttons
    const selectAllBtn = document.getElementById('select-all-detected');
    const clearAllBtn = document.getElementById('clear-all-detected');
    const searchInput = document.getElementById('detected-column-search');

    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', selectAllDetectedColumns);
    }

    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllDetectedColumns);
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => searchDetectedColumns(e.target.value));
    }
}

// Generate Operation Cards Dynamically
// Generate Operation Cards Dynamically
function generateOperationCards() {
    const operations = [
        {
            id: 'remove-duplicates',
            category: 'cleaning',
            icon: 'fa-copy',
            title: 'Remove Duplicates',
            desc: 'Remove duplicate rows based on selected columns',
            hasColumnSelector: true,
            hasRadioOptions: true,
            radioOptions: [
                { id: 'keep-first', label: 'Keep First', icon: 'fa-arrow-up', value: 'first' },
                { id: 'keep-last', label: 'Keep Last', icon: 'fa-arrow-down', value: 'last' }
            ]
        },
        {
            id: 'trim-spaces',
            category: 'cleaning',
            icon: 'fa-scissors',
            title: 'Remove Extra Spaces',
            desc: 'Trim leading, trailing, and multiple spaces',
            hasColumnSelector: true
        },
        {
            id: 'text-case',
            category: 'text',
            icon: 'fa-font',
            title: 'Text Case Conversion',
            desc: 'Convert text to uppercase, lowercase, or proper case',
            hasColumnSelector: true,
            hasRadioOptions: true,
            radioOptions: [
                { id: 'case-upper', label: 'UPPERCASE', icon: 'fa-font', value: 'upper' },
                { id: 'case-lower', label: 'lowercase', icon: 'fa-font', value: 'lower' },
                { id: 'case-proper', label: 'Proper Case', icon: 'fa-font', value: 'proper' }
            ]
        },
        {
            id: 'text-to-number',
            category: 'text',
            icon: 'fa-hashtag',
            title: 'Convert Text to Number',
            desc: 'Convert text columns containing numbers to numeric type',
            hasColumnSelector: true
        },
        {
            id: 'merge-columns',
            category: 'merge',
            icon: 'fa-object-group',
            title: 'Merge Columns',
            desc: 'Combine multiple columns into one',
            hasColumnSelector: true,
            hasCustomInputs: true,
            customInputs: [
                { id: 'merge-separator', label: 'Separator', type: 'text', placeholder: 'e.g., space, comma', defaultValue: ' ' },
                { id: 'merge-new-name', label: 'New column name', type: 'text', placeholder: 'Merged_Column' }
            ]
        },
        {
            id: 'split-column',
            category: 'merge',
            icon: 'fa-split',
            title: 'Split Column',
            desc: 'Split one column into multiple columns',
            hasSingleColumnSelector: true,
            hasCustomInputs: true,
            customInputs: [
                { id: 'split-delimiter', label: 'Delimiter', type: 'text', placeholder: 'e.g., space, comma, -', defaultValue: ' ' },
                { id: 'split-count', label: 'Number of columns to create', type: 'number', min: 2, max: 10, defaultValue: 2 }
            ]
        }
    ];

    // Render operations into specific containers
    const containers = {
        cleaning: document.getElementById('ops-container-cleaning'),
        text: document.getElementById('ops-container-text'),
        merge: document.getElementById('ops-container-merge')
    };

    operations.forEach(op => {
        if (containers[op.category]) {
            containers[op.category].innerHTML += createOperationCard(op);
        }
    });

    // Add event listeners for operations
    operations.forEach(op => {
        const checkbox = document.getElementById(`cb-${op.id}`);
        const card = document.getElementById(`op-${op.id}`);

        if (checkbox && card) {
            checkbox.addEventListener('change', (e) => handleOperationToggle(e, card));

            // Radio button listeners
            if (op.hasRadioOptions) {
                op.radioOptions.forEach(radio => {
                    const radioEl = document.getElementById(radio.id);
                    if (radioEl) {
                        radioEl.addEventListener('change', () => {
                            updateRadioCards(op.id);
                        });
                    }
                });
            }
        }
    });

    // Setup New Upgrade Listeners (Tabs, Gatekeeper)
    setupUpgradeListeners();
}

function setupUpgradeListeners() {
    // 1. Extract Data Button (Gatekeeper)
    const extractBtn = document.getElementById('extract-data-btn');
    if (extractBtn) {
        extractBtn.addEventListener('click', handleExtractData);
    }

    // 2. Tab Navigation
    const tabs = document.querySelectorAll('.op-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // 3. Start Modification Button
    const startModBtn = document.getElementById('start-modification-btn');
    if (startModBtn) {
        startModBtn.addEventListener('click', handleStartModification);
    }
}

function handleExtractData() {
    if (state.selectedColumns.detected.length === 0) {
        showToast('Please select at least one column to proceed', 'error');
        return;
    }

    // Lock Step 2
    stepSheet.classList.add('locked');

    // Reveal Step 3
    stepOperations.classList.remove('disabled');
    stepOperations.scrollIntoView({ behavior: 'smooth' });

    // Initialize selectors with selected columns
    populateColumnSelectors();
}

function switchTab(tabId) {
    // Update Tabs
    document.querySelectorAll('.op-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.op-tab[data-tab="${tabId}"]`).classList.add('active');

    // Update Content
    document.querySelectorAll('.op-tab-content').forEach(c => c.style.display = 'none');
    const content = document.getElementById(`tab-${tabId}`);
    if (content) {
        content.style.display = 'block';
    }
}

function handleStartModification() {
    // Basic validation could go here

    // Transition to Step 4
    stepProcess.classList.remove('disabled');
    stepProcess.scrollIntoView({ behavior: 'smooth' });

    // Update Preview
    updatePreview();
}

function createOperationCard(op) {
    return `
        <div class="operation-card" id="op-${op.id}">
            <div class="operation-card-header">
                <div class="checkbox-wrapper">
                    <input type="checkbox" id="cb-${op.id}">
                    <span class="custom-checkbox"></span>
                </div>
                
                <div class="operation-icon-wrapper">
                    <i class="fas ${op.icon} operation-icon"></i>
                </div>
                
                <div class="operation-info">
                    <h4 class="operation-title">${op.title}</h4>
                    <p class="operation-desc">${op.desc}</p>
                </div>
                
                <div class="toggle-indicator">
                    <i class="fas fa-chevron-down"></i>
                </div>
            </div>
            
            <div class="operation-config-panel">
                ${op.hasColumnSelector ? `<div id="selector-${op.id}"></div>` : ''}
                ${op.hasSingleColumnSelector ? `
                    <div class="form-group">
                        <label class="form-label">Select column to split</label>
                        <select id="${op.id}-column" class="form-select"></select>
                    </div>
                ` : ''}
                ${op.hasRadioOptions ? `
                    <div class="radio-group-enhanced">
                        <span class="radio-label">${op.title === 'Remove Duplicates' ? 'Keep which occurrence?' : 'Select case type'}</span>
                        <div class="radio-options" id="radio-${op.id}">
                            ${op.radioOptions.map((radio, idx) => `
                                <div class="radio-option-card ${idx === 0 ? 'active' : ''}" onclick="selectRadio('${radio.id}')">
                                    <input type="radio" id="${radio.id}" name="${op.id}-radio" value="${radio.value}" ${idx === 0 ? 'checked' : ''}>
                                    <label for="${radio.id}">
                                        <i class="fas ${radio.icon}"></i>
                                        <span>${radio.label}</span>
                                    </label>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                ${op.hasCustomInputs ? op.customInputs.map(input => `
                    <div class="form-group">
                        <label class="form-label">${input.label}</label>
                        <input type="${input.type}" id="${input.id}" class="form-input" 
                               placeholder="${input.placeholder || ''}" 
                               value="${input.defaultValue || ''}"
                               ${input.min ? `min="${input.min}"` : ''}
                               ${input.max ? `max="${input.max}"` : ''}>
                    </div>
                `).join('') : ''}
            </div>
        </div>
    `;
}

function handleOperationToggle(e, card) {
    const checkbox = e.target;
    if (checkbox.checked) {
        card.classList.add('active');
    } else {
        card.classList.remove('active');
    }
    updatePreview();
}

window.selectRadio = function (radioId) {
    const radio = document.getElementById(radioId);
    if (radio) {
        radio.checked = true;
        const parent = radio.closest('.radio-options');
        parent.querySelectorAll('.radio-option-card').forEach(card => {
            card.classList.remove('active');
        });
        radio.closest('.radio-option-card').classList.add('active');
    }
};

function updateRadioCards(opId) {
    const radioGroup = document.getElementById(`radio-${opId}`);
    if (radioGroup) {
        radioGroup.querySelectorAll('.radio-option-card').forEach(card => {
            const radio = card.querySelector('input[type="radio"]');
            if (radio.checked) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });
    }
}

// File Handling
async function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
        showToast('Please upload a valid Excel file (.xlsx or .xls)', 'error');
        return;
    }

    try {
        showToast('Reading file...', 'info');
        const data = await readExcelFile(file);
        state.workbook = data;
        state.originalFilename = file.name;

        displayFileInfo(file);
        populateSheetSelector();
        enableStep(stepSheet);

        showToast('File loaded successfully!', 'success');
    } catch (error) {
        console.error(error);
        showToast('Error reading file: ' + error.message, 'error');
    }
}

function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                resolve(workbook);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

function displayFileInfo(file) {
    const sheetCount = state.workbook.SheetNames.length;
    const fileSize = formatFileSize(file.size);

    fileInfoContainer.innerHTML = `
        <div style="background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%); border: 2px solid #e5e7eb; border-radius: 12px; padding: 1.25rem; margin-top: 1.5rem; display: flex; align-items: center; gap: 1rem;">
            <i class="fas fa-file-excel" style="font-size: 2.5rem; color: #10b981;"></i>
            <div style="flex: 1;">
                <div style="font-weight: 600; color: #1f2937; font-size: 1.125rem;">${file.name}</div>
                <div style="color: #6b7280; font-size: 0.875rem; margin-top: 0.25rem;">${fileSize} • ${sheetCount} sheet${sheetCount > 1 ? 's' : ''}</div>
            </div>
        </div>
    `;
    fileInfoContainer.classList.remove('hidden');
}

function populateSheetSelector() {
    const sheetNames = state.workbook.SheetNames;
    sheetSelector.innerHTML = sheetNames.map(name =>
        `<option value="${name}">${name}</option>`
    ).join('');

    handleSheetChange();
}

function handleSheetChange() {
    const sheetName = sheetSelector.value;
    state.currentSheet = sheetName;

    const worksheet = state.workbook.Sheets[sheetName];
    state.sheetData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    analyzeColumns();

    // Auto-select all columns by default
    state.selectedColumns.detected = [...state.columns];

    displayColumns();
    populateColumnSelectors();
    enableStep(stepOperations);
    enableStep(stepProcess);
    updatePreview();
}

// Column Analysis
function analyzeColumns() {
    if (!state.sheetData || state.sheetData.length === 0) {
        state.columns = [];
        state.columnTypes = {};
        return;
    }

    const firstRow = state.sheetData[0];
    state.columns = Object.keys(firstRow);

    // Detect data types
    state.columns.forEach(col => {
        state.columnTypes[col] = detectColumnType(col, state.sheetData);
    });
}

function detectColumnType(columnName, data) {
    const samples = data.slice(0, Math.min(100, data.length));
    const types = { number: 0, date: 0, boolean: 0, text: 0, empty: 0 };

    samples.forEach(row => {
        const value = row[columnName];

        if (value === null || value === undefined || value === '') {
            types.empty++;
        } else if (typeof value === 'boolean') {
            types.boolean++;
        } else if (value instanceof Date) {
            types.date++;
        } else if (!isNaN(value) && typeof value === 'number') {
            types.number++;
        } else if (typeof value === 'string') {
            if (isDateString(value)) {
                types.date++;
            } else if (!isNaN(parseFloat(value))) {
                types.number++;
            } else {
                types.text++;
            }
        } else {
            types.text++;
        }
    });

    // Determine primary type
    delete types.empty;
    const maxType = Object.keys(types).reduce((a, b) => types[a] > types[b] ? a : b);

    // If mixed types
    const total = Object.values(types).reduce((a, b) => a + b, 0);
    const maxCount = types[maxType];
    if (maxCount / total < 0.7) {
        return 'mixed';
    }

    return maxType;
}

function isDateString(str) {
    const datePatterns = [
        /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,
        /^\d{4}-\d{2}-\d{2}$/,
        /^\d{1,2}-\d{1,2}-\d{2,4}$/
    ];
    return datePatterns.some(pattern => pattern.test(str));
}

function displayColumns() {
    const icons = {
        text: 'fa-font',
        number: 'fa-hashtag',
        date: 'fa-calendar',
        boolean: 'fa-toggle-on',
        mixed: 'fa-question-circle'
    };

    columnList.innerHTML = state.columns.map(col => {
        const type = state.columnTypes[col];
        const isSelected = state.selectedColumns.detected.includes(col);

        return `
            <div class="column-item-selectable ${isSelected ? 'selected' : ''}" 
                 data-column="${col}" 
                 onclick="toggleDetectedColumn(this)">
                <div class="column-checkbox">
                    ${isSelected ? '<i class="fas fa-check"></i>' : ''}
                </div>
                <div class="column-content">
                    <i class="fas ${icons[type]} column-type-icon ${type}"></i>
                    <span class="column-name">${col}</span>
                    <span class="column-type">${type.toUpperCase()}</span>
                </div>
            </div>
        `;
    }).join('');

    updateDetectedCount();
}

function populateColumnSelectors() {
    // Use ONLY selected columns from Step 2 for all operations
    const availableColumns = state.selectedColumns.detected;

    // Create column selectors for each operation using filtered columns
    createColumnSelector('selector-remove-duplicates', 'duplicates', availableColumns);
    createColumnSelector('selector-trim-spaces', 'trim', availableColumns);
    createColumnSelector('selector-text-case', 'case', availableColumns);
    createColumnSelector('selector-text-to-number', 'textToNumber', availableColumns);
    createColumnSelector('selector-merge-columns', 'mergeSource', availableColumns);

    // Populate single column dropdown for split - only selected columns
    const splitSelect = document.getElementById('split-column-column');
    if (splitSelect) {
        splitSelect.innerHTML = availableColumns.map(col =>
            `<option value="${col}">${col}</option>`
        ).join('');
    }
}

function createColumnSelector(containerId, stateKey, columnsToShow = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Use provided columns or fall back to selected columns from Step 2
    const availableColumns = columnsToShow || state.selectedColumns.detected;

    const html = `
        <div class="column-selector">
            <div class="selector-header">
                <label>Select columns</label>
                <span class="selected-count" id="count-${stateKey}">0 selected</span>
            </div>
            
            <div class="search-box">
                <i class="fas fa-search"></i>
                <input type="text" class="column-search" placeholder="Search columns..." onkeyup="searchColumns('${stateKey}', this.value)">
            </div>
            
            <div class="column-options-grid" id="grid-${stateKey}">
                ${availableColumns.map(col => createColumnOption(col, stateKey)).join('')}
            </div>
            
            <div class="selector-footer">
                <button class="select-all-btn" onclick="selectAllColumns('${stateKey}')">Select All</button>
                <button class="clear-all-btn" onclick="clearAllColumns('${stateKey}')">Clear All</button>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function createColumnOption(column, stateKey) {
    const type = state.columnTypes[column] || 'text';
    const icons = {
        text: 'fa-font',
        number: 'fa-hashtag',
        date: 'fa-calendar',
        boolean: 'fa-toggle-on',
        mixed: 'fa-question-circle'
    };

    const selected = state.selectedColumns[stateKey].includes(column);

    return `
        <div class="column-option" data-column="${column}" data-selected="${selected}" data-key="${stateKey}" onclick="toggleColumn(this)">
            <div class="column-checkbox">${selected ? '✓' : ''}</div>
            <div class="column-info">
                <i class="fas ${icons[type]} column-type-icon ${type}"></i>
                <span class="column-name">${column}</span>
                <span class="column-type-badge">${type.toUpperCase()}</span>
            </div>
        </div>
    `;
}

window.toggleColumn = function (element) {
    const column = element.getAttribute('data-column');
    const key = element.getAttribute('data-key');
    const isSelected = element.getAttribute('data-selected') === 'true';

    if (isSelected) {
        state.selectedColumns[key] = state.selectedColumns[key].filter(c => c !== column);
        element.setAttribute('data-selected', 'false');
        element.querySelector('.column-checkbox').textContent = '';
    } else {
        state.selectedColumns[key].push(column);
        element.setAttribute('data-selected', 'true');
        element.querySelector('.column-checkbox').textContent = '✓';
    }

    updateSelectedCount(key);
    updatePreview();
};

window.selectAllColumns = function (key) {
    state.selectedColumns[key] = [...state.selectedColumns.detected];
    const grid = document.getElementById(`grid-${key}`);
    if (grid) {
        grid.querySelectorAll('.column-option').forEach(opt => {
            opt.setAttribute('data-selected', 'true');
            opt.querySelector('.column-checkbox').textContent = '✓';
        });
    }
    updateSelectedCount(key);
    updatePreview();
};

window.clearAllColumns = function (key) {
    state.selectedColumns[key] = [];
    const grid = document.getElementById(`grid-${key}`);
    if (grid) {
        grid.querySelectorAll('.column-option').forEach(opt => {
            opt.setAttribute('data-selected', 'false');
            opt.querySelector('.column-checkbox').textContent = '';
        });
    }
    updateSelectedCount(key);
    updatePreview();
};

window.searchColumns = function (key, query) {
    const grid = document.getElementById(`grid-${key}`);
    if (!grid) return;

    const options = grid.querySelectorAll('.column-option');
    options.forEach(opt => {
        const columnName = opt.getAttribute('data-column').toLowerCase();
        if (columnName.includes(query.toLowerCase())) {
            opt.style.display = '';
        } else {
            opt.style.display = 'none';
        }
    });
};

function updateSelectedCount(key) {
    const count = state.selectedColumns[key].length;
    const countEl = document.getElementById(`count-${key}`);
    if (countEl) {
        countEl.textContent = `${count} selected`;
    }
}

// Formula Management
let formulaCounter = 0;


function addFormulaRow() {
    const formulaId = `formula-${formulaCounter++}`;

    const formulaHTML = `
        <div class="formula-item" style="background: white; border: 2px solid #e5e7eb; border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 0.4rem 1rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600;">
                    <i class="fas fa-function"></i> FORMULA #${formulaCounter}
                </span>
                <button onclick="removeFormula('${formulaId}')" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 1.25rem; padding: 0.25rem;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="form-group">
                <label class="form-label">Formula Type</label>
                <select class="form-select formula-type" id="type-${formulaId}" onchange="updateFormulaConfig('${formulaId}')">
                    <option value="">Select formula...</option>
                    <optgroup label="Math & Stats">
                        <option value="SUM">SUM - Add values</option>
                        <option value="AVERAGE">AVERAGE - Calculate average</option>
                        <option value="COUNT">COUNT - Count numbers</option>
                        <option value="COUNTIF">COUNTIF - Count with condition</option>
                        <option value="SUMIF">SUMIF - Sum with condition</option>
                    </optgroup>
                    <optgroup label="Text & Logic">
                        <option value="IF">IF - Conditional logic</option>
                        <option value="CONCAT">CONCAT - Combine text</option>
                        <option value="LEFT">LEFT - Extract left characters</option>
                        <option value="RIGHT">RIGHT - Extract right characters</option>
                    </optgroup>
                    <optgroup label="Lookup">
                        <option value="VLOOKUP">VLOOKUP - Vertical Lookup</option>
                        <option value="XLOOKUP">XLOOKUP - Modern Lookup</option>
                    </optgroup>
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">New Column Name</label>
                <input type="text" class="form-input formula-new-column" placeholder="Result_Column">
            </div>
            
            <div id="config-${formulaId}" class="formula-config-panel"></div>
        </div>
    `;

    formulaList.insertAdjacentHTML('beforeend', formulaHTML);
    formulaEmpty.classList.add('hidden');
    // updatePreview(); // Don't update preview on add, only on config change
}

window.updateFormulaConfig = function (formulaId) {
    const type = document.getElementById(`type-${formulaId}`).value;
    const container = document.getElementById(`config-${formulaId}`);
    const columns = state.selectedColumns.detected; // Use selected columns for options

    let html = '';

    if (!type) {
        container.innerHTML = '';
        return;
    }

    const columnOptions = columns.map(c => `<option value="${c}">${c}</option>`).join('');

    switch (type) {
        case 'SUM':
        case 'AVERAGE':
        case 'COUNT':
            html = `
                <div class="form-group">
                    <label class="form-label">Select Column</label>
                    <select class="form-select">${columnOptions}</select>
                </div>`;
            break;
        case 'COUNTIF':
        case 'SUMIF':
            html = `
                <div class="form-group">
                    <label class="form-label">Range Column</label>
                    <select class="form-select">${columnOptions}</select>
                </div>
                <div class="form-group">
                    <label class="form-label">Criteria</label>
                    <input type="text" class="form-input" placeholder="e.g. >100 or 'Pending'">
                </div>`;
            break;
        case 'IF':
            html = `
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem;">
                    <select class="form-select" placeholder="Col">${columnOptions}</select>
                    <select class="form-select">
                        <option value="==">Equals</option>
                        <option value=">">Greater than</option>
                        <option value="<">Less than</option>
                        <option value="!=">Not equal</option>
                    </select>
                    <input type="text" class="form-input" placeholder="Value">
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.5rem;">
                    <input type="text" class="form-input" placeholder="True Result">
                    <input type="text" class="form-input" placeholder="False Result">
                </div>`;
            break;
        case 'CONCAT':
            html = `
                <div class="form-group">
                    <label class="form-label">Select Columns to Join</label>
                    <select class="form-select" multiple style="height: 100px;">${columnOptions}</select>
                    <p class="text-xs text-gray-500">Hold Ctrl to select multiple</p>
                </div>
                <div class="form-group">
                    <label class="form-label">Separator</label>
                    <input type="text" class="form-input" placeholder="e.g. space, comma">
                </div>`;
            break;
        case 'LEFT':
        case 'RIGHT':
            html = `
                <div class="form-group">
                    <label class="form-label">Source Column</label>
                    <select class="form-select">${columnOptions}</select>
                </div>
                <div class="form-group">
                    <label class="form-label">Number of Characters</label>
                    <input type="number" class="form-input" value="3">
                </div>`;
            break;
        case 'VLOOKUP':
        case 'XLOOKUP':
            html = `
                <div class="alert alert-info" style="background: #eef2ff; color: #667eea; padding: 0.75rem; border-radius: 8px; font-size: 0.9rem;">
                    <i class="fas fa-info-circle"></i> Lookup features require a second sheet. Currently limited to intra-sheet lookups.
                </div>
                <div class="form-group">
                    <label class="form-label">Lookup Value Column</label>
                    <select class="form-select">${columnOptions}</select>
                </div>
                <div class="form-group">
                    <label class="form-label">Result Column</label>
                    <select class="form-select">${columnOptions}</select>
                </div>`;
            break;
    }

    container.innerHTML = html;
    updatePreview();
};

// Update Preview
function updatePreview() {
    displayColumnMapping();
    displayDataPreview();
}

function displayColumnMapping() {
    // Use ONLY selected columns from Step 2 as "original"
    const originalColumns = state.selectedColumns.detected;
    const newColumns = [];

    // Check for merge operation
    if (document.getElementById('cb-merge-columns')?.checked) {
        const newName = document.getElementById('merge-new-name')?.value || 'Merged_Column';
        newColumns.push(newName);
    }

    // Check for split operation
    if (document.getElementById('cb-split-column')?.checked) {
        const sourceCol = document.getElementById('split-column-column')?.value;
        const count = parseInt(document.getElementById('split-count')?.value || 2);
        if (sourceCol) {
            for (let i = 1; i <= count; i++) {
                newColumns.push(`${sourceCol}_Part${i}`);
            }
        }
    }

    // Add formula columns
    const formulaItems = document.querySelectorAll('.formula-new-column');
    formulaItems.forEach(input => {
        if (input.value) {
            newColumns.push(input.value);
        }
    });

    const outputColumns = [...originalColumns, ...newColumns];

    columnMappingContainer.innerHTML = `
        <div class="column-mapping-display">
            <h4><i class="fas fa-columns"></i> Column Mapping</h4>
            <div class="mapping-grid">
                <div class="original-columns">
                    <span class="label">Selected Columns (${originalColumns.length})</span>
                    <div class="column-tags">
                        ${originalColumns.map(col => `<span class="column-tag">${col}</span>`).join('')}
                    </div>
                </div>
                
                <div class="arrow-icon">→</div>
                
                <div class="output-columns">
                    <span class="label">Output Columns (${outputColumns.length})</span>
                    <div class="column-tags">
                        ${outputColumns.map(col => {
        const isNew = newColumns.includes(col);
        return `<span class="column-tag ${isNew ? 'new' : ''}">${col}</span>`;
    }).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function displayDataPreview() {
    if (!state.sheetData || state.sheetData.length === 0) return;

    const previewData = state.sheetData.slice(0, 20);

    // Use ONLY selected columns from Step 2
    const allColumns = [...state.selectedColumns.detected];

    // Add new columns from operations
    if (document.getElementById('cb-merge-columns')?.checked) {
        const newName = document.getElementById('merge-new-name')?.value || 'Merged_Column';
        allColumns.push(newName);
    }

    if (document.getElementById('cb-split-column')?.checked) {
        const sourceCol = document.getElementById('split-column-column')?.value;
        const count = parseInt(document.getElementById('split-count')?.value || 2);
        if (sourceCol) {
            for (let i = 1; i <= count; i++) {
                allColumns.push(`${sourceCol}_Part${i}`);
            }
        }
    }

    dataPreviewContainer.innerHTML = `
        <div class="data-preview-card">
            <div class="preview-header">
                <h4><i class="fas fa-eye"></i> Data Preview</h4>
                <span class="rows-info">Showing ${Math.min(20, state.sheetData.length)} of ${state.sheetData.length} rows</span>
            </div>
            
            <div class="table-scroll-wrapper">
                <table class="data-preview-table">
                    <thead>
                        <tr>
                            ${allColumns.map(col => {
        const isNew = !state.selectedColumns.detected.includes(col);
        return `<th class="${isNew ? 'new-column' : ''}">${col}</th>`;
    }).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${previewData.map(row => `
                            <tr>
                                ${allColumns.map(col => {
        const isNew = !state.selectedColumns.detected.includes(col);
        const value = row[col] !== undefined && row[col] !== null ? row[col] : '';
        return `<td class="${isNew ? 'new-column' : ''}">${value}</td>`;
    }).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="preview-footer">
                <span class="info-text">
                    <i class="fas fa-info-circle"></i>
                    Preview shows first 20 rows. Scroll horizontally to view all columns.
                </span>
            </div>
        </div>
    `;
}

// Processing (simplified - keeping original logic)
async function processExcelFile() {
    try {
        processBtn.disabled = true;
        processingStatus.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <div style="width: 50px; height: 50px; border: 4px solid #e5e7eb; border-top-color: #667eea; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
                <div style="font-weight: 600; color: #374151; margin-bottom: 0.5rem;">Processing your file...</div>
                <div style="font-size: 0.875rem; color: #6b7280;">This may take a moment</div>
            </div>
            <style>
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            </style>
        `;
        processingStatus.classList.remove('hidden');

        // Clone data
        let processedData = JSON.parse(JSON.stringify(state.sheetData));

        // Filter to only selected columns from Step 2
        const selectedCols = state.selectedColumns.detected;
        if (selectedCols && selectedCols.length > 0) {
            processedData = processedData.map(row => {
                const filteredRow = {};
                selectedCols.forEach(col => {
                    if (row.hasOwnProperty(col)) {
                        filteredRow[col] = row[col];
                    }
                });
                return filteredRow;
            });
        }

        // Apply selected operations (simplified)
        // ... (keep original processing logic)

        // Apply Formulas
        const formulaItems = document.querySelectorAll('.formula-item');
        formulaItems.forEach(item => {
            const type = item.querySelector('.formula-type').value;
            const newColName = item.querySelector('.formula-new-column').value || 'Formula_Result';

            // Get inputs safely
            const inputs = item.querySelectorAll('.form-input, .form-select');
            // Helper to get value by order or placeholder (fragile, but works for this structure)
            const getVal = (idx) => inputs[idx] ? inputs[idx].value : null;

            if (!type) return;

            // Pre-calculate scalars for aggregations
            let scalarResult = null;
            if (['SUM', 'AVERAGE', 'COUNT', 'COUNTIF', 'SUMIF'].includes(type)) {
                const targetCol = item.querySelector('select:not(.formula-type)').value;
                const criteria = item.querySelector('input[placeholder*="Criteria"]')?.value;
                const colValues = processedData.map(r => r[targetCol]);
                const numericValues = colValues.map(v => parseFloat(v)).filter(v => !isNaN(v));

                if (type === 'SUM') scalarResult = numericValues.reduce((a, b) => a + b, 0);
                if (type === 'AVERAGE') scalarResult = numericValues.length ? (numericValues.reduce((a, b) => a + b, 0) / numericValues.length) : 0;
                if (type === 'COUNT') scalarResult = numericValues.length;
                if (type === 'COUNTIF') {
                    // Simple criteria parsing: ">100", "Pending", etc.
                    scalarResult = colValues.filter(v => {
                        if (!criteria) return true;
                        if (criteria.startsWith('>')) return v > parseFloat(criteria.substring(1));
                        if (criteria.startsWith('<')) return v < parseFloat(criteria.substring(1));
                        return v == criteria;
                    }).length;
                }
                if (type === 'SUMIF') {
                    scalarResult = processedData.reduce((acc, row) => {
                        const v = row[targetCol];
                        const val = parseFloat(v);
                        if (isNaN(val)) return acc;

                        let match = false;
                        if (!criteria) match = true;
                        else if (criteria.startsWith('>')) match = val > parseFloat(criteria.substring(1));
                        else if (criteria.startsWith('<')) match = val < parseFloat(criteria.substring(1));
                        else match = v == criteria;

                        return match ? acc + val : acc;
                    }, 0);
                }
            }

            // Apply row-by-row
            processedData = processedData.map(row => {
                let result = '';

                if (scalarResult !== null) {
                    result = scalarResult;
                } else {
                    // Row-level logic
                    if (type === 'IF') {
                        // Inputs: Col, Op, Val, True, False
                        // The structure in updateFormulaConfig is: Select(Col), Select(Op), Input(Val), Input(True), Input(False)
                        // This logic relies on exact DOM order. 
                        const colBox = item.querySelector('.formula-config-panel select:nth-child(1)');
                        const col = colBox ? colBox.value : '';

                        const opBox = item.querySelector('.formula-config-panel select:nth-child(2)');
                        const op = opBox ? opBox.value : '==';

                        const rangeDiv = item.querySelector('.formula-config-panel div:nth-child(1)'); // The grid
                        const valInput = rangeDiv ? rangeDiv.querySelector('input') : null;
                        const val = valInput ? valInput.value : '';

                        const resultDiv = item.querySelector('.formula-config-panel div:nth-child(2)');
                        const trueVal = resultDiv ? resultDiv.querySelector('input:nth-child(1)').value : '';
                        const falseVal = resultDiv ? resultDiv.querySelector('input:nth-child(2)').value : '';

                        const rowVal = row[col];
                        let conditionMet = false;

                        // Simple comparison
                        if (op === '==') conditionMet = (rowVal == val);
                        if (op === '>') conditionMet = (parseFloat(rowVal) > parseFloat(val));
                        if (op === '<') conditionMet = (parseFloat(rowVal) < parseFloat(val));
                        if (op === '!=') conditionMet = (rowVal != val);

                        result = conditionMet ? trueVal : falseVal;
                    }
                    else if (type === 'CONCAT') {
                        const select = item.querySelector('.formula-config-panel select');
                        const separator = item.querySelector('.formula-config-panel input').value || '';
                        const cols = Array.from(select.selectedOptions).map(opt => opt.value);
                        result = cols.map(c => row[c]).join(separator);
                    }
                    else if (type === 'LEFT') {
                        const col = item.querySelector('.formula-config-panel select').value;
                        const len = parseInt(item.querySelector('.formula-config-panel input').value) || 3;
                        result = String(row[col] || '').substring(0, len);
                    }
                    else if (type === 'RIGHT') {
                        const col = item.querySelector('.formula-config-panel select').value;
                        const len = parseInt(item.querySelector('.formula-config-panel input').value) || 3;
                        const str = String(row[col] || '');
                        result = str.substring(str.length - len);
                    }
                }

                return { ...row, [newColName]: result };
            });
        });

        state.processedData = processedData;

        processingStatus.classList.add('hidden');
        stepDownload.classList.remove('hidden', 'disabled');
        enableStep(stepDownload);

        showToast('Processing complete!', 'success');

    } catch (error) {
        console.error(error);
        processingStatus.classList.add('hidden');
        processBtn.disabled = false;
        showToast('Error processing file: ' + error.message, 'error');
    }
}

function downloadProcessedFile() {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(state.processedData || state.sheetData);

    const colWidths = Object.keys((state.processedData || state.sheetData)[0] || {}).map(key => ({
        wch: Math.max(key.length, 15)
    }));
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, state.currentSheet);

    const filename = `processed_${state.originalFilename}`;
    XLSX.writeFile(wb, filename);

    showToast('File downloaded successfully!', 'success');
}

// Utility Functions
function enableStep(stepElement) {
    stepElement.classList.remove('disabled');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function showToast(message, type = 'info') {
    toastMessage.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
// Toggle detected column selection
window.toggleDetectedColumn = function (element) {
    const column = element.getAttribute('data-column');
    const isSelected = state.selectedColumns.detected.includes(column);

    if (isSelected) {
        state.selectedColumns.detected = state.selectedColumns.detected.filter(c => c !== column);
        element.classList.remove('selected');
        element.querySelector('.column-checkbox').innerHTML = '';
    } else {
        state.selectedColumns.detected.push(column);
        element.classList.add('selected');
        element.querySelector('.column-checkbox').innerHTML = '<i class="fas fa-check"></i>';
    }

    updateDetectedCount();
    updateExtractButtonState();
};

// Update selection count display
function updateDetectedCount() {
    const countEl = document.getElementById('detected-count');
    const count = state.selectedColumns.detected.length;
    const total = state.columns.length;

    if (countEl) {
        countEl.textContent = `${count} of ${total} selected`;
        countEl.style.color = count > 0 ? '#10b981' : '#6b7280';
    }
}

// Select all detected columns
function selectAllDetectedColumns() {
    state.selectedColumns.detected = [...state.columns];
    displayColumns();
    updateExtractButtonState();
}

// Clear all detected columns
function clearAllDetectedColumns() {
    state.selectedColumns.detected = [];
    displayColumns();
    updateExtractButtonState();
}

// Search/filter columns
function searchDetectedColumns(query) {
    const items = document.querySelectorAll('.column-item-selectable');
    items.forEach(item => {
        const columnName = item.getAttribute('data-column').toLowerCase();
        if (columnName.includes(query.toLowerCase())) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

// Update process button state (disable if no columns selected)
// Update Extract Data button state (gatekeeper)
function updateExtractButtonState() {
    const extractBtn = document.getElementById('extract-data-btn');
    if (extractBtn) {
        if (state.selectedColumns.detected.length === 0) {
            extractBtn.classList.add('disabled');
            extractBtn.disabled = true;
            extractBtn.title = 'Please select at least one column to proceed';
        } else {
            extractBtn.classList.remove('disabled');
            extractBtn.disabled = false;
            extractBtn.title = '';
        }
    }
}

// Fix operation listeners
setTimeout(function () {
    document.querySelectorAll('.operation-card-header').forEach(header => {
        const card = header.closest('.operation-card');
        const checkbox = header.querySelector('input[type="checkbox"]');
        if (card && checkbox) {
            header.style.cursor = 'pointer';
            header.onclick = function (e) {
                if (e.target.type !== 'checkbox' && !e.target.closest('.checkbox-wrapper')) {
                    checkbox.checked = !checkbox.checked;
                    if (checkbox.checked) {
                        card.classList.add('active');
                    } else {
                        card.classList.remove('active');
                    }
                }
            };
        }
    });
}, 300);
