const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const priorityInput = document.getElementById("priorityInput");
const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");

const totalTasks = document.getElementById("totalTasks");
const completedTasks = document.getElementById("completedTasks");
const pendingTasks = document.getElementById("pendingTasks");

const taskCount = document.getElementById("taskCount");
const progressText = document.getElementById("progressText");
const progressBar = document.getElementById("progressBar");

const clearCompletedButton = document.getElementById("clearCompleted");
const filterButtons = document.querySelectorAll(".filter");

let tasks = [];

let currentFilter = "all";
let editingId = null;

// Safely load previously saved tasks.
try {
    const savedTasks = JSON.parse(
        localStorage.getItem("taskflow_tasks") || "[]"
    );

    if (Array.isArray(savedTasks)) {
        tasks = savedTasks.filter(task =>
            task &&
            typeof task.id === "string" &&
            typeof task.title === "string" &&
            ["Low", "Medium", "High"].includes(task.priority) &&
            typeof task.completed === "boolean"
        );
    }
} catch (error) {
    tasks = [];
}

// Display today's date.
function displayDate() {
    const now = new Date();

    document.getElementById("day").textContent =
        now.toLocaleDateString("en-US", { weekday: "long" });

    document.getElementById("date").textContent =
        now.toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
}

// Save tasks in the browser.
function saveTasks() {
    try {
        localStorage.setItem(
            "taskflow_tasks",
            JSON.stringify(tasks)
        );
    } catch (error) {
        alert("Unable to save tasks. Check your browser storage.");
    }
}

// Add a task.
taskForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const title = taskInput.value.trim();
    const priority = priorityInput.value;

    if (!title) {
        taskInput.focus();
        return;
    }

    if (editingId !== null) {
        tasks = tasks.map(task =>
            task.id === editingId
                ? { ...task, title, priority }
                : task
        );

        editingId = null;
        document.getElementById("addButton").textContent = "+ Add Task";
    } else {
        const newTask = {
            id: createId(),
            title: title,
            priority: priority,
            completed: false,
            createdAt: new Date().toISOString()
        };

        tasks.unshift(newTask);
    }

    saveTasks();

    taskForm.reset();
    priorityInput.value = "Medium";

    renderTasks();
    taskInput.focus();
});

// Create a unique task ID.
function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }

    return Date.now().toString() + Math.random().toString(36).slice(2);
}

// Create task elements safely.
function renderTasks() {
    taskList.replaceChildren();

    const visibleTasks = tasks.filter(task => {
        if (currentFilter === "pending") {
            return !task.completed;
        }

        if (currentFilter === "completed") {
            return task.completed;
        }

        return true;
    });

    visibleTasks.forEach(task => {
        const item = document.createElement("article");
        item.className = "task-item";

        if (task.completed) {
            item.classList.add("completed");
        }

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "task-checkbox";
        checkbox.checked = task.completed;
        checkbox.setAttribute("aria-label", "Mark task as completed");

        checkbox.addEventListener("change", () => {
            toggleTask(task.id);
        });

        const content = document.createElement("div");
        content.className = "task-content";

        const title = document.createElement("p");
        title.className = "task-title";
        title.textContent = task.title;

        const meta = document.createElement("div");
        meta.className = "task-meta";

        const priority = document.createElement("span");
        priority.className = "priority " + task.priority;
        priority.textContent = task.priority + " Priority";

        const time = document.createElement("span");
        time.className = "task-time";

        const createdDate = new Date(task.createdAt);

        time.textContent = Number.isNaN(createdDate.getTime())
            ? ""
            : createdDate.toLocaleDateString();

        meta.append(priority, time);
        content.append(title, meta);

        const actions = document.createElement("div");
        actions.className = "task-actions";

        const editButton = document.createElement("button");
        editButton.className = "action-button edit-button";
        editButton.textContent = "Edit";
        editButton.setAttribute("aria-label", "Edit task");

        editButton.addEventListener("click", () => {
            editTask(task.id);
        });

        const deleteButton = document.createElement("button");
        deleteButton.className = "action-button delete-button";
        deleteButton.textContent = "Delete";
        deleteButton.setAttribute("aria-label", "Delete task");

        deleteButton.addEventListener("click", () => {
            deleteTask(task.id);
        });

        actions.append(editButton, deleteButton);
        item.append(checkbox, content, actions);

        taskList.appendChild(item);
    });

    emptyState.hidden = visibleTasks.length > 0;
    taskList.hidden = visibleTasks.length === 0;

    updateStatistics();
}

// Mark a task as completed or pending.
function toggleTask(id) {
    tasks = tasks.map(task =>
        task.id === id
            ? { ...task, completed: !task.completed }
            : task
    );

    saveTasks();
    renderTasks();
}

// Edit a task.
function editTask(id) {
    const task = tasks.find(task => task.id === id);

    if (!task) return;

    taskInput.value = task.title;
    priorityInput.value = task.priority;

    editingId = id;

    document.getElementById("addButton").textContent = "Save Changes";

    taskInput.focus();
    taskForm.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}

// Delete a task.
function deleteTask(id) {
    tasks = tasks.filter(task => task.id !== id);

    if (editingId === id) {
        editingId = null;
        taskForm.reset();

        document.getElementById("addButton").textContent = "+ Add Task";
    }

    saveTasks();
    renderTasks();
}

// Change the task filter.
filterButtons.forEach(button => {
    button.addEventListener("click", () => {
        currentFilter = button.dataset.filter;

        filterButtons.forEach(filterButton => {
            const active = filterButton === button;

            filterButton.classList.toggle("active", active);
            filterButton.setAttribute("aria-pressed", String(active));
        });

        renderTasks();
    });
});

// Remove all completed tasks.
clearCompletedButton.addEventListener("click", () => {
    tasks = tasks.filter(task => !task.completed);

    if (editingId !== null && !tasks.some(task => task.id === editingId)) {
        editingId = null;
        taskForm.reset();

        document.getElementById("addButton").textContent = "+ Add Task";
    }

    saveTasks();
    renderTasks();
});

// Update counters and progress.
function updateStatistics() {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const pending = total - completed;

    const percentage = total === 0
        ? 0
        : Math.round((completed / total) * 100);

    totalTasks.textContent = total;
    completedTasks.textContent = completed;
    pendingTasks.textContent = pending;

    taskCount.textContent =
        total + (total === 1 ? " task" : " tasks");

    progressText.textContent = percentage + "% completed";
    progressBar.style.width = percentage + "%";

    progressBar.setAttribute("role", "progressbar");
    progressBar.setAttribute("aria-valuemin", "0");
    progressBar.setAttribute("aria-valuemax", "100");
    progressBar.setAttribute("aria-valuenow", String(percentage));
}

// Initialize the app.
displayDate();
renderTasks();