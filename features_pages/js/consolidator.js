// ===== EXTEROID Excel Consolidator - Enhanced Logic =====
// Preserves core SheetJS functionality while adding multi-file support and gated flow

// ===== STATE MANAGEMENT =====
const AppState = {
    // File Management (Enhanced: 2-5 files)
    uploadedFiles: [], // Array of File objects
    fileStructures: [], // Analyzed data for each file

    // Column Management
    allColumns: [], // All unique columns detected across files
    selectedColumns: new Set(), // User-selected columns
    columnMapping: {}, // Column normalization mapping

    // Data Flow
    previewData: [], // Merged preview data
    processedData: null, // Final processed data

    // Cleaning Options
    cleaningOptions: {
        trimSpaces: true,
        removeDuplicates: true,
        smartFormat: true
    },

    // UI State
    currentStep: 1,
    isProcessing: false,

    // Constants
    MIN_FILES: 2,
    MAX_FILES: 5
};

// ===== DOM ELEMENTS =====
const DOM = {
    // Step 1: Upload
    multiDropZone: document.getElementById('multi-drop-zone'),
    fileInputMulti: document.getElementById('file-input-multi'),
    btnBrowse: document.getElementById('btn-browse'),
    uploadedFilesContainer: document.getElementById('uploaded-files-container'),
    fileList: document.getElementById('file-list'),
    fileCount: document.getElementById('file-count'),
    uploadValidation: document.getElementById('upload-validation'),

    // Step 2: Column Selection
    step2Section: document.getElementById('step-2-columns'),
    columnCardsGrid: document.getElementById('column-cards-grid'),
    btnBackToUpload: document.getElementById('btn-back-to-upload'),
    btnExtractColumns: document.getElementById('btn-extract-columns'),

    // Step 3: Preview
    step3Section: document.getElementById('step-3-preview'),
    previewTableContainer: document.getElementById('preview-table-container'),
    btnBackToColumns: document.getElementById('btn-back-to-columns'),
    btnProceedToCleaning: document.getElementById('btn-proceed-to-cleaning'),

    // Step 4: Cleaning
    step4Section: document.getElementById('step-4-cleaning'),
    cleanTrimSpaces: document.getElementById('clean-trim-spaces'),
    cleanRemoveDuplicates: document.getElementById('clean-remove-duplicates'),
    cleanSmartFormat: document.getElementById('clean-smart-format'),
    btnBackToPreview: document.getElementById('btn-back-to-preview'),
    btnProcessData: document.getElementById('btn-process-data'),

    // Step 5: Export
    step5Section: document.getElementById('step-5-export'),
    statsGrid: document.getElementById('stats-grid'),
    finalPreviewContainer: document.getElementById('final-preview-container'),
    btnExportExcel: document.getElementById('btn-export-excel'),
    btnExportCSV: document.getElementById('btn-export-csv'),
    btnStartOver: document.getElementById('btn-start-over'),

    // Global
    loadingOverlay: document.getElementById('loading-overlay'),
    loadingText: document.getElementById('loading-text'),
    progressSteps: document.querySelectorAll('.progress-steps .step')
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    console.log('EXTEROID Consolidator initialized');
});

