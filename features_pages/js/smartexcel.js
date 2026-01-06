// ===== EXTEROID Smart Data Cleaning & Transformation Engine =====
// Version: 1.0.0
// Conditions Applied:
// ✅ SheetJS v0.18.5 pinned
// ✅ Dynamic file limits (30MB desktop / 10MB mobile)
// ✅ Column merge guardrails (text only)
// ✅ V1 scope lock (no templates/configs)

// ===== STATE MANAGEMENT =====
const AppState = {
    // Original data (IMMUTABLE - frozen after parse)
    originalData: null,
    originalFileName: '',
    originalFileSize: 0,

    // Working data (MUTABLE - all operations modify this)
    workingData: null,

    // File handling
    selectedFile: null,
    maxFileSize: 0, // Set dynamically based on device

    // Column metadata
    columns: [],
    columnTypes: {},
    columnOperations: {}, // {colName: {include, rename, mergeWith, splitBy}}

    // Cleaning options
    cleaningOptions: {
        basic: {
            removeEmptyRows: true,
            trimWhitespace: true,
            removeDuplicates: true,
            fixLineBreaks: true
        },
        normalization: {
            removeSpecialChars: true,
            normalizeCase: true,
            fixEncoding: true,
            removeEmojis: false
        },
        smartFormatting: {
            formatMobile: true,
            validateEmail: true,
            normalizeCurrency: true,
            standardizeDates: true
        }
    },

    // Validation results
    validation: {
        totalRows: 0,
        validRows: 0,
        invalidRows: [],
        duplicates: [],
        emptyRows: [],
        errors: []
    },

    // Transformation tracking
    transformations: [],

    // UI state
    currentSection: 1,
    isProcessing: false,
    confirmed: false
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌌 EXTEROID Smart Excel initialized')
    setDynamicFileLimits()
    setupEventListeners()
})

// ===== DYNAMIC FILE SIZE LIMITS (CONDITION 2) =====
function setDynamicFileLimits() {
    // Detect device type
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

    // Set limits
    if (isMobile) {
        AppState.maxFileSize = 10 * 1024 * 1024 // 10MB for mobile
        document.getElementById('file-size-limit').textContent = 'Max size: 10MB (Mobile)'
    } else {
        AppState.maxFileSize = 30 * 1024 * 1024 // 30MB for desktop
        document.getElementById('file-size-limit').textContent = 'Max size: 30MB (Desktop)'
    }

    console.log(`Max file size set to: ${formatFileSize(AppState.maxFileSize)}`)
}

