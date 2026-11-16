/**
 * Employee Management System - CRUD Operations
 * Connected to Live API: https://my-api-emp.runasp.net
 */

const API_BASE_URL = "https://my-api-emp.runasp.net/api/Employee";

// Application State
let employeesList = [];
let deleteTargetId = null;
let isSubmitting = false;

// DOM Elements
const employeeTable = document.getElementById("employeeTable");
const totalEmployees = document.getElementById("totalEmployees");
const recordCount = document.getElementById("recordCount");
const statusText = document.getElementById("status");
const refreshBtn = document.getElementById("refreshBtn");
const addBtn = document.getElementById("addBtn");
const searchInput = document.getElementById("searchInput");
const clearSearchBtn = document.getElementById("clearSearchBtn");

// Employee Form Modal Elements
const employeeModal = document.getElementById("employeeModal");
const employeeForm = document.getElementById("employeeForm");
const modalTitle = document.getElementById("modalTitle");
const employeeIdInput = document.getElementById("employeeId");
const employeeNameInput = document.getElementById("employeeName");
const employeeDepartmentInput = document.getElementById("employeeDepartment");
const formError = document.getElementById("formError");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelModalBtn = document.getElementById("cancelModalBtn");
const saveEmployeeBtn = document.getElementById("saveEmployeeBtn");
const saveBtnSpinner = document.getElementById("saveBtnSpinner");
const saveBtnText = document.getElementById("saveBtnText");

// Delete Modal Elements
const deleteModal = document.getElementById("deleteModal");
const deleteEmpName = document.getElementById("deleteEmpName");
const deleteEmpId = document.getElementById("deleteEmpId");
const closeDeleteModalBtn = document.getElementById("closeDeleteModalBtn");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const deleteBtnSpinner = document.getElementById("deleteBtnSpinner");
const deleteBtnText = document.getElementById("deleteBtnText");

// Toast Container
const toastContainer = document.getElementById("toastContainer");

// ==========================================
// Event Listeners
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    loadEmployees();

    refreshBtn.addEventListener("click", () => {
        loadEmployees(true);
    });

    addBtn.addEventListener("click", openAddModal);

    closeModalBtn.addEventListener("click", closeEmployeeModal);
    cancelModalBtn.addEventListener("click", closeEmployeeModal);
    employeeForm.addEventListener("submit", handleFormSubmit);

    closeDeleteModalBtn.addEventListener("click", closeDeleteModal);
    cancelDeleteBtn.addEventListener("click", closeDeleteModal);
    confirmDeleteBtn.addEventListener("click", handleDeleteConfirm);

    // Search input
    searchInput.addEventListener("input", handleSearch);
    clearSearchBtn.addEventListener("click", () => {
        searchInput.value = "";
        clearSearchBtn.style.display = "none";
        renderTable(employeesList);
    });

    // Close modal on backdrop click
    employeeModal.addEventListener("click", (e) => {
        if (e.target === employeeModal) closeEmployeeModal();
    });
    deleteModal.addEventListener("click", (e) => {
        if (e.target === deleteModal) closeDeleteModal();
    });

    // Keyboard shortcuts (Escape key closes modals)
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            if (employeeModal.classList.contains("active")) closeEmployeeModal();
            if (deleteModal.classList.contains("active")) closeDeleteModal();
        }
    });
});

// ==========================================
// API Operations (CRUD)
// ==========================================

/**
 * READ: Fetch all employees from API
 */
async function loadEmployees(showToastOnSuccess = false) {
    refreshBtn.disabled = true;
    statusText.textContent = "Loading...";

    employeeTable.replaceChildren();
    const loadingRow = document.createElement("tr");
    loadingRow.innerHTML = `
        <td colspan="4" class="message">
            <div class="spinner"></div>
            <p>Loading employees from API...</p>
        </td>
    `;
    employeeTable.appendChild(loadingRow);

    try {
        const response = await fetch(API_BASE_URL);

        if (!response.ok) {
            throw new Error(`Server returned HTTP ${response.status} (${response.statusText})`);
        }

        const data = await response.json();
        employeesList = Array.isArray(data) ? data : (data.data || []);

        totalEmployees.textContent = employeesList.length;
        statusText.textContent = `Updated at ${new Date().toLocaleTimeString()}`;

        renderTable(employeesList);

        if (showToastOnSuccess) {
            showToast("Employee list refreshed successfully", "info");
        }
    } catch (error) {
        console.error("API Fetch Error:", error);
        totalEmployees.textContent = "0";
        statusText.textContent = "Failed to load";
        renderErrorState("Could not connect to API. Please check your internet or API server status.");
        showToast("Error loading employees: " + error.message, "error");
    } finally {
        refreshBtn.disabled = false;
    }
}

