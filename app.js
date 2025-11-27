/**
 * Umbramed Academy - Airtable Management Interface
 * A responsive CRUD application for managing Airtable data
 * 
 * @version 1.0.0
 * @author Umbramed Academy Development Team
 */

// ============================================================================
// CONFIGURATION - HARDCODED CREDENTIALS (Per User Request)
// ============================================================================
const CONFIG = {
    // IMPORTANT: Replace these with your actual Airtable credentials
    API_KEY: 'YOUR_AIRTABLE_API_KEY_HERE', // e.g., 'patXXXXXXXXXXXXXX.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
    BASE_ID: 'YOUR_BASE_ID_HERE',          // e.g., 'appXXXXXXXXXXXXXX'
    TABLE_NAME: 'Students',                 // Default table name - will be updated from schema
    
    // API Configuration
    API_BASE_URL: 'https://api.airtable.com/v0',
    
    // Pagination
    DEFAULT_PAGE_SIZE: 10,
    MAX_RECORDS_PER_REQUEST: 100,
    
    // Demo Mode - Set to false when using real API credentials
    DEMO_MODE: true
};

// ============================================================================
// APPLICATION STATE
// ============================================================================
let state = {
    records: [],
    filteredRecords: [],
    schema: [],
    currentPage: 1,
    pageSize: CONFIG.DEFAULT_PAGE_SIZE,
    viewMode: 'table',
    editingRecordId: null,
    sortField: null,
    sortDirection: 'asc',
    filters: {
        search: '',
        status: '',
        course: ''
    }
};

// ============================================================================
// DEMO DATA - Used when DEMO_MODE is true
// ============================================================================
const DEMO_SCHEMA = [
    { name: 'Nombre', type: 'singleLineText' },
    { name: 'Email', type: 'email' },
    { name: 'Teléfono', type: 'phoneNumber' },
    { name: 'Curso', type: 'singleSelect', options: ['Medicina General', 'Enfermería', 'Farmacología', 'Anatomía', 'Pediatría'] },
    { name: 'Estado', type: 'singleSelect', options: ['Activo', 'Inactivo', 'Pendiente'] },
    { name: 'Fecha Inscripción', type: 'date' },
    { name: 'Notas', type: 'multilineText' }
];