// ===== EVENT LISTENERS SETUP =====
function setupEventListeners() {
    // Section 1: Upload
    const dropZone = document.getElementById('drop-zone')
    const fileInput = document.getElementById('file-input')
    const btnBrowse = document.getElementById('btn-browse')
    const btnRemove = document.getElementById('btn-remove-file')
    const btnProcess = document.getElementById('btn-process-file')

    btnBrowse.addEventListener('click', () => fileInput.click())
    dropZone.addEventListener('click', (e) => {
        if (e.target === dropZone || e.target.closest('.drop-zone')) {
            fileInput.click()
        }
    })

    fileInput.addEventListener('change', handleFileSelect)
    dropZone.addEventListener('dragover', handleDragOver)
    dropZone.addEventListener('dragleave', handleDragLeave)
    dropZone.addEventListener('drop', handleDrop)

    btnRemove.addEventListener('click', removeFile)
    btnProcess.addEventListener('click', processFile)

    // Section 2: Preview
    const btnToColumnOps = document.getElementById('btn-to-column-ops')
    if (btnToColumnOps) {
        btnToColumnOps.addEventListener('click', () => {
            generateColumnOperationsCards()
            unlockSection(3)
        })
    }

    // Section 3: Column Operations
    const btnBackToPreview = document.getElementById('btn-back-to-preview')
    const btnApplyColumnOps = document.getElementById('btn-apply-column-ops')

    if (btnBackToPreview) btnBackToPreview.addEventListener('click', () => scrollToSection(2))
    if (btnApplyColumnOps) btnApplyColumnOps.addEventListener('click', applyColumnOperations)

    // Section 4: Cleaning
    const btnBackToColumns = document.getElementById('btn-back-to-columns')
    const btnRunCleaning = document.getElementById('btn-run-cleaning')

    if (btnBackToColumns) btnBackToColumns.addEventListener('click', () => scrollToSection(3))
    if (btnRunCleaning) btnRunCleaning.addEventListener('click', runCleaningEngine)

    // Cleaning option checkboxes
    document.getElementById('clean-empty-rows').addEventListener('change', (e) => {
        AppState.cleaningOptions.basic.removeEmptyRows = e.target.checked
    })
    document.getElementById('clean-trim').addEventListener('change', (e) => {
        AppState.cleaningOptions.basic.trimWhitespace = e.target.checked
    })
    document.getElementById('clean-duplicates').addEventListener('change', (e) => {
        AppState.cleaningOptions.basic.removeDuplicates = e.target.checked
    })
    document.getElementById('clean-line-breaks').addEventListener('change', (e) => {
        AppState.cleaningOptions.basic.fixLineBreaks = e.target.checked
    })
    document.getElementById('clean-special-chars').addEventListener('change', (e) => {
        AppState.cleaningOptions.normalization.removeSpecialChars = e.target.checked
    })
    document.getElementById('clean-normalize-case').addEventListener('change', (e) => {
        AppState.cleaningOptions.normalization.normalizeCase = e.target.checked
    })
    document.getElementById('clean-fix-encoding').addEventListener('change', (e) => {
        AppState.cleaningOptions.normalization.fixEncoding = e.target.checked
    })
    document.getElementById('clean-remove-emojis').addEventListener('change', (e) => {
        AppState.cleaningOptions.normalization.removeEmojis = e.target.checked
    })
    document.getElementById('clean-format-phone').addEventListener('change', (e) => {
        AppState.cleaningOptions.smartFormatting.formatMobile = e.target.checked
    })
    document.getElementById('clean-validate-email').addEventListener('change', (e) => {
        AppState.cleaningOptions.smartFormatting.validateEmail = e.target.checked
    })
    document.getElementById('clean-normalize-currency').addEventListener('change', (e) => {
        AppState.cleaningOptions.smartFormatting.normalizeCurrency = e.target.checked
    })
    document.getElementById('clean-standardize-dates').addEventListener('change', (e) => {
        AppState.cleaningOptions.smartFormatting.standardizeDates = e.target.checked
    })

    // Section 5: Validation
    const btnBackToCleaning = document.getElementById('btn-back-to-cleaning')
    const btnToFinalPreview = document.getElementById('btn-to-final-preview')
    const btnRemoveInvalid = document.getElementById('btn-remove-invalid')
    const btnKeepFlagInvalid = document.getElementById('btn-keep-flag-invalid')
    const btnDownloadInvalid = document.getElementById('btn-download-invalid')

    if (btnBackToCleaning) btnBackToCleaning.addEventListener('click', () => scrollToSection(4))
    if (btnToFinalPreview) btnToFinalPreview.addEventListener('click', () => {
        generateFinalPreview()
        unlockSection(6)
    })
    if (btnRemoveInvalid) btnRemoveInvalid.addEventListener('click', removeInvalidRows)
    if (btnKeepFlagInvalid) btnKeepFlagInvalid.addEventListener('click', keepAndFlagInvalid)
    if (btnDownloadInvalid) btnDownloadInvalid.addEventListener('click', downloadInvalidOnly)

    // Section 6: Final Preview
    const confirmCheckbox = document.getElementById('confirm-data')
    const btnBackToValidation = document.getElementById('btn-back-to-validation')
    const btnProceedToExport = document.getElementById('btn-proceed-to-export')

    if (confirmCheckbox) {
        confirmCheckbox.addEventListener('change', (e) => {
            AppState.confirmed = e.target.checked
            btnProceedToExport.disabled = !e.target.checked
        })
    }

    if (btnBackToValidation) btnBackToValidation.addEventListener('click', () => scrollToSection(5))
    if (btnProceedToExport) btnProceedToExport.addEventListener('click', () => unlockSection(7))

    // Section 7: Export
    const btnExportExcel = document.getElementById('btn-export-excel')
    const btnExportCSV = document.getElementById('btn-export-csv')
    const btnStartOver = document.getElementById('btn-start-over')

    if (btnExportExcel) btnExportExcel.addEventListener('click', () => exportData('excel'))
    if (btnExportCSV) btnExportCSV.addEventListener('click', () => exportData('csv'))
    if (btnStartOver) btnStartOver.addEventListener('click', resetApplication)
}

// ===== FILE UPLOAD HANDLERS =====
function handleFileSelect(event) {
    const file = event.target.files[0]
    if (!file) return
    validateAndDisplayFile(file)
}

function handleDragOver(event) {
    event.preventDefault()
    event.currentTarget.classList.add('drag-active')
}

function handleDragLeave(event) {
    event.preventDefault()
    event.currentTarget.classList.remove('drag-active')
}

function handleDrop(event) {
    event.preventDefault()
    event.currentTarget.classList.remove('drag-active')

    const file = event.dataTransfer.files[0]
    if (!file) return

    validateAndDisplayFile(file)
}

function validateAndDisplayFile(file) {
    // Validate file type
    const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv' // .csv
    ]
    const validExtensions = /\.(xlsx|xls|csv)$/i

    if (!validTypes.includes(file.type) && !validExtensions.test(file.name)) {
        showNotification('Invalid file type. Please upload .xlsx, .xls, or .csv files only.', 'error')
        return
    }

    // Validate file size (dynamic based on device)
    if (file.size > AppState.maxFileSize) {
        showNotification(`File size exceeds ${formatFileSize(AppState.maxFileSize)} limit.`, 'error')
        return
    }

    // Validate not empty
    if (file.size === 0) {
        showNotification('File is empty.', 'error')
        return
    }

    // Store in state
    AppState.selectedFile = file

    // Display file info
    document.getElementById('file-name').textContent = file.name
    document.getElementById('file-size').textContent = formatFileSize(file.size)
    document.getElementById('file-selected').classList.remove('hidden')

    // Dim drop zone
    document.getElementById('drop-zone').style.opacity = '0.5'
}

function removeFile() {
    AppState.selectedFile = null

    document.getElementById('file-selected').classList.add('hidden')
    document.getElementById('drop-zone').style.opacity = '1'
    document.getElementById('file-input').value = ''
}

async function processFile() {
    if (!AppState.selectedFile) return

    showLoading('Processing file...')

    try {
        const data = await parseExcelFile(AppState.selectedFile)

        if (!data || data.length === 0) {
            throw new Error('File contains no data')
        }

        const firstRow = data[0]
        if (!firstRow || !Object.keys(firstRow).length) {
            throw new Error('File must contain column headers')
        }

        // Initialize data structures
        initializeDataStructures(data, AppState.selectedFile.name, AppState.selectedFile.size)

        hideLoading()

        // Show next section
        unlockSection(2)
        scrollToSection(2)

        showNotification('File processed successfully!', 'success')

    } catch (error) {
        hideLoading()
        showNotification(`Error processing file: ${error.message}`, 'error')
        console.error('File processing error:', error)
    }
}

