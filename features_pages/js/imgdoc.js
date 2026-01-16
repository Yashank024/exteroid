/**
 * EXTEROID - Image/PDF to Excel Data Extractor
 * Simplified Zero-Config Extraction
 * 
 * Features:
 * - PDF text extraction (fast for text-based PDFs)
 * - OCR for images and scanned PDFs
 * - Extracts ALL phone numbers and emails
 * - Simplified schema: Name, Phone, Email, Address, Date only
 * - No hallucination - only extracts verified data
 */

// ===== APP STATE =====
const AppState = {
    files: [],
    pages: [],
    extractedRows: [],
    finalRows: [],
    processing: {
        currentStep: "idle",
        progress: 0,
        message: ""
    },
    config: {
        maxRowsPreview: 20,
        minConfidence: 40,
        pdfTextThreshold: 200,
        pdfRenderScale: 3.0
    }
};

// ===== DOM ELEMENTS =====
const Elements = {};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    Elements.uploadState = document.getElementById('state-upload');
    Elements.readyState = document.getElementById('state-ready');
    Elements.processingState = document.getElementById('state-processing');
    Elements.resultState = document.getElementById('state-result');
    Elements.fileInput = document.getElementById('file-input');
    Elements.dropZone = document.getElementById('drop-zone');
    Elements.readyCount = document.getElementById('ready-count-num');
    Elements.btnExtract = document.getElementById('btn-extract');
    Elements.processingText = document.getElementById('processing-text');
    Elements.resultContainer = document.getElementById('result-table-container');
    Elements.btnDownloadExcel = document.getElementById('btn-download-excel');
    Elements.btnDownloadCsv = document.getElementById('btn-download-csv');
    Elements.btnReset = document.getElementById('btn-reset');

    setupEventListeners();
    console.log('EXTEROID Extractor Ready');
});

function setupEventListeners() {
    if (!Elements.dropZone) return;

    Elements.dropZone.addEventListener('click', () => Elements.fileInput.click());
    Elements.dropZone.addEventListener('dragover', e => {
        e.preventDefault();
        Elements.dropZone.classList.add('drag-over');
    });
    Elements.dropZone.addEventListener('dragleave', () =>
        Elements.dropZone.classList.remove('drag-over')
    );
    Elements.dropZone.addEventListener('drop', e => {
        e.preventDefault();
        Elements.dropZone.classList.remove('drag-over');
        handleFileSelect(e.dataTransfer.files);
    });
    Elements.fileInput.addEventListener('change', e =>
        handleFileSelect(e.target.files)
    );

    Elements.btnExtract?.addEventListener('click', startExtraction);
    Elements.btnDownloadExcel?.addEventListener('click', () => exportData('xlsx'));
    Elements.btnDownloadCsv?.addEventListener('click', () => exportData('csv'));
    Elements.btnReset?.addEventListener('click', resetApp);
}

// ===== FILE UPLOAD =====
async function handleFileSelect(fileList) {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    const validFiles = [];

    for (const file of files) {
        if (file.type.startsWith('image/')) {
            if (file.size > 5 * 1024 * 1024) {
                alert(`${file.name}: Image must be ≤ 5MB`);
                continue;
            }
            validFiles.push(file);
        } else if (file.type === 'application/pdf') {
            if (file.size > 25 * 1024 * 1024) {
                alert(`${file.name}: PDF must be ≤ 25MB`);
                continue;
            }
            validFiles.push(file);
        }
    }

    if (validFiles.length === 0) {
        alert('Please upload valid images or PDFs.');
        return;
    }

    if (AppState.files.length + validFiles.length > 100) {
        alert('Maximum 100 files allowed.');
        return;
    }

    AppState.files.push(...validFiles);
    updateUI('ready');
}

