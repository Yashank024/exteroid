/**
 * EXTEROID - Advanced Image to Data Extractor
 * AI-Powered OCR with Custom Field Extraction
 */

// ===== STATE MANAGEMENT =====
const appState = {
    uploadedFiles: [],           // Array of File objects
    fileDataURLs: [],            // Array of data URLs for preview
    selectedFields: new Set(),   // Set of selected field names
    ocrResults: [],              // OCR text blocks with coordinates
    extractedData: [],           // Extracted structured data
    cleanedData: [],            // Cleaned final data
    currentStep: 1,             // Current step (1-6)
    processingStats: {
        totalImages: 0,
        processedImages: 0,
        totalRows: 0
    }
};

// ===== FIELD PATTERNS & CONFIG =====
const fieldPatterns = {
    // Extract ANY sequence of 5+ digits (with or without +91, spaces, dashes)
    // NO validation here - just capture everything, clean later
    mobile: /[\+\d][\d\s\-\.]{4,20}/g,
    email: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi,
    pincode: /\b\d{6}\b/g,
    date: /\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2}/g,
    id: /[A-Z]{2,4}\d{4,}/g
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    log('System ready. Upload images to begin.', 'info');
});

function initializeEventListeners() {
    // Step 1: Upload
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const btnBrowse = document.getElementById('btn-browse');
    const btnClearFiles = document.getElementById('btn-clear-files');
    const btnToFieldSelection = document.getElementById('btn-to-field-selection');

    dropZone?.addEventListener('click', () => fileInput.click());
    dropZone?.addEventListener('dragover', handleDragOver);
    dropZone?.addEventListener('dragleave', handleDragLeave);
    dropZone?.addEventListener('drop', handleDrop);
    btnBrowse?.addEventListener('click', () => fileInput.click());
    fileInput?.addEventListener('change', (e) => handleFileSelect(e.target.files));
    btnClearFiles?.addEventListener('click', clearAllFiles);
    btnToFieldSelection?.addEventListener('click', () => showStep(2));

    // Step 2: Field Selection
    const fieldCheckboxes = document.querySelectorAll('input[name="field"]');
    fieldCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateFieldSelection);
    });
    document.getElementById('btn-back-to-upload')?.addEventListener('click', () => showStep(1));
    document.getElementById('btn-start-extraction')?.addEventListener('click', startExtraction);

    // Step 3: Processing (automatic)

    // Step 4: Preview
    document.getElementById('btn-back-to-fields')?.addEventListener('click', () => showStep(2));
    document.getElementById('btn-confirm-data')?.addEventListener('click', () => showStep(5));

    // Step 5: Cleaning
    document.getElementById('btn-back-to-preview')?.addEventListener('click', () => showStep(4));
    document.getElementById('btn-apply-cleaning')?.addEventListener('click', applyDataCleaning);

    // Step 6: Export
    document.getElementById('btn-export-excel')?.addEventListener('click', () => exportData('excel'));
    document.getElementById('btn-export-csv')?.addEventListener('click', () => exportData('csv'));
    document.getElementById('btn-start-over')?.addEventListener('click', resetApplication);
}

// ===== LOGGING SYSTEM =====
function log(message, type = 'info') {
    const consoleOutput = document.getElementById('console-output');
    if (!consoleOutput) return;

    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.textContent = `[${timestamp}] ${message}`;

    consoleOutput.appendChild(logEntry);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

// ===== STEP NAVIGATION =====
function showStep(stepNumber) {
    // Hide all steps
    for (let i = 1; i <= 6; i++) {
        const step = document.getElementById(`step-${i}-${getStepName(i)}`);
        if (step) step.classList.add('hidden');
    }

    // Show target step
    const targetStep = document.getElementById(`step-${stepNumber}-${getStepName(stepNumber)}`);
    if (targetStep) {
        targetStep.classList.remove('hidden');
        appState.currentStep = stepNumber;
    }
}

function getStepName(stepNumber) {
    const names = ['', 'upload', 'fields', 'processing', 'preview', 'cleaning', 'export'];
    return names[stepNumber] || '';
}

// ===== FILE UPLOAD HANDLING =====
function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-active');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-active');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-active');
    handleFileSelect(e.dataTransfer.files);
}