// ===== SheetJS PARSER (v0.18.5 PINNED) =====
function parseExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result)
                const workbook = XLSX.read(data, { type: 'array' })

                // Get first sheet
                const sheetName = workbook.SheetNames[0]
                if (!sheetName) {
                    throw new Error('Workbook has no sheets')
                }

                const sheet = workbook.Sheets[sheetName]

                // Convert to JSON
                const json = XLSX.utils.sheet_to_json(sheet, {
                    defval: '',  // Empty cells become empty strings
                    raw: false   // Keep as strings for safety
                })

                resolve(json)
            } catch (error) {
                reject(new Error('Failed to parse Excel file: ' + error.message))
            }
        }

        reader.onerror = () => reject(new Error('File reading failed'))
        reader.readAsArrayBuffer(file)
    })
}

// ===== DATA INITIALIZATION (IMMUTABILITY ENFORCED) =====
function initializeDataStructures(parsedData, fileName, fileSize) {
    // IMMUTABLE original data (FROZEN)
    AppState.originalData = Object.freeze(parsedData)
    AppState.originalFileName = fileName
    AppState.originalFileSize = fileSize

    // MUTABLE working copy (deep clone)
    AppState.workingData = JSON.parse(JSON.stringify(parsedData))

    // Extract columns
    AppState.columns = Object.keys(parsedData[0] || {})

    // Detect column types
    AppState.columnTypes = detectColumnTypes(parsedData)

    // Initialize column operations (all included by default)
    AppState.columnOperations = {}
    AppState.columns.forEach(col => {
        AppState.columnOperations[col] = {
            include: true,
            rename: col,
            mergeWith: null,
            splitBy: null
        }
    })

    // Clear transformations
    AppState.transformations = []

    // Render raw preview
    renderRawDataPreview()
}

// ===== COLUMN TYPE DETECTION =====
function detectColumnTypes(data) {
    const types = {}
    const sampleSize = Math.min(100, data.length)

    AppState.columns.forEach(colName => {
        const samples = data.slice(0, sampleSize).map(row => row[colName])
        types[colName] = detectColumnType(colName, samples)
    })

    return types
}

function detectColumnType(columnName, samples) {
    const name = columnName.toLowerCase().trim()

    // Pattern definitions
    const patterns = {
        phone: /^[\+\d\s\-\(\)]{10,15}$/,
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        currency: /^[\$₹€£]?\d+(\.\d{1,2})?$/,
        url: /^https?:\/\//,
        date: /^\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}$/
    }

    // Name-based heuristics (fast path)
    if (name.includes('phone') || name.includes('mobile') || name.includes('contact')) return 'phone'
    if (name.includes('email') || name.includes('mail')) return 'email'
    if (name.includes('price') || name.includes('amount') || name.includes('cost') || name.includes('salary')) return 'currency'
    if (name.includes('date') || name.includes('time') || name.includes('dob')) return 'date'
    if (name.includes('url') || name.includes('link') || name.includes('website')) return 'url'

    // Value-based detection (70% threshold)
    const validSamples = samples.filter(v => v && v.toString().trim())
    if (validSamples.length === 0) return 'text'

    const threshold = 0.7

    // Phone detection
    const phoneCount = validSamples.filter(v => patterns.phone.test(v)).length
    if (phoneCount / validSamples.length > threshold) return 'phone'

    // Email detection
    const emailCount = validSamples.filter(v => patterns.email.test(v)).length
    if (emailCount / validSamples.length > threshold) return 'email'

    // Currency detection
    const currencyCount = validSamples.filter(v => patterns.currency.test(v)).length
    if (currencyCount / validSamples.length > threshold) return 'currency'

    // Date detection
    const dateCount = validSamples.filter(v => !isNaN(Date.parse(v))).length
    if (dateCount / validSamples.length > threshold) return 'date'

    // Number detection
    const numberCount = validSamples.filter(v => {
        const num = parseFloat(v)
        return !isNaN(num) && isFinite(num)
    }).length
    if (numberCount / validSamples.length > threshold) return 'number'

    // Default
    return 'text'
}

// ===== SECTION 2: RAW DATA PREVIEW =====
function renderRawDataPreview() {
    const preview = AppState.originalData.slice(0, 20)
    const totalRows = AppState.originalData.length

    // Update counts
    document.getElementById('preview-count').textContent = Math.min(20, totalRows)
    document.getElementById('total-rows').textContent = totalRows

    // Generate table
    const table = createDataTable(preview, AppState.columns)
    document.getElementById('raw-table-container').innerHTML = table

    // Display column types
    renderColumnTypes()
}

function createDataTable(data, columns) {
    let html = '<table class="data-table"><thead><tr>'

    // Headers
    columns.forEach(col => {
        html += `<th>${escapeHtml(col)}</th>`
    })
    html += '</tr></thead><tbody>'

    // Rows
    data.forEach(row => {
        html += '<tr>'
        columns.forEach(col => {
            const value = row[col] || ''
            html += `<td>${escapeHtml(value.toString())}</td>`
        })
        html += '</tr>'
    })

    html += '</tbody></table>'
    return html
}