const DEMO_DATA = [
    { id: 'rec1', fields: { 'Nombre': 'María García López', 'Email': 'maria.garcia@email.com', 'Teléfono': '+34 612 345 678', 'Curso': 'Medicina General', 'Estado': 'Activo', 'Fecha Inscripción': '2024-01-15', 'Notas': 'Estudiante destacada con excelente rendimiento académico.' }},
    { id: 'rec2', fields: { 'Nombre': 'Carlos Rodríguez Martín', 'Email': 'carlos.rodriguez@email.com', 'Teléfono': '+34 623 456 789', 'Curso': 'Enfermería', 'Estado': 'Activo', 'Fecha Inscripción': '2024-02-01', 'Notas': 'Interesado en especialización en urgencias.' }},
    { id: 'rec3', fields: { 'Nombre': 'Ana Martínez Sánchez', 'Email': 'ana.martinez@email.com', 'Teléfono': '+34 634 567 890', 'Curso': 'Farmacología', 'Estado': 'Activo', 'Fecha Inscripción': '2024-01-20', 'Notas': 'Experiencia previa en farmacia comunitaria.' }},
    { id: 'rec4', fields: { 'Nombre': 'Pedro Fernández Gil', 'Email': 'pedro.fernandez@email.com', 'Teléfono': '+34 645 678 901', 'Curso': 'Anatomía', 'Estado': 'Pendiente', 'Fecha Inscripción': '2024-03-01', 'Notas': 'Pendiente de documentación.' }},
    { id: 'rec5', fields: { 'Nombre': 'Laura Sánchez Ruiz', 'Email': 'laura.sanchez@email.com', 'Teléfono': '+34 656 789 012', 'Curso': 'Pediatría', 'Estado': 'Activo', 'Fecha Inscripción': '2024-01-10', 'Notas': 'Madre de dos hijos, muy motivada.' }},
    { id: 'rec6', fields: { 'Nombre': 'Javier López Torres', 'Email': 'javier.lopez@email.com', 'Teléfono': '+34 667 890 123', 'Curso': 'Medicina General', 'Estado': 'Inactivo', 'Fecha Inscripción': '2023-09-15', 'Notas': 'Licencia temporal por motivos personales.' }},
    { id: 'rec7', fields: { 'Nombre': 'Isabel Pérez Navarro', 'Email': 'isabel.perez@email.com', 'Teléfono': '+34 678 901 234', 'Curso': 'Enfermería', 'Estado': 'Activo', 'Fecha Inscripción': '2024-02-15', 'Notas': 'Transferencia desde otra institución.' }},
    { id: 'rec8', fields: { 'Nombre': 'Miguel Torres Vega', 'Email': 'miguel.torres@email.com', 'Teléfono': '+34 689 012 345', 'Curso': 'Farmacología', 'Estado': 'Activo', 'Fecha Inscripción': '2024-01-25', 'Notas': 'Becario del programa de excelencia.' }},
    { id: 'rec9', fields: { 'Nombre': 'Carmen Ruiz Molina', 'Email': 'carmen.ruiz@email.com', 'Teléfono': '+34 690 123 456', 'Curso': 'Anatomía', 'Estado': 'Activo', 'Fecha Inscripción': '2024-02-10', 'Notas': 'Interés en investigación.' }},
    { id: 'rec10', fields: { 'Nombre': 'David Navarro Cruz', 'Email': 'david.navarro@email.com', 'Teléfono': '+34 601 234 567', 'Curso': 'Pediatría', 'Estado': 'Pendiente', 'Fecha Inscripción': '2024-03-05', 'Notas': 'Esperando confirmación de matrícula.' }},
    { id: 'rec11', fields: { 'Nombre': 'Elena Vega Romero', 'Email': 'elena.vega@email.com', 'Teléfono': '+34 612 345 670', 'Curso': 'Medicina General', 'Estado': 'Activo', 'Fecha Inscripción': '2024-01-05', 'Notas': 'Mejor promedio del curso anterior.' }},
    { id: 'rec12', fields: { 'Nombre': 'Fernando Molina Herrero', 'Email': 'fernando.molina@email.com', 'Teléfono': '+34 623 456 781', 'Curso': 'Enfermería', 'Estado': 'Activo', 'Fecha Inscripción': '2024-02-20', 'Notas': 'Experiencia en hospitales.' }},
    { id: 'rec13', fields: { 'Nombre': 'Gloria Cruz Jiménez', 'Email': 'gloria.cruz@email.com', 'Teléfono': '+34 634 567 892', 'Curso': 'Farmacología', 'Estado': 'Inactivo', 'Fecha Inscripción': '2023-11-10', 'Notas': 'Baja temporal.' }},
    { id: 'rec14', fields: { 'Nombre': 'Hugo Romero Díaz', 'Email': 'hugo.romero@email.com', 'Teléfono': '+34 645 678 903', 'Curso': 'Anatomía', 'Estado': 'Activo', 'Fecha Inscripción': '2024-01-30', 'Notas': 'Aspirante a cirujano.' }},
    { id: 'rec15', fields: { 'Nombre': 'Irene Herrero Blanco', 'Email': 'irene.herrero@email.com', 'Teléfono': '+34 656 789 014', 'Curso': 'Pediatría', 'Estado': 'Activo', 'Fecha Inscripción': '2024-02-05', 'Notas': 'Voluntariado en UNICEF.' }}
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a unique ID for demo records
 */
function generateId() {
    return 'rec' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Get current time formatted
 */
function getCurrentTime() {
    return new Date().toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

/**
 * Debounce function for search
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Fetch table schema from Airtable
 */
async function fetchSchema() {
    if (CONFIG.DEMO_MODE) {
        state.schema = DEMO_SCHEMA;
        return DEMO_SCHEMA;
    }
    
    try {
        const response = await fetch(
            `${CONFIG.API_BASE_URL}/${CONFIG.BASE_ID}/${CONFIG.TABLE_NAME}?maxRecords=1`,
            {
                headers: {
                    'Authorization': `Bearer ${CONFIG.API_KEY}`
                }
            }
        );
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        // Infer schema from first record
        if (data.records && data.records.length > 0) {
            state.schema = Object.keys(data.records[0].fields).map(name => ({
                name,
                type: inferFieldType(data.records[0].fields[name])
            }));
        }
        return state.schema;
    } catch (error) {
        console.error('Error fetching schema:', error);
        showToast('error', 'Error', 'No se pudo cargar el esquema de la tabla');
        throw error;
    }
}

/**
 * Infer field type from value
 */
function inferFieldType(value) {
    if (value === null || value === undefined) return 'singleLineText';
    if (typeof value === 'boolean') return 'checkbox';
    if (typeof value === 'number') return 'number';
    if (Array.isArray(value)) return 'multipleSelect';
    if (typeof value === 'string') {
        if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
        if (value.includes('@')) return 'email';
        if (/^\+?\d[\d\s-]+$/.test(value)) return 'phoneNumber';
        if (value.includes('\n')) return 'multilineText';
    }
    return 'singleLineText';
}

/**
 * Fetch all records from Airtable
 */
async function fetchRecords() {
    showLoading(true);
    
    if (CONFIG.DEMO_MODE) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        state.records = [...DEMO_DATA];
        applyFilters();
        showLoading(false);
        updateStats();
        return state.records;
    }
    
    try {
        let allRecords = [];
        let offset = null;
        
        do {
            const url = new URL(`${CONFIG.API_BASE_URL}/${CONFIG.BASE_ID}/${CONFIG.TABLE_NAME}`);
            url.searchParams.append('maxRecords', CONFIG.MAX_RECORDS_PER_REQUEST);
            if (offset) {
                url.searchParams.append('offset', offset);
            }
            
            const response = await fetch(url.toString(), {
                headers: {
                    'Authorization': `Bearer ${CONFIG.API_KEY}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            const data = await response.json();
            allRecords = allRecords.concat(data.records);
            offset = data.offset;
        } while (offset);
        
        state.records = allRecords;
        applyFilters();
        showLoading(false);
        updateStats();
        return state.records;
    } catch (error) {
        console.error('Error fetching records:', error);
        showLoading(false);
        showToast('error', 'Error', 'No se pudieron cargar los registros');
        throw error;
    }
}

/**
 * Create a new record
 */
async function createRecord(fields) {
    if (CONFIG.DEMO_MODE) {
        await new Promise(resolve => setTimeout(resolve, 300));
        const newRecord = {
            id: generateId(),
            fields: { ...fields }
        };
        state.records.unshift(newRecord);
        applyFilters();
        updateStats();
        return newRecord;
    }
    
    try {
        const response = await fetch(
            `${CONFIG.API_BASE_URL}/${CONFIG.BASE_ID}/${CONFIG.TABLE_NAME}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${CONFIG.API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fields })
            }
        );
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const newRecord = await response.json();
        state.records.unshift(newRecord);
        applyFilters();
        updateStats();
        return newRecord;
    } catch (error) {
        console.error('Error creating record:', error);
        showToast('error', 'Error', 'No se pudo crear el registro');
        throw error;
    }
}

/**
 * Update an existing record
 */
async function updateRecord(recordId, fields) {
    if (CONFIG.DEMO_MODE) {
        await new Promise(resolve => setTimeout(resolve, 300));
        const index = state.records.findIndex(r => r.id === recordId);
        if (index !== -1) {
            state.records[index].fields = { ...state.records[index].fields, ...fields };
        }
        applyFilters();
        return state.records[index];
    }
    
    try {
        const response = await fetch(
            `${CONFIG.API_BASE_URL}/${CONFIG.BASE_ID}/${CONFIG.TABLE_NAME}/${recordId}`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${CONFIG.API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fields })
            }
        );
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const updatedRecord = await response.json();
        const index = state.records.findIndex(r => r.id === recordId);
        if (index !== -1) {
            state.records[index] = updatedRecord;
        }
        applyFilters();
        return updatedRecord;
    } catch (error) {
        console.error('Error updating record:', error);
        showToast('error', 'Error', 'No se pudo actualizar el registro');
        throw error;
    }
}

/**
 * Delete a record
 */
async function deleteRecord(recordId) {
    if (CONFIG.DEMO_MODE) {
        await new Promise(resolve => setTimeout(resolve, 300));
        state.records = state.records.filter(r => r.id !== recordId);
        applyFilters();
        updateStats();
        return true;
    }
    
    try {
        const response = await fetch(
            `${CONFIG.API_BASE_URL}/${CONFIG.BASE_ID}/${CONFIG.TABLE_NAME}/${recordId}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${CONFIG.API_KEY}`
                }
            }
        );
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        state.records = state.records.filter(r => r.id !== recordId);
        applyFilters();
        updateStats();
        return true;
    } catch (error) {
        console.error('Error deleting record:', error);
        showToast('error', 'Error', 'No se pudo eliminar el registro');
        throw error;
    }
}