async function handleFileSelect(files) {
    if (files.length === 0) return;

    const validFiles = Array.from(files).filter(file => {
        if (!file.type.startsWith('image/')) {
            log(`Skipped ${file.name}: Not an image`, 'warning');
            return false;
        }
        return true;
    });

    if (validFiles.length === 0) return;

    appState.uploadedFiles.push(...validFiles);
    log(`Added ${validFiles.length} images. Total: ${appState.uploadedFiles.length}`, 'info');

    await displayThumbnails();
    updateFileStats();
}

async function displayThumbnails() {
    const thumbnailGrid = document.getElementById('thumbnail-grid');
    if (!thumbnailGrid) return;

    thumbnailGrid.innerHTML = '';
    thumbnailGrid.classList.remove('hidden');

    for (let i = 0; i < appState.uploadedFiles.length; i++) {
        const file = appState.uploadedFiles[i];
        const dataURL = await fileToDataURL(file);

        if (!appState.fileDataURLs[i]) {
            appState.fileDataURLs.push(dataURL);
        }

        const thumbnailItem = document.createElement('div');
        thumbnailItem.className = 'thumbnail-item';
        thumbnailItem.innerHTML = `
            <img src="${dataURL}" class="thumbnail-img" alt="${file.name}">
            <div class="thumbnail-name">${file.name}</div>
            <button class="btn-remove-thumb" data-index="${i}">
                <i class="fas fa-times"></i>
            </button>
        `;

        thumbnailGrid.appendChild(thumbnailItem);
    }

    // Add remove listeners
    document.querySelectorAll('.btn-remove-thumb').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFile(parseInt(btn.dataset.index));
        });
    });
}

function removeFile(index) {
    appState.uploadedFiles.splice(index, 1);
    appState.fileDataURLs.splice(index, 1);
    log(`Removed image at position ${index + 1}`, 'info');

    if (appState.uploadedFiles.length === 0) {
        document.getElementById('thumbnail-grid')?.classList.add('hidden');
        document.getElementById('file-stats')?.classList.add('hidden');
    } else {
        displayThumbnails();
    }

    updateFileStats();
}

function clearAllFiles() {
    if (!confirm('Clear all uploaded images?')) return;

    appState.uploadedFiles = [];
    appState.fileDataURLs = [];
    document.getElementById('thumbnail-grid')?.classList.add('hidden');
    document.getElementById('file-stats')?.classList.add('hidden');
    updateFileStats();
    log('All images cleared', 'info');
}

function updateFileStats() {
    const fileStats = document.getElementById('file-stats');
    const fileCountText = document.getElementById('file-count-text');
    const btnToFieldSelection = document.getElementById('btn-to-field-selection');

    if (!fileStats || !fileCountText) return;

    const count = appState.uploadedFiles.length;

    if (count > 0) {
        fileStats.classList.remove('hidden');
        fileCountText.textContent = `${count} image${count !== 1 ? 's' : ''} uploaded`;
        btnToFieldSelection.disabled = false;
    } else {
        fileStats.classList.add('hidden');
        btnToFieldSelection.disabled = true;
    }
}

function fileToDataURL(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
}

// ===== FIELD SELECTION =====
function updateFieldSelection() {
    appState.selectedFields.clear();

    const checkboxes = document.querySelectorAll('input[name="field"]:checked');
    checkboxes.forEach(cb => appState.selectedFields.add(cb.value));

    const selectedCount = document.getElementById('selected-count');
    const btnStartExtraction = document.getElementById('btn-start-extraction');

    if (selectedCount) {
        selectedCount.textContent = `${appState.selectedFields.size} field${appState.selectedFields.size !== 1 ? 's' : ''} selected`;
    }

    if (btnStartExtraction) {
        btnStartExtraction.disabled = appState.selectedFields.size === 0;
    }
}

// ===== OCR EXTRACTION ENGINE =====
async function startExtraction() {
    if (appState.uploadedFiles.length === 0 || appState.selectedFields.size === 0) {
        alert('Please upload images and select fields');
        return;
    }

    showStep(3);
    log('Starting OCR extraction...', 'info');
    log(`Processing ${appState.uploadedFiles.length} images`, 'info');
    log(`Extracting ${appState.selectedFields.size} fields: ${Array.from(appState.selectedFields).join(', ')}`, 'info');

    appState.processingStats.totalImages = appState.uploadedFiles.length;
    appState.processingStats.processedImages = 0;

    try {
        await performOCR();
        await extractStructuredData();

        log('✓ Extraction complete!', 'info');
        log(`Found ${appState.extractedData.length} data rows`, 'info');

        displayDataPreview();
        showStep(4);
    } catch (error) {
        log(`✗ Error: ${error.message}`, 'error');
        alert('Extraction failed. Please try again.');
        showStep(2);
    }
}