function renderColumnTypes() {
    const container = document.getElementById('column-types-display')
    let html = ''

    AppState.columns.forEach(col => {
        const type = AppState.columnTypes[col]
        const icon = getTypeIcon(type)
        const color = getTypeColor(type)

        html += `
            <div class="type-badge" style="border-color: ${color}">
                <i class="${icon}" style="color: ${color}"></i>
                <span class="type-col-name">${escapeHtml(col)}</span>
                <span class="type-label" style="background: ${color}">${type}</span>
            </div>
        `
    })

    container.innerHTML = html
}

function getTypeIcon(type) {
    const icons = {
        phone: 'fas fa-phone',
        email: 'fas fa-envelope',
        currency: 'fas fa-dollar-sign',
        date: 'fas fa-calendar',
        number: 'fas fa-hashtag',
        text: 'fas fa-font',
        url: 'fas fa-link'
    }
    return icons[type] || 'fas fa-question'
}

function getTypeColor(type) {
    const colors = {
        phone: '#10b981',
        email: '#3b82f6',
        currency: '#f59e0b',
        date: '#8b5cf6',
        number: '#06b6d4',
        text: '#6b7280',
        url: '#ec4899'
    }
    return colors[type] || '#9ca3af'
}

// ===== SECTION 3: COLUMN OPERATIONS =====
function generateColumnOperationsCards() {
    const container = document.getElementById('column-cards-container')
    let html = ''

    AppState.columns.forEach(col => {
        const type = AppState.columnTypes[col]
        const color = getTypeColor(type)

        html += `
            <div class="column-op-card" id="col-card-${sanitizeId(col)}">
                <div class="col-op-header">
                    <span class="col-op-name">${escapeHtml(col)}</span>
                    <label class="checkbox-option">
                        <input type="checkbox" 
                               class="col-include-checkbox" 
                               data-column="${escapeHtml(col)}" 
                               checked>
                        <span>Include</span>
                    </label>
                </div>
                <div class="col-op-body">
                    <label>
                        Rename to:
                        <input type="text" 
                               class="col-rename-input" 
                               data-column="${escapeHtml(col)}" 
                               value="${escapeHtml(col)}" 
                               placeholder="New column name">
                    </label>
                    
                    <label>
                        Column type:
                        <select class="col-type-select" data-column="${escapeHtml(col)}">
                            <option value="text" ${type === 'text' ? 'selected' : ''}>Text</option>
                            <option value="phone" ${type === 'phone' ? 'selected' : ''}>Phone</option>
                            <option value="email" ${type === 'email' ? 'selected' : ''}>Email</option>
                            <option value="currency" ${type === 'currency' ? 'selected' : ''}>Currency</option>
                            <option value="date" ${type === 'date' ? 'selected' : ''}>Date</option>
                            <option value="number" ${type === 'number' ? 'selected' : ''}>Number</option>
                        </select>
                    </label>
                    
                    <label>
                        Merge with:
                        <select class="col-merge-select" data-column="${escapeHtml(col)}">
                            <option value="">None</option>
                            ${AppState.columns.filter(c => c !== col).map(c =>
            `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`
        ).join('')}
                        </select>
                    </label>
                    
                    <label>
                        Split by delimiter:
                        <select class="col-split-select" data-column="${escapeHtml(col)}">
                            <option value="">None</option>
                            <option value=",">Comma (,)</option>
                            <option value=" ">Space</option>
                            <option value="-">Dash (-)</option>
                            <option value="|">Pipe (|)</option>
                        </select>
                    </label>
                </div>
            </div>
        `
    })

    container.innerHTML = html

    // Attach event listeners
    attachColOperationListeners()
}

function attachColOperationListeners() {
    // Include/exclude checkboxes
    document.querySelectorAll('.col-include-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const col = e.target.dataset.column
            AppState.columnOperations[col].include = e.target.checked

            const card = document.getElementById(`col-card-${sanitizeId(col)}`)
            if (e.target.checked) {
                card.classList.remove('excluded')
            } else {
                card.classList.add('excluded')
            }
        })
    })

    // Rename inputs
    document.querySelectorAll('.col-rename-input').forEach(input => {
        input.addEventListener('blur', (e) => {
            const col = e.target.dataset.column
            const newName = e.target.value.trim()

            if (newName && newName !== col) {
                // Check for duplicates
                const existing = Object.values(AppState.columnOperations).find(op => op.rename === newName)
                if (existing) {
                    showNotification(`Column name "${newName}" already exists!`, 'error')
                    e.target.value = AppState.columnOperations[col].rename
                } else {
                    AppState.columnOperations[col].rename = newName
                }
            }
        })
    })

    // Type selectors
    document.querySelectorAll('.col-type-select').forEach(select => {
        select.addEventListener('change', (e) => {
            const col = e.target.dataset.column
            AppState.columnTypes[col] = e.target.value
        })
    })

    // Merge selectors (CONDITION 3: Guardrails)
    document.querySelectorAll('.col-merge-select').forEach(select => {
        select.addEventListener('change', (e) => {
            const col = e.target.dataset.column
            const mergeWith = e.target.value

            if (mergeWith) {
                // GUARDRAIL: Only allow text column merging
                const col1Type = AppState.columnTypes[col]
                const col2Type = AppState.columnTypes[mergeWith]

                if ((col1Type === 'number' || col1Type === 'currency') ||
                    (col2Type === 'number' || col2Type === 'currency')) {
                    showNotification('⚠️ Merging numeric/currency columns is blocked to prevent data corruption.', 'error')
                    e.target.value = ''
                    return
                }

                AppState.columnOperations[col].mergeWith = mergeWith
            } else {
                AppState.columnOperations[col].mergeWith = null
            }
        })
    })

    // Split selectors
    document.querySelectorAll('.col-split-select').forEach(select => {
        select.addEventListener('change', (e) => {
            const col = e.target.dataset.column
            const splitBy = e.target.value

            AppState.columnOperations[col].splitBy = splitBy || null
        })
    })
}