// ============================================================================
// UI RENDERING FUNCTIONS
// ============================================================================

/**
 * Show/hide loading state
 */
function showLoading(show) {
    const loadingState = document.getElementById('loadingState');
    const tableView = document.getElementById('tableView');
    const gridView = document.getElementById('gridView');
    const emptyState = document.getElementById('emptyState');
    
    if (show) {
        loadingState.classList.remove('hidden');
        tableView.classList.add('hidden');
        gridView.classList.add('hidden');
        emptyState.classList.add('hidden');
    } else {
        loadingState.classList.add('hidden');
    }
}

/**
 * Render table headers
 */
function renderTableHeaders() {
    const tableHeader = document.getElementById('tableHeader');
    
    let html = '<th class="px-6 py-4 w-12"><input type="checkbox" id="selectAll" class="w-4 h-4 text-umbramed-600 bg-gray-700 border-gray-600 rounded focus:ring-umbramed-500"></th>';
    
    state.schema.forEach(field => {
        const sortIcon = state.sortField === field.name 
            ? (state.sortDirection === 'asc' ? '↑' : '↓') 
            : '';
        html += `
            <th class="px-6 py-4 cursor-pointer hover:bg-gray-700 transition-colors" onclick="sortBy('${escapeHtml(field.name)}')">
                <div class="flex items-center gap-2">
                    <span>${escapeHtml(field.name)}</span>
                    <span class="text-umbramed-400">${sortIcon}</span>
                </div>
            </th>
        `;
    });
    
    html += '<th class="px-6 py-4 text-right">Acciones</th>';
    
    tableHeader.innerHTML = html;
    
    // Add select all handler
    document.getElementById('selectAll').addEventListener('change', function() {
        const checkboxes = document.querySelectorAll('.row-checkbox');
        checkboxes.forEach(cb => cb.checked = this.checked);
    });
}

