/**
 * EXTEROID - SmartExcel Simplified
 * 3-Step Workflow: Upload → Clean → Export
 * Essential Features Only
 */

// ===== APP STATE =====
const AppState = {
    file: null,
    rawData: [],
    columns: [],
    columnTypes: {},
    selectedColumns: new Set(),
    cleanedData: [],
    stats: {
        totalRows: 0,
        emptyRemoved: 0,
        duplicatesRemoved: 0,
        phonesCleaned: 0,
        datesStandardized: 0,
        finalRows: 0
    },
    options: {
        phoneFormat: '+91-format', // or '10-digit'
        dateFormat: 'YYYY-MM-DD', // or 'DD/MM/YYYY'
        removeEmptyCols: true,
        splitName: false,
        normalizeYesNo: false,
        removeEmojis: false
    }
};

// ===== COLUMN ALIASES FOR AUTO MAPPING =====
const COLUMN_ALIASES = {
    'Phone': ['phone', 'mobile', 'contact', 'cell', 'telephone', 'whatsapp', 'number'],
    'Name': ['name', 'full name', 'customer', 'person', 'client'],
    'Email': ['email', 'mail', 'e-mail', 'email address'],
    'Address': ['address', 'location', 'addr', 'full address'],
    'Date': ['date', 'timestamp', 'created', 'modified', 'dob'],
    'City': ['city', 'district', 'town'],
    'State': ['state', 'province', 'region'],
    'Pincode': ['pincode', 'pin', 'zip', 'postal', 'zipcode']
};

// ===== DOM ELEMENTS =====
const Elements = {
    dropZone: document.getElementById('drop-zone'),
    fileInput: document.getElementById('file-input'),
    fileSelected: document.getElementById('file-selected'),
    fileName: document.getElementById('file-name'),
    fileSize: document.getElementById('file-size'),
    btnRemoveFile: document.getElementById('btn-remove-file'),
    btnProcessFile: document.getElementById('btn-process-file'),

    // Section 2
    columnCleanSection: document.getElementById('column-clean-section'),
    chipsGrid: document.getElementById('chips-grid'),
    advancedToggle: document.getElementById('advanced-toggle'),
    advancedContent: document.getElementById('advanced-content'),
    btnBackToUpload: document.getElementById('btn-back-to-upload'),
    btnRunClean: document.getElementById('btn-run-clean'),

    // Section 3
    resultSection: document.getElementById('result-section'),
    statsContainer: document.getElementById('stats-container'),
    previewTableContainer: document.getElementById('preview-table-container'),
    btnExportExcel: document.getElementById('btn-export-excel'),
    btnExportCSV: document.getElementById('btn-export-csv'),
    btnStartOver: document.getElementById('btn-start-over'),

    loadingOverlay: document.getElementById('loading-overlay'),
    loadingText: document.getElementById('loading-text')
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    console.log('SmartExcel Ready (Simplified)');
});

function setupEventListeners() {
    // Upload Section
    Elements.dropZone.addEventListener('click', () => Elements.fileInput.click());
    Elements.dropZone.addEventListener('dragover', handleDragOver);
    Elements.dropZone.addEventListener('dragleave', handleDragLeave);
    Elements.dropZone.addEventListener('drop', handleDrop);
    Elements.fileInput.addEventListener('change', handleFileInputChange);
    Elements.btnRemoveFile.addEventListener('click', removeFile);
    Elements.btnProcessFile.addEventListener('click', processFile);

    // Column & Clean Section
    Elements.btnBackToUpload.addEventListener('click', backToUpload);
    Elements.btnRunClean.addEventListener('click', runAutoClean);
    Elements.advancedToggle.addEventListener('click', toggleAdvanced);

    document.getElementById('select-all-chips').addEventListener('click', selectAllChips);
    document.getElementById('select-common-chips').addEventListener('click', selectCommonChips);
    document.getElementById('deselect-all-chips').addEventListener('click', deselectAllChips);

    // Advanced options
    document.querySelectorAll('input[name="phone-format"]').forEach(radio => {
        radio.addEventListener('change', (e) => AppState.options.phoneFormat = e.target.value);
    });
    document.querySelectorAll('input[name="date-format"]').forEach(radio => {
        radio.addEventListener('change', (e) => AppState.options.dateFormat = e.target.value);
    });
    document.getElementById('remove-empty-cols').addEventListener('change', (e) =>
        AppState.options.removeEmptyCols = e.target.checked
    );
    document.getElementById('split-name').addEventListener('change', (e) =>
        AppState.options.splitName = e.target.checked
    );
    document.getElementById('normalize-yesno').addEventListener('change', (e) =>
        AppState.options.normalizeYesNo = e.target.checked
    );
    document.getElementById('remove-emojis').addEventListener('change', (e) =>
        AppState.options.removeEmojis = e.target.checked
    );

    // Export Section
    Elements.btnExportExcel.addEventListener('click', () => exportData('xlsx'));
    Elements.btnExportCSV.addEventListener('click', () => exportData('csv'));
    Elements.btnStartOver.addEventListener('click', startOver);
}