function applyColumnOperations() {
    showLoading('Applying column operations...')

    try {
        let newData = JSON.parse(JSON.stringify(AppState.workingData))

        // Apply operations: rename, merge, split
        newData = applyRename(newData)
        newData = applyMerge(newData)
        newData = applySplit(newData)
        newData = applyExclusions(newData)

        AppState.workingData = newData
        AppState.transformations.push({
            operation: 'column_operations',
            timestamp: new Date().toISOString()
        })

        hideLoading()
        unlockSection(4)
        scrollToSection(4)

        showNotification('Column operations applied successfully!', 'success')

    } catch (error) {
        hideLoading()
        showNotification('Error applying column operations: ' + error.message, 'error')
        console.error(error)
    }
}

function applyRename(data) {
    return data.map(row => {
        const newRow = {}
        Object.keys(row).forEach(oldCol => {
            const op = AppState.columnOperations[oldCol]
            if (op && op.rename) {
                newRow[op.rename] = row[oldCol]
            } else {
                newRow[oldCol] = row[oldCol]
            }
        })
        return newRow
    })
}

function applyMerge(data) {
    Object.keys(AppState.columnOperations).forEach(col => {
        const op = AppState.columnOperations[col]
        if (op.mergeWith && AppState.columnOperations[op.mergeWith]) {
            const newColName = `${op.rename}_${AppState.columnOperations[op.mergeWith].rename}`

            data = data.map(row => {
                const val1 = row[op.rename] || ''
                const val2 = row[AppState.columnOperations[op.mergeWith].rename] || ''
                row[newColName] = `${val1} ${val2}`.trim()
                return row
            })

            AppState.transformations.push(`Merged "${col}" with "${op.mergeWith}"`)
        }
    })

    return data
}

function applySplit(data) {
    Object.keys(AppState.columnOperations).forEach(col => {
        const op = AppState.columnOperations[col]
        if (op.splitBy) {
            const maxParts = Math.max(...data.map(row => {
                const val = row[op.rename] || ''
                return val.split(op.splitBy).length
            }))

            data = data.map(row => {
                const val = row[op.rename] || ''
                const parts = val.split(op.splitBy)

                for (let i = 0; i < maxParts; i++) {
                    row[`${op.rename}_${i + 1}`] = parts[i] || ''
                }

                return row
            })

            AppState.transformations.push(`Split "${col}" by "${op.splitBy}"`)
        }
    })

    return data
}

function applyExclusions(data) {
    const includedColumns = Object.keys(AppState.columnOperations)
        .filter(col => AppState.columnOperations[col].include)
        .map(col => AppState.columnOperations[col].rename)

    // Also include merged and split columns
    Object.keys(AppState.columnOperations).forEach(col => {
        const op = AppState.columnOperations[col]
        if (op.mergeWith) {
            const newColName = `${op.rename}_${AppState.columnOperations[op.mergeWith].rename}`
            includedColumns.push(newColName)
        }
    })

    // Keep only included columns
    return data.map(row => {
        const newRow = {}
        Object.keys(row).forEach(col => {
            if (includedColumns.includes(col) || col.includes('_1') || col.includes('_2')) {
                newRow[col] = row[col]
            }
        })
        return newRow
    })
}

