// Excel Consolidator Logic
// State
let uploadedFiles = [];
let processedData = null;
let columnMappings = {};
let fileStructures = [];
let cleaningOptions = {
    removeEmptyRows: true,
    removeDuplicates: true,
    trimSpaces: true,
    removeSource: false
};

// DOM Elements
const dropZone1 = document.getElementById('drop-zone-1');
const dropZone2 = document.getElementById('drop-zone-2');
const fileInput1 = document.getElementById('file-input-1');
const fileInput2 = document.getElementById('file-input-2');
const fileCards = document.getElementById('file-cards');
const columnMappingSection = document.getElementById('column-mapping-section');
const columnMappingContainer = document.getElementById('column-mapping');
const optionsSection = document.getElementById('options-section');
const processBtn = document.getElementById('process-btn');
const resultsSection = document.getElementById('results-section');
const statsContainer = document.getElementById('stats-container');
const dataPreview = document.getElementById('data-preview');
const downloadBtn = document.getElementById('download-btn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
});

function setupEventListeners() {
    // Drop zones
    [dropZone1, dropZone2].forEach((zone, index) => {
        zone.addEventListener('click', () => {
            if (index === 0) fileInput1.click();
            else fileInput2.click();
        });

        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('active');
        });

        zone.addEventListener('dragleave', () => {
            zone.classList.remove('active');
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('active');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFileSelect(files[0], index);
            }
        });
    });

    // File inputs
    fileInput1.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0], 0);
        }
    });

    fileInput2.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0], 1);
        }
    });

    // Process button
    processBtn.addEventListener('click', processFiles);

    // Download button
    downloadBtn.addEventListener('click', downloadResults);

    // Cleaning options
    document.getElementById('remove-empty').addEventListener('change', (e) => {
        cleaningOptions.removeEmptyRows = e.target.checked;
    });

    document.getElementById('remove-duplicates').addEventListener('change', (e) => {
        cleaningOptions.removeDuplicates = e.target.checked;
    });

    document.getElementById('trim-spaces').addEventListener('change', (e) => {
        cleaningOptions.trimSpaces = e.target.checked;
    });

    document.getElementById('remove-source').addEventListener('change', (e) => {
        cleaningOptions.removeSource = e.target.checked;
    });
}