// ===== FILE UPLOAD =====
function handleDragOver(e) {
    e.preventDefault();
    Elements.dropZone.classList.add('drag-active');
}

function handleDragLeave(e) {
    e.preventDefault();
    Elements.dropZone.classList.remove('drag-active');
}

function handleDrop(e) {
    e.preventDefault();
    Elements.dropZone.classList.remove('drag-active');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
}

function handleFileInputChange(e) {
    const file = e.target.files[0];
    if (file) handleFile(file);
}

function handleFile(file) {
    // Validate
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
        alert('Please upload Excel (.xlsx, .xls) or CSV file only');
        return;
    }

    AppState.file = file;
    Elements.fileName.textContent = file.name;
    Elements.fileSize.textContent = formatFileSize(file.size);
    Elements.fileSelected.classList.remove('hidden');
    Elements.dropZone.style.opacity = '0.5';
}

function removeFile() {
    AppState.file = null;
    Elements.fileSelected.classList.add('hidden');
    Elements.dropZone.style.opacity = '1';
    Elements.fileInput.value = '';
}

async function processFile() {
    if (!AppState.file) return;

    showLoading('Processing file...');

    try {
        const data = await readExcelFile(AppState.file);

        if (!data || data.length === 0) {
            throw new Error('File is empty');
        }

        if (!Object.keys(data[0]).length) {
            throw new Error('No columns detected');
        }

        AppState.rawData = data;
        AppState.columns = Object.keys(data[0]);

        // Fix headers
        fixColumnHeaders();

        // Detect types
        detectColumnTypes();

        // Auto-select columns
        autoSelectColumns();

        // Render chips
        renderColumnChips();

        hideLoading();
        Elements.columnCleanSection.classList.remove('hidden');
        scrollTo(Elements.columnCleanSection);

    } catch (error) {
        hideLoading();
        alert('Error: ' + error.message);
    }
}

function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
                resolve(json);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// ===== HEADER FIXING (NEW) =====
function fixColumnHeaders() {
    const newData = [];
    const headerMap = {};
    const usedNames = {};

    // Fix headers: trim, title case, remove special chars
    AppState.columns = AppState.columns.map(col => {
        let fixed = col.trim();
        // Remove special characters
        fixed = fixed.replace(/[_\-\.]+/g, ' ');
        // Title case
        fixed = fixed.split(' ').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');

        // Handle duplicates
        if (usedNames[fixed]) {
            usedNames[fixed]++;
            fixed = `${fixed} ${usedNames[fixed]}`;
        } else {
            usedNames[fixed] = 1;
        }

        headerMap[col] = fixed;
        return fixed;
    });

    // Remap data with new headers
    AppState.rawData = AppState.rawData.map(row => {
        const newRow = {};
        Object.keys(row).forEach(oldKey => {
            newRow[headerMap[oldKey]] = row[oldKey];
        });
        return newRow;
    });
}

// ===== COLUMN TYPE DETECTION =====
function detectColumnTypes() {
    AppState.columnTypes = {};

    AppState.columns.forEach(col => {
        const normalized = col.toLowerCase().trim();
        let type = 'text';

        // Check aliases
        for (const [group, aliases] of Object.entries(COLUMN_ALIASES)) {
            if (aliases.some(alias => normalized.includes(alias))) {
                type = group.toLowerCase();
                break;
            }
        }

        AppState.columnTypes[col] = type;
    });
}