// ===== SECTION 4: SMART DATA CLEANING ENGINE =====
async function runCleaningEngine() {
    showLoading('Running cleaning engine...')

    try {
        let cleaned = JSON.parse(JSON.stringify(AppState.workingData))

        // Basic cleaning
        if (AppState.cleaningOptions.basic.removeEmptyRows) {
            cleaned = cleaned.filter(row => {
                return Object.values(row).some(val => val && val.toString().trim())
            })
            AppState.transformations.push('Removed empty rows')
        }

        if (AppState.cleaningOptions.basic.trimWhitespace) {
            cleaned = cleaned.map(row => {
                const newRow = {}
                Object.keys(row).forEach(col => {
                    const val = row[col]
                    newRow[col] = typeof val === 'string' ? val.trim().replace(/\s+/g, ' ') : val
                })
                return newRow
            })
            AppState.transformations.push('Trimmed whitespace')
        }

        if (AppState.cleaningOptions.basic.fixLineBreaks) {
            cleaned = cleaned.map(row => {
                const newRow = {}
                Object.keys(row).forEach(col => {
                    const val = row[col]
                    newRow[col] = typeof val === 'string' ? val.replace(/[\r\n]+/g, ' ') : val
                })
                return newRow
            })
            AppState.transformations.push('Fixed line breaks')
        }

        // Text normalization
        if (AppState.cleaningOptions.normalization.removeSpecialChars) {
            cleaned = cleaned.map(row => {
                const newRow = {}
                Object.keys(row).forEach(col => {
                    const type = AppState.columnTypes[col]
                    const val = row[col]
                    if (typeof val === 'string' && type === 'text') {
                        newRow[col] = val.replace(/[^\w\s\-\.@]/g, '')
                    } else {
                        newRow[col] = val
                    }
                })
                return newRow
            })
            AppState.transformations.push('Removed special characters')
        }

        if (AppState.cleaningOptions.normalization.normalizeCase) {
            cleaned = cleaned.map(row => {
                const newRow = {}
                Object.keys(row).forEach(col => {
                    const type = AppState.columnTypes[col]
                    const val = row[col]
                    if (typeof val === 'string' && (type === 'text' || type === 'email')) {
                        newRow[col] = toTitleCase(val)
                    } else {
                        newRow[col] = val
                    }
                })
                return newRow
            })
            AppState.transformations.push('Normalized case')
        }

        if (AppState.cleaningOptions.normalization.removeEmojis) {
            cleaned = cleaned.map(row => {
                const newRow = {}
                Object.keys(row).forEach(col => {
                    const val = row[col]
                    newRow[col] = typeof val === 'string' ? val.replace(/[\u{1F600}-\u{1F64F}]/gu, '') : val
                })
                return newRow
            })
            AppState.transformations.push('Removed emojis')
        }

        // Smart formatting
        if (AppState.cleaningOptions.smartFormatting.formatMobile) {
            cleaned = cleaned.map(row => {
                const newRow = {}
                Object.keys(row).forEach(col => {
                    const type = AppState.columnTypes[col]
                    const val = row[col]
                    if (type === 'phone' && val) {
                        newRow[col] = formatMobileNumber(val)
                    } else {
                        newRow[col] = val
                    }
                })
                return newRow
            })
            AppState.transformations.push('Formatted mobile numbers')
        }

        if (AppState.cleaningOptions.smartFormatting.validateEmail) {
            cleaned = cleaned.map(row => {
                const newRow = {}
                Object.keys(row).forEach(col => {
                    const type = AppState.columnTypes[col]
                    const val = row[col]
                    if (type === 'email' && val) {
                        newRow[col] = validateAndFixEmail(val)
                    } else {
                        newRow[col] = val
                    }
                })
                return newRow
            })
            AppState.transformations.push('Validated emails')
        }

        if (AppState.cleaningOptions.smartFormatting.normalizeCurrency) {
            cleaned = cleaned.map(row => {
                const newRow = {}
                Object.keys(row).forEach(col => {
                    const type = AppState.columnTypes[col]
                    const val = row[col]
                    if (type === 'currency' && val) {
                        newRow[col] = normalizeCurrency(val)
                    } else {
                        newRow[col] = val
                    }
                })
                return newRow
            })
            AppState.transformations.push('Normalized currency')
        }

        if (AppState.cleaningOptions.smartFormatting.standardizeDates) {
            cleaned = cleaned.map(row => {
                const newRow = {}
                Object.keys(row).forEach(col => {
                    const type = AppState.columnTypes[col]
                    const val = row[col]
                    if (type === 'date' && val) {
                        newRow[col] = standardizeDate(val)
                    } else {
                        newRow[col] = val
                    }
                })
                return newRow
            })
            AppState.transformations.push('Standardized dates')
        }

        // Duplicate removal (LAST)
        if (AppState.cleaningOptions.basic.removeDuplicates) {
            const before = cleaned.length
            cleaned = removeDuplicates(cleaned)
            const after = cleaned.length
            const removed = before - after
            if (removed > 0) {
                AppState.transformations.push(`Removed ${removed} duplicate rows`)
            }
        }

        AppState.workingData = cleaned

        hideLoading()

        // Run validation
        runValidation()
        unlockSection(5)
        scrollToSection(5)

        showNotification('Cleaning complete!', 'success')

    } catch (error) {
        hideLoading()
        showNotification('Error during cleaning: ' + error.message, 'error')
        console.error(error)
    }
}

// ===== CLEANING HELPER FUNCTIONS =====
function formatMobileNumber(value) {
    if (!value) return ''

    // Remove all non-digits
    let digits = value.toString().replace(/\D/g, '')

    // Handle country code
    if (digits.startsWith('91') && digits.length > 10) {
        digits = digits.substring(2)
    }
    if (digits.startsWith('0')) {
        digits = digits.substring(1)
    }

    // Enforce 10 digits
    if (digits.length > 10) {
        digits = digits.substring(digits.length - 10)
    }

    // Validate
    if (digits.length !== 10) {
        return value // Return original if invalid
    }

    // Format with +91
    return '+91' + digits
}

function validateAndFixEmail(email) {
    if (!email) return ''

    email = email.toLowerCase().trim()

    // Common typo fixes
    email = email.replace(/gmial\.com/, 'gmail.com')
    email = email.replace(/yahooo\.com/, 'yahoo.com')
    email = email.replace(/outlok\.com/, 'outlook.com')

    // Basic validation
    const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!pattern.test(email)) {
        return email // Return as-is if invalid (will be flagged in validation)
    }

    return email
}

function normalizeCurrency(value) {
    if (!value) return ''

    // Remove currency symbols
    let numeric = value.toString().replace(/[₹$€£,]/g, '')
    const amount = parseFloat(numeric)

    if (isNaN(amount)) {
        return value // Return original if not a number
    }

    // Format with 2 decimals
    return amount.toFixed(2)
}

function standardizeDate(value) {
    if (!value) return ''

    const date = new Date(value)

    if (isNaN(date.getTime())) {
        return value // Return original if invalid
    }

    // Format as YYYY-MM-DD
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
}

function toTitleCase(str) {
    if (!str) return ''
    return str.toLowerCase().split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
}

function removeDuplicates(data) {
    const seen = new Map()
    return data.filter(row => {
        const key = JSON.stringify(row)
        if (seen.has(key)) {
            return false
        }
        seen.set(key, true)
        return true
    })
}

