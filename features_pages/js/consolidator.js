/**
 * EXTEROID - Excel Consolidator
 * Simplified Progressive Disclosure with Smart Column Detection
 * 
 * Features:
 * - Auto header mapping (Phone/Mobile/Contact → Phone)
 * - Column chips instead of large cards
 * - Inline cleaning options
 * - Mandatory phone normalization
 * - Auto-remove empty rows and duplicates
 */

// ===== COLUMN ALIASES FOR AUTO MAPPING =====
const COLUMN_ALIASES = {
    'Phone': ['phone', 'mobile', 'contact', 'cell', 'telephone', 'mobile no', 'contact number', 'whatsapp'],
    'Name': ['name', 'full name', 'customer name', 'person name', 'client name', 'nama'],
    'Email': ['email', 'mail', 'e-mail', 'email address'],
    'Address': ['address', 'location', 'addr', 'full address', 'alamat'],
    'Date': ['date', 'timestamp', 'created', 'modified', 'dob'],
    'City': ['city', 'district', 'town'],
    'State': ['state', 'province', 'region'],
    'Pincode': ['pincode', 'pin', 'zip', 'postal', 'zipcode']
};

// ===== APP STATE =====
const AppState = {
    files: [],
    parsedSheets: [],
    allColumns: [], // {name, normalized, group, fileCount, sources: [{fileName, originalName}]}
    selectedColumns: new Set(),
    mergedRows: [],
    cleanedRows: [],
    stats: {
        totalRowsBefore: 0,
        emptyRemoved: 0,
        duplicatesRemoved: 0,
        totalAfter: 0
    },
    options: {
        normalizePhone: true, // Always ON
        trimSpaces: true,
        standardizeEmpty: false,
        mergeMode: 'append'
    },
    MIN_FILES: 2,
    MAX_FILES: 5
};

// ===== DOM ELEMENTS =====
const Elements = {
    // Upload Section
    dropZone: document.getElementById('drop-zone'),
    fileInput: document.getElementById('file-input'),
    uploadedFilesContainer: document.getElementById('uploaded-files-container'),
    fileList: document.getElementById('file-list'),
    fileCount: document.getElementById('file-count'),
    uploadValidation: document.getElementById('upload-validation'),
    startMergeRow: document.getElementById('start-merge-row'),
    btnStartMerge: document.getElementById('btn-start-merge'),

    // Column + Cleaning Section
    columnCleaningSection: document.getElementById('column-cleaning-section'),
    chipsGrid: document.getElementById('chips-grid'),
    btnSelectAllChips: document.getElementById('select-all-chips'),
    btnSelectCommonChips: document.getElementById('select-common-chips'),
    btnDeselectAllChips: document.getElementById('deselect-all-chips'),
    normalizePhone: document.getElementById('normalize-phone'),
    trimSpaces: document.getElementById('trim-spaces'),
    standardizeEmpty: document.getElementById('standardize-empty'),
    mergeMode: document.getElementById('merge-mode'),
    btnBackToUpload: document.getElementById('btn-back-to-upload'),
    btnExtractMerge: document.getElementById('btn-extract-merge'),

    // Result Section
    resultSection: document.getElementById('result-section'),
    statsContainer: document.getElementById('stats-container'),
    previewTableContainer: document.getElementById('preview-table-container'),
    btnExportExcel: document.getElementById('btn-export-excel'),
    btnExportCSV: document.getElementById('btn-export-csv'),
    btnStartOver: document.getElementById('btn-start-over'),

    // Global
    loadingOverlay: document.getElementById('loading-overlay'),
    loadingText: document.getElementById('loading-text')
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    console.log('EXTEROID Consolidator Ready (Simplified UI)');
});