async function performOCR() {
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');

    appState.ocrResults = [];

    for (let i = 0; i < appState.fileDataURLs.length; i++) {
        const dataURL = appState.fileDataURLs[i];
        const fileName = appState.uploadedFiles[i].name;

        log(`Processing: ${fileName} (${i + 1}/${appState.fileDataURLs.length})`, 'info');

        if (progressText) {
            progressText.textContent = `Processing ${i + 1} of ${appState.fileDataURLs.length} - ${fileName}`;
        }

        try {
            const worker = await Tesseract.createWorker();
            await worker.loadLanguage('eng');
            await worker.initialize('eng');

            const { data } = await worker.recognize(dataURL);

            // Extract text blocks with coordinates
            const blocks = data.words.map(word => ({
                text: word.text.trim(),
                x: word.bbox.x0,
                y: word.bbox.y0,
                width: word.bbox.x1 - word.bbox.x0,
                height: word.bbox.y1 - word.bbox.y0,
                confidence: word.confidence
            })).filter(block => block.text.length > 0);

            appState.ocrResults.push(blocks);
            log(`✓ ${fileName}: Extracted ${blocks.length} text blocks (${Math.round(data.confidence)}% confidence)`, 'info');

            await worker.terminate();
        } catch (error) {
            log(`✗ Error processing ${fileName}: ${error.message}`, 'error');
            appState.ocrResults.push([]);
        }

        appState.processingStats.processedImages = i + 1;
        if (progressFill) {
            progressFill.style.width = `${((i + 1) / appState.fileDataURLs.length) * 100}%`;
        }
    }
}

async function extractStructuredData() {
    log('Extracting structured data from OCR results...', 'info');

    const allBlocks = appState.ocrResults.flat();
    const dataRows = [];

    // Group text blocks by Y-coordinate (rows)
    const rowGroups = groupBlocksByRows(allBlocks);

    log(`Detected ${rowGroups.length} potential data rows`, 'info');

    rowGroups.forEach((rowBlocks, rowIndex) => {
        const rowData = {};
        let hasData = false;

        // Extract each selected field
        appState.selectedFields.forEach(fieldName => {
            const value = extractFieldValue(fieldName, rowBlocks, allBlocks);
            if (value) {
                rowData[fieldName] = value;
                hasData = true;
            } else {
                rowData[fieldName] = '';
            }
        });

        if (hasData) {
            dataRows.push(rowData);
        }
    });

    // Also try pattern matching across all text (for scattered data)
    const scatteredMatches = extractScatteredData(allBlocks);
    dataRows.push(...scatteredMatches);

    appState.extractedData = dataRows;
    appState.processingStats.totalRows = dataRows.length;
}

function groupBlocksByRows(blocks) {
    if (blocks.length === 0) return [];

    const sortedByY = [...blocks].sort((a, b) => a.y - b.y);
    const rows = [];
    let currentRow = [sortedByY[0]];
    const yTolerance = 15; // Pixels

    for (let i = 1; i < sortedByY.length; i++) {
        const block = sortedByY[i];
        const lastBlock = currentRow[currentRow.length - 1];

        if (Math.abs(block.y - lastBlock.y) <= yTolerance) {
            currentRow.push(block);
        } else {
            rows.push(currentRow);
            currentRow = [block];
        }
    }
    rows.push(currentRow);

    return rows;
}

