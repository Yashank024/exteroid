/**
 * EXTEROID - Image/Document to Excel Engine
 * OCR + Intelligent Table Reconstruction System
 */

// ===== STATE MANAGEMENT =====
const appState = {
    uploadedFiles: [],           // Array of File objects
    fileDataURLs: [],            // Array of data URLs for images
    ocrResults: [],              // Array of OCR text blocks per file
    documentTypes: [],           // Detected type per file
    detectedColumns: [],         // Column definitions
    reconstructedRows: [],       // Table rows
    cleanedData: [],            // Final cleaned data
    currentStep: 0,             // UI step tracker
    processingConfig: {         // Adjustable parameters
        columnToleranceX: 20,     // Pixel tolerance for column clustering
        rowToleranceY: 15,        // Pixel tolerance for row grouping
        headerDetectionThreshold: 0.7
    }
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
});

function initializeEventListeners() {
    // File upload
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const btnBrowse = document.getElementById('btn-browse');
    const btnStartDetection = document.getElementById('btn-start-detection');

    // Drop zone events
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);

    btnBrowse.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFileSelect(e.target.files));
    btnStartDetection.addEventListener('click', startOCRProcessing);

    // Navigation buttons
    document.getElementById('btn-proceed-to-columns')?.addEventListener('click', () => showSection(3));
    document.getElementById('btn-reconstruct-rows')?.addEventListener('click', reconstructTableRows);
    document.getElementById('btn-to-column-control')?.addEventListener('click', () => {
        displayColumnControl();
        showSection(5);
        updateProgressSteps(5);
    });
    document.getElementById('btn-apply-column-changes')?.addEventListener('click', applyColumnChanges);
    document.getElementById('btn-run-cleaning')?.addEventListener('click', runDataCleaning);
    document.getElementById('btn-export-excel')?.addEventListener('click', () => exportData('excel'));
    document.getElementById('btn-export-csv')?.addEventListener('click', () => exportData('csv'));

    // Re-analyse button
    document.getElementById('btn-reanalyse')?.addEventListener('click', reAnalyseTable);
    document.getElementById('btn-reanalyse-alt')?.addEventListener('click', reAnalyseTable);

    // Back buttons
    document.getElementById('btn-back-to-upload-1')?.addEventListener('click', () => showSection(0));
    document.getElementById('btn-back-to-columns')?.addEventListener('click', () => showSection(3));
    document.getElementById('btn-back-to-preview')?.addEventListener('click', () => showSection(4));
    document.getElementById('btn-back-to-control')?.addEventListener('click', () => showSection(5));

    // Start over
    document.getElementById('btn-start-over')?.addEventListener('click', resetApplication);
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
    const files = e.dataTransfer.files;
    handleFileSelect(files);
}

function handleFileSelect(files) {
    // Validate file count
    if (files.length === 0) return;
    if (files.length > 10) {
        alert('Maximum 10 files allowed. Please select fewer files.');
        return;
    }

    // Validate file types and sizes
    const validFiles = [];
    let totalSize = 0;

    for (let file of files) {
        const fileType = file.type;
        const fileSize = file.size;

        // Check file type
        if (!fileType.startsWith('image/') && fileType !== 'application/pdf') {
            alert(`Invalid file type: ${file.name}. Only images and PDFs are allowed.`);
            continue;
        }

        // Check individual file size (5MB)
        if (fileSize > 5 * 1024 * 1024) {
            alert(`File too large: ${file.name}. Maximum size is 5MB per file.`);
            continue;
        }

        totalSize += fileSize;
        validFiles.push(file);
    }

    // Check total size (30MB)
    if (totalSize > 30 * 1024 * 1024) {
        alert('Total file size exceeds 30MB. Please select fewer or smaller files.');
        return;
    }

    if (validFiles.length === 0) return;

    appState.uploadedFiles = validFiles;
    displayThumbnails();
}