/**
 * CREATE / UPDATE: Submit Employee Form
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return;

    hideFormError();

    const id = employeeIdInput.value.trim();
    const name = employeeNameInput.value.trim();
    const department = employeeDepartmentInput.value.trim();

    // Client-side validation per API spec
    if (name.length < 2 || name.length > 50) {
        showFormError("Name must be between 2 and 50 characters.");
        return;
    }
    if (department.length < 2 || department.length > 100) {
        showFormError("Department must be between 2 and 100 characters.");
        return;
    }

    const payload = {
        name: name,
        department: department
    };

    setFormSubmitting(true);

    try {
        if (id) {
            // UPDATE (PUT /api/Employee/{id})
            const response = await fetch(`${API_BASE_URL}/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || `Update failed with status ${response.status}`);
            }

            showToast(`Employee "${name}" updated successfully!`, "success");
        } else {
            // CREATE (POST /api/Employee)
            const response = await fetch(API_BASE_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || `Creation failed with status ${response.status}`);
            }

            showToast(`Employee "${name}" added successfully!`, "success");
        }

        closeEmployeeModal();
        await loadEmployees();
    } catch (error) {
        console.error("Save error:", error);
        showFormError(error.message || "Failed to save employee. Please try again.");
        showToast("Operation failed: " + error.message, "error");
    } finally {
        setFormSubmitting(false);
    }
}

/**
 * DELETE: Confirm & Delete Employee
 */
async function handleDeleteConfirm() {
    if (!deleteTargetId || isSubmitting) return;

    setDeleteSubmitting(true);

    try {
        const response = await fetch(`${API_BASE_URL}/${deleteTargetId}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText || `Delete failed with status ${response.status}`);
        }

        showToast(`Employee (ID: ${deleteTargetId}) deleted successfully.`, "success");
        closeDeleteModal();
        await loadEmployees();
    } catch (error) {
        console.error("Delete error:", error);
        showToast("Failed to delete employee: " + error.message, "error");
    } finally {
        setDeleteSubmitting(false);
    }
}

// ==========================================
// UI Rendering
// ==========================================

function renderTable(list) {
    employeeTable.replaceChildren();

    if (!list || list.length === 0) {
        const emptyRow = document.createElement("tr");
        emptyRow.innerHTML = `
            <td colspan="4" class="message">
                <p>No employees found.</p>
            </td>
        `;
        employeeTable.appendChild(emptyRow);
        recordCount.textContent = "0 items";
        return;
    }

    recordCount.textContent = `${list.length} item${list.length === 1 ? "" : "s"}`;

    list.forEach((emp) => {
        const row = document.createElement("tr");

        // ID column
        const idCell = document.createElement("td");
        const idBadge = document.createElement("span");
        idBadge.className = "emp-id-badge";
        idBadge.textContent = `#${emp.id}`;
        idCell.appendChild(idBadge);

        // Name column
        const nameCell = document.createElement("td");
        const nameSpan = document.createElement("span");
        nameSpan.className = "emp-name-text";
        nameSpan.textContent = emp.name;
        nameCell.appendChild(nameSpan);

        // Department column
        const deptCell = document.createElement("td");
        const deptBadge = document.createElement("span");
        deptBadge.className = "department-badge";
        deptBadge.textContent = emp.department || "General";
        deptCell.appendChild(deptBadge);

        // Actions column
        const actionCell = document.createElement("td");
        const actionWrapper = document.createElement("div");
        actionWrapper.className = "actions-cell";

        const editBtn = document.createElement("button");
        editBtn.className = "btn btn-sm btn-edit";
        editBtn.innerHTML = "✏️ Edit";
        editBtn.title = "Edit Employee";
        editBtn.addEventListener("click", () => openEditModal(emp));

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "btn btn-sm btn-delete";
        deleteBtn.innerHTML = "🗑️ Delete";
        deleteBtn.title = "Delete Employee";
        deleteBtn.addEventListener("click", () => openDeleteModal(emp));

        actionWrapper.append(editBtn, deleteBtn);
        actionCell.appendChild(actionWrapper);

        row.append(idCell, nameCell, deptCell, actionCell);
        employeeTable.appendChild(row);
    });
}