function autoSelectColumns() {
    AppState.selectedColumns.clear();

    // Select all by default
    AppState.columns.forEach(col => {
        AppState.selectedColumns.add(col);
    });
}

// ===== COLUMN CHIPS =====
function renderColumnChips() {
    Elements.chipsGrid.innerHTML = AppState.columns.map(col => {
        const isSelected = AppState.selectedColumns.has(col);
        const icon = isSelected ? 'fa-check-circle' : 'fa-circle';
        const selectedClass = isSelected ? 'selected' : '';
        const type = AppState.columnTypes[col] || 'text';

        return `
            <div class="column-chip ${selectedClass}" 
                 data-column="${col}"
                 onclick="toggleChip('${col.replace(/'/g, "\\'")}')">
                <i class="fas ${icon} chip-icon"></i>
                <span class="chip-label">${col}</span>
                <span class="chip-meta">${type}</span>
            </div>
        `;
    }).join('');
}

function toggleChip(col) {
    if (AppState.selectedColumns.has(col)) {
        AppState.selectedColumns.delete(col);
    } else {
        AppState.selectedColumns.add(col);
    }
    renderColumnChips();
}

function selectAllChips() {
    AppState.selectedColumns = new Set(AppState.columns);
    renderColumnChips();
}

function selectCommonChips() {
    // Select only phone, name, email
    AppState.selectedColumns.clear();
    AppState.columns.forEach(col => {
        const type = AppState.columnTypes[col];
        if (['phone', 'name', 'email'].includes(type)) {
            AppState.selectedColumns.add(col);
        }
    });
    renderColumnChips();
}

function deselectAllChips() {
    AppState.selectedColumns.clear();
    renderColumnChips();
}

// ===== ADVANCED OPTIONS TOGGLE =====
function toggleAdvanced() {
    const content = Elements.advancedContent;
    const toggle = Elements.advancedToggle;

    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        content.classList.add('show');
        toggle.classList.add('active');
    } else {
        content.classList.add('hidden');
        content.classList.remove('show');
        toggle.classList.remove('active');
    }
}