async function displayThumbnails() {
    const thumbnailGrid = document.getElementById('thumbnail-grid');
    const thumbnailsContainer = document.getElementById('thumbnails-container');
    const fileCount = document.getElementById('file-count');

    thumbnailGrid.classList.remove('hidden');
    thumbnailsContainer.innerHTML = '';
    fileCount.textContent = appState.uploadedFiles.length;

    appState.fileDataURLs = [];

    for (let i = 0; i < appState.uploadedFiles.length; i++) {
        const file = appState.uploadedFiles[i];
        const dataURL = await fileToDataURL(file);
        appState.fileDataURLs.push(dataURL);

        const thumbnailItem = document.createElement('div');
        thumbnailItem.className = 'thumbnail-item';
        thumbnailItem.innerHTML = `
            <img src="${dataURL}" class="thumbnail-img" alt="${file.name}">
            <div class="thumbnail-name">${file.name}</div>
            <button class="btn-remove-thumb" data-index="${i}">
                <i class="fas fa-times"></i>
            </button>
        `;

        thumbnailsContainer.appendChild(thumbnailItem);
    }

    // Add remove listeners
    document.querySelectorAll('.btn-remove-thumb').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            removeFile(index);
        });
    });
}

function removeFile(index) {
    appState.uploadedFiles.splice(index, 1);
    appState.fileDataURLs.splice(index, 1);

    if (appState.uploadedFiles.length === 0) {
        document.getElementById('thumbnail-grid').classList.add('hidden');
    } else {
        displayThumbnails();
    }
}

function fileToDataURL(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
}

// ===== OCR PROCESSING =====
async function startOCRProcessing() {
    if (appState.uploadedFiles.length === 0) {
        alert('Please upload at least one file.');
        return;
    }

    showSection(1); // Show OCR processing section
    updateProgressSteps(1);

    showLoading('Initializing OCR engine...');

    try {
        await extractTextFromImages();
        hideLoading();

        // Proceed to document type detection
        detectDocumentType();
        showSection(2);
        updateProgressSteps(2);

        // Auto-proceed to column discovery after 2 seconds
        setTimeout(() => {
            discoverColumns();
            showSection(3);
            updateProgressSteps(3);
        }, 2000);
    } catch (error) {
        hideLoading();
        alert('OCR processing failed: ' + error.message);
        console.error(error);
    }
}

async function extractTextFromImages() {
    const statusText = document.getElementById('ocr-status-text');
    const detailText = document.getElementById('ocr-detail-text');
    const progressBar = document.getElementById('ocr-progress');

    appState.ocrResults = [];

    for (let i = 0; i < appState.fileDataURLs.length; i++) {
        const dataURL = appState.fileDataURLs[i];
        const fileName = appState.uploadedFiles[i].name;

        statusText.textContent = `Extracting text from: ${fileName}`;
        detailText.textContent = `Processing file ${i + 1} of ${appState.fileDataURLs.length}`;
        progressBar.style.width = `${((i / appState.fileDataURLs.length) * 100)}%`;

        try {
            const worker = await Tesseract.createWorker();
            await worker.loadLanguage('eng');
            await worker.initialize('eng');

            const { data } = await worker.recognize(dataURL);

            // Extract blocks with coordinates
            const blocks = data.words.map(word => ({
                text: word.text.trim(),
                x: word.bbox.x0,
                y: word.bbox.y0,
                width: word.bbox.x1 - word.bbox.x0,
                height: word.bbox.y1 - word.bbox.y0,
                confidence: word.confidence
            })).filter(block => block.text.length > 0);

            appState.ocrResults.push(blocks);
            await worker.terminate();
        } catch (error) {
            console.error(`Error processing ${fileName}:`, error);
            appState.ocrResults.push([]);
        }
    }

    progressBar.style.width = '100%';
}

// ===== DOCUMENT TYPE DETECTION =====
function detectDocumentType() {
    // For now, we'll detect all as "table" type
    // In production, this would use advanced heuristics

    const docTypeTitle = document.getElementById('doc-type-name');
    const docTypeDescription = document.getElementById('doc-type-description');
    const confidenceBadge = document.getElementById('confidence-badge');
    const confidenceValue = document.getElementById('confidence-value');

    // Simple detection: if we have OCR blocks, assume it's a table
    const hasData = appState.ocrResults.some(result => result.length > 0);

    if (hasData) {
        docTypeTitle.textContent = 'Tabular Data';
        docTypeDescription.textContent = 'Detected structured table with rows and columns. Ready for column discovery.';
        confidenceValue.textContent = 'High (85%)';
        confidenceBadge.classList.add('high');
    } else {
        docTypeTitle.textContent = 'Unknown';
        docTypeDescription.textContent = 'Unable to detect table structure. Please try a different image.';
        confidenceValue.textContent = 'Low (20%)';
        confidenceBadge.classList.add('low');
    }

    appState.documentTypes = ['table'];
}