function renderErrorState(message) {
    employeeTable.replaceChildren();
    const errorRow = document.createElement("tr");
    errorRow.innerHTML = `
        <td colspan="4" class="message" style="color: #dc2626;">
            <p>⚠️ ${escapeHtml(message)}</p>
        </td>
    `;
    employeeTable.appendChild(errorRow);
    recordCount.textContent = "Error";
}

// Search Filter
function handleSearch() {
    const query = searchInput.value.trim().toLowerCase();
    clearSearchBtn.style.display = query ? "block" : "none";

    if (!query) {
        renderTable(employeesList);
        return;
    }

    const filtered = employeesList.filter((emp) => {
        const nameMatch = emp.name && emp.name.toLowerCase().includes(query);
        const deptMatch = emp.department && emp.department.toLowerCase().includes(query);
        const idMatch = emp.id && emp.id.toString().includes(query);
        return nameMatch || deptMatch || idMatch;
    });

    renderTable(filtered);
}

// ==========================================
// Modal Handlers
// ==========================================

function openAddModal() {
    modalTitle.textContent = "Add New Employee";
    saveBtnText.textContent = "Save Employee";
    employeeIdInput.value = "";
    employeeNameInput.value = "";
    employeeDepartmentInput.value = "";
    hideFormError();
    employeeModal.classList.add("active");
    employeeModal.setAttribute("aria-hidden", "false");
    setTimeout(() => employeeNameInput.focus(), 100);
}

function openEditModal(emp) {
    modalTitle.textContent = "Edit Employee";
    saveBtnText.textContent = "Update Employee";
    employeeIdInput.value = emp.id;
    employeeNameInput.value = emp.name || "";
    employeeDepartmentInput.value = emp.department || "";
    hideFormError();
    employeeModal.classList.add("active");
    employeeModal.setAttribute("aria-hidden", "false");
    setTimeout(() => employeeNameInput.focus(), 100);
}

function closeEmployeeModal() {
    if (isSubmitting) return;
    employeeModal.classList.remove("active");
    employeeModal.setAttribute("aria-hidden", "true");
    hideFormError();
}

function openDeleteModal(emp) {
    deleteTargetId = emp.id;
    deleteEmpName.textContent = emp.name;
    deleteEmpId.textContent = emp.id;
    deleteModal.classList.add("active");
    deleteModal.setAttribute("aria-hidden", "false");
}

function closeDeleteModal() {
    if (isSubmitting) return;
    deleteTargetId = null;
    deleteModal.classList.remove("active");
    deleteModal.setAttribute("aria-hidden", "true");
}

function showFormError(msg) {
    formError.textContent = msg;
    formError.style.display = "block";
}

function hideFormError() {
    formError.textContent = "";
    formError.style.display = "none";
}

function setFormSubmitting(loading) {
    isSubmitting = loading;
    saveEmployeeBtn.disabled = loading;
    cancelModalBtn.disabled = loading;
    closeModalBtn.disabled = loading;
    saveBtnSpinner.style.display = loading ? "inline-block" : "none";
}

function setDeleteSubmitting(loading) {
    isSubmitting = loading;
    confirmDeleteBtn.disabled = loading;
    cancelDeleteBtn.disabled = loading;
    closeDeleteModalBtn.disabled = loading;
    deleteBtnSpinner.style.display = loading ? "inline-block" : "none";
}

// ==========================================
// Notification Toast
// ==========================================

function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    let icon = "ℹ️";
    if (type === "success") icon = "✅";
    if (type === "error") icon = "❌";

    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add("show");
    });

    // Auto dismiss
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => {
            if (toast.parentElement) toast.parentElement.removeChild(toast);
        }, 300);
    }, 4000);
}

function escapeHtml(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