// ===== AUTO CLEAN ENGINE =====
async function runAutoClean() {
    if (AppState.selectedColumns.size === 0) {
        alert('Please select at least one column');
        return;
    }

    showLoading('Running auto clean...');

    try {
        let data = [...AppState.rawData];

        AppState.stats.totalRows = data.length;

        // 1. Select only chosen columns
        data = data.map(row => {
            const newRow = {};
            AppState.selectedColumns.forEach(col => {
                newRow[col] = row[col] || '';
            });
            return newRow;
        });

        // 2. Remove empty columns (if enabled)
        if (AppState.options.removeEmptyCols) {
            data = removeEmptyColumns(data);
        }

        // 3. Fix headers (already done in processFile)

        // 4. Remove empty rows
        const beforeEmpty = data.length;
        data = data.filter(row => {
            return Object.values(row).some(v => String(v).trim() !== '');
        });
        AppState.stats.emptyRemoved = beforeEmpty - data.length;

        // 5. Trim spaces + clean symbols
        data = data.map(row => {
            const cleaned = {};
            for (const [key, val] of Object.entries(row)) {
                let cleanVal = typeof val === 'string' ? val.trim().replace(/\s+/g, ' ') : val;
                // Clean unwanted symbols
                cleanVal = String(cleanVal).replace(/[@!#$%^&*()]+/g, '');
                cleaned[key] = cleanVal;
            }
            return cleaned;
        });

        // 6. Phone normalization (ENHANCED)
        let phonesCleaned = 0;
        data = data.map(row => {
            const normalized = { ...row };
            for (const [key, val] of Object.entries(row)) {
                const type = AppState.columnTypes[key];
                if (type === 'phone') {
                    const cleaned = normalizePhone(val);
                    if (cleaned !== val) phonesCleaned++;
                    normalized[key] = cleaned;
                }
            }
            return normalized;
        });
        AppState.stats.phonesCleaned = phonesCleaned;

        // 7. Date standardization + year validation (NEW)
        let datesStandardized = 0;
        data = data.map(row => {
            const normalized = { ...row };
            for (const [key, val] of Object.entries(row)) {
                const type = AppState.columnTypes[key];
                if (type === 'date') {
                    const cleaned = standardizeDate(val);
                    if (cleaned !== val) datesStandardized++;
                    normalized[key] = cleaned;
                }
            }
            return normalized;
        });
        AppState.stats.datesStandardized = datesStandardized;

        // 8. Remove duplicates
        const beforeDup = data.length;
        data = removeDuplicates(data);
        AppState.stats.duplicatesRemoved = beforeDup - data.length;

        // 9. Split name (if enabled)
        if (AppState.options.splitName) {
            data = splitNameColumn(data);
        }

        // 10. Normalize Yes/No (if enabled)
        if (AppState.options.normalizeYesNo) {
            data = normalizeYesNoFields(data);
        }

        // 11. Remove emojis (if enabled)
        if (AppState.options.removeEmojis) {
            data = removeEmojisFromData(data);
        }

        AppState.stats.finalRows = data.length;
        AppState.cleanedData = data;

        // Render preview & stats
        renderPreview();
        renderStatistics();

        hideLoading();
        Elements.resultSection.classList.remove('hidden');
        scrollTo(Elements.resultSection);

    } catch (error) {
        hideLoading();
        alert('Cleaning error: ' + error.message);
    }
}

// ===== PHONE NORMALIZATION (ENHANCED) =====
function normalizePhone(value) {
    if (!value) return '';

    // Remove all non-digits
    let digits = String(value).replace(/\D/g, '');

    // Remove country code if present
    if (digits.startsWith('91') && digits.length > 10) {
        digits = digits.substring(2);
    }

    // Remove leading zero
    if (digits.startsWith('0')) {
        digits = digits.substring(1);
    }

    // Get last 10 digits
    if (digits.length > 10) {
        digits = digits.substring(digits.length - 10);
    }

    // Validate length
    if (digits.length !== 10) {
        return value; // Return original if invalid
    }

    // Format based on option
    if (AppState.options.phoneFormat === '+91-format') {
        return '+91 ' + digits;
    } else {
        return digits;
    }
}

// ===== DATE STANDARDIZATION + YEAR VALIDATION (NEW) =====
function standardizeDate(value) {
    if (!value) return '';

    const str = String(value).trim();
    if (!str) return '';

    // Try parsing common formats
    let date;

    // DD-MM-YYYY or DD/MM/YYYY
    const ddmmyyyy = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
    if (ddmmyyyy) {
        const [_, day, month, year] = ddmmyyyy;
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    // YYYY-MM-DD
    const yyyymmdd = str.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
    if (yyyymmdd) {
        const [_, year, month, day] = yyyymmdd;
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    if (!date || isNaN(date.getTime())) {
        // Try general parse
        date = new Date(str);
    }

    if (isNaN(date.getTime())) {
        return value; // Return original if can't parse
    }

    const year = date.getFullYear();
    const currentYear = new Date().getFullYear();

    // Validate year range (1950 < year <= currentYear + 1)
    if (year < 1950 || year > currentYear + 1) {
        return ''; // Mark as invalid
    }

    // Format based on option
    if (AppState.options.dateFormat === 'YYYY-MM-DD') {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } else {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${day}/${month}/${year}`;
    }
}

// ===== OTHER CLEANING FUNCTIONS =====
function removeEmptyColumns(data) {
    if (data.length === 0) return data;

    const cols = Object.keys(data[0]);
    const emptyCols = cols.filter(col => {
        return data.every(row => !row[col] || String(row[col]).trim() === '');
    });

    return data.map(row => {
        const newRow = {};
        cols.forEach(col => {
            if (!emptyCols.includes(col)) {
                newRow[col] = row[col];
            }
        });
        return newRow;
    });
}

function removeDuplicates(data) {
    const seen = new Set();
    return data.filter(row => {
        const key = JSON.stringify(row);
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}

function splitNameColumn(data) {
    const nameCol = AppState.columns.find(col =>
        AppState.columnTypes[col] === 'name'
    );

    if (!nameCol) return data;

    return data.map(row => {
        const name = row[nameCol] || '';
        const parts = name.trim().split(/\s+/);

        row['First Name'] = parts[0] || '';
        row['Last Name'] = parts.slice(1).join(' ') || '';

        return row;
    });
}

function normalizeYesNoFields(data) {
    return data.map(row => {
        const normalized = {};
        for (const [key, val] of Object.entries(row)) {
            const str = String(val).trim().toLowerCase();
            if (['yes', 'y', 'true', '1'].includes(str)) {
                normalized[key] = 'Yes';
            } else if (['no', 'n', 'false', '0'].includes(str)) {
                normalized[key] = 'No';
            } else {
                normalized[key] = val;
            }
        }
        return normalized;
    });
}

function removeEmojisFromData(data) {
    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;

    return data.map(row => {
        const cleaned = {};
        for (const [key, val] of Object.entries(row)) {
            cleaned[key] = String(val).replace(emojiRegex, '');
        }
        return cleaned;
    });
}

// ===== PREVIEW & STATS =====
function renderPreview() {
    const preview = AppState.cleanedData.slice(0, 20);

    if (preview.length === 0) {
        Elements.previewTableContainer.innerHTML = '<p style="text-align:center;color:#94a3b8;">No data to preview</p>';
        return;
    }

    const columns = Object.keys(preview[0]);

    const html = `
        <table>
            <thead>
                <tr>
                    ${columns.map(col => `<th>${col}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${preview.map(row => `
                    <tr>
                        ${columns.map(col => `<td>${row[col] || '-'}</td>`).join('')}
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    Elements.previewTableContainer.innerHTML = html;
}

function renderStatistics() {
    const stats = AppState.stats;

    const html = `
        <div class="stat-card">
            <div class="stat-number">${stats.totalRows}</div>
            <div class="stat-label">Total Rows</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.emptyRemoved}</div>
            <div class="stat-label">Empty Removed</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.duplicatesRemoved}</div>
            <div class="stat-label">Duplicates Removed</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.phonesCleaned}</div>
            <div class="stat-label">Phones Cleaned</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.datesStandardized}</div>
            <div class="stat-label">Dates Fixed</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.finalRows}</div>
            <div class="stat-label">Final Rows</div>
        </div>
    `;

    Elements.statsContainer.innerHTML = html;
}

// ===== EXPORT =====
function exportData(format) {
    if (!AppState.cleanedData || AppState.cleanedData.length === 0) {
        alert('No data to export');
        return;
    }

    showLoading(`Preparing ${format.toUpperCase()} download...`);

    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `EXTEROID_CLEANED_${timestamp}`;

    try {
        const ws = XLSX.utils.json_to_sheet(AppState.cleanedData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Cleaned Data');

        if (format === 'xlsx') {
            XLSX.writeFile(wb, `${fileName}.xlsx`);
        } else if (format === 'csv') {
            const csv = XLSX.utils.sheet_to_csv(ws);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${fileName}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        hideLoading();
    } catch (error) {
        hideLoading();
        alert('Export error: ' + error.message);
    }
}

// ===== NAVIGATION =====
function backToUpload() {
    Elements.columnCleanSection.classList.add('hidden');
    scrollTo(Elements.dropZone);
}

function startOver() {
    if (!confirm('Start over? All data will be lost.')) return;

    // Reset state
    AppState.file = null;
    AppState.rawData = [];
    AppState.columns = [];
    AppState.columnTypes = {};
    AppState.selectedColumns.clear();
    AppState.cleanedData = [];
    AppState.stats = {
        totalRows: 0,
        emptyRemoved: 0,
        duplicatesRemoved: 0,
        phonesCleaned: 0,
        datesStandardized: 0,
        finalRows: 0
    };

    // Reset UI
    Elements.fileInput.value = '';
    Elements.columnCleanSection.classList.add('hidden');
    Elements.resultSection.classList.add('hidden');
    Elements.fileSelected.classList.add('hidden');
    Elements.dropZone.style.opacity = '1';

    scrollTo(Elements.dropZone);
}

// ===== UTILITIES =====
function showLoading(message) {
    Elements.loadingOverlay.classList.remove('hidden');
    Elements.loadingText.textContent = message;
}

function hideLoading() {
    Elements.loadingOverlay.classList.add('hidden');
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

function scrollTo(element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