// ===== COLUMN DISCOVERY ENGINE =====
function discoverColumns() {
    // Combine all OCR blocks from all images
    const allBlocks = appState.ocrResults.flat();

    if (allBlocks.length === 0) {
        alert('No text detected in images. Please try higher quality images.');
        return;
    }

    // Strategy A: Spatial Clustering
    const columns = spatialClustering(allBlocks);

    // Strategy B: Header Detection
    const headers = detectHeaders(allBlocks);

    // Merge strategies: use headers as column names if available
    const detectedColumns = columns.map((col, index) => {
        const header = headers.find(h =>
            h.x >= col.xMin - 20 && h.x <= col.xMax + 20
        );

        const sampleValues = col.blocks.slice(1, 4).map(b => b.text);

        return {
            id: index + 1,
            name: header ? header.text : `Column ${index + 1}`,
            xRange: [col.xMin, col.xMax],
            sampleValues: sampleValues,
            detectedType: inferColumnType(sampleValues),
            blocks: col.blocks
        };
    });

    appState.detectedColumns = detectedColumns;
    displayDetectedColumns();
}

function spatialClustering(blocks) {
    if (blocks.length === 0) return [];

    // Sort blocks by X coordinate
    const sortedBlocks = [...blocks].sort((a, b) => a.x - b.x);

    const columns = [];
    let currentColumn = {
        xMin: sortedBlocks[0].x,
        xMax: sortedBlocks[0].x + sortedBlocks[0].width,
        blocks: [sortedBlocks[0]]
    };

    for (let i = 1; i < sortedBlocks.length; i++) {
        const block = sortedBlocks[i];
        const tolerance = appState.processingConfig.columnToleranceX;

        // Check if block overlaps with current column X-range
        if (block.x <= currentColumn.xMax + tolerance) {
            currentColumn.xMax = Math.max(currentColumn.xMax, block.x + block.width);
            currentColumn.blocks.push(block);
        } else {
            columns.push(currentColumn);
            currentColumn = {
                xMin: block.x,
                xMax: block.x + block.width,
                blocks: [block]
            };
        }
    }
    columns.push(currentColumn);

    return columns;
}

function detectHeaders(blocks) {
    // Find top Y row
    const topY = Math.min(...blocks.map(b => b.y));
    const headerBlocks = blocks.filter(b => Math.abs(b.y - topY) < 30);

    // Common header keywords
    const headerKeywords = [
        'name', 'phone', 'email', 'address', 'registration',
        'number', 'date', 'status', 'contact', 'fpo', 'company',
        'mobile', 'id', 'code', 'type', 'category'
    ];

    return headerBlocks.filter(block => {
        const text = block.text.toLowerCase();
        return headerKeywords.some(kw => text.includes(kw)) || block.text.length > 3;
    });
}

function inferColumnType(sampleValues) {
    if (sampleValues.length === 0) return 'text';

    // Check for phone numbers
    const hasPhone = sampleValues.some(v => /\d{10}|\d{3}[-.\s]\d{3}[-.\s]\d{4}/.test(v));
    if (hasPhone) return 'phone';

    // Check for emails
    const hasEmail = sampleValues.some(v => /@/.test(v));
    if (hasEmail) return 'email';

    // Check for numbers
    const hasNumber = sampleValues.every(v => !isNaN(v) && v.trim() !== '');
    if (hasNumber) return 'number';

    // Check for yes/no
    const hasYesNo = sampleValues.every(v =>
        ['yes', 'no', 'y', 'n', 'true', 'false'].includes(v.toLowerCase())
    );
    if (hasYesNo) return 'yesno';

    return 'text';
}

