const COURSES_PER_PAGE = 5;

// Локальная SVG-заглушка для фото репетитора (без обращения к внешним сервисам)
const TUTOR_PHOTO_PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48">' +
    '<circle cx="24" cy="24" r="24" fill="#dee2e6"/>' +
    '<circle cx="24" cy="19" r="8" fill="#adb5bd"/>' +
    '<path d="M8 42c2-9 10-14 16-14s14 5 16 14" fill="#adb5bd"/>' +
    '</svg>'
);

let allCourses = [];
let filteredCourses = [];
let currentCoursePage = 1;

let allTutors = [];
let filteredTutors = [];
let selectedTutorId = null;

let currentCourseData = null;
let currentTutorData = null;

function showNotification(message, type = 'success') {
    const area = document.getElementById('notification-area');
    const alertId = `alert-${Date.now()}`;

    const alertEl = document.createElement('div');
    alertEl.id = alertId;
    alertEl.className = `alert alert-${type} alert-dismissible fade show shadow-sm`;
    alertEl.setAttribute('role', 'alert');
    alertEl.innerHTML = `
        <i class="bi bi-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Закрыть"></button>
    `;

    area.appendChild(alertEl);

    setTimeout(() => {
        const el = document.getElementById(alertId);
        if (el) {
            const bsAlert = bootstrap.Alert.getOrCreateInstance(el);
            bsAlert.close();
        }
    }, 5000);
}

function renderPagination(paginationId, totalItems, itemsPerPage, currentPage, onPageChange) {
    const paginationEl = document.getElementById(paginationId);
    if (!paginationEl) return;

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    paginationEl.innerHTML = '';

    if (totalPages <= 1) return;

    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#courses" aria-label="Предыдущая">
        <span aria-hidden="true">&laquo;</span></a>`;
    prevLi.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage > 1) onPageChange(currentPage - 1);
    });
    paginationEl.appendChild(prevLi);

    for (let page = 1; page <= totalPages; page++) {
        const li = document.createElement('li');
        li.className = `page-item ${page === currentPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#courses">${page}</a>`;
        li.addEventListener('click', (e) => {
            e.preventDefault();
            onPageChange(page);
        });
        paginationEl.appendChild(li);
    }

    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#courses" aria-label="Следующая">
        <span aria-hidden="true">&raquo;</span></a>`;
    nextLi.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage < totalPages) onPageChange(currentPage + 1);
    });
    paginationEl.appendChild(nextLi);
}

function renderCoursesTable() {
    const tbody = document.getElementById('courses-table-body');
    const start = (currentCoursePage - 1) * COURSES_PER_PAGE;
    const pageItems = filteredCourses.slice(start, start + COURSES_PER_PAGE);

    if (pageItems.length === 0) {
        tbody.innerHTML = `<tr>
            <td colspan="6" class="text-center text-muted py-4">
                <i class="bi bi-search me-2"></i>Курсы не найдены
            </td>
        </tr>`;
        renderPagination('courses-pagination', 0, COURSES_PER_PAGE, 1, () => {});
        return;
    }

    tbody.innerHTML = pageItems.map(course => `
        <tr>
            <td class="fw-semibold">${course.name}</td>
            <td>
                <span class="badge ${getLevelBadgeClass(course.level)}">
                    ${course.level}
                </span>
            </td>
            <td>${course.teacher || '–'}</td>
            <td>${course.week_length || '–'}</td>
            <td>${course.course_fee_per_hour ? course.course_fee_per_hour + ' ₽' : '–'}</td>
            <td>
                <button class="btn btn-sm btn-primary enroll-btn"
                        data-course-id="${course.id}">
                    <i class="bi bi-pencil-square me-1"></i>Записаться
                </button>
            </td>
        </tr>
    `).join('');

    tbody.querySelectorAll('.enroll-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const courseId = parseInt(btn.dataset.courseId, 10);
            openEnrollmentModal(courseId);
        });
    });

    renderPagination(
        'courses-pagination',
        filteredCourses.length,
        COURSES_PER_PAGE,
        currentCoursePage,
        (page) => {
            currentCoursePage = page;
            renderCoursesTable();
        }
    );
}

function getLevelBadgeClass(level) {
    const map = {
        'Beginner': 'bg-success',
        'Intermediate': 'bg-warning text-dark',
        'Advanced': 'bg-danger'
    };
    return map[level] || 'bg-secondary';
}

async function loadCourses() {
    try {
        allCourses = await fetchCourses();
        filteredCourses = [...allCourses];
        currentCoursePage = 1;
        renderCoursesTable();
    } catch (error) {
        showNotification(`Не удалось загрузить курсы: ${error.message}`, 'danger');
        document.getElementById('courses-table-body').innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger py-4">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Ошибка загрузки данных
                </td>
            </tr>`;
    }
}