// ===== SECTION 5: VALIDATION =====
function runValidation() {
    const results = {
        totalRows: AppState.workingData.length,
        validRows: 0,
        invalidRows: [],
        duplicates: [],
        emptyRows: [],
        errors: []
    }

    AppState.workingData.forEach((row, index) => {
        const rowErrors = []

        // Check for completely empty rows
        const hasData = Object.values(row).some(val => val && val.toString().trim())
        if (!hasData) {
            results.emptyRows.push(index)
            return
        }

        // Validate each column
        Object.keys(row).forEach(col => {
            const type = AppState.columnTypes[col]
            const value = row[col]

            if (!value || !value.toString().trim()) return

            switch (type) {
                case 'phone':
                    if (!value.match(/^\+91\d{10}$/)) {
                        rowErrors.push({ column: col, error: 'Invalid phone format' })
                    }
                    break
                case 'email':
                    if (!value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                        rowErrors.push({ column: col, error: 'Invalid email format' })
                    }
                    break
                case 'currency':
                    if (isNaN(parseFloat(value))) {
                        rowErrors.push({ column: col, error: 'Invalid currency value' })
                    }
                    break
                case 'date':
                    if (isNaN(Date.parse(value))) {
                        rowErrors.push({ column: col, error: 'Invalid date' })
                    }
                    break
                case 'number':
                    if (isNaN(parseFloat(value))) {
                        rowErrors.push({ column: col, error: 'Invalid number' })
                    }
                    break
            }
        })

        if (rowErrors.length > 0) {
            results.invalidRows.push({ index, row, errors: rowErrors })
        } else {
            results.validRows++
        }
    })

    AppState.validation = results

    // Render validation stats
    renderValidationStats()
}

function renderValidationStats() {
    const stats = AppState.validation
    const container = document.getElementById('validation-stats')

    const html = `
        <div class="stat-card">
            <i class="fas fa-database stat-icon" style="color: var(--cyan-glow)"></i>
            <p class="stat-value">${stats.totalRows}</p>
            <p class="stat-label">Total Rows</p>
        </div>
        <div class="stat-card">
            <i class="fas fa-check-circle stat-icon" style="color: var(--success-green)"></i>
            <p class="stat-value">${stats.validRows}</p>
            <p class="stat-label">Valid Rows</p>
        </div>
        <div class="stat-card">
            <i class="fas fa-exclamation-triangle stat-icon" style="color: var(--warning-yellow)"></i>
            <p class="stat-value">${stats.invalidRows.length}</p>
            <p class="stat-label">Invalid Rows</p>
        </div>
        <div class="stat-card">
            <i class="fas fa-trash stat-icon" style="color: var(--error-red)"></i>
            <p class="stat-value">${stats.emptyRows.length}</p>
            <p class="stat-label">Empty Rows</p>
        </div>
    `

    container.innerHTML = html

    // Show invalid rows section if there are any
    if (stats.invalidRows.length > 0) {
        renderInvalidRowsTable()
        document.getElementById('invalid-rows-section').classList.remove('hidden')
    }
}

function renderInvalidRowsTable() {
    const invalid = AppState.validation.invalidRows.slice(0, 100) // Max 100 displayed
    const container = document.getElementById('invalid-rows-table')

    let html = '<table class="data-table"><thead><tr>'
    html += '<th>Row #</th><th>Column</th><th>Value</th><th>Error</th>'
    html += '</tr></thead><tbody>'

    invalid.forEach(item => {
        item.errors.forEach(err => {
            html += `<tr>
                <td>${item.index + 1}</td>
                <td>${escapeHtml(err.column)}</td>
                <td>${escapeHtml(item.row[err.column]?.toString() || '')}</td>
                <td style="color: var(--error-red)">${escapeHtml(err.error)}</td>
            </tr>`
        })
    })

    html += '</tbody></table>'
    container.innerHTML = html
}

function removeInvalidRows() {
    if (!confirm('Are you sure you want to permanently remove all invalid rows?')) {
        return
    }

    const invalidIndices = new Set(AppState.validation.invalidRows.map(item => item.index))
    AppState.workingData = AppState.workingData.filter((_, index) => !invalidIndices.has(index))

    AppState.transformations.push(`Removed ${invalidIndices.size} invalid rows`)

    // Re-run validation
    runValidation()
    showNotification(`${invalidIndices.size} invalid rows removed`, 'success')
}

function keepAndFlagInvalid() {
    const invalidIndices = new Set(AppState.validation.invalidRows.map(item => item.index))

    AppState.workingData = AppState.workingData.map((row, index) => {
        if (invalidIndices.has(index)) {
            return { ...row, _validation_flagged: 'YES' }
        }
        return row
    })

    AppState.transformations.push('Flagged invalid rows')
    showNotification('Invalid rows flagged with _validation_flagged column', 'success')
}