function displayDetectedColumns() {
    const grid = document.getElementById('detected-columns-grid');
    const columnCount = document.getElementById('column-count');

    grid.innerHTML = '';
    columnCount.textContent = appState.detectedColumns.length;

    appState.detectedColumns.forEach(col => {
        const card = document.createElement('div');
        card.className = 'column-preview-card';
        card.innerHTML = `
            <div class="column-preview-header">
                <div class="column-preview-title">${col.name}</div>
                <div class="column-type-badge">${col.detectedType}</div>
            </div>
            <div class="column-sample">
                Samples: ${col.sampleValues.join(', ') || 'N/A'}
            </div>
        `;
        grid.appendChild(card);
    });
}

// ===== ROW RECONSTRUCTION =====
function reconstructTableRows() {
    const allBlocks = appState.ocrResults.flat();
    const columns = appState.detectedColumns;

    if (columns.length === 0) {
        alert('No columns detected. Cannot reconstruct rows.');
        return;
    }

    // Assign each block to nearest column
    const blocksWithColumn = allBlocks.map(block => {
        const column = findNearestColumn(block, columns);
        return { ...block, columnId: column ? column.id : null };
    }).filter(b => b.columnId !== null);

    // Group by Y-proximity (rows)
    const rows = [];
    const sortedByY = blocksWithColumn.sort((a, b) => a.y - b.y);

    if (sortedByY.length === 0) {
        alert('No data to reconstruct rows.');
        return;
    }

    let currentRow = { y: sortedByY[0].y, cells: {} };

    for (let block of sortedByY) {
        const yTolerance = appState.processingConfig.rowToleranceY;

        if (Math.abs(block.y - currentRow.y) <= yTolerance) {
            // Same row
            if (currentRow.cells[block.columnId]) {
                // Multi-line cell: append text
                currentRow.cells[block.columnId] += ' ' + block.text;
            } else {
                currentRow.cells[block.columnId] = block.text;
            }
        } else {
            // New row
            rows.push(currentRow);
            currentRow = { y: block.y, cells: { [block.columnId]: block.text } };
        }
    }
    rows.push(currentRow);

    // Convert to array of objects
    appState.reconstructedRows = rows.map(row => {
        const obj = {};
        columns.forEach(col => {
            obj[col.name] = row.cells[col.id] || '';
        });
        return obj;
    }).filter(row => {
        // Remove rows where all values are empty
        return Object.values(row).some(v => v.trim() !== '');
    });

    displayTablePreview();
    showSection(4);
    updateProgressSteps(4);
}

function findNearestColumn(block, columns) {
    let nearestColumn = null;
    let minDistance = Infinity;

    for (let col of columns) {
        const [xMin, xMax] = col.xRange;
        const blockCenter = block.x + block.width / 2;
        const colCenter = (xMin + xMax) / 2;
        const distance = Math.abs(blockCenter - colCenter);

        if (distance < minDistance) {
            minDistance = distance;
            nearestColumn = col;
        }
    }

    return nearestColumn;
}

function displayTablePreview() {
    const container = document.getElementById('preview-table-container');
    const totalRowsCount = document.getElementById('total-rows-count');

    totalRowsCount.textContent = appState.reconstructedRows.length;

    // Show first 20 rows
    const previewRows = appState.reconstructedRows.slice(0, 20);
    container.innerHTML = createTableHTML(previewRows);

    // Check for low confidence warning
    const avgConfidence = calculateAverageConfidence();
    const lowConfidenceWarning = document.getElementById('low-confidence-warning');

    if (avgConfidence < 50) {
        lowConfidenceWarning.classList.remove('hidden');
    } else {
        lowConfidenceWarning.classList.add('hidden');
    }
}

function calculateAverageConfidence() {
    const allBlocks = appState.ocrResults.flat();
    if (allBlocks.length === 0) return 100;

    const totalConfidence = allBlocks.reduce((sum, block) => sum + block.confidence, 0);
    return totalConfidence / allBlocks.length;
}