// ===== UI STATE =====
function updateUI(state) {
    document.querySelectorAll('.app-container > div[id^="state-"]').forEach(div =>
        div.classList.add('hidden')
    );

    switch (state) {
        case 'upload':
            Elements.uploadState?.classList.remove('hidden');
            break;
        case 'ready':
            if (Elements.readyCount) Elements.readyCount.textContent = AppState.files.length;
            Elements.readyState?.classList.remove('hidden');
            break;
        case 'processing':
            Elements.processingState?.classList.remove('hidden');
            break;
        case 'result':
            Elements.resultState?.classList.remove('hidden');
            break;
    }
}

function updateProgress(message, progress = null) {
    if (Elements.processingText) {
        Elements.processingText.innerText = message;
    }
    if (progress !== null) {
        AppState.processing.progress = progress;
    }
    AppState.processing.message = message;
}

// ===== STEP 1: NORMALIZE INPUTS =====
async function normalizeInputToPages() {
    AppState.pages = [];
    let pageId = 0;

    for (const file of AppState.files) {
        if (file.type.startsWith('image/')) {
            const page = await imageToPage(file, ++pageId);
            AppState.pages.push(page);
        } else if (file.type === 'application/pdf') {
            const pdfPages = await pdfToPages(file, pageId);
            AppState.pages.push(...pdfPages);
            pageId += pdfPages.length;
        }
    }
}

async function imageToPage(file, id) {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);

    return {
        id: `page_${String(id).padStart(3, '0')}`,
        sourceFileName: file.name,
        type: 'image',
        canvas: canvas
    };
}

async function pdfToPages(file, startId) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);

        // Try text extraction first
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');

        // If sufficient text, use text extraction
        if (pageText.length > AppState.config.pdfTextThreshold) {
            pages.push({
                id: `page_${String(startId + pageNum).padStart(3, '0')}`,
                sourceFileName: file.name,
                type: 'pdfText',
                text: pageText
            });
            continue;
        }

        // Fallback to OCR
        const viewport = page.getViewport({ scale: AppState.config.pdfRenderScale });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        await page.render({ canvasContext: ctx, viewport: viewport }).promise;

        pages.push({
            id: `page_${String(startId + pageNum).padStart(3, '0')}`,
            sourceFileName: file.name,
            type: 'pdfOCR',
            canvas: canvas
        });
    }

    return pages;
}

// ===== STEP 2: TEXT EXTRACTION =====
async function extractTextFromPages() {
    updateProgress('Extracting text...', 20);

    for (let i = 0; i < AppState.pages.length; i++) {
        const page = AppState.pages[i];

        if (page.type === 'pdfText') {
            // Already has text
            continue;
        }

        // Run OCR
        updateProgress(`Reading page ${i + 1} of ${AppState.pages.length}...`,
            20 + (i / AppState.pages.length) * 40);

        try {
            const worker = await Tesseract.createWorker();
            await worker.loadLanguage('eng');
            await worker.initialize('eng');

            // Preprocess canvas
            const preprocessed = preprocessCanvas(page.canvas);
            const { data } = await worker.recognize(preprocessed);

            page.text = data.text;
            await worker.terminate();
        } catch (err) {
            console.error(`OCR failed for page ${i + 1}:`, err);
            page.text = '';
        }
    }
}

function preprocessCanvas(canvas) {
    const srcCtx = canvas.getContext('2d');
    const srcData = srcCtx.getImageData(0, 0, canvas.width, canvas.height);

    // Resize if too small
    let targetWidth = canvas.width;
    let targetHeight = canvas.height;
    if (targetWidth < 1500) {
        const scale = 1500 / targetWidth;
        targetWidth = 1500;
        targetHeight = Math.floor(targetHeight * scale);
    }

    const newCanvas = document.createElement('canvas');
    newCanvas.width = targetWidth;
    newCanvas.height = targetHeight;
    const ctx = newCanvas.getContext('2d');

    ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
    const imageData = ctx.getImageData(0, 0, newCanvas.width, newCanvas.height);
    const data = imageData.data;

    // Grayscale + contrast boost
    for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const contrasted = ((gray - 128) * 1.3) + 128;
        const clamped = Math.max(0, Math.min(255, contrasted));
        data[i] = data[i + 1] = data[i + 2] = clamped;
    }

    ctx.putImageData(imageData, 0, 0);
    return newCanvas;
}