// ===== EVENT LISTENERS SETUP =====
function setupEventListeners() {
    // Step 1: File Upload
    DOM.multiDropZone.addEventListener('click', () => DOM.fileInputMulti.click());
    DOM.btnBrowse.addEventListener('click', () => DOM.fileInputMulti.click());

    DOM.multiDropZone.addEventListener('dragover', handleDragOver);
    DOM.multiDropZone.addEventListener('dragleave', handleDragLeave);
    DOM.multiDropZone.addEventListener('drop', handleDrop);

    DOM.fileInputMulti.addEventListener('change', handleFileInputChange);

    // Step 2: Column Selection
    DOM.btnBackToUpload.addEventListener('click', () => goToStep(1));
    DOM.btnExtractColumns.addEventListener('click', extractSelectedColumns);

    // Step 3: Preview
    DOM.btnBackToColumns.addEventListener('click', () => goToStep(2));
    DOM.btnProceedToCleaning.addEventListener('click', () => unlockStep(4));

    // Step 4: Cleaning
    DOM.btnBackToPreview.addEventListener('click', () => goToStep(3));
    DOM.btnProcessData.addEventListener('click', processAndExport);

    // Cleaning options
    DOM.cleanTrimSpaces.addEventListener('change', (e) => {
        AppState.cleaningOptions.trimSpaces = e.target.checked;
    });
    DOM.cleanRemoveDuplicates.addEventListener('change', (e) => {
        AppState.cleaningOptions.removeDuplicates = e.target.checked;
    });
    DOM.cleanSmartFormat.addEventListener('change', (e) => {
        AppState.cleaningOptions.smartFormat = e.target.checked;
    });

    // Step 5: Export
    DOM.btnExportExcel.addEventListener('click', () => exportData('excel'));
    DOM.btnExportCSV.addEventListener('click', () => exportData('csv'));
    DOM.btnStartOver.addEventListener('click', resetApplication);
}

// ===== FILE UPLOAD HANDLERS =====
function handleDragOver(e) {
    e.preventDefault();
    DOM.multiDropZone.classList.add('active');
}

function handleDragLeave(e) {
    e.preventDefault();
    DOM.multiDropZone.classList.remove('active');
}

function handleDrop(e) {
    e.preventDefault();
    DOM.multiDropZone.classList.remove('active');

    const files = Array.from(e.dataTransfer.files);
    handleMultipleFiles(files);
}

function handleFileInputChange(e) {
    const files = Array.from(e.target.files);
    handleMultipleFiles(files);
}

async function handleMultipleFiles(files) {
    // Validate file count
    const currentCount = AppState.uploadedFiles.length;
    const newTotal = currentCount + files.length;

    if (newTotal > AppState.MAX_FILES) {
        showValidationMessage(`Maximum ${AppState.MAX_FILES} files allowed. You're trying to upload ${newTotal} files.`, 'error');
        return;
    }

    // Validate file types and add to state
    for (const file of files) {
        if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
            showValidationMessage(`"${file.name}" is not a valid Excel or CSV file`, 'error');
            continue;
        }

        AppState.uploadedFiles.push(file);

        // Read and analyze file structure
        try {
            showLoading(`Analyzing ${file.name}...`);
            const data = await readExcelFile(file); // PRESERVED from original
            const structure = analyzeFileStructure(data, file.name); // PRESERVED from original
            AppState.fileStructures.push(structure);
        } catch (error) {
            showNotification(`Error reading ${file.name}: ${error.message}`, 'error');
            // Remove the problematic file
            const index = AppState.uploadedFiles.indexOf(file);
            AppState.uploadedFiles.splice(index, 1);
        }
    }

    hideLoading();
    renderUploadedFiles();
    validateUploadGate();
}