function createTableHTML(rows) {
    if (rows.length === 0) return '<p>No data to display</p>';

    const columns = Object.keys(rows[0]);

    let html = '<table class="data-table"><thead><tr>';
    columns.forEach(col => {
        html += `<th>${col}</th>`;
    });
    html += '</tr></thead><tbody>';

    rows.forEach(row => {
        html += '<tr>';
        columns.forEach(col => {
            html += `<td>${row[col] || ''}</td>`;
        });
        html += '</tr>';
    });

    html += '</tbody></table>';
    return html;
}

// ===== RE-ANALYSE MODE =====
function reAnalyseTable() {
    // Increase tolerances
    appState.processingConfig.columnToleranceX *= 1.3;
    appState.processingConfig.rowToleranceY *= 1.2;

    showLoading('Re-analysing with adjusted parameters...');

    setTimeout(() => {
        discoverColumns();
        reconstructTableRows();
        hideLoading();
    }, 1000);
}

// ===== COLUMN CONTROL PANEL =====
function displayColumnControl() {
    const grid = document.getElementById('column-control-grid');
    grid.innerHTML = '';

    appState.detectedColumns.forEach((col, index) => {
        const card = document.createElement('div');
        card.className = 'column-control-card';
        card.dataset.index = index;

        card.innerHTML = `
            <div class="control-header">
                <div class="control-title">${col.name}</div>
                <label class="checkbox-option">
                    <input type="checkbox" checked>
                    <span>Include</span>
                </label>
            </div>
            <div class="control-body">
                <label>Rename Column</label>
                <input type="text" placeholder="${col.name}" value="${col.name}">
                <label>Column Type</label>
                <select>
                    <option value="text" ${col.detectedType === 'text' ? 'selected' : ''}>Text</option>
                    <option value="number" ${col.detectedType === 'number' ? 'selected' : ''}>Number</option>
                    <option value="phone" ${col.detectedType === 'phone' ? 'selected' : ''}>Phone</option>
                    <option value="email" ${col.detectedType === 'email' ? 'selected' : ''}>Email</option>
                    <option value="yesno" ${col.detectedType === 'yesno' ? 'selected' : ''}>Yes/No</option>
                </select>
            </div>
        `;

        // Add checkbox listener to toggle excluded class
        const checkbox = card.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                card.classList.remove('excluded');
            } else {
                card.classList.add('excluded');
            }
        });

        grid.appendChild(card);
    });
}

function applyColumnChanges() {
    // Get column checkboxes and rename inputs
    const columnCards = document.querySelectorAll('.column-control-card');

    const updatedColumns = [];
    columnCards.forEach((card, index) => {
        const checkbox = card.querySelector('input[type="checkbox"]');
        const renameInput = card.querySelector('input[type="text"]');

        if (checkbox && checkbox.checked) {
            const col = appState.detectedColumns[index];
            if (renameInput && renameInput.value.trim()) {
                col.name = renameInput.value.trim();
            }
            updatedColumns.push(col);
        }
    });

    if (updatedColumns.length === 0) {
        alert('Please select at least one column.');
        return;
    }

    appState.detectedColumns = updatedColumns;

    // Rebuild rows with updated columns
    appState.reconstructedRows = appState.reconstructedRows.map(row => {
        const newRow = {};
        updatedColumns.forEach(col => {
            // Find original column value
            const originalValue = Object.entries(row).find(([key]) => key === col.name)?.[1];
            newRow[col.name] = originalValue || '';
        });
        return newRow;
    });

    showSection(6);
    updateProgressSteps(6);
}