function applyCoursesFilter() {
    const searchQuery = document.getElementById('course-search-input').value.trim().toLowerCase();
    const selectedLevel = document.getElementById('course-level-select').value;

    filteredCourses = allCourses.filter(course => {
        const nameMatch = !searchQuery || course.name.toLowerCase().includes(searchQuery);
        const levelMatch = !selectedLevel || course.level === selectedLevel;
        return nameMatch && levelMatch;
    });

    currentCoursePage = 1;
    renderCoursesTable();
}

function populateTutorLanguageFilter() {
    const select = document.getElementById('tutor-language-select');
    const languages = new Set();

    allTutors.forEach(tutor => {
        if (Array.isArray(tutor.languages_offered)) {
            tutor.languages_offered.forEach(lang => {
                languages.add(lang.trim());
            });
        }
    });

    languages.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang;
        option.textContent = lang;
        select.appendChild(option);
    });
}

function renderTutorsTable(tutors) {
    const tbody = document.getElementById('tutors-table-body');

    if (tutors.length === 0) {
        tbody.innerHTML = `<tr>
            <td colspan="7" class="text-center text-muted py-4">
                <i class="bi bi-search me-2"></i>Репетиторы не найдены
            </td>
        </tr>`;
        return;
    }

    tbody.innerHTML = tutors.map(tutor => `
        <tr id="tutor-row-${tutor.id}"
            class="${selectedTutorId === tutor.id ? 'tutor-selected' : ''}">
            <td class="fw-semibold">${tutor.name}</td>
            <td>
                <span class="badge ${getLevelBadgeClass(tutor.language_level)}">
                    ${tutor.language_level || '–'}
                </span>
            </td>
            <td>${Array.isArray(tutor.languages_offered) ? tutor.languages_offered.join(', ') : '–'}</td>
            <td>${tutor.work_experience !== undefined ? tutor.work_experience : '–'}</td>
            <td>${tutor.price_per_hour ? tutor.price_per_hour + ' ₽' : '–'}</td>
            <td>
                <img src="${tutor.photo_url || TUTOR_PHOTO_PLACEHOLDER}"
                     alt="Фото ${tutor.name}"
                     class="tutor-photo"
                     onerror="this.onerror=null;this.src='${TUTOR_PHOTO_PLACEHOLDER}'">
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary select-tutor-btn"
                        data-tutor-id="${tutor.id}">
                    ${selectedTutorId === tutor.id
                        ? '<i class="bi bi-check-circle-fill me-1"></i>Выбран'
                        : '<i class="bi bi-person-check me-1"></i>Выбрать'}
                </button>
            </td>
        </tr>
    `).join('');

    tbody.querySelectorAll('.select-tutor-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tutorId = parseInt(btn.dataset.tutorId, 10);
            selectTutor(tutorId, tutors);
        });
    });
}

function selectTutor(tutorId, tutors) {
    if (selectedTutorId !== null) {
        const prevRow = document.getElementById(`tutor-row-${selectedTutorId}`);
        if (prevRow) prevRow.classList.remove('tutor-selected');
    }

    if (selectedTutorId === tutorId) {
        selectedTutorId = null;
    } else {
        selectedTutorId = tutorId;
        const row = document.getElementById(`tutor-row-${tutorId}`);
        if (row) row.classList.add('tutor-selected');
    }

    renderTutorsTable(tutors);
    updateTutoringButtonState(tutors);
}

function updateTutoringButtonState(tutors) {
    const btn = document.getElementById('request-tutoring-btn');
    const tutor = tutors.find(t => t.id === selectedTutorId);

    if (!tutor) {
        btn.classList.add('d-none');
        return;
    }

    btn.classList.remove('d-none');
    btn.innerHTML = `<i class="bi bi-person-plus me-2"></i>Запросить занятие с ${tutor.name}`;
}