function extractFieldValue(fieldName, rowBlocks, allBlocks) {
    const rowText = rowBlocks.map(b => b.text).join(' ');

    switch (fieldName) {
        case 'mobile':
            // Extract raw number sequences - NO PROCESSING
            // Just find and return as-is, all processing happens in cleaning phase
            const mobileMatches = rowText.match(fieldPatterns.mobile);
            // Return first match as-is (no formatting, no validation)
            return mobileMatches ? mobileMatches[0] : '';

        case 'email':
            // Extract raw email - NO PROCESSING
            const emailMatches = rowText.match(fieldPatterns.email);
            return emailMatches ? emailMatches[0] : '';

        case 'pincode':
            // Extract raw pincode - NO PROCESSING
            const pincodeMatches = rowText.match(fieldPatterns.pincode);
            return pincodeMatches ? pincodeMatches[0] : '';

        case 'date':
            // Extract raw date - NO PROCESSING
            const dateMatches = rowText.match(fieldPatterns.date);
            return dateMatches ? dateMatches[0] : '';

        case 'id':
            // Extract raw ID - NO PROCESSING
            const idMatches = rowText.match(fieldPatterns.id);
            return idMatches ? idMatches[0] : '';

        case 'name':
            // Name is text without special patterns
            // Remove detected patterns and return remaining text as-is
            const nameText = rowText
                .replace(fieldPatterns.mobile, '')
                .replace(fieldPatterns.email, '')
                .replace(fieldPatterns.pincode, '')
                .trim();
            return nameText.length > 2 ? nameText : '';

        case 'address':
        case 'city':
        case 'state':
            // Extract multi-word text as-is
            return rowText.length > 3 ? rowText : '';

        case 'custom':
            // Return all text as-is
            return rowText;

        default:
            return rowText;
    }
}

function extractScatteredData(allBlocks) {
    const scatteredRows = [];
    const usedIndexes = new Set();

    // Pattern-based extraction
    appState.selectedFields.forEach(fieldName => {
        if (fieldPatterns[fieldName]) {
            const allText = allBlocks.map(b => b.text).join(' ');
            const matches = allText.match(fieldPatterns[fieldName]);

            if (matches) {
                matches.forEach(match => {
                    const row = {};
                    row[fieldName] = match;
                    scatteredRows.push(row);
                });
            }
        }
    });

    return scatteredRows;
}

// ===== DATA PREVIEW =====
function displayDataPreview() {
    const container = document.getElementById('preview-table-container');
    const totalRowsPreview = document.getElementById('total-rows-preview');
    const totalColumnsPreview = document.getElementById('total-columns-preview');
    const displayingRows = document.getElementById('displaying-rows');

    if (!container) return;

    const totalRows = appState.extractedData.length;
    const previewRows = appState.extractedData.slice(0, 20);
    const columns = Array.from(appState.selectedFields);

    if (totalRowsPreview) totalRowsPreview.textContent = totalRows;
    if (totalColumnsPreview) totalColumnsPreview.textContent = columns.length;
    if (displayingRows) {
        displayingRows.textContent = totalRows > 20
            ? `First 20 of ${totalRows} rows`
            : `All ${totalRows} rows`;
    }

    container.innerHTML = createTableHTML(previewRows, columns);
    makeTableEditable();
}

function createTableHTML(rows, columns) {
    if (rows.length === 0) return '<p style="padding: 2rem; text-align: center; color: #7dd3fc;">No data found</p>';

    let html = '<table class="data-table"><thead><tr>';
    columns.forEach(col => {
        html += `<th>${capitalizeField(col)}</th>`;
    });
    html += '</tr></thead><tbody>';

    rows.forEach((row, rowIndex) => {
        html += '<tr>';
        columns.forEach(col => {
            html += `<td class="editable-cell" data-row="${rowIndex}" data-col="${col}">${row[col] || ''}</td>`;
        });
        html += '</tr>';
    });

    html += '</tbody></table>';
    return html;
}

function makeTableEditable() {
    document.querySelectorAll('.editable-cell').forEach(cell => {
        cell.addEventListener('click', function () {
            const currentValue = this.textContent;
            const input = document.createElement('input');
            input.type = 'text';
            input.value = currentValue;
            input.style.width = '100%';
            input.style.background = 'rgba(6, 182, 212, 0.1)';
            input.style.border = '1px solid #06b6d4';
            input.style.padding = '0.5rem';
            input.style.color = '#e0f2fe';
            input.style.borderRadius = '4px';

            input.addEventListener('blur', () => {
                const newValue = input.value;
                const rowIndex = parseInt(this.dataset.row);
                const colName = this.dataset.col;

                appState.extractedData[rowIndex][colName] = newValue;
                this.textContent = newValue;
            });

            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') input.blur();
            });

            this.textContent = '';
            this.appendChild(input);
            input.focus();
        });
    });
}