async function handleFileSelect(file, index) {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
        showNotification('Please upload Excel (.xlsx, .xls) or CSV files only', 'error');
        return;
    }

    uploadedFiles[index] = file;
    renderFileCards();

    // Read and analyze file structure
    try {
        const data = await readExcelFile(file);
        fileStructures[index] = analyzeFileStructure(data, file.name);

        // If both files are uploaded, show column mapping
        if (uploadedFiles[0] && uploadedFiles[1] && fileStructures[0] && fileStructures[1]) {
            generateColumnMapping();
            columnMappingSection.classList.remove('hidden');
            optionsSection.classList.remove('hidden');
            processBtn.disabled = false;
        }
    } catch (error) {
        showNotification('Error reading file: ' + error.message, 'error');
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

function analyzeFileStructure(data, fileName) {
    if (!data || data.length === 0) {
        return { columns: [], sampleData: [], fileName };
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
        fileName
    };
}

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

function generateColumnMapping() {
    const file1Cols = fileStructures[0].columns;
    const file2Cols = fileStructures[1].columns;

    // Auto-map columns based on type
    const mapping = {};
    const usedFile2Cols = new Set();

    file1Cols.forEach(col1 => {
        // Find best match in file2
        let bestMatch = null;
        let bestScore = 0;

        file2Cols.forEach(col2 => {
            if (usedFile2Cols.has(col2.original)) return;

            let score = 0;
            // Same type gets high score
            if (col1.type === col2.type && col1.type !== 'other') score += 10;

            // Similar names get score
            const similarity = calculateSimilarity(col1.cleaned, col2.cleaned);
            score += similarity * 5;

            if (score > bestScore) {
                bestScore = score;
                bestMatch = col2;
            }
        });

        if (bestMatch && bestScore > 5) {
            mapping[col1.original] = bestMatch.original;
            usedFile2Cols.add(bestMatch.original);
        }
    });

    columnMappings = mapping;
    renderColumnMapping();
}

function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

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

function renderFileCards() {
    fileCards.innerHTML = '';

    uploadedFiles.forEach((file, index) => {
        if (!file) return;

        const card = document.createElement('div');
        card.className = 'file-card bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between';
        card.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="bg-green-100 text-green-600 p-2 rounded">
                    <i class="fas fa-file-excel text-xl"></i>
                </div>
                <div>
                    <p class="font-medium text-gray-800">${file.name}</p>
                    <p class="text-sm text-gray-500">${formatFileSize(file.size)}</p>
                </div>
            </div>
            <button onclick="removeFile(${index})" class="text-gray-400 hover:text-red-500 transition">
                <i class="fas fa-times text-xl"></i>
            </button>
        `;
        fileCards.appendChild(card);
    });
}

function removeFile(index) {
    uploadedFiles[index] = null;
    fileStructures[index] = null;
    renderFileCards();
    columnMappingSection.classList.add('hidden');
    optionsSection.classList.add('hidden');
    resultsSection.classList.add('hidden');
    processBtn.disabled = true;
}

function renderColumnMapping() {
    columnMappingContainer.innerHTML = '';

    const file1Cols = fileStructures[0].columns;

    file1Cols.forEach(col1 => {
        const row = document.createElement('div');
        row.className = 'column-row';
        row.innerHTML = `
            <div>
                <span class="column-badge">${col1.original}</span>
                <span class="text-xs text-gray-500 ml-2">(${col1.type})</span>
            </div>
            <div class="arrow-icon">
                <i class="fas fa-arrow-right"></i>
            </div>
            <div>
                <select class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" onchange="updateMapping('${col1.original}', this.value)">
                    <option value="">-- Select Column --</option>
                    ${fileStructures[1].columns.map(col2 => `
                        <option value="${col2.original}" ${columnMappings[col1.original] === col2.original ? 'selected' : ''}>
                            ${col2.original} (${col2.type})
                        </option>
                    `).join('')}
                </select>
            </div>
        `;
        columnMappingContainer.appendChild(row);
    });
}

function updateMapping(col1, col2) {
    if (col2) {
        columnMappings[col1] = col2;
    } else {
        delete columnMappings[col1];
    }
}

async function processFiles() {
    processBtn.disabled = true;
    processBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';

    try {
        const file1Data = await readExcelFile(uploadedFiles[0]);
        const file2Data = await readExcelFile(uploadedFiles[1]);

        const consolidated = mergeData(file1Data, file2Data);
        const cleaned = cleanData(consolidated);

        processedData = cleaned;
        displayResults(cleaned);
        resultsSection.classList.remove('hidden');

    } catch (error) {
        showNotification('Error processing files: ' + error.message, 'error');
    } finally {
        processBtn.disabled = false;
        processBtn.innerHTML = '<i class="fas fa-cogs mr-2"></i>Merge & Process Files';
    }
}

function mergeData(file1Data, file2Data) {
    const merged = [];

    // Process file 1
    file1Data.forEach(row => {
        const newRow = {};
        Object.keys(columnMappings).forEach(col1 => {
            newRow[col1] = row[col1] || '';
        });
        newRow['Source'] = fileStructures[0].fileName;
        merged.push(newRow);
    });

    // Process file 2
    file2Data.forEach(row => {
        const newRow = {};
        Object.keys(columnMappings).forEach(col1 => {
            const col2 = columnMappings[col1];
            newRow[col1] = row[col2] || '';
        });
        newRow['Source'] = fileStructures[1].fileName;
        merged.push(newRow);
    });

    return merged;
}

function cleanData(data) {
    let cleaned = data;

    // Trim spaces
    if (cleaningOptions.trimSpaces) {
        cleaned = cleaned.map(row => {
            const newRow = {};
            Object.keys(row).forEach(key => {
                newRow[key] = typeof row[key] === 'string' ? row[key].trim() : row[key];
            });
            return newRow;
        });
    }

    // Remove empty rows
    if (cleaningOptions.removeEmptyRows) {
        cleaned = cleaned.filter(row => {
            return Object.values(row).some(val => val && val !== '');
        });
    }

    // Remove Source column if requested
    if (cleaningOptions.removeSource) {
        cleaned = cleaned.map(row => {
            const newRow = { ...row };
            delete newRow.Source;
            return newRow;
        });
    }

    // Detect and mark duplicates
    if (cleaningOptions.removeDuplicates) {
        const seen = new Map();
        cleaned = cleaned.map((row, index) => {
            const key = JSON.stringify(row);
            if (seen.has(key)) {
                return { ...row, _isDuplicate: true, _duplicateOf: seen.get(key) };
            } else {
                seen.set(key, index);
                return { ...row, _isDuplicate: false };
            }
        });
    }

    return cleaned;
}

function displayResults(data) {
    const total = data.length;
    const duplicates = data.filter(row => row._isDuplicate).length;
    const unique = total - duplicates;

    statsContainer.innerHTML = `
        <div class="stat-card bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex items-center gap-3">
                <i class="fas fa-database text-2xl text-blue-600"></i>
                <div>
                    <p class="text-3xl font-bold text-blue-900">${total}</p>
                    <p class="text-sm text-blue-700">Total Records</p>
                </div>
            </div>
        </div>
        <div class="stat-card bg-green-50 border border-green-200 rounded-lg p-4">
            <div class="flex items-center gap-3">
                <i class="fas fa-check-circle text-2xl text-green-600"></i>
                <div>
                    <p class="text-3xl font-bold text-green-900">${unique}</p>
                    <p class="text-sm text-green-700">Unique Records</p>
                </div>
            </div>
        </div>
        <div class="stat-card bg-red-50 border border-red-200 rounded-lg p-4">
            <div class="flex items-center gap-3">
                <i class="fas fa-exclamation-triangle text-2xl text-red-600"></i>
                <div>
                    <p class="text-3xl font-bold text-red-900">${duplicates}</p>
                    <p class="text-sm text-red-700">Duplicates Found</p>
                </div>
            </div>
        </div>
    `;

    renderDataPreview(data.slice(0, 20));
}

function renderDataPreview(data) {
    if (data.length === 0) {
        dataPreview.innerHTML = '<p class="text-center text-gray-500 py-8">No data to display</p>';
        return;
    }

    const columns = Object.keys(data[0]).filter(key => !key.startsWith('_'));

    let html = `
        <div class="overflow-x-auto custom-scrollbar">
            <table class="data-table w-full text-sm">
                <thead>
                    <tr class="bg-gray-100 border-b">
                        ${columns.map(col => `<th class="px-4 py-3 text-left font-semibold text-gray-700">${col}</th>`).join('')}
                        <th class="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(row => `
                        <tr class="border-b ${row._isDuplicate ? 'bg-red-50' : ''}">
                            ${columns.map(col => `
                                <td class="px-4 py-3 text-gray-800">${row[col] || '-'}</td>
                            `).join('')}
                            <td class="px-4 py-3 text-center">
                                ${row._isDuplicate ? '<span class="duplicate-badge"><i class="fas fa-copy"></i> Duplicate</span>' : '<span class="text-gray-400">-</span>'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <div class="text-center text-xs text-gray-500 mt-4 p-3 bg-gray-50 rounded">
            Showing first 20 rows of ${processedData.length} total records
        </div>
    `;

    dataPreview.innerHTML = html;
}

function downloadResults() {
    if (!processedData) return;

    // Remove internal flags before export
    const exportData = processedData.map(row => {
        const clean = { ...row };
        delete clean._isDuplicate;
        delete clean._duplicateOf;
        return clean;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Consolidated Data");

    // Auto-fit columns
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
        wch: Math.max(key.length, 15)
    }));
    worksheet['!cols'] = colWidths;

    const fileName = `Consolidated_${new Date().getTime()}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    showNotification('File downloaded successfully!', 'success');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function showNotification(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-5 right-5 px-6 py-3 rounded-lg shadow-lg text-white transition-all transform translate-y-32 z-50 ${type === 'error' ? 'bg-red-600' : type === 'success' ? 'bg-green-600' : 'bg-blue-600'
        }`;
    toast.innerHTML = `<i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'} mr-2"></i>${message}`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('translate-y-32');
    }, 100);

    setTimeout(() => {
        toast.classList.add('translate-y-32');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
