// --- State ---
let extractedData = []; // Stores objects: { name, corePhone, rawLine }
let isProcessing = false;
let processedNumbers = new Set(); // To prevent duplicates

// ---DOM Elements ---
const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const prefixToggle = document.getElementById('prefix-toggle');
const dataBody = document.getElementById('data-body');
const controlsArea = document.getElementById('controls-area');
const tableContainer = document.getElementById('table-container');
const downloadBtn = document.getElementById('download-btn');
const statusText = document.getElementById('status-text');
const spinner = document.getElementById('spinner');

// --- Event Listeners ---
prefixToggle.addEventListener('change', reRenderPhoneNumbers);

// Drag & Drop
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(e => {
    dropArea.addEventListener(e, (ev) => { ev.preventDefault(); ev.stopPropagation(); });
});
['dragenter', 'dragover'].forEach(e => dropArea.addEventListener(e, () => dropArea.classList.add('active')));
['dragleave', 'drop'].forEach(e => dropArea.addEventListener(e, () => dropArea.classList.remove('active')));

dropArea.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files));
dropArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

// --- Main Logic ---

async function handleFiles(files) {
    if (files.length === 0) return;

    showUI();
    updateStatus("Initializing Engine...", true);

    try {
        const worker = await Tesseract.createWorker('eng');

        for (let i = 0; i < files.length; i++) {
            updateStatus(`Scanning Image ${i + 1}/${files.length}...`, true);
            const ret = await worker.recognize(files[i]);
            processText(ret.data.text);
        }

        await worker.terminate();
        updateStatus("Processing Complete!", false);
        showToast(`Processed ${files.length} images`);

    } catch (err) {
        console.error(err);
        updateStatus("Error Occurred", false);
        showToast("Error processing images", true);
    }
    fileInput.value = ''; // Reset
}

function processText(text) {
    const lines = text.split('\n');

    lines.forEach(line => {
        const cleanLine = line.trim();
        if (!cleanLine) return;

        // 1. Extract ALL digits from the line
        const allDigits = cleanLine.replace(/\D/g, '');

        // 2. Logic: Valid mobile numbers in India are 10 digits.
        // If we have > 10 digits (e.g. 12 or 13 due to prefixes like 91, 0, 191 etc),
        // we ONLY care about the LAST 10 digits.

        if (allDigits.length >= 10) {
            // Extract last 10 digits
            const corePhone = allDigits.slice(-10);

            // Basic validation: Indian mobile start with 6,7,8,9
            if (['6', '7', '8', '9'].includes(corePhone[0])) {

                if (!processedNumbers.has(corePhone)) {

                    // Extract Name: Remove the digits from the original line to find name
                    // We use a loose replacement to try and keep the name part
                    let name = cleanLine.replace(/[0-9\+\-\(\)]/g, '').trim();

                    // Clean up name garbage
                    name = name.replace(/^[:\.\-_]+|[:\.\-_]+$/g, '').trim();
                    if (name.length < 2) name = "Unknown";

                    const record = {
                        id: Date.now() + Math.random(),
                        name: name,
                        corePhone: corePhone // Store ONLY the pure 10 digit number
                    };

                    extractedData.push(record);
                    processedNumbers.add(corePhone);
                    appendRow(record, extractedData.length);
                }
            }
        }
    });

    checkEmpty();
}

// --- Rendering & formatting ---

function getFormattedPhone(corePhone) {
    // Apply prefix if toggle is ON
    const addPrefix = prefixToggle.checked;
    return addPrefix ? `+91${corePhone}` : corePhone;
}

function appendRow(item, index) {
    const row = document.createElement('tr');
    row.id = `row-${item.id}`;
    row.className = "bg-white border-b hover:bg-gray-50";

    row.innerHTML = `
        <td class="px-6 py-4 text-gray-400 text-xs">${index}</td>
        <td class="px-6 py-4 contenteditable focus:bg-blue-50 outline-none rounded" contenteditable="true" onblur="updateName('${item.id}', this.innerText)">${item.name}</td>
        <td class="px-6 py-4 font-mono font-bold text-blue-700 phone-cell">${getFormattedPhone(item.corePhone)}</td>
        <td class="px-6 py-4 text-xs text-gray-400 font-mono">${item.corePhone}</td>
        <td class="px-6 py-4 text-center">
            <button onclick="deleteRow('${item.id}', '${item.corePhone}')" class="text-red-400 hover:text-red-600 transition">
                <i class="fas fa-times"></i>
            </button>
        </td>
    `;
    dataBody.appendChild(row);
}

// Called when checkbox changes
function reRenderPhoneNumbers() {
    // Update UI without deleting rows
    extractedData.forEach(item => {
        const row = document.getElementById(`row-${item.id}`);
        if (row) {
            const phoneCell = row.querySelector('.phone-cell');
            phoneCell.innerText = getFormattedPhone(item.corePhone);
        }
    });
}

// --- Data Management ---

function updateName(id, newName) {
    const item = extractedData.find(d => d.id == id);
    if (item) item.name = newName.trim();
}

function deleteRow(id, phone) {
    extractedData = extractedData.filter(d => d.id != id);
    processedNumbers.delete(phone);
    document.getElementById(`row-${id}`).remove();
    checkEmpty();
}

function clearData() {
    if (confirm("Clear all data?")) {
        extractedData = [];
        processedNumbers.clear();
        dataBody.innerHTML = '';
        checkEmpty();
        updateStatus("Ready", false);
    }
}

function checkEmpty() {
    if (extractedData.length > 0) {
        downloadBtn.disabled = false;
        document.getElementById('empty-msg').classList.add('hidden');
        tableContainer.classList.remove('hidden');
    } else {
        downloadBtn.disabled = true;
        document.getElementById('empty-msg').classList.remove('hidden');
    }
}

function showUI() {
    controlsArea.classList.remove('hidden');
}

function updateStatus(text, loading) {
    statusText.innerText = text;
    spinner.className = loading ? "spinner" : "spinner hidden";
}

function showToast(msg, isError) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.style.backgroundColor = isError ? '#EF4444' : '#1F2937';
    t.classList.remove('translate-y-32');
    setTimeout(() => t.classList.add('translate-y-32'), 3000);
}

// --- Export ---

function downloadExcel() {
    if (extractedData.length === 0) return;

    // Prepare data with current formatting setting
    const exportData = extractedData.map((item, i) => ({
        "S.No": i + 1,
        "Name": item.name,
        "Phone Number": getFormattedPhone(item.corePhone) // Exports what you see
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Column widths
    ws['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 20 }];

    XLSX.utils.book_append_sheet(wb, ws, "Contacts");
    XLSX.writeFile(wb, "Smart_Contacts_List.xlsx");
    showToast("Downloaded!");
}