function setupEventListeners() {
    // Upload
    Elements.dropZone.addEventListener('click', () => Elements.fileInput.click());
    Elements.dropZone.addEventListener('dragover', handleDragOver);
    Elements.dropZone.addEventListener('dragleave', handleDragLeave);
    Elements.dropZone.addEventListener('drop', handleDrop);
    Elements.fileInput.addEventListener('change', handleFileInputChange);
    Elements.btnStartMerge.addEventListener('click', startMerge);

    // Column + Cleaning
    Elements.btnSelectAllChips.addEventListener('click', selectAllChips);
    Elements.btnSelectCommonChips.addEventListener('click', selectCommonChips);
    Elements.btnDeselectAllChips.addEventListener('click', deselectAllChips);
    Elements.trimSpaces.addEventListener('change', (e) => AppState.options.trimSpaces = e.target.checked);
    Elements.standardizeEmpty.addEventListener('change', (e) => AppState.options.standardizeEmpty = e.target.checked);
    Elements.mergeMode.addEventListener('change', (e) => AppState.options.mergeMode = e.target.value);
    Elements.btnBackToUpload.addEventListener('click', backToUpload);
    Elements.btnExtractMerge.addEventListener('click', extractAndMerge);

    // Export
    Elements.btnExportExcel.addEventListener('click', () => exportData('xlsx'));
    Elements.btnExportCSV.addEventListener('click', () => exportData('csv'));
    Elements.btnStartOver.addEventListener('click', startOver);
}

// ===== FILE UPLOAD =====
function handleDragOver(e) {
    e.preventDefault();
    Elements.dropZone.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    Elements.dropZone.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    Elements.dropZone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
}

function handleFileInputChange(e) {
    const files = Array.from(e.target.files);
    handleFiles(files);
}

async function handleFiles(files) {
    // Validate count
    const currentCount = AppState.files.length;
    const newTotal = currentCount + files.length;

    if (newTotal > AppState.MAX_FILES) {
        showValidation(`Maximum ${AppState.MAX_FILES} files allowed`, 'error');
        return;
    }

    // Validate and add files
    for (const file of files) {
        if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
            showValidation(`"${file.name}" is not a valid Excel or CSV file`, 'error');
            continue;
        }

        AppState.files.push(file);
    }

    renderFileList();
    validateUpload();
}

function renderFileList() {
    if (AppState.files.length === 0) {
        Elements.uploadedFilesContainer.classList.add('hidden');
        Elements.startMergeRow.classList.add('hidden');
        return;
    }

    Elements.uploadedFilesContainer.classList.remove('hidden');
    Elements.startMergeRow.classList.remove('hidden');
    Elements.fileCount.textContent = AppState.files.length;

    Elements.fileList.innerHTML = AppState.files.map((file, index) => `
        <div class="file-item">
            <div class="file-info">
                <div class="file-icon">
                    <i class="fas fa-file-excel"></i>
                </div>
                <div class="file-details">
                    <p><strong>${file.name}</strong></p>
                    <p class="file-size">${formatFileSize(file.size)}</p>
                </div>
            </div>
            <button class="btn-remove-file" onclick="removeFile(${index})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

function removeFile(index) {
    AppState.files.splice(index, 1);
    AppState.parsedSheets.splice(index, 1);
    renderFileList();
    validateUpload();
}

function validateUpload() {
    const count = AppState.files.length;

    if (count >= AppState.MIN_FILES && count <= AppState.MAX_FILES) {
        showValidation(`✓ ${count} files ready to merge`, 'success');
        Elements.btnStartMerge.disabled = false;
    } else if (count > 0) {
        showValidation(`Upload at least ${AppState.MIN_FILES} files (currently: ${count})`, 'error');
        Elements.btnStartMerge.disabled = true;
    } else {
        Elements.uploadValidation.classList.add('hidden');
        Elements.btnStartMerge.disabled = true;
    }
}

// ===== PARSE FILES =====
async function startMerge() {
    showLoading('Parsing files...');

    try {
        AppState.parsedSheets = [];

        for (let i = 0; i < AppState.files.length; i++) {
            const file = AppState.files[i];
            updateLoading(`Reading ${file.name}...`);

            const data = await readExcelFile(file);
            AppState.parsedSheets.push({
                fileName: file.name,
                rows: data
            });
        }

        detectAllColumns();
        autoSelectColumns();
        renderColumnChips();

        hideLoading();
        Elements.columnCleaningSection.classList.remove('hidden');
        scrollTo(Elements.columnCleaningSection);

    } catch (error) {
        hideLoading();
        showValidation(`Error: ${error.message}`, 'error');
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

// ===== COLUMN DETECTION WITH AUTO MAPPING =====
function detectColumnGroup(headerName) {
    const normalized = headerName.toLowerCase().trim();

    for (const [group, aliases] of Object.entries(COLUMN_ALIASES)) {
        if (aliases.some(alias => normalized.includes(alias))) {
            return group;
        }
    }

    return headerName; // No match, use original
}

function detectAllColumns() {
    const columnMap = new Map(); // normalized → {name, group, fileCount, sources}

    AppState.parsedSheets.forEach((sheet, fileIndex) => {
        if (!sheet.rows || sheet.rows.length === 0) return;

        const headers = Object.keys(sheet.rows[0]);

        headers.forEach(header => {
            const group = detectColumnGroup(header);
            const normalized = group.toLowerCase().replace(/\s+/g, '_');

            if (!columnMap.has(normalized)) {
                columnMap.set(normalized, {
                    name: group,
                    normalized: normalized,
                    group: group,
                    fileCount: 0,
                    sources: []
                });
            }

            const col = columnMap.get(normalized);
            col.fileCount++;
            col.sources.push({
                fileName: sheet.fileName,
                originalName: header,
                fileIndex: fileIndex
            });
        });
    });

    // Convert to array and sort by file count
    AppState.allColumns = Array.from(columnMap.values()).sort((a, b) =>
        b.fileCount - a.fileCount
    );
}

function autoSelectColumns() {
    const totalFiles = AppState.files.length;
    const threshold = Math.ceil(totalFiles * 0.6); // 60% of files

    AppState.selectedColumns.clear();

    AppState.allColumns.forEach(col => {
        // Auto-select if:
        // 1. Column exists in >= 60% of files OR
        // 2. Column is Phone type
        if (col.fileCount >= threshold || col.group === 'Phone') {
            AppState.selectedColumns.add(col.normalized);
        }
    });
}

// ===== COLUMN CHIPS =====
function renderColumnChips() {
    Elements.chipsGrid.innerHTML = AppState.allColumns.map(col => {
        const isSelected = AppState.selectedColumns.has(col.normalized);
        const icon = isSelected ? 'fa-check-circle' : 'fa-circle';
        const selectedClass = isSelected ? 'selected' : '';

        return `
            <div class="column-chip ${selectedClass}" 
                 data-column="${col.normalized}"
                 onclick="toggleChip('${col.normalized}')">
                <i class="fas ${icon} chip-icon"></i>
                <span class="chip-label">${col.name}</span>
                <span class="chip-meta">(${col.fileCount}/${AppState.files.length})</span>
            </div>
        `;
    }).join('');
}

function toggleChip(normalizedName) {
    if (AppState.selectedColumns.has(normalizedName)) {
        AppState.selectedColumns.delete(normalizedName);
    } else {
        AppState.selectedColumns.add(normalizedName);
    }
    renderColumnChips();
}

function selectAllChips() {
    AppState.selectedColumns = new Set(AppState.allColumns.map(col => col.normalized));
    renderColumnChips();
}

function selectCommonChips() {
    const totalFiles = AppState.files.length;
    const threshold = Math.ceil(totalFiles * 0.6);

    AppState.selectedColumns.clear();
    AppState.allColumns.forEach(col => {
        if (col.fileCount >= threshold) {
            AppState.selectedColumns.add(col.normalized);
        }
    });
    renderColumnChips();
}

function deselectAllChips() {
    AppState.selectedColumns.clear();
    renderColumnChips();
}

// ===== EXTRACT & MERGE =====
async function extractAndMerge() {
    if (AppState.selectedColumns.size === 0) {
        alert('Please select at least one column');
        return;
    }

    showLoading('Merging data...');

    try {
        AppState.mergedRows = [];

        // Merge all files
        AppState.parsedSheets.forEach((sheet, fileIndex) => {
            sheet.rows.forEach(row => {
                const newRow = {};

                // Map selected columns
                AppState.allColumns.forEach(col => {
                    if (!AppState.selectedColumns.has(col.normalized)) return;

                    // Find original column name in this file
                    const source = col.sources.find(s => s.fileIndex === fileIndex);
                    if (source) {
                        newRow[col.name] = row[source.originalName] || '';
                    } else {
                        newRow[col.name] = '';
                    }
                });

                newRow._sourceFile = sheet.fileName;
                AppState.mergedRows.push(newRow);
            });
        });

        // Apply cleaning
        let cleaned = [...AppState.mergedRows];

        // 1. Always remove empty rows
        const beforeEmpty = cleaned.length;
        cleaned = cleaned.filter(row => {
            const values = Object.values(row).filter(v => !String(v).startsWith('_'));
            return values.some(v => String(v).trim() !== '');
        });
        AppState.stats.emptyRemoved = beforeEmpty - cleaned.length;

        // 2. Trim spaces (if enabled)
        if (AppState.options.trimSpaces) {
            cleaned = cleaned.map(row => {
                const trimmed = {};
                for (const [key, val] of Object.entries(row)) {
                    trimmed[key] = typeof val === 'string' ? val.trim().replace(/\s+/g, ' ') : val;
                }
                return trimmed;
            });
        }

        // 3. Standardize empty values (if enabled)
        if (AppState.options.standardizeEmpty) {
            cleaned = cleaned.map(row => {
                const standardized = {};
                for (const [key, val] of Object.entries(row)) {
                    const str = String(val).trim();
                    standardized[key] = ['NA', 'N/A', 'null', 'undefined', '-'].includes(str) ? '' : val;
                }
                return standardized;
            });
        }

        // 4. Normalize phone numbers (ALWAYS ON - mandatory)
        cleaned = cleaned.map(row => {
            const normalized = {};
            for (const [key, val] of Object.entries(row)) {
                const col = AppState.allColumns.find(c => c.name === key);
                if (col && col.group === 'Phone') {
                    normalized[key] = normalizePhoneNumber(val);
                } else {
                    normalized[key] = val;
                }
            }
            return normalized;
        });

        // 5. Always remove duplicates (based on phone if available, else full row)
        const beforeDup = cleaned.length;
        cleaned = removeDuplicates(cleaned);
        AppState.stats.duplicatesRemoved = beforeDup - cleaned.length;

        // 6. Apply merge strategy
        if (AppState.options.mergeMode === 'phone-only') {
            cleaned = cleaned.filter(row => {
                const phoneCol = AppState.allColumns.find(c => c.group === 'Phone');
                if (phoneCol) {
                    const phone = row[phoneCol.name];
                    return phone && String(phone).trim() !== '';
                }
                return true;
            });
        }

        AppState.stats.totalRowsBefore = AppState.mergedRows.length;
        AppState.stats.totalAfter = cleaned.length;
        AppState.cleanedRows = cleaned;

        // Render preview and stats
        renderPreview();
        renderStatistics();

        hideLoading();
        Elements.resultSection.classList.remove('hidden');
        scrollTo(Elements.resultSection);

    } catch (error) {
        hideLoading();
        alert(`Error: ${error.message}`);
    }
}

function normalizePhoneNumber(value) {
    if (!value) return '';

    // Remove all non-digits
    let digits = String(value).replace(/\D/g, '');

    // Handle country code
    if (digits.startsWith('91') && digits.length > 10) {
        digits = digits.substring(2); // Remove +91
    }
    if (digits.startsWith('0')) {
        digits = digits.substring(1); // Remove leading 0
    }

    // Get last 10 digits
    if (digits.length > 10) {
        digits = digits.substring(digits.length - 10);
    }

    // Validate length
    if (digits.length !== 10) {
        return value; // Return original if invalid
    }

    // Return with +91 prefix
    return '+91' + digits;
}

function removeDuplicates(data) {
    const seen = new Set();
    return data.filter(row => {
        // Try phone-based deduplication first
        const phoneCol = AppState.allColumns.find(c => c.group === 'Phone');
        let key;

        if (phoneCol && row[phoneCol.name]) {
            key = String(row[phoneCol.name]).trim();
        } else {
            // Fallback to full row hash
            const cleanRow = {};
            for (const [k, v] of Object.entries(row)) {
                if (!k.startsWith('_')) cleanRow[k] = v;
            }
            key = JSON.stringify(cleanRow);
        }

        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}

// ===== RENDER PREVIEW & STATS =====
function renderPreview() {
    const preview = AppState.cleanedRows.slice(0, 20);

    if (preview.length === 0) {
        Elements.previewTableContainer.innerHTML = '<p style="text-align:center;color:#fca5a5;">No data to preview</p>';
        return;
    }

    const columns = Object.keys(preview[0]).filter(key => !key.startsWith('_'));

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
        <div class="stat-item">
            <div class="stat-number">${stats.totalRowsBefore}</div>
            <div class="stat-label">Total Rows Combined</div>
        </div>
        <div class="stat-item">
            <div class="stat-number">${stats.emptyRemoved}</div>
            <div class="stat-label">Empty Rows Removed</div>
        </div>
        <div class="stat-item">
            <div class="stat-number">${stats.duplicatesRemoved}</div>
            <div class="stat-label">Duplicates Removed</div>
        </div>
        <div class="stat-item">
            <div class="stat-number">${stats.totalAfter}</div>
            <div class="stat-label">Final Rows</div>
        </div>
        <div class="stat-item">
            <div class="stat-number">${AppState.selectedColumns.size}</div>
            <div class="stat-label">Columns</div>
        </div>
    `;

    Elements.statsContainer.innerHTML = html;
}

// ===== EXPORT =====
function exportData(format) {
    if (!AppState.cleanedRows || AppState.cleanedRows.length === 0) {
        alert('No data to export');
        return;
    }

    showLoading(`Preparing ${format.toUpperCase()} download...`);

    // Remove internal fields
    const exportData = AppState.cleanedRows.map(row => {
        const clean = {};
        for (const [key, val] of Object.entries(row)) {
            if (!key.startsWith('_')) {
                clean[key] = val;
            }
        }
        return clean;
    });

    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `EXTEROID_CONSOLIDATED_${timestamp}`;

    try {
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Merged Data');

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
        alert(`Export error: ${error.message}`);
    }
}

// ===== NAVIGATION =====
function backToUpload() {
    Elements.columnCleaningSection.classList.add('hidden');
    scrollTo(Elements.dropZone);
}

function startOver() {
    if (!confirm('Start over? All data will be lost.')) return;

    // Reset state
    AppState.files = [];
    AppState.parsedSheets = [];
    AppState.allColumns = [];
    AppState.selectedColumns.clear();
    AppState.mergedRows = [];
    AppState.cleanedRows = [];
    AppState.stats = {
        totalRowsBefore: 0,
        emptyRemoved: 0,
        duplicatesRemoved: 0,
        totalAfter: 0
    };

    // Reset UI
    Elements.fileInput.value = '';
    Elements.columnCleaningSection.classList.add('hidden');
    Elements.resultSection.classList.add('hidden');
    renderFileList();
    validateUpload();

    scrollTo(Elements.dropZone);
}

// ===== UTILITIES =====
function showLoading(message) {
    Elements.loadingOverlay.classList.remove('hidden');
    Elements.loadingText.textContent = message;
}

function updateLoading(message) {
    Elements.loadingText.textContent = message;
}

function hideLoading() {
    Elements.loadingOverlay.classList.add('hidden');
}

function showValidation(message, type) {
    Elements.uploadValidation.classList.remove('hidden');
    Elements.uploadValidation.className = `validation-message ${type}`;
    Elements.uploadValidation.textContent = message;
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

function scrollTo(element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