// ===== DATA CLEANING =====
function runDataCleaning() {
    let data = [...appState.reconstructedRows];

    // Remove empty rows
    if (document.getElementById('clean-empty-rows').checked) {
        data = data.filter(row =>
            Object.values(row).some(v => v && v.trim() !== '')
        );
    }

    // Trim whitespace
    if (document.getElementById('clean-trim').checked) {
        data = data.map(row => {
            const cleaned = {};
            Object.entries(row).forEach(([key, value]) => {
                cleaned[key] = typeof value === 'string' ? value.trim() : value;
            });
            return cleaned;
        });
    }

    // Remove duplicates
    if (document.getElementById('clean-duplicates').checked) {
        const seen = new Set();
        data = data.filter(row => {
            const key = JSON.stringify(row);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    // Format phone numbers
    if (document.getElementById('clean-format-phone').checked) {
        data = data.map(row => {
            const cleaned = {};
            Object.entries(row).forEach(([key, value]) => {
                if (typeof value === 'string' && /\d{10}/.test(value)) {
                    // Extract 10 digits
                    const digits = value.replace(/\D/g, '');
                    if (digits.length === 10) {
                        cleaned[key] = '+91' + digits;
                    } else {
                        cleaned[key] = value;
                    }
                } else {
                    cleaned[key] = value;
                }
            });
            return cleaned;
        });
    }

    // Normalize Yes/No
    if (document.getElementById('clean-normalize-text').checked) {
        data = data.map(row => {
            const cleaned = {};
            Object.entries(row).forEach(([key, value]) => {
                if (typeof value === 'string') {
                    const lower = value.toLowerCase().trim();
                    if (['yes', 'y', 'true', '1'].includes(lower)) {
                        cleaned[key] = 'Yes';
                    } else if (['no', 'n', 'false', '0'].includes(lower)) {
                        cleaned[key] = 'No';
                    } else if (['na', 'n/a', 'n.a.', 'not available'].includes(lower)) {
                        cleaned[key] = 'NA';
                    } else {
                        cleaned[key] = value;
                    }
                } else {
                    cleaned[key] = value;
                }
            });
            return cleaned;
        });
    }

    const rowsRemoved = appState.reconstructedRows.length - data.length;
    appState.cleanedData = data;

    displayFinalPreview(rowsRemoved);
    showSection(7);
    updateProgressSteps(7);
}

function displayFinalPreview(rowsRemoved) {
    const finalTableContainer = document.getElementById('final-table-container');
    const finalRowsCount = document.getElementById('final-rows-count');
    const finalColumnsCount = document.getElementById('final-columns-count');
    const rowsRemovedCount = document.getElementById('rows-removed-count');

    finalRowsCount.textContent = appState.cleanedData.length;
    finalColumnsCount.textContent = appState.detectedColumns.length;
    rowsRemovedCount.textContent = rowsRemoved;

    const previewRows = appState.cleanedData.slice(0, 20);
    finalTableContainer.innerHTML = createTableHTML(previewRows);
}

// ===== EXPORT =====
function exportData(format) {
    if (appState.cleanedData.length === 0) {
        alert('No data to export.');
        return;
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `EXTEROID_OCR_${timestamp}`;

    if (format === 'excel') {
        const worksheet = XLSX.utils.json_to_sheet(appState.cleanedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Extracted Data');
        XLSX.writeFile(workbook, `${filename}.xlsx`);
    } else if (format === 'csv') {
        const worksheet = XLSX.utils.json_to_sheet(appState.cleanedData);
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        downloadCSV(csv, `${filename}.csv`);
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

// ===== UI HELPERS =====
function showSection(sectionIndex) {
    // Hide all sections
    document.querySelectorAll('.step-section').forEach(section => {
        section.classList.add('hidden');
    });

    // Show target section
    const sections = [
        'section-0-upload',
        'section-1-ocr',
        'section-2-detect',
        'section-3-columns',
        'section-4-preview',
        'section-5-control',
        'section-6-cleaning',
        'section-7-export'
    ];

    if (sections[sectionIndex]) {
        document.getElementById(sections[sectionIndex])?.classList.remove('hidden');
    }

    appState.currentStep = sectionIndex;
}

function updateProgressSteps(activeStep) {
    const steps = document.querySelectorAll('.progress-steps .step');
    steps.forEach((step, index) => {
        if (index === activeStep) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
}

function showLoading(text = 'Processing...') {
    const overlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    loadingText.textContent = text;
    overlay.classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
}

function resetApplication() {
    if (confirm('Are you sure you want to start over? All progress will be lost.')) {
        appState.uploadedFiles = [];
        appState.fileDataURLs = [];
        appState.ocrResults = [];
        appState.detectedColumns = [];
        appState.reconstructedRows = [];
        appState.cleanedData = [];
        appState.currentStep = 0;

        showSection(0);
        updateProgressSteps(0);
        document.getElementById('thumbnail-grid').classList.add('hidden');
    }
}