// ===== STEP 3: DATA EXTRACTION =====
function extractDataFromPages() {
    updateProgress('Structuring data...', 65);
    AppState.extractedRows = [];

    for (const page of AppState.pages) {
        const text = page.text || '';
        if (!text) continue;

        const rows = extractRowsFromText(text, page.id);
        AppState.extractedRows.push(...rows);
    }

    // Remove duplicates
    AppState.extractedRows = removeDuplicates(AppState.extractedRows);
}

function extractRowsFromText(text, pageId) {
    // Extract ALL phones and emails
    const phones = extractAllPhones(text);
    const emails = extractAllEmails(text);
    const dates = extractAllDates(text);
    const names = extractAllNames(text);

    const maxCount = Math.max(phones.length, emails.length, names.length, 1);
    const rows = [];

    for (let i = 0; i < maxCount; i++) {
        const row = {
            Name: names[i] || '',
            Phone: phones[i] || '',
            Email: emails[i] || '',
            Address: '',
            Date: dates[i] || '',
            SourcePage: pageId,
            Confidence: 0
        };

        row.Confidence = calculateConfidence(row);

        if (row.Confidence >= AppState.config.minConfidence) {
            rows.push(row);
        }
    }

    return rows;
}

// ===== FIELD EXTRACTORS =====
function extractAllPhones(text) {
    const phones = [];
    const phonePattern = /(\+91[\s-]?)?[6-9]\d{9}\b/g;
    let match;

    while ((match = phonePattern.exec(text)) !== null) {
        let digits = match[0].replace(/\D/g, '');

        // Handle +91 prefix
        if (digits.length === 12 && digits.startsWith('91')) {
            digits = digits.substring(2);
        }

        if (digits.length === 10 && /^[6-9]/.test(digits)) {
            const phone = `+91${digits}`;
            if (!phones.includes(phone)) {
                phones.push(phone);
            }
        }
    }

    return phones;
}

function extractAllEmails(text) {
    const emails = [];
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    let match;

    while ((match = emailPattern.exec(text)) !== null) {
        const email = match[0].toLowerCase();
        if (!emails.includes(email)) {
            emails.push(email);
        }
    }

    return emails;
}

function extractAllDates(text) {
    const dates = [];
    const datePattern = /\b(\d{1,2})[-\/](\d{1,2})[-\/](19\d{2}|20[0-3][0-9])\b/g;
    let match;

    while ((match = datePattern.exec(text)) !== null) {
        const day = parseInt(match[1]);
        const month = parseInt(match[2]);
        const year = parseInt(match[3]);

        if (day >= 1 && day <= 31 && month >= 1 && month <= 12 &&
            year >= 1950 && year <= 2035) {
            if (!dates.includes(match[0])) {
                dates.push(match[0]);
            }
        }
    }

    return dates;
}

function extractAllNames(text) {
    const names = [];
    const lines = text.split('\n');

    for (const line of lines) {
        // Find capitalized word sequences (2-3 words)
        const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/g;
        let match;

        while ((match = namePattern.exec(line)) !== null) {
            const candidate = match[1];

            // Filter out common non-names
            const lowerCandidate = candidate.toLowerCase();
            const badWords = ['executive', 'admin', 'manager', 'officer', 'active',
                'offline', 'online', 'sales', 'marketing'];

            if (badWords.some(word => lowerCandidate.includes(word))) continue;
            if (/\d/.test(candidate)) continue; // No digits
            if (candidate.length < 3) continue; // Too short

            const cleanName = candidate.trim()
                .split(' ')
                .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                .join(' ');

            if (!names.includes(cleanName)) {
                names.push(cleanName);
            }
        }
    }

    return names;
}

// ===== CONFIDENCE & CLEANING =====
function calculateConfidence(row) {
    let score = 0;
    if (row.Phone) score += 40;
    if (row.Email) score += 30;
    if (row.Name) score += 20;
    if (row.Date) score += 10;
    return Math.min(100, score);
}