function downloadInvalidOnly() {
    const invalidRows = AppState.validation.invalidRows.map(item => item.row)

    if (invalidRows.length === 0) {
        showNotification('No invalid rows to download', 'info')
        return
    }

    const worksheet = XLSX.utils.json_to_sheet(invalidRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invalid Rows")

    const filename = `exteroid_invalid_rows_${Date.now()}.xlsx`
    XLSX.writeFile(workbook, filename)

    showNotification('Invalid rows downloaded!', 'success')
}

// ===== SECTION 6: FINAL PREVIEW =====
function generateFinalPreview() {
    const preview = AppState.workingData.slice(0, 20)
    const columns = Object.keys(preview[0] || {}).filter(col => !col.startsWith('_'))

    // Render table
    const table = createDataTable(preview, columns)
    document.getElementById('final-table-container').innerHTML = table

    // Render transformation summary
    const summaryContainer = document.getElementById('transformation-summary')
    let summaryHtml = '<h3>Transformations Applied:</h3><ul>'

    AppState.transformations.forEach(transform => {
        summaryHtml += `<li><i class="fas fa-check"></i> ${escapeHtml(transform)}</li>`
    })

    summaryHtml += `</ul><p style="font-weight: 700; color: var(--success-green); margin-top: 1rem;">
        ${AppState.workingData.length} rows cleaned successfully
    </p>`

    summaryContainer.innerHTML = summaryHtml
}

// ===== SECTION 7: EXPORT =====
function exportData(format) {
    const includeReport = document.getElementById('export-include-report').checked

    showLoading(`Preparing ${format.toUpperCase()} download...`)

    try {
        // Remove internal flags
        const exportData = AppState.workingData.map(row => {
            const clean = { ...row }
            delete clean._validation_error
            delete clean._validation_flagged
            return clean
        })

        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
        const baseName = AppState.originalFileName.replace(/\.[^/.]+$/, '')
        const filename = `exteroid_cleaned_${baseName}_${timestamp}.${format === 'excel' ? 'xlsx' : 'csv'}`

        if (format === 'excel') {
            const workbook = XLSX.utils.book_new()

            // Main data sheet
            const worksheet = XLSX.utils.json_to_sheet(exportData)
            XLSX.utils.book_append_sheet(workbook, worksheet, "Cleaned Data")

            // Optional report sheet
            if (includeReport) {
                const report = generateValidationReport()
                const reportSheet = XLSX.utils.json_to_sheet(report)
                XLSX.utils.book_append_sheet(workbook, reportSheet, "Validation Report")
            }

            XLSX.writeFile(workbook, filename)

        } else if (format === 'csv') {
            const worksheet = XLSX.utils.json_to_sheet(exportData)
            const csv = XLSX.utils.sheet_to_csv(worksheet)
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = filename
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)
        }

        hideLoading()
        showNotification(`✓ ${format.toUpperCase()} file downloaded successfully!`, 'success')

    } catch (error) {
        hideLoading()
        showNotification(`Error exporting: ${error.message}`, 'error')
        console.error(error)
    }
}

function generateValidationReport() {
    return [
        { Metric: 'Original Rows', Value: AppState.originalData.length },
        { Metric: 'Final Rows', Value: AppState.workingData.length },
        { Metric: 'Valid Rows', Value: AppState.validation.validRows },
        { Metric: 'Invalid Rows', Value: AppState.validation.invalidRows.length },
        { Metric: 'Empty Rows', Value: AppState.validation.emptyRows.length },
        { Metric: 'Transformations Applied', Value: AppState.transformations.length }
    ]
}

// ===== NAVIGATION & UI CONTROL =====
function unlockSection(sectionNumber) {
    const sectionId = `section-${sectionNumber}-` + ['', 'upload', 'preview', 'column-ops', 'cleaning', 'validation', 'final-preview', 'export'][sectionNumber]
    const section = document.getElementById(sectionId)

    if (section) {
        section.classList.remove('hidden')
        AppState.currentSection = sectionNumber
        scrollToSection(sectionNumber)
    }
}

function scrollToSection(sectionNumber) {
    const sectionId = `section-${sectionNumber}-` + ['', 'upload', 'preview', 'column-ops', 'cleaning', 'validation', 'final-preview', 'export'][sectionNumber]
    const section = document.getElementById(sectionId)

    if (section) {
        setTimeout(() => {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 100)
    }
}

function resetApplication() {
    if (!confirm('Are you sure you want to start over? All progress will be lost.')) {
        return
    }

    // Reset state
    AppState.originalData = null
    AppState.workingData = null
    AppState.selectedFile = null
    AppState.columns = []
    AppState.columnTypes = {}
    AppState.columnOperations = {}
    AppState.validation = { totalRows: 0, validRows: 0, invalidRows: [], duplicates: [], emptyRows: [], errors: [] }
    AppState.transformations = []
    AppState.currentSection = 1
    AppState.confirmed = false

    // Reset UI
    document.getElementById('file-selected').classList.add('hidden')
    document.getElementById('drop-zone').style.opacity = '1'
    document.getElementById('file-input').value = ''
    document.getElementById('confirm-data').checked = false

    // Hide all sections except upload
    for (let i = 2; i <= 7; i++) {
        const sectionId = `section-${i}-` + ['', 'upload', 'preview', 'column-ops', 'cleaning', 'validation', 'final-preview', 'export'][i]
        const section = document.getElementById(sectionId)
        if (section) {
            section.classList.add('hidden')
        }
    }

    scrollToSection(1)
    showNotification('Application reset', 'info')
}

// ===== UTILITY FUNCTIONS =====
function showLoading(message = 'Processing...') {
    document.getElementById('loading-text').textContent = message
    document.getElementById('loading-overlay').classList.remove('hidden')
    AppState.isProcessing = true
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden')
    AppState.isProcessing = false
}

function showNotification(message, type = 'info') {
    const toast = document.createElement('div')
    const bgColor = type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'

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
    `

    toast.innerHTML = `
        <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
        ${escapeHtml(message)}
    `

    document.body.appendChild(toast)

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease'
        setTimeout(() => toast.remove(), 300)
    }, 3000)
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }
    return String(text).replace(/[&<>"']/g, m => map[m])
}

function sanitizeId(str) {
    return str.replace(/[^a-zA-Z0-9]/g, '_')
}

console.log('✅ EXTEROID Smart Excel loaded successfully')
console.log('Conditions Applied: SheetJS v0.18.5 pinned | Dynamic file limits | Column merge guardrails | V1 scope')