/**
 * Render table rows
 */
function renderTableRows() {
    const tableBody = document.getElementById('tableBody');
    const tableView = document.getElementById('tableView');
    const emptyState = document.getElementById('emptyState');
    
    const startIndex = (state.currentPage - 1) * state.pageSize;
    const endIndex = startIndex + state.pageSize;
    const pageRecords = state.filteredRecords.slice(startIndex, endIndex);
    
    if (pageRecords.length === 0) {
        tableView.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }
    
    tableView.classList.remove('hidden');
    emptyState.classList.add('hidden');
    
    let html = '';
    
    pageRecords.forEach((record, index) => {
        html += `
            <tr class="table-row-hover transition-colors" style="animation-delay: ${index * 50}ms">
                <td class="px-6 py-4">
                    <input type="checkbox" class="row-checkbox w-4 h-4 text-umbramed-600 bg-gray-700 border-gray-600 rounded focus:ring-umbramed-500" data-id="${escapeHtml(record.id)}">
                </td>
        `;
        
        state.schema.forEach(field => {
            const value = record.fields[field.name];
            html += `<td class="px-6 py-4">${renderFieldValue(value, field)}</td>`;
        });
        
        html += `
                <td class="px-6 py-4">
                    <div class="flex items-center justify-end gap-2">
                        <button onclick="openEditModal('${escapeHtml(record.id)}')" 
                                class="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded-lg transition-colors"
                                title="Editar">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                        </button>
                        <button onclick="openDeleteModal('${escapeHtml(record.id)}')" 
                                class="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
                                title="Eliminar">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

/**
 * Render field value based on type
 */
function renderFieldValue(value, field) {
    if (value === null || value === undefined || value === '') {
        return '<span class="text-gray-500">—</span>';
    }
    
    switch (field.type) {
        case 'date':
            return `<span class="text-gray-300">${formatDate(value)}</span>`;
        
        case 'email':
            return `<a href="mailto:${escapeHtml(value)}" class="text-umbramed-400 hover:text-umbramed-300 hover:underline">${escapeHtml(value)}</a>`;
        
        case 'phoneNumber':
            return `<a href="tel:${escapeHtml(value)}" class="text-gray-300 hover:text-white">${escapeHtml(value)}</a>`;
        
        case 'singleSelect':
            const colors = {
                'Activo': 'bg-green-500/20 text-green-400 border-green-500/30',
                'Inactivo': 'bg-red-500/20 text-red-400 border-red-500/30',
                'Pendiente': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
            };
            const colorClass = colors[value] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
            return `<span class="px-2.5 py-1 text-xs font-medium rounded-full border ${colorClass}">${escapeHtml(value)}</span>`;
        
        case 'multilineText':
            const truncated = String(value).length > 50 ? String(value).substring(0, 50) + '...' : value;
            return `<span class="text-gray-300" title="${escapeHtml(value)}">${escapeHtml(truncated)}</span>`;
        
        case 'checkbox':
            return value 
                ? '<span class="text-green-400">✓</span>' 
                : '<span class="text-gray-500">✗</span>';
        
        default:
            return `<span class="text-gray-300">${escapeHtml(value)}</span>`;
    }
}

/**
 * Render grid view cards
 */
function renderGridView() {
    const gridContainer = document.getElementById('gridContainer');
    const gridView = document.getElementById('gridView');
    const emptyState = document.getElementById('emptyState');
    
    const startIndex = (state.currentPage - 1) * state.pageSize;
    const endIndex = startIndex + state.pageSize;
    const pageRecords = state.filteredRecords.slice(startIndex, endIndex);
    
    if (pageRecords.length === 0) {
        gridView.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }
    
    gridView.classList.remove('hidden');
    emptyState.classList.add('hidden');
    
    let html = '';
    
    pageRecords.forEach((record, index) => {
        const nombre = record.fields['Nombre'] || 'Sin nombre';
        const email = record.fields['Email'] || '';
        const curso = record.fields['Curso'] || '';
        const estado = record.fields['Estado'] || '';
        
        const statusColors = {
            'Activo': 'bg-green-500',
            'Inactivo': 'bg-red-500',
            'Pendiente': 'bg-yellow-500'
        };
        const statusColor = statusColors[estado] || 'bg-gray-500';
        
        html += `
            <div class="bg-gray-750 rounded-xl border border-gray-700 overflow-hidden hover:border-umbramed-500/50 transition-all duration-300 animate-fadeIn" style="animation-delay: ${index * 50}ms">
                <div class="p-5">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 bg-gradient-to-br from-umbramed-500 to-umbramed-700 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                                ${escapeHtml(nombre.charAt(0))}
                            </div>
                            <div>
                                <h4 class="font-semibold text-white">${escapeHtml(nombre)}</h4>
                                <p class="text-sm text-gray-400">${escapeHtml(email)}</p>
                            </div>
                        </div>
                        <div class="w-3 h-3 rounded-full ${statusColor}"></div>
                    </div>
                    
                    <div class="space-y-2 mb-4">
                        <div class="flex items-center gap-2 text-sm">
                            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                            </svg>
                            <span class="text-gray-300">${escapeHtml(curso)}</span>
                        </div>
                        <div class="flex items-center gap-2 text-sm">
                            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <span class="text-gray-300">${escapeHtml(estado)}</span>
                        </div>
                    </div>
                    
                    <div class="flex items-center justify-end gap-2 pt-4 border-t border-gray-700">
                        <button onclick="openEditModal('${escapeHtml(record.id)}')" 
                                class="px-3 py-1.5 text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded-lg transition-colors">
                            Editar
                        </button>
                        <button onclick="openDeleteModal('${escapeHtml(record.id)}')" 
                                class="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors">
                            Eliminar
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    gridContainer.innerHTML = html;
}

/**
 * Render pagination
 */
function renderPagination() {
    const pagination = document.getElementById('pagination');
    const totalPages = Math.ceil(state.filteredRecords.length / state.pageSize);
    
    // Update showing info
    const startIndex = (state.currentPage - 1) * state.pageSize + 1;
    const endIndex = Math.min(state.currentPage * state.pageSize, state.filteredRecords.length);
    
    document.getElementById('showingStart').textContent = state.filteredRecords.length > 0 ? startIndex : 0;
    document.getElementById('showingEnd').textContent = endIndex;
    document.getElementById('showingTotal').textContent = state.filteredRecords.length;
    
    let html = '';
    
    // Previous button
    html += `
        <button onclick="goToPage(${state.currentPage - 1})" 
                class="p-2 rounded-lg ${state.currentPage === 1 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-gray-700'} transition-colors"
                ${state.currentPage === 1 ? 'disabled' : ''}>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
        </button>
    `;
    
    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, state.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
        html += `<button onclick="goToPage(1)" class="px-3 py-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">1</button>`;
        if (startPage > 2) {
            html += `<span class="px-2 text-gray-600">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `
            <button onclick="goToPage(${i})" 
                    class="px-3 py-1 rounded-lg ${i === state.currentPage ? 'bg-umbramed-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'} transition-colors">
                ${i}
            </button>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span class="px-2 text-gray-600">...</span>`;
        }
        html += `<button onclick="goToPage(${totalPages})" class="px-3 py-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">${totalPages}</button>`;
    }
    
    // Next button
    html += `
        <button onclick="goToPage(${state.currentPage + 1})" 
                class="p-2 rounded-lg ${state.currentPage === totalPages || totalPages === 0 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-gray-700'} transition-colors"
                ${state.currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
        </button>
    `;
    
    pagination.innerHTML = html;
}

/**
 * Render form fields dynamically
 */
function renderFormFields(record = null) {
    const formFields = document.getElementById('formFields');
    let html = '';
    
    state.schema.forEach(field => {
        const value = record ? record.fields[field.name] || '' : '';
        const fieldId = `field_${field.name.replace(/\s+/g, '_')}`;
        
        html += `<div class="mb-4">`;
        html += `<label for="${fieldId}" class="block text-sm font-medium text-gray-300 mb-2">${escapeHtml(field.name)}</label>`;
        
        switch (field.type) {
            case 'multilineText':
                html += `
                    <textarea id="${fieldId}" name="${escapeHtml(field.name)}" rows="3"
                              class="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-umbramed-500 focus:border-transparent transition-all resize-none"
                              placeholder="Ingrese ${escapeHtml(field.name).toLowerCase()}...">${escapeHtml(value)}</textarea>
                `;
                break;
            
            case 'singleSelect':
                html += `
                    <select id="${fieldId}" name="${escapeHtml(field.name)}"
                            class="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-umbramed-500 focus:border-transparent transition-all">
                        <option value="">Seleccionar...</option>
                `;
                if (field.options) {
                    field.options.forEach(option => {
                        const selected = option === value ? 'selected' : '';
                        html += `<option value="${escapeHtml(option)}" ${selected}>${escapeHtml(option)}</option>`;
                    });
                }
                html += `</select>`;
                break;
            
            case 'date':
                html += `
                    <input type="date" id="${fieldId}" name="${escapeHtml(field.name)}" value="${escapeHtml(value)}"
                           class="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-umbramed-500 focus:border-transparent transition-all">
                `;
                break;
            
            case 'email':
                html += `
                    <input type="email" id="${fieldId}" name="${escapeHtml(field.name)}" value="${escapeHtml(value)}"
                           class="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-umbramed-500 focus:border-transparent transition-all"
                           placeholder="ejemplo@email.com">
                `;
                break;
            
            case 'phoneNumber':
                html += `
                    <input type="tel" id="${fieldId}" name="${escapeHtml(field.name)}" value="${escapeHtml(value)}"
                           class="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-umbramed-500 focus:border-transparent transition-all"
                           placeholder="+34 XXX XXX XXX">
                `;
                break;
            
            case 'number':
                html += `
                    <input type="number" id="${fieldId}" name="${escapeHtml(field.name)}" value="${escapeHtml(value)}"
                           class="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-umbramed-500 focus:border-transparent transition-all"
                           placeholder="0">
                `;
                break;
            
            case 'checkbox':
                html += `
                    <label class="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" id="${fieldId}" name="${escapeHtml(field.name)}" ${value ? 'checked' : ''}
                               class="w-5 h-5 text-umbramed-600 bg-gray-700 border-gray-600 rounded focus:ring-umbramed-500">
                        <span class="text-gray-300">Activar</span>
                    </label>
                `;
                break;
            
            default:
                html += `
                    <input type="text" id="${fieldId}" name="${escapeHtml(field.name)}" value="${escapeHtml(value)}"
                           class="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-umbramed-500 focus:border-transparent transition-all"
                           placeholder="Ingrese ${escapeHtml(field.name).toLowerCase()}...">
                `;
        }
        
        html += `</div>`;
    });
    
    formFields.innerHTML = html;
}

/**
 * Update course filter options
 */
function updateCourseFilter() {
    const filterCourse = document.getElementById('filterCourse');
    const courses = new Set();
    
    state.records.forEach(record => {
        const course = record.fields['Curso'];
        if (course) courses.add(course);
    });
    
    let html = '<option value="">Todos los cursos</option>';
    Array.from(courses).sort().forEach(course => {
        html += `<option value="${escapeHtml(course)}">${escapeHtml(course)}</option>`;
    });
    
    filterCourse.innerHTML = html;
}

/**
 * Update statistics cards
 */
function updateStats() {
    document.getElementById('totalRecords').textContent = state.records.length;
    
    const activeCount = state.records.filter(r => r.fields['Estado'] === 'Activo').length;
    document.getElementById('activeStudents').textContent = activeCount;
    
    const courses = new Set(state.records.map(r => r.fields['Curso']).filter(Boolean));
    document.getElementById('totalCourses').textContent = courses.size;
    
    document.getElementById('lastUpdate').textContent = getCurrentTime();
}

// ============================================================================
// MODAL FUNCTIONS
// ============================================================================

/**
 * Open create modal
 */
function openCreateModal() {
    state.editingRecordId = null;
    document.getElementById('modalTitle').textContent = 'Nuevo Registro';
    document.getElementById('submitBtnText').textContent = 'Crear';
    document.getElementById('recordId').value = '';
    renderFormFields();
    openModal('formModal');
}

/**
 * Open edit modal
 */
function openEditModal(recordId) {
    const record = state.records.find(r => r.id === recordId);
    if (!record) return;
    
    state.editingRecordId = recordId;
    document.getElementById('modalTitle').textContent = 'Editar Registro';
    document.getElementById('submitBtnText').textContent = 'Guardar Cambios';
    document.getElementById('recordId').value = recordId;
    renderFormFields(record);
    openModal('formModal');
}

/**
 * Close form modal
 */
function closeFormModal() {
    closeModal('formModal');
    state.editingRecordId = null;
}

/**
 * Open delete confirmation modal
 */
function openDeleteModal(recordId) {
    document.getElementById('deleteRecordId').value = recordId;
    openModal('deleteModal');
}

/**
 * Close delete modal
 */
function closeDeleteModal() {
    closeModal('deleteModal');
}

/**
 * Open modal by ID
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
}

/**
 * Close modal by ID
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
}

/**
 * Confirm delete action
 */
async function confirmDelete() {
    const recordId = document.getElementById('deleteRecordId').value;
    
    try {
        await deleteRecord(recordId);
        closeDeleteModal();
        showToast('success', 'Eliminado', 'El registro ha sido eliminado correctamente');
        renderCurrentView();
    } catch (error) {
        console.error('Delete failed:', error);
    }
}

// ============================================================================
// FILTER AND SORT FUNCTIONS
// ============================================================================

/**
 * Apply all filters
 */
function applyFilters() {
    state.filteredRecords = state.records.filter(record => {
        // Search filter
        if (state.filters.search) {
            const searchLower = state.filters.search.toLowerCase();
            const matches = Object.values(record.fields).some(value => 
                String(value).toLowerCase().includes(searchLower)
            );
            if (!matches) return false;
        }
        
        // Status filter
        if (state.filters.status && record.fields['Estado'] !== state.filters.status) {
            return false;
        }
        
        // Course filter
        if (state.filters.course && record.fields['Curso'] !== state.filters.course) {
            return false;
        }
        
        return true;
    });
    
    // Apply sorting
    if (state.sortField) {
        state.filteredRecords.sort((a, b) => {
            const aVal = a.fields[state.sortField] || '';
            const bVal = b.fields[state.sortField] || '';
            
            const comparison = String(aVal).localeCompare(String(bVal));
            return state.sortDirection === 'asc' ? comparison : -comparison;
        });
    }
    
    // Reset to first page if current page is out of range
    const totalPages = Math.ceil(state.filteredRecords.length / state.pageSize);
    if (state.currentPage > totalPages) {
        state.currentPage = Math.max(1, totalPages);
    }
    
    renderCurrentView();
}

/**
 * Sort by field
 */
function sortBy(fieldName) {
    if (state.sortField === fieldName) {
        state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        state.sortField = fieldName;
        state.sortDirection = 'asc';
    }
    
    applyFilters();
    renderTableHeaders();
}

/**
 * Clear all filters
 */
function clearFilters() {
    state.filters = { search: '', status: '', course: '' };
    state.sortField = null;
    state.sortDirection = 'asc';
    
    document.getElementById('globalSearch').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterCourse').value = '';
    
    applyFilters();
    renderTableHeaders();
}

/**
 * Go to specific page
 */
function goToPage(page) {
    const totalPages = Math.ceil(state.filteredRecords.length / state.pageSize);
    if (page < 1 || page > totalPages) return;
    
    state.currentPage = page;
    renderCurrentView();
}

// ============================================================================
// VIEW FUNCTIONS
// ============================================================================

/**
 * Render current view (table or grid)
 */
function renderCurrentView() {
    const tableView = document.getElementById('tableView');
    const gridView = document.getElementById('gridView');
    
    if (state.viewMode === 'table') {
        tableView.classList.remove('hidden');
        gridView.classList.add('hidden');
        renderTableRows();
    } else {
        tableView.classList.add('hidden');
        gridView.classList.remove('hidden');
        renderGridView();
    }
    
    renderPagination();
}

/**
 * Switch to table view
 */
function switchToTableView() {
    state.viewMode = 'table';
    document.getElementById('viewTable').classList.add('bg-umbramed-600', 'text-white');
    document.getElementById('viewTable').classList.remove('bg-gray-700', 'text-gray-400');
    document.getElementById('viewGrid').classList.remove('bg-umbramed-600', 'text-white');
    document.getElementById('viewGrid').classList.add('bg-gray-700', 'text-gray-400');
    renderCurrentView();
}

/**
 * Switch to grid view
 */
function switchToGridView() {
    state.viewMode = 'grid';
    document.getElementById('viewGrid').classList.add('bg-umbramed-600', 'text-white');
    document.getElementById('viewGrid').classList.remove('bg-gray-700', 'text-gray-400');
    document.getElementById('viewTable').classList.remove('bg-umbramed-600', 'text-white');
    document.getElementById('viewTable').classList.add('bg-gray-700', 'text-gray-400');
    renderCurrentView();
}

// ============================================================================
// TOAST NOTIFICATIONS
// ============================================================================

/**
 * Show toast notification
 */
function showToast(type, title, message) {
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toastIcon');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    
    const icons = {
        success: `<svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>`,
        error: `<svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>`,
        warning: `<svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                  </svg>`,
        info: `<svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
               </svg>`
    };
    
    const bgColors = {
        success: 'bg-green-500/20',
        error: 'bg-red-500/20',
        warning: 'bg-yellow-500/20',
        info: 'bg-blue-500/20'
    };
    
    toastIcon.className = `w-8 h-8 rounded-lg flex items-center justify-center ${bgColors[type]}`;
    toastIcon.innerHTML = icons[type];
    toastTitle.textContent = title;
    toastMessage.textContent = message;
    
    toast.classList.remove('hidden');
    
    // Animate in
    setTimeout(() => {
        toast.classList.remove('translate-y-full', 'opacity-0');
    }, 10);
    
    // Auto hide after 4 seconds
    setTimeout(hideToast, 4000);
}

/**
 * Hide toast notification
 */
function hideToast() {
    const toast = document.getElementById('toast');
    toast.classList.add('translate-y-full', 'opacity-0');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 300);
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Handle form submission
 */
async function handleFormSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const fields = {};
    
    state.schema.forEach(field => {
        const fieldId = `field_${field.name.replace(/\s+/g, '_')}`;
        const element = document.getElementById(fieldId);
        
        if (element) {
            if (field.type === 'checkbox') {
                fields[field.name] = element.checked;
            } else {
                const value = element.value.trim();
                if (value) {
                    fields[field.name] = value;
                }
            }
        }
    });
    
    try {
        if (state.editingRecordId) {
            await updateRecord(state.editingRecordId, fields);
            showToast('success', 'Actualizado', 'El registro ha sido actualizado correctamente');
        } else {
            await createRecord(fields);
            showToast('success', 'Creado', 'El registro ha sido creado correctamente');
        }
        
        closeFormModal();
        renderCurrentView();
    } catch (error) {
        console.error('Form submission failed:', error);
    }
}

/**
 * Handle search input
 */
const handleSearch = debounce(function(value) {
    state.filters.search = value;
    state.currentPage = 1;
    applyFilters();
}, 300);

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the application
 */
async function init() {
    console.log('🏫 Umbramed Academy - Initializing...');
    
    // Fetch schema and records
    await fetchSchema();
    await fetchRecords();
    
    // Render initial UI
    renderTableHeaders();
    updateCourseFilter();
    renderCurrentView();
    
    // Setup event listeners
    setupEventListeners();
    
    console.log('✅ Umbramed Academy - Ready!');
    showToast('success', 'Bienvenido', 'Umbramed Academy cargado correctamente');
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Add new button
    document.getElementById('addNewBtn').addEventListener('click', openCreateModal);
    
    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', async () => {
        await fetchRecords();
        showToast('info', 'Actualizado', 'Los datos han sido actualizados');
    });
    
    // Form submission
    document.getElementById('recordForm').addEventListener('submit', handleFormSubmit);
    
    // Search
    document.getElementById('globalSearch').addEventListener('input', (e) => {
        handleSearch(e.target.value);
    });
    
    // Status filter
    document.getElementById('filterStatus').addEventListener('change', (e) => {
        state.filters.status = e.target.value;
        state.currentPage = 1;
        applyFilters();
    });
    
    // Course filter
    document.getElementById('filterCourse').addEventListener('change', (e) => {
        state.filters.course = e.target.value;
        state.currentPage = 1;
        applyFilters();
    });
    
    // Clear filters
    document.getElementById('clearFilters').addEventListener('click', clearFilters);
    
    // Page size
    document.getElementById('pageSize').addEventListener('change', (e) => {
        state.pageSize = parseInt(e.target.value);
        state.currentPage = 1;
        renderCurrentView();
    });
    
    // View toggles
    document.getElementById('viewTable').addEventListener('click', switchToTableView);
    document.getElementById('viewGrid').addEventListener('click', switchToGridView);
    
    // Close modals on backdrop click
    document.getElementById('formModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeFormModal();
    });
    document.getElementById('deleteModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeDeleteModal();
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeFormModal();
            closeDeleteModal();
        }
        
        // Ctrl/Cmd + N for new record
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            openCreateModal();
        }
        
        // Ctrl/Cmd + F for search focus
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            document.getElementById('globalSearch').focus();
        }
    });
}

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', init);