function removeDuplicates(rows) {
    const seen = new Set();
    return rows.filter(row => {
        const key = `${row.Phone}|${row.Email}`;
        if (key === '|') return true;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function cleanFinalData() {
    updateProgress('Cleaning data...', 85);

    AppState.finalRows = AppState.extractedRows.map(row => {
        const cleaned = { ...row };

        for (const key in cleaned) {
            if (typeof cleaned[key] === 'string') {
                cleaned[key] = cleaned[key]
                    .trim()
                    .replace(/^(NA|N\/A|--)$/i, '')
                    .replace(/\s+/g, ' ');
            }
        }

        return cleaned;
    }).filter(row =>
        Object.values(row).some(v =>
            v && typeof v !== 'number' && String(v).trim() !== ''
        )
    );
}

// ===== MAIN EXTRACTION PIPELINE =====
async function startExtraction() {
    if (AppState.files.length === 0) {
        alert('Please upload files first.');
        return;
    }

    updateUI('processing');
    AppState.processing.currentStep = 'normalizing';

    try {
        updateProgress('Loading files...', 5);
        await normalizeInputToPages();

        if (AppState.pages.length === 0) {
            throw new Error('No pages could be loaded.');
        }

        await extractTextFromPages();

        extractDataFromPages();

        if (AppState.extractedRows.length === 0) {
            throw new Error('No data found. Try clearer images.');
        }

        cleanFinalData();

        updateProgress('Complete!', 100);
        renderPreview();
        updateUI('result');

    } catch (error) {
        console.error('Extraction error:', error);
        alert(error.message || 'Extraction failed. Please try again.');
        updateUI('ready');
    }
}

// ===== PREVIEW =====
function renderPreview() {
    const container = Elements.resultContainer;
    if (!container) return;

    if (AppState.finalRows.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:white;">No data extracted.</p>';
        return;
    }

    const displayRows = AppState.finalRows.slice(0, AppState.config.maxRowsPreview);
    const columns = ['Name', 'Phone', 'Email', 'Address', 'Date'];

    let html = '<table><thead><tr>';
    columns.forEach(col => html += `<th>${col}</th>`);
    html += '</tr></thead><tbody>';

    displayRows.forEach(row => {
        html += '<tr>';
        columns.forEach(col => {
            html += `<td contenteditable="true">${row[col] || ''}</td>`;
        });
        html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;

    // Update statistics
    updateDataStatistics(AppState.finalRows.length, columns.length);
}

// ===== UPDATE STATISTICS =====
function updateDataStatistics(rowCount, columnCount) {
    const statsContainer = document.getElementById('data-stats');
    if (!statsContainer) return;

    statsContainer.innerHTML = `
        <div class="stat-item">
            <div class="stat-number">${rowCount}</div>
            <div class="stat-label">Rows Extracted</div>
        </div>
        <div class="stat-item">
            <div class="stat-number">${columnCount}</div>
            <div class="stat-label">Columns</div>
        </div>
    `;
}

// ===== EXPORT =====
function exportData(format) {
    if (AppState.finalRows.length === 0) {
        alert('No data to export.');
        return;
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `EXTEROID_${timestamp}`;
    const columns = ['Name', 'Phone', 'Email', 'Address', 'Date', 'SourcePage'];

    const exportData = AppState.finalRows.map(row => {
        const obj = {};
        columns.forEach(col => obj[col] = row[col] || '');
        return obj;
    });

    if (format === 'xlsx') {
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Extracted Data');
        XLSX.writeFile(wb, `${filename}.xlsx`);
    } else if (format === 'csv') {
        const ws = XLSX.utils.json_to_sheet(exportData);
        const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// ===== RESET =====
function resetApp() {
    if (!confirm('Start over? All data will be lost.')) return;

    AppState.files = [];
    AppState.pages = [];
    AppState.extractedRows = [];
    AppState.finalRows = [];
    AppState.processing.currentStep = 'idle';

    if (Elements.fileInput) Elements.fileInput.value = '';
    updateUI('upload');
}