async function loadTutors() {
    try {
        allTutors = await fetchTutors();
        filteredTutors = [...allTutors];
        populateTutorLanguageFilter();
        renderTutorsTable(filteredTutors);
    } catch (error) {
        showNotification(`Не удалось загрузить репетиторов: ${error.message}`, 'danger');
        document.getElementById('tutors-table-body').innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger py-4">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Ошибка загрузки данных
                </td>
            </tr>`;
    }
}

function applyTutorsFilter() {
    const selectedLanguage = document.getElementById('tutor-language-select').value;
    const selectedLevel = document.getElementById('tutor-level-select').value;

    filteredTutors = allTutors.filter(tutor => {
        const languageMatch = !selectedLanguage
            || (tutor.languages_offered && tutor.languages_offered.includes(selectedLanguage));
        const levelMatch = !selectedLevel || tutor.language_level === selectedLevel;
        return languageMatch && levelMatch;
    });

    renderTutorsTable(filteredTutors);
}

async function openEnrollmentModal(courseId) {
    try {
        const course = await fetchCourseById(courseId);
        currentCourseData = course;

        document.getElementById('enrollment-course-id').value = course.id;
        document.getElementById('enrollment-course-name').value = course.name;
        document.getElementById('enrollment-instructor').value = course.teacher || '–';

        const dateSelect = document.getElementById('enrollment-date');
        dateSelect.innerHTML = '<option value="">– выберите дату –</option>';

        if (course.start_dates && course.start_dates.length > 0) {
            const uniqueDates = [...new Set(
                course.start_dates.map(dt => dt.split('T')[0])
            )].sort();

            uniqueDates.forEach(date => {
                const option = document.createElement('option');
                option.value = date;
                option.textContent = formatDate(date);
                dateSelect.appendChild(option);
            });
        }

        const timeSelect = document.getElementById('enrollment-time');
        timeSelect.innerHTML = '<option value="">– сначала выберите дату –</option>';
        timeSelect.disabled = true;

        document.getElementById('enrollment-duration').value = '';
        document.getElementById('enrollment-students').value = 1;
        document.getElementById('enrollment-total-cost').value = '';
        document.getElementById('auto-option-badges').innerHTML =
            '<span class="text-muted small">Будут рассчитаны после заполнения формы</span>';

        document.querySelectorAll('.enrollment-option').forEach(cb => {
            cb.checked = false;
        });

        const modal = bootstrap.Modal.getOrCreateInstance(
            document.getElementById('enrollmentModal')
        );
        modal.show();
    } catch (error) {
        showNotification(`Не удалось загрузить данные курса: ${error.message}`, 'danger');
    }
}

function formatDate(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return `${day}.${month}.${year}`;
}

function handleEnrollmentDateChange() {
    const dateSelect = document.getElementById('enrollment-date');
    const timeSelect = document.getElementById('enrollment-time');
    const selectedDate = dateSelect.value;

    timeSelect.innerHTML = '<option value="">– выберите время –</option>';
    timeSelect.disabled = !selectedDate;

    if (!selectedDate || !currentCourseData) {
        document.getElementById('enrollment-duration').value = '';
        updateEnrollmentCost();
        return;
    }

    const matchingTimes = currentCourseData.start_dates
        .filter(dt => dt.split('T')[0] === selectedDate)
        .map(dt => {
            const timePart = dt.split('T')[1] || dt.split(' ')[1] || '';
            return timePart.substring(0, 5);
        })
        .filter((t, i, arr) => arr.indexOf(t) === i)
        .sort();

    matchingTimes.forEach(timeStart => {
        const option = document.createElement('option');
        option.value = timeStart;
        const endTime = calcEndTime(timeStart, currentCourseData.week_length);
        option.textContent = `${timeStart} до ${endTime}`;
        timeSelect.appendChild(option);
    });

    updateEnrollmentDuration();
    updateEnrollmentCost();
}

function calcEndTime(timeStart, hours) {
    const [h, m] = timeStart.split(':').map(Number);
    const totalMinutes = h * 60 + m + (hours || 0) * 60;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

function updateEnrollmentDuration() {
    const dateVal = document.getElementById('enrollment-date').value;
    const durationField = document.getElementById('enrollment-duration');

    if (!dateVal || !currentCourseData) {
        durationField.value = '';
        return;
    }

    const totalLength = currentCourseData.total_length;
    const startDate = new Date(dateVal);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + totalLength * 7);

    durationField.value = `${totalLength} нед., последнее занятие: ${formatDate(
        endDate.toISOString().split('T')[0]
    )}`;
}

function updateEnrollmentCost() {
    if (!currentCourseData) return;

    const dateVal = document.getElementById('enrollment-date').value;
    const timeVal = document.getElementById('enrollment-time').value;
    const students = parseInt(document.getElementById('enrollment-students').value, 10) || 0;

    const supplementary = document.getElementById('opt-supplementary').checked;
    const personalized = document.getElementById('opt-personalized').checked;
    const excursions = document.getElementById('opt-excursions').checked;
    const assessment = document.getElementById('opt-assessment').checked;
    const interactive = document.getElementById('opt-interactive').checked;

    const totalLength = currentCourseData.total_length || 0;
    const weekLength = currentCourseData.week_length || 0;
    const feePerHour = currentCourseData.course_fee_per_hour || 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let earlyRegistration = false;
    let groupEnrollment = students >= 5;
    let intensiveCourse = weekLength >= 5;

    if (dateVal) {
        const startDate = new Date(dateVal);
        const oneMonthLater = new Date(today);
        oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
        earlyRegistration = startDate >= oneMonthLater;
    }

    renderAutoBadges(earlyRegistration, groupEnrollment, intensiveCourse);

    if (!dateVal || !timeVal || students <= 0) {
        document.getElementById('enrollment-total-cost').value = '';
        return;
    }

    const durationInHours = totalLength * weekLength;

    const startDate = new Date(dateVal);
    const dayOfWeek = startDate.getDay(); // 0=вс, 6=сб
    const isWeekendOrHoliday = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.5 : 1;

    const hour = parseInt(timeVal.split(':')[0], 10);
    const morningSurcharge = (hour >= 9 && hour < 12) ? 400 : 0;
    const eveningSurcharge = (hour >= 18 && hour < 20) ? 1000 : 0;

    const baseCost = (feePerHour * durationInHours * isWeekendOrHoliday)
        + morningSurcharge + eveningSurcharge;

    let totalCost = baseCost * students;

    // Применяем множители (строго по порядку из ТЗ)
    if (intensiveCourse) totalCost *= 1.20;
    if (excursions)      totalCost *= 1.25;
    if (interactive)     totalCost *= 1.50;
    if (supplementary)   totalCost += 2000 * students;
    if (personalized)    totalCost += 1500 * totalLength;
    if (assessment)      totalCost += 300;
    if (earlyRegistration) totalCost *= 0.90;
    if (groupEnrollment)   totalCost *= 0.85;

    document.getElementById('enrollment-total-cost').value =
        Math.round(totalCost).toLocaleString('ru-RU') + ' ₽';
}

function renderAutoBadges(earlyReg, groupEnroll, intensive, containerId = 'auto-option-badges') {
    const container = document.getElementById(containerId);
    const badges = [];

    if (earlyReg) {
        badges.push('<span class="badge bg-success">Ранняя запись −10%</span>');
    }
    if (groupEnroll) {
        badges.push('<span class="badge bg-info text-dark">Групповая запись −15%</span>');
    }
    if (intensive) {
        badges.push('<span class="badge bg-warning text-dark">Интенсивный курс +20%</span>');
    }

    container.innerHTML = badges.length > 0
        ? badges.join('')
        : '<span class="text-muted small">Нет применимых условий</span>';
}

function calcTutoringAutoOptions() {
    const dateVal = document.getElementById('tutoring-date').value;
    const students = parseInt(document.getElementById('tutoring-students').value, 10) || 0;

    let earlyRegistration = false;
    if (dateVal) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startDate = new Date(dateVal);
        const oneMonthLater = new Date(today);
        oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
        earlyRegistration = startDate >= oneMonthLater;
    }

    return { earlyRegistration, groupEnrollment: students >= 5 };
}

function updateTutoringCost() {
    if (!currentTutorData) return;

    const dateVal = document.getElementById('tutoring-date').value;
    const duration = parseInt(document.getElementById('tutoring-duration').value, 10) || 0;
    const students = parseInt(document.getElementById('tutoring-students').value, 10) || 0;
    const pricePerHour = currentTutorData.price_per_hour || 0;

    const { earlyRegistration, groupEnrollment } = calcTutoringAutoOptions();
    renderAutoBadges(earlyRegistration, groupEnrollment, false, 'tutoring-auto-badges');

    if (!dateVal || duration <= 0 || students <= 0) {
        document.getElementById('tutoring-total-cost').value = '';
        return;
    }

    let totalCost = pricePerHour * duration * students;
    if (earlyRegistration) totalCost *= 0.90;
    if (groupEnrollment)   totalCost *= 0.85;

    document.getElementById('tutoring-total-cost').value =
        Math.round(totalCost).toLocaleString('ru-RU') + ' ₽';
}

function openTutoringModal() {
    currentTutorData = allTutors.find(t => t.id === selectedTutorId) || null;
    if (!currentTutorData) return;

    document.getElementById('tutoring-tutor-id').value = currentTutorData.id;
    document.getElementById('tutoring-tutor-name').value = currentTutorData.name;

    const dateInput = document.getElementById('tutoring-date');
    dateInput.value = '';
    dateInput.min = new Date().toISOString().split('T')[0];

    document.getElementById('tutoring-time').value = '';
    document.getElementById('tutoring-duration').value = 1;
    document.getElementById('tutoring-students').value = 1;
    document.getElementById('tutoring-total-cost').value = '';
    document.getElementById('tutoring-auto-badges').innerHTML =
        '<span class="text-muted small">Будут рассчитаны после заполнения формы</span>';
}

async function handleTutoringSubmit() {
    if (!currentTutorData) return;

    const dateVal  = document.getElementById('tutoring-date').value;
    const timeVal  = document.getElementById('tutoring-time').value;
    const duration = parseInt(document.getElementById('tutoring-duration').value, 10);
    const students = parseInt(document.getElementById('tutoring-students').value, 10);

    if (!dateVal) {
        showNotification('Пожалуйста, выберите дату занятия.', 'danger');
        return;
    }
    if (!timeVal) {
        showNotification('Пожалуйста, выберите время начала.', 'danger');
        return;
    }
    if (!duration || duration < 1 || duration > 40) {
        showNotification('Длительность должна быть от 1 до 40 часов.', 'danger');
        return;
    }
    if (!students || students < 1 || students > 20) {
        showNotification('Количество студентов должно быть от 1 до 20.', 'danger');
        return;
    }

    const pricePerHour = currentTutorData.price_per_hour || 0;
    const { earlyRegistration, groupEnrollment } = calcTutoringAutoOptions();

    let totalCost = pricePerHour * duration * students;
    if (earlyRegistration) totalCost *= 0.90;
    if (groupEnrollment)   totalCost *= 0.85;

    const orderData = {
        tutor_id:            currentTutorData.id,
        course_id:           0,
        date_start:          dateVal,
        time_start:          timeVal,
        duration:            duration,
        persons:             students,
        price:               Math.round(totalCost),
        early_registration:  earlyRegistration,
        group_enrollment:    groupEnrollment,
        intensive_course:    false,
        supplementary:       false,
        personalized:        false,
        excursions:          false,
        assessment:          false,
        interactive:         false
    };

    const submitBtn = document.getElementById('tutoring-submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Отправка...';

    try {
        await createOrder(orderData);

        const modal = bootstrap.Modal.getInstance(document.getElementById('tutoringModal'));
        if (modal) modal.hide();

        document.getElementById('tutoring-request-form').reset();
        currentTutorData = null;
        selectedTutorId = null;
        renderTutorsTable(filteredTutors);

        showNotification('Заявка на занятие с репетитором успешно отправлена!', 'success');
    } catch (error) {
        showNotification(`Ошибка при отправке заявки: ${error.message}`, 'danger');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-send me-1"></i>Отправить';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadCourses();
    loadTutors();

    document.getElementById('course-search-btn').addEventListener('click', applyCoursesFilter);

    document.getElementById('course-search-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') applyCoursesFilter();
    });

    document.getElementById('course-level-select').addEventListener('change', applyCoursesFilter);

    document.getElementById('tutor-language-select').addEventListener('change', applyTutorsFilter);
    document.getElementById('tutor-level-select').addEventListener('change', applyTutorsFilter);

    document.getElementById('tutor-search-btn').addEventListener('click', applyTutorsFilter);

    document.getElementById('enrollment-date').addEventListener('change', () => {
        handleEnrollmentDateChange();
        updateEnrollmentDuration();
        updateEnrollmentCost();
    });

    document.getElementById('enrollment-time').addEventListener('change', updateEnrollmentCost);

    document.getElementById('enrollment-students').addEventListener('input', updateEnrollmentCost);

    document.querySelectorAll('.enrollment-option').forEach(cb => {
        cb.addEventListener('change', updateEnrollmentCost);
    });

    document.getElementById('tutoringModal').addEventListener('show.bs.modal', (e) => {
        if (selectedTutorId === null) {
            e.preventDefault();
            showNotification('Сначала выберите репетитора в таблице ниже.', 'danger');
            return;
        }
        openTutoringModal();
    });

    document.getElementById('tutoring-date').addEventListener('change', updateTutoringCost);
    document.getElementById('tutoring-time').addEventListener('change', updateTutoringCost);
    document.getElementById('tutoring-duration').addEventListener('input', updateTutoringCost);
    document.getElementById('tutoring-students').addEventListener('input', updateTutoringCost);

    document.getElementById('tutoring-submit-btn').addEventListener('click', handleTutoringSubmit);

    document.getElementById('tutoringModal').addEventListener('hidden.bs.modal', () => {
        document.getElementById('tutoring-request-form').reset();
        document.getElementById('tutoring-total-cost').value = '';
        document.getElementById('tutoring-auto-badges').innerHTML =
            '<span class="text-muted small">Будут рассчитаны после заполнения формы</span>';
        currentTutorData = null;
    });
});