function renderUploadedFiles() {
    if (AppState.uploadedFiles.length === 0) {
        DOM.uploadedFilesContainer.classList.add('hidden');
        return;
    }

    DOM.uploadedFilesContainer.classList.remove('hidden');
    DOM.fileCount.textContent = AppState.uploadedFiles.length;

    DOM.fileList.innerHTML = AppState.uploadedFiles.map((file, index) => `
        <div class="file-item" data-index="${index}">
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
    AppState.uploadedFiles.splice(index, 1);
    AppState.fileStructures.splice(index, 1);
    renderUploadedFiles();
    validateUploadGate();
}

function validateUploadGate() {
    const count = AppState.uploadedFiles.length;

    if (count >= AppState.MIN_FILES && count <= AppState.MAX_FILES) {
        showValidationMessage(`✓ ${count} files uploaded successfully. Ready to proceed!`, 'success');

        // Unlock Step 2
        setTimeout(() => {
            detectAllColumns();
            unlockStep(2);
        }, 500);
    } else if (count > 0) {
        showValidationMessage(`Upload at least ${AppState.MIN_FILES} files to continue (currently: ${count})`, 'error');
    } else {
        DOM.uploadValidation.classList.add('hidden');
    }
}

// ===== CORE LOGIC (PRESERVED FROM ORIGINAL) =====

// ✅ PRESERVED: Excel file reading using SheetJS
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

// ✅ PRESERVED: File structure analysis
function analyzeFileStructure(data, fileName) {
    if (!data || data.length === 0) {
        return { columns: [], sampleData: [], totalRows: 0, fileName };
    }

    const firstRow = data[0];
    const columns = Object.keys(firstRow).map(col => ({
        original: col,
        cleaned: col.trim().toLowerCase(),
        type: detectColumnType(col, data)
    }));

    return {
        columns,
        sampleData: data.slice(0, 5),
        totalRows: data.length,
        fileName,
        fullData: data // Store full data for later use
    };
}

// ✅ PRESERVED: Column type detection
function detectColumnType(columnName, data) {
    const name = columnName.toLowerCase().trim();

    if (name.includes('name') || name.includes('nama')) return 'name';
    if (name.includes('mobile') || name.includes('phone') || name.includes('whatsapp')) return 'phone';
    if (name.includes('email') || name.includes('mail')) return 'email';
    if (name.includes('district') || name.includes('city')) return 'district';
    if (name.includes('state') || name.includes('province')) return 'state';
    if (name.includes('address') || name.includes('alamat')) return 'address';
    if (name.includes('pin') || name.includes('zip') || name.includes('postal')) return 'pincode';

    return 'other';
}

// ✅ PRESERVED: Similarity calculation for column matching
function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

// ✅ PRESERVED: Levenshtein distance algorithm
function levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[str2.length][str1.length];
}

// ===== NEW: MULTI-FILE COLUMN DETECTION =====
function detectAllColumns() {
    const columnMap = new Map(); // normalized_name → { original_names: [], file_indices: [], type: '' }

    AppState.fileStructures.forEach((structure, fileIndex) => {
        structure.columns.forEach(col => {
            const normalized = col.cleaned;

            if (!columnMap.has(normalized)) {
                columnMap.set(normalized, {
                    normalizedName: normalized,
                    originalNames: [],
                    fileIndices: [],
                    type: col.type
                });
            }

            const entry = columnMap.get(normalized);
            entry.originalNames.push({ name: col.original, fileIndex });
            if (!entry.fileIndices.includes(fileIndex)) {
                entry.fileIndices.push(fileIndex);
            }
        });
    });

    // Convert to array and sort by file count (most common first)
    AppState.allColumns = Array.from(columnMap.values()).sort((a, b) =>
        b.fileIndices.length - a.fileIndices.length
    );

    // Select all by default
    AppState.selectedColumns = new Set(AppState.allColumns.map(col => col.normalizedName));

    renderColumnCards();
}

function renderColumnCards() {
    DOM.columnCardsGrid.innerHTML = AppState.allColumns.map(col => {
        const isSelected = AppState.selectedColumns.has(col.normalizedName);
        const displayName = col.originalNames[0].name; // Use first occurrence
        const fileCount = col.fileIndices.length;
        const totalFiles = AppState.uploadedFiles.length;

        return `
            <div class="column-card ${isSelected ? 'selected' : ''}" data-column="${col.normalizedName}">
                <input type="checkbox" 
                       id="col-${col.normalizedName}" 
                       ${isSelected ? 'checked' : ''}
                       onchange="toggleColumn('${col.normalizedName}')">
                <h3 class="column-name">${displayName}</h3>
                <div class="column-meta">
                    <span class="file-count">
                        <i class="fas fa-file"></i>
                        Found in ${fileCount} of ${totalFiles} files
                    </span>
                    <span class="column-type">${col.type}</span>
                </div>
            </div>
        `;
    }).join('');
}

function toggleColumn(normalizedName) {
    if (AppState.selectedColumns.has(normalizedName)) {
        AppState.selectedColumns.delete(normalizedName);
    } else {
        AppState.selectedColumns.add(normalizedName);
    }
}

// ===== STEP 3: EXTRACT AND PREVIEW =====
async function extractSelectedColumns() {
    if (AppState.selectedColumns.size === 0) {
        showNotification('Please select at least one column', 'error');
        return;
    }

    showLoading('Extracting selected columns...');

    try {
        // Merge data from all files
        const mergedData = [];

        for (let fileIndex = 0; fileIndex < AppState.fileStructures.length; fileIndex++) {
            const structure = AppState.fileStructures[fileIndex];
            const data = structure.fullData;

            data.forEach(row => {
                const newRow = {};

                // Map selected columns
                AppState.allColumns.forEach(col => {
                    if (!AppState.selectedColumns.has(col.normalizedName)) return;

                    // Find the original column name in this file
                    const originalInThisFile = col.originalNames.find(o => o.fileIndex === fileIndex);
                    if (originalInThisFile) {
                        newRow[col.originalNames[0].name] = row[originalInThisFile.name] || '';
                    } else {
                        newRow[col.originalNames[0].name] = '';
                    }
                });

                newRow['_source_file'] = structure.fileName;
                mergedData.push(newRow);
            });
        }

        AppState.previewData = mergedData;
        renderPreviewTable(mergedData.slice(0, 20));

        hideLoading();
        unlockStep(3);

    } catch (error) {
        hideLoading();
        showNotification('Error extracting columns: ' + error.message, 'error');
    }
}

function renderPreviewTable(data) {
    if (data.length === 0) {
        DOM.previewTableContainer.innerHTML = '<p class="preview-info">No data to preview</p>';
        return;
    }

    const columns = Object.keys(data[0]).filter(key => !key.startsWith('_'));

    const html = `
        <table class="preview-table">
            <thead>
                <tr>
                    ${columns.map(col => `<th>${col}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${data.map(row => `
                    <tr>
                        ${columns.map(col => `<td>${row[col] || '-'}</td>`).join('')}
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <p class="preview-info">
            <i class="fas fa-info-circle"></i>
            Showing first 20 rows of ${AppState.previewData.length} total records
        </p>
    `;

    DOM.previewTableContainer.innerHTML = html;
}

// ===== STEP 4 & 5: PROCESS AND EXPORT =====
async function processAndExport() {
    showLoading('Processing data with cleaning options...');

    try {
        let cleaned = [...AppState.previewData];

        // Apply cleaning options
        if (AppState.cleaningOptions.trimSpaces) {
            cleaned = cleanTrimSpaces(cleaned);
        }

        if (AppState.cleaningOptions.smartFormat) {
            cleaned = smartFormatData(cleaned);
        }

        if (AppState.cleaningOptions.removeDuplicates) {
            cleaned = detectDuplicates(cleaned);
        }

        AppState.processedData = cleaned;

        // Render statistics
        const totalRecords = cleaned.length;
        const duplicates = cleaned.filter(r => r._isDuplicate).length;
        const uniqueRecords = totalRecords - duplicates;

        DOM.statsGrid.innerHTML = `
            <div class="stat-card">
                <i class="fas fa-database"></i>
                <p class="stat-value">${totalRecords}</p>
                <p class="stat-label">Total Records</p>
            </div>
            <div class="stat-card">
                <i class="fas fa-check-circle"></i>
                <p class="stat-value">${uniqueRecords}</p>
                <p class="stat-label">Unique Records</p>
            </div>
            <div class="stat-card">
                <i class="fas fa-exclamation-triangle"></i>
                <p class="stat-value">${duplicates}</p>
                <p class="stat-label">Duplicates Found</p>
            </div>
        `;

        // Render final preview
        renderFinalPreview(cleaned.slice(0, 20));

        hideLoading();
        unlockStep(5);

    } catch (error) {
        hideLoading();
        showNotification('Error processing data: ' + error.message, 'error');
    }
}

function renderFinalPreview(data) {
    if (data.length === 0) {
        DOM.finalPreviewContainer.innerHTML = '<p class="preview-info">No data to preview</p>';
        return;
    }

    const columns = Object.keys(data[0]).filter(key => !key.startsWith('_'));

    const html = `
        <table class="preview-table">
            <thead>
                <tr>
                    ${columns.map(col => `<th>${col}</th>`).join('')}
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(row => `
                    <tr class="${row._isDuplicate ? 'duplicate-row' : ''}">
                        ${columns.map(col => `<td>${row[col] || '-'}</td>`).join('')}
                        <td>
                            ${row._isDuplicate ?
            '<span style="color: #fca5a5;"><i class="fas fa-copy"></i> Duplicate</span>' :
            '<span style="color: #6ee7b7;">✓</span>'}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <p class="preview-info">
            <i class="fas fa-info-circle"></i>
            Showing first 20 rows of ${AppState.processedData.length} total records
        </p>
    `;

    DOM.finalPreviewContainer.innerHTML = html;
}

// ===== DATA CLEANING FUNCTIONS =====

function cleanTrimSpaces(data) {
    return data.map(row => {
        const cleaned = {};
        for (let [key, val] of Object.entries(row)) {
            cleaned[key] = typeof val === 'string'
                ? val.trim().replace(/\s+/g, ' ')
                : val;
        }
        return cleaned;
    });
}

// ⚠️ NEW FEATURE: Smart mobile number formatting
function smartFormatData(data) {
    return data.map(row => {
        const formatted = {};

        for (let [key, val] of Object.entries(row)) {
            // Find column type
            const colInfo = AppState.allColumns.find(c =>
                c.originalNames.some(o => o.name === key)
            );

            if (colInfo && colInfo.type === 'phone') {
                formatted[key] = formatMobileNumber(val);
            } else {
                formatted[key] = val;
            }
        }

        return formatted;
    });
}

//⚠️ NEW FEATURE: Mobile number formatting logic
function formatMobileNumber(value) {
    if (!value) return '';

    // Remove all non-digits
    let digits = value.toString().replace(/\D/g, '');

    // Handle country code
    if (digits.startsWith('91') && digits.length > 10) {
        digits = digits.substring(2); // Remove +91
    }
    if (digits.startsWith('0')) {
        digits = digits.substring(1); // Remove leading 0
    }

    // Enforce 10 digits (Indian mobile standard)
    if (digits.length > 10) {
        digits = digits.substring(digits.length - 10);
    }

    // Validate length
    if (digits.length !== 10) {
        return value; // Return original if invalid
    }

    // Add +91 prefix
    return '+91' + digits;
}

// ✅ PRESERVED: Duplicate detection
function detectDuplicates(data) {
    const seen = new Map();
    return data.map((row, index) => {
        // Create key without internal fields
        const cleanRow = {};
        Object.keys(row).forEach(key => {
            if (!key.startsWith('_')) {
                cleanRow[key] = row[key];
            }
        });

        const key = JSON.stringify(cleanRow);
        if (seen.has(key)) {
            return { ...row, _isDuplicate: true };
        } else {
            seen.set(key, index);
            return { ...row, _isDuplicate: false };
        }
    });
}

// ===== EXPORT FUNCTIONS =====
function exportData(format) {
    if (!AppState.processedData) {
        showNotification('No data to export', 'error');
        return;
    }

    showLoading(`Preparing ${format.toUpperCase()} download...`);

    // Remove internal flags
    const exportData = AppState.processedData.map(row => {
        const clean = { ...row };
        delete clean._isDuplicate;
        delete clean._source_file;
        return clean;
    });

    const fileName = `EXTEROID_Consolidated_${Date.now()}`;

    try {
        if (format === 'excel') {
            exportToExcel(exportData, fileName);
        } else if (format === 'csv') {
            exportToCSV(exportData, fileName);
        }

        showNotification(`✓ ${format.toUpperCase()} file downloaded successfully!`, 'success');
    } catch (error) {
        showNotification(`Error exporting: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

// ✅ PRESERVED: Excel export
function exportToExcel(data, fileName) {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Consolidated Data");

    // Auto-fit columns
    const colWidths = Object.keys(data[0] || {}).map(key => ({
        wch: Math.max(key.length, 15)
    }));
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

// ⚠️ NEW: CSV export
function exportToCSV(data, fileName) {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// ===== NAVIGATION & UI CONTROL =====
function unlockStep(step) {
    const sections = {
        1: 'step-1-upload',
        2: 'step-2-columns',
        3: 'step-3-preview',
        4: 'step-4-cleaning',
        5: 'step-5-export'
    };

    const sectionId = sections[step];
    const section = document.getElementById(sectionId);

    if (section) {
        section.classList.remove('hidden');
        updateProgressIndicator(step);
        scrollToSection(sectionId);
    }
}

function goToStep(step) {
    // Hide all steps
    for (let i = 2; i <= 5; i++) {
        const sections = {
            2: 'step-2-columns',
            3: 'step-3-preview',
            4: 'step-4-cleaning',
            5: 'step-5-export'
        };
        const section = document.getElementById(sections[i]);
        if (section && i > step) {
            section.classList.add('hidden');
        }
    }

    AppState.currentStep = step;
    updateProgressIndicator(step);

    // Scroll to the target step
    const sections = {
        1: 'step-1-upload',
        2: 'step-2-columns',
        3: 'step-3-preview',
        4: 'step-4-cleaning'
    };

    if (sections[step]) {
        scrollToSection(sections[step]);
    }
}

function updateProgressIndicator(step) {
    DOM.progressSteps.forEach((stepEl, index) => {
        const stepNumber = index + 1;
        stepEl.classList.remove('active', 'completed');

        if (stepNumber === step) {
            stepEl.classList.add('active');
        } else if (stepNumber < step) {
            stepEl.classList.add('completed');
        }
    });
}

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        setTimeout(() => {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
}

function resetApplication() {
    if (!confirm('Are you sure you want to start over? All progress will be lost.')) {
        return;
    }

    // Reset state
    AppState.uploadedFiles = [];
    AppState.fileStructures = [];
    AppState.allColumns = [];
    AppState.selectedColumns = new Set();
    AppState.previewData = [];
    AppState.processedData = null;
    AppState.currentStep = 1;

    // Reset UI
    DOM.fileList.innerHTML = '';
    DOM.uploadedFilesContainer.classList.add('hidden');
    DOM.uploadValidation.classList.add('hidden');

    // Hide all steps except 1
    for (let i = 2; i <= 5; i++) {
        const sections = {
            2: 'step-2-columns',
            3: 'step-3-preview',
            4: 'step-4-cleaning',
            5: 'step-5-export'
        };
        document.getElementById(sections[i]).classList.add('hidden');
    }

    updateProgressIndicator(1);
    scrollToSection('step-1-upload');
}

// ===== UTILITY FUNCTIONS =====
function showLoading(message = 'Processing...') {
    DOM.loadingText.textContent = message;
    DOM.loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    DOM.loadingOverlay.classList.add('hidden');
}

function showValidationMessage(message, type) {
    DOM.uploadValidation.innerHTML = `
        <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
        ${message}
    `;
    DOM.uploadValidation.className = `validation-message ${type}`;
    DOM.uploadValidation.classList.remove('hidden');
}

function showNotification(message, type = 'info') {
    const toast = document.createElement('div');
    const bgColor = type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6';

    toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background: ${bgColor};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 500;
        animation: slideIn 0.3s ease;
    `;

    toast.innerHTML = `
        <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
        ${message}
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ✅ PRESERVED: File size formatter
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

console.log('✅ EXTEROID Consolidator loaded successfully');