function capitalizeField(field) {
    return field.split('_').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

// ===== SMART MOBILE NUMBER EXTRACTION =====
/**
 * Extracts valid 10-digit Indian mobile number from any input
 * Logic:
 * 1. Remove all non-digits
 * 2. Remove +91 prefix if present
 * 3. If exactly 10 digits and starts with 6/7/8/9, return it
 * 4. If >10 digits, find 10-digit sequence starting with 6/7/8/9
 * 5. Scan from right to left starting at position 5 (to handle cases like 492549193350)
 */
function extractValidMobile(input) {
    if (!input) return '';

    // Extract all digits
    let digits = input.replace(/\D/g, '');

    // ENHANCED: Remove 91 prefix if applicable
    // Handles both +91XXXXXXXXXX and 91XXXXXXXXXX formats
    // Example: 9198921161 → Check if 9898921161 is valid → Yes, use it
    if (digits.startsWith('91') && digits.length > 10) {
        const without91 = digits.slice(2);  // Remove first 2 digits (91)

        // Keep only if exactly 10 digits remain AND starts with 6/7/8/9
        if (without91.length === 10 && /^[6789]/.test(without91)) {
            digits = without91;
            // Successfully removed 91 prefix
        }
    }

    // If exactly 10 digits and starts with 6/7/8/9
    if (digits.length === 10 && /^[6789]/.test(digits)) {
        return digits;
    }

    // If less than 10 digits, invalid
    if (digits.length < 10) {
        return digits; // Return as-is, user can edit
    }

    // If more than 10 digits, find valid 10-digit sequence
    if (digits.length > 10) {
        // Try to find 10 consecutive digits starting with 6/7/8/9
        for (let i = 0; i <= digits.length - 10; i++) {
            const sequence = digits.slice(i, i + 10);
            if (/^[6789]/.test(sequence)) {
                return sequence; // Found valid mobile
            }
        }

        // If no valid sequence found, try scanning from right
        // (handles cases like 492549193350 -> 9254919335)
        // Start from position 5 from right and look backwards
        if (digits.length >= 10) {
            // Get last 10 digits
            const last10 = digits.slice(-10);
            if (/^[6789]/.test(last10)) {
                return last10;
            }

            // Try different positions
            for (let i = digits.length - 10; i >= 0; i--) {
                const sequence = digits.slice(i, i + 10);
                if (/^[6789]/.test(sequence)) {
                    return sequence;
                }
            }
        }
    }

    // Fallback: return first 10 digits or original
    return digits.length >= 10 ? digits.slice(0, 10) : digits;
}

// ===== SMART EMAIL CLEANING =====
/**
 * Cleans and validates email addresses
 * - Converts to lowercase
 * - Removes extra spaces
 * - Removes duplicate dots
 * - Validates format
 * - Handles common OCR errors
 */
function cleanEmail(input) {
    if (!input) return '';

    let email = input.toLowerCase().trim();

    // Remove spaces
    email = email.replace(/\s+/g, '');

    // Common OCR errors: O vs 0, l vs 1, etc.
    // Fix common domain errors
    email = email.replace(/gmai1\.com/g, 'gmail.com');
    email = email.replace(/gma1l\.com/g, 'gmail.com');

    // Remove duplicate dots
    email = email.replace(/\.{2,}/g, '.');

    // Remove leading/trailing dots
    email = email.replace(/^\.+|\.+$/g, '');

    // Ensure only one @ symbol
    const atCount = (email.match(/@/g) || []).length;
    if (atCount > 1) {
        // Keep only first @
        const parts = email.split('@');
        email = parts[0] + '@' + parts.slice(1).join('');
    }

    // Basic validation
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
    if (!emailRegex.test(email)) {
        // If invalid, return original (user can edit)
        return input;
    }

    return email;
}

// ===== DATA CLEANING =====
function applyDataCleaning() {
    log('Applying data cleaning operations...', 'info');

    let data = [...appState.extractedData];
    const originalCount = data.length;

    // Remove empty rows
    if (document.getElementById('clean-empty-rows')?.checked) {
        data = data.filter(row =>
            Object.values(row).some(v => v && v.trim() !== '')
        );
        log(`Removed ${originalCount - data.length} empty rows`, 'info');
    }

    // Trim whitespace
    if (document.getElementById('clean-trim')?.checked) {
        data = data.map(row => {
            const cleaned = {};
            Object.entries(row).forEach(([key, value]) => {
                cleaned[key] = typeof value === 'string' ? value.trim() : value;
            });
            return cleaned;
        });
        log('Trimmed whitespace from all fields', 'info');
    }

    // Remove duplicates
    if (document.getElementById('clean-duplicates')?.checked) {
        const seen = new Set();
        const beforeDupCount = data.length;
        data = data.filter(row => {
            const key = JSON.stringify(row);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
        log(`Removed ${beforeDupCount - data.length} duplicate rows`, 'info');
    }

    // Format mobile numbers - SMART EXTRACTION + FILTER INCOMPLETE
    if (document.getElementById('clean-format-mobile')?.checked && appState.selectedFields.has('mobile')) {
        let removedCount = 0;
        data = data.map(row => {
            if (row.mobile) {
                const extracted = extractValidMobile(row.mobile);
                // Only keep if exactly 10 digits
                if (extracted.length === 10 && /^[6789]/.test(extracted)) {
                    row.mobile = extracted;
                } else {
                    // Remove incomplete/invalid mobile
                    row.mobile = '';
                    removedCount++;
                }
            }
            return row;
        });

        // Remove rows where mobile is required but empty/invalid
        const beforeFilter = data.length;
        data = data.filter(row => !appState.selectedFields.has('mobile') || (row.mobile && row.mobile.length === 10));
        const filtered = beforeFilter - data.length;

        log(`Extracted valid mobile numbers. Removed ${filtered} rows with incomplete mobiles`, 'info');
    }

    // Format emails - SMART CLEANING
    if (document.getElementById('clean-format-email')?.checked && appState.selectedFields.has('email')) {
        data = data.map(row => {
            if (row.email) {
                row.email = cleanEmail(row.email);
            }
            return row;
        });
        log('Cleaned and validated email addresses', 'info');
    }

    // Format names
    if (document.getElementById('clean-format-names')?.checked && appState.selectedFields.has('name')) {
        data = data.map(row => {
            if (row.name) {
                row.name = row.name.split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(' ');
            }
            return row;
        });
        log('Formatted names to Title Case', 'info');
    }

    const rowsRemoved = originalCount - data.length;
    appState.cleanedData = data;

    log(`✓ Cleaning complete. ${data.length} rows ready for export`, 'info');

    displayFinalPreview(rowsRemoved);
    showStep(6);
}

function displayFinalPreview(rowsRemoved) {
    const finalTableContainer = document.getElementById('final-table-container');
    const finalRowsCount = document.getElementById('final-rows-count');
    const finalColumnsCount = document.getElementById('final-columns-count');
    const rowsRemovedCount = document.getElementById('rows-removed-count');
    const finalRemainingRows = document.getElementById('final-remaining-rows');

    const totalRows = appState.extractedData.length;
    const finalRows = appState.cleanedData.length;
    const columns = Array.from(appState.selectedFields);

    if (finalRowsCount) finalRowsCount.textContent = totalRows;
    if (finalColumnsCount) finalColumnsCount.textContent = columns.length;
    if (rowsRemovedCount) rowsRemovedCount.textContent = rowsRemoved;
    if (finalRemainingRows) finalRemainingRows.textContent = finalRows;

    const previewRows = appState.cleanedData.slice(0, 20);
    if (finalTableContainer) {
        finalTableContainer.innerHTML = createTableHTML(previewRows, columns);
    }
}

// ===== EXPORT =====
function exportData(format) {
    if (appState.cleanedData.length === 0) {
        alert('No data to export');
        return;
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `Extracted_Data_${timestamp}`;

    log(`Exporting ${appState.cleanedData.length} rows as ${format.toUpperCase()}...`, 'info');

    if (format === 'excel') {
        const worksheet = XLSX.utils.json_to_sheet(appState.cleanedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Extracted Data');
        XLSX.writeFile(workbook, `${filename}.xlsx`);
        log('✓ Excel file downloaded successfully', 'info');
    } else if (format === 'csv') {
        const worksheet = XLSX.utils.json_to_sheet(appState.cleanedData);
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        downloadCSV(csv, `${filename}.csv`);
        log('✓ CSV file downloaded successfully', 'info');
    }
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ===== RESET =====
function resetApplication() {
    if (!confirm('Start over? All data will be lost.')) return;

    appState.uploadedFiles = [];
    appState.fileDataURLs = [];
    appState.selectedFields.clear();
    appState.ocrResults = [];
    appState.extractedData = [];
    appState.cleanedData = [];

    // Uncheck all field checkboxes
    document.querySelectorAll('input[name="field"]').forEach(cb => cb.checked = false);

    // Clear console
    const consoleOutput = document.getElementById('console-output');
    if (consoleOutput) {
        consoleOutput.innerHTML = '<div class="log-entry">[System] Reset complete. Ready for new extraction.</div>';
    }

    log('Application reset', 'info');
    showStep(1);
}
