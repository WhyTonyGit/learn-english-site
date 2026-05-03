const ORDERS_PER_PAGE = 5;

let allOrders = [];
let currentOrderPage = 1;
let editCourseData = null;
let editTutorData = null;
let orderToDeleteId = null;

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
        <button type="button" class="btn-close" data-bs-dismiss="alert"
                aria-label="Закрыть"></button>
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
    prevLi.innerHTML = `<a class="page-link" href="#" aria-label="Предыдущая">
        <span aria-hidden="true">&laquo;</span></a>`;
    prevLi.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage > 1) onPageChange(currentPage - 1);
    });
    paginationEl.appendChild(prevLi);

    for (let page = 1; page <= totalPages; page++) {
        const li = document.createElement('li');
        li.className = `page-item ${page === currentPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${page}</a>`;
        li.addEventListener('click', (e) => {
            e.preventDefault();
            onPageChange(page);
        });
        paginationEl.appendChild(li);
    }

    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" aria-label="Следующая">
        <span aria-hidden="true">&raquo;</span></a>`;
    nextLi.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage < totalPages) onPageChange(currentPage + 1);
    });
    paginationEl.appendChild(nextLi);
}

function formatDate(dateStr) {
    if (!dateStr) return '–';
    const [year, month, day] = dateStr.split('-');
    return `${day}.${month}.${year}`;
}

function calcEndTime(timeStart, hours) {
    if (!timeStart) return '';
    const [h, m] = timeStart.split(':').map(Number);
    const totalMinutes = h * 60 + m + (hours || 0) * 60;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

function getAppliedOptions(order) {
    const options = [];

    if (order.early_registration) {
        options.push({ label: 'Ранняя запись (−10%)', type: 'success' });
    }
    if (order.group_enrollment) {
        options.push({ label: 'Групповая запись (−15%)', type: 'info' });
    }
    if (order.intensive_course) {
        options.push({ label: 'Интенсивный курс (+20%)', type: 'warning' });
    }
    if (order.supplementary) {
        options.push({ label: 'Дополнительные материалы (+2000 руб./студент)', type: 'secondary' });
    }
    if (order.personalized) {
        options.push({ label: 'Персонализированные занятия (+1500 руб./нед.)', type: 'secondary' });
    }
    if (order.excursions) {
        options.push({ label: 'Культурные экскурсии (+25%)', type: 'secondary' });
    }
    if (order.assessment) {
        options.push({ label: 'Языковое тестирование (+300 руб.)', type: 'secondary' });
    }
    if (order.interactive) {
        options.push({ label: 'Интерактивная платформа (+50%)', type: 'secondary' });
    }

    return options;
}

function renderOrdersTable() {
    const tbody = document.getElementById('orders-table-body');
    const start = (currentOrderPage - 1) * ORDERS_PER_PAGE;
    const pageItems = allOrders.slice(start, start + ORDERS_PER_PAGE);

    if (pageItems.length === 0) {
        tbody.innerHTML = `<tr>
            <td colspan="5" class="text-center text-muted py-5">
                <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                Заявок пока нет
            </td>
        </tr>`;
        renderPagination('orders-pagination', 0, ORDERS_PER_PAGE, 1, () => {});
        return;
    }

    tbody.innerHTML = pageItems.map(order => `
        <tr id="order-row-${order.id}">
            <td class="fw-semibold">#${order.id}</td>
            <td>${order.course_name || '–'}</td>
            <td>${formatDate(order.date_start)}
                ${order.time_start ? '<br><small class="text-muted">' + order.time_start + '</small>' : ''}
            </td>
            <td class="fw-semibold">
                ${order.price ? Number(order.price).toLocaleString('ru-RU') + ' ₽' : '–'}
            </td>
            <td>
                <div class="d-flex gap-1 flex-wrap">
                    <button class="btn btn-sm btn-info text-white details-btn"
                            data-order-id="${order.id}" title="Подробнее">
                        <i class="bi bi-info-circle me-1"></i>Подробнее
                    </button>
                    <button class="btn btn-sm btn-warning edit-btn"
                            data-order-id="${order.id}" title="Редактировать">
                        <i class="bi bi-pencil me-1"></i>Изменить
                    </button>
                    <button class="btn btn-sm btn-danger delete-btn"
                            data-order-id="${order.id}" title="Удалить">
                        <i class="bi bi-trash me-1"></i>Удалить
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    tbody.querySelectorAll('.details-btn').forEach(btn => {
        btn.addEventListener('click', () => openDetailsModal(parseInt(btn.dataset.orderId, 10)));
    });
    tbody.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.orderId, 10)));
    });
    tbody.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => openDeleteModal(parseInt(btn.dataset.orderId, 10)));
    });

    renderPagination(
        'orders-pagination',
        allOrders.length,
        ORDERS_PER_PAGE,
        currentOrderPage,
        (page) => {
            currentOrderPage = page;
            renderOrdersTable();
        }
    );
}

async function loadOrders() {
    try {
        allOrders = await fetchOrders();
        await Promise.all(allOrders.map(async (order) => {
            try {
                if (order.course_id) {
                    const course = await fetchCourseById(order.course_id);
                    order.course_name = course.name;
                } else if (order.tutor_id) {
                    const tutor = await fetchTutorById(order.tutor_id);
                    order.course_name = tutor.name;
                }
            } catch (_) {
                order.course_name = null;
            }
        }));
        currentOrderPage = 1;
        renderOrdersTable();
    } catch (error) {
        showNotification(`Не удалось загрузить заявки: ${error.message}`, 'danger');
        document.getElementById('orders-table-body').innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger py-4">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Ошибка загрузки данных
                </td>
            </tr>`;
    }
}

async function openDetailsModal(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;

    const appliedOptions = getAppliedOptions(order);
    const optionsBadges = appliedOptions.length > 0
        ? appliedOptions.map(opt =>
            `<span class="badge bg-${opt.type} text-${opt.type === 'warning' || opt.type === 'info' ? 'dark' : 'white'} me-1 mb-1">${opt.label}</span>`
          ).join('')
        : '<span class="text-muted">Нет применённых опций</span>';

    const isTutorOrder = !!order.tutor_id;

    let description = '–';
    try {
        if (isTutorOrder) {
            const tutor = await fetchTutorById(order.tutor_id);
            description = `Опыт: ${tutor.work_experience ?? '–'} лет, `
                + `уровень: ${tutor.language_level || '–'}, `
                + `ставка: ${tutor.price_per_hour ? tutor.price_per_hour + ' ₽/час' : '–'}`;
        } else {
            const course = await fetchCourseById(order.course_id);
            description = course.description || course.name || '–';
        }
    } catch (_) {
        description = order.course_name || '–';
    }

    document.getElementById('order-details-body').innerHTML = `
        <div class="row g-3">
            <div class="col-md-6">
                <p class="mb-1 text-muted small">Номер заявки</p>
                <p class="fw-bold fs-5">#${order.id}</p>
            </div>
            <div class="col-md-6">
                <p class="mb-1 text-muted small">${isTutorOrder ? 'Репетитор' : 'Курс'}</p>
                <p class="fw-semibold">${order.course_name || '–'}</p>
            </div>
            <div class="col-12">
                <p class="mb-1 text-muted small">${isTutorOrder ? 'О репетиторе' : 'Описание курса'}</p>
                <p>${description}</p>
            </div>
            <div class="col-md-4">
                <p class="mb-1 text-muted small">Дата начала</p>
                <p>${formatDate(order.date_start)}</p>
            </div>
            <div class="col-md-4">
                <p class="mb-1 text-muted small">Время начала</p>
                <p>${order.time_start || '–'}</p>
            </div>
            <div class="col-md-4">
                <p class="mb-1 text-muted small">Длительность (часов)</p>
                <p>${order.duration || '–'}</p>
            </div>
            <div class="col-md-6">
                <p class="mb-1 text-muted small">Количество студентов</p>
                <p>${order.persons || '–'}</p>
            </div>
            <div class="col-md-6">
                <p class="mb-1 text-muted small">Итоговая стоимость</p>
                <p class="fw-bold text-primary fs-5">
                    ${order.price ? Number(order.price).toLocaleString('ru-RU') + ' ₽' : '–'}
                </p>
            </div>
            <div class="col-12">
                <p class="mb-2 text-muted small fw-semibold">Применённые опции и условия</p>
                <div>${optionsBadges}</div>
            </div>
        </div>
    `;

    bootstrap.Modal.getOrCreateInstance(
        document.getElementById('orderDetailsModal')
    ).show();
}

async function openEditModal(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;

    document.getElementById('edit-order-id').value = order.id;

    if (order.tutor_id) {
        await openEditModalForTutor(order);
    } else {
        await openEditModalForCourse(order);
    }
}

function setEditModalMode(mode) {
    const isTutor = mode === 'tutor';
    document.getElementById('edit-course-fields').classList.toggle('d-none', isTutor);
    document.getElementById('edit-course-options').classList.toggle('d-none', isTutor);
    document.getElementById('edit-tutor-fields').classList.toggle('d-none', !isTutor);
}

async function openEditModalForCourse(order) {
    try {
        const course = await fetchCourseById(order.course_id);
        editCourseData = course;
        editTutorData = null;
        setEditModalMode('course');

        document.getElementById('edit-course-id').value = order.course_id;
        document.getElementById('edit-course-name').value = course.name || '–';
        document.getElementById('edit-instructor').value = course.teacher || '–';

        const dateSelect = document.getElementById('edit-date');
        dateSelect.innerHTML = '<option value="">– выберите дату –</option>';

        if (course.start_dates && course.start_dates.length > 0) {
            const uniqueDates = [...new Set(
                course.start_dates.map(dt => dt.split('T')[0])
            )].sort();

            uniqueDates.forEach(date => {
                const option = document.createElement('option');
                option.value = date;
                option.textContent = formatDate(date);
                if (date === order.date_start) option.selected = true;
                dateSelect.appendChild(option);
            });
        }

        updateEditTimeSelect(order.date_start, order.time_start);

        document.getElementById('edit-students').value = order.persons || 1;

        document.getElementById('edit-opt-supplementary').checked = !!order.supplementary;
        document.getElementById('edit-opt-personalized').checked  = !!order.personalized;
        document.getElementById('edit-opt-excursions').checked    = !!order.excursions;
        document.getElementById('edit-opt-assessment').checked    = !!order.assessment;
        document.getElementById('edit-opt-interactive').checked   = !!order.interactive;

        updateEditDuration();
        updateEditCost();

        bootstrap.Modal.getOrCreateInstance(
            document.getElementById('editOrderModal')
        ).show();
    } catch (error) {
        showNotification(`Не удалось загрузить данные курса: ${error.message}`, 'danger');
    }
}

async function openEditModalForTutor(order) {
    try {
        const tutor = await fetchTutorById(order.tutor_id);
        editTutorData = tutor;
        editCourseData = null;
        setEditModalMode('tutor');

        document.getElementById('edit-tutor-id').value = order.tutor_id;
        document.getElementById('edit-tutor-name').value = tutor.name || '–';
        document.getElementById('edit-tutor-date').value = order.date_start || '';
        document.getElementById('edit-tutor-time').value = order.time_start || '';
        document.getElementById('edit-tutor-duration').value = order.duration || 1;
        document.getElementById('edit-students').value = order.persons || 1;

        updateEditTutoringCost();

        bootstrap.Modal.getOrCreateInstance(
            document.getElementById('editOrderModal')
        ).show();
    } catch (error) {
        showNotification(`Не удалось загрузить данные репетитора: ${error.message}`, 'danger');
    }
}

function updateEditTimeSelect(selectedDate, preselectedTime = null) {
    const timeSelect = document.getElementById('edit-time');
    timeSelect.innerHTML = '<option value="">– выберите время –</option>';
    timeSelect.disabled = !selectedDate;

    if (!selectedDate || !editCourseData) return;

    const matchingTimes = editCourseData.start_dates
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
        const endTime = calcEndTime(timeStart, editCourseData.week_length);
        option.textContent = `${timeStart} до ${endTime}`;
        if (timeStart === preselectedTime) option.selected = true;
        timeSelect.appendChild(option);
    });
}

function updateEditDuration() {
    const dateVal = document.getElementById('edit-date').value;
    const durationField = document.getElementById('edit-duration');

    if (!dateVal || !editCourseData) {
        durationField.value = '';
        return;
    }

    const totalLength = editCourseData.total_length || 0;
    const endDate = new Date(dateVal);
    endDate.setDate(endDate.getDate() + totalLength * 7);
    durationField.value = `${totalLength} нед., последнее занятие: ${formatDate(
        endDate.toISOString().split('T')[0]
    )}`;
}

function updateEditCost() {
    if (!editCourseData) return;

    const dateVal  = document.getElementById('edit-date').value;
    const timeVal  = document.getElementById('edit-time').value;
    const students = parseInt(document.getElementById('edit-students').value, 10) || 0;

    const supplementary = document.getElementById('edit-opt-supplementary').checked;
    const personalized  = document.getElementById('edit-opt-personalized').checked;
    const excursions    = document.getElementById('edit-opt-excursions').checked;
    const assessment    = document.getElementById('edit-opt-assessment').checked;
    const interactive   = document.getElementById('edit-opt-interactive').checked;

    const totalLength = editCourseData.total_length || 0;
    const weekLength  = editCourseData.week_length  || 0;
    const feePerHour  = editCourseData.course_fee_per_hour || 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let earlyRegistration = false;
    const groupEnrollment = students >= 5;
    const intensiveCourse = weekLength >= 5;

    if (dateVal) {
        const startDate = new Date(dateVal);
        const oneMonthLater = new Date(today);
        oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
        earlyRegistration = startDate >= oneMonthLater;
    }

    renderEditAutoBadges(earlyRegistration, groupEnrollment, intensiveCourse);

    if (!dateVal || !timeVal || students <= 0) {
        document.getElementById('edit-total-cost').value = '';
        return;
    }

    // Расчёт стоимости (идентичная логика из main.js)
    const durationInHours = totalLength * weekLength;
    const startDate = new Date(dateVal);
    const dayOfWeek = startDate.getDay();
    const isWeekendOrHoliday = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.5 : 1;

    const hour = parseInt(timeVal.split(':')[0], 10);
    const morningSurcharge = (hour >= 9 && hour < 12) ? 400 : 0;
    const eveningSurcharge = (hour >= 18 && hour < 20) ? 1000 : 0;

    const baseCost = (feePerHour * durationInHours * isWeekendOrHoliday)
        + morningSurcharge + eveningSurcharge;

    let totalCost = baseCost * students;

    if (intensiveCourse)   totalCost *= 1.20;
    if (excursions)        totalCost *= 1.25;
    if (interactive)       totalCost *= 1.50;
    if (supplementary)     totalCost += 2000 * students;
    if (personalized)      totalCost += 1500 * totalLength;
    if (assessment)        totalCost += 300;
    if (earlyRegistration) totalCost *= 0.90;
    if (groupEnrollment)   totalCost *= 0.85;

    document.getElementById('edit-total-cost').value =
        Math.round(totalCost).toLocaleString('ru-RU') + ' ₽';
}

function renderEditAutoBadges(earlyReg, groupEnroll, intensive) {
    const container = document.getElementById('edit-auto-badges');
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

function calcEditTutoringAutoOptions() {
    const dateVal = document.getElementById('edit-tutor-date').value;
    const students = parseInt(document.getElementById('edit-students').value, 10) || 0;

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

function updateEditTutoringCost() {
    if (!editTutorData) return;

    const dateVal = document.getElementById('edit-tutor-date').value;
    const duration = parseInt(document.getElementById('edit-tutor-duration').value, 10) || 0;
    const students = parseInt(document.getElementById('edit-students').value, 10) || 0;
    const pricePerHour = editTutorData.price_per_hour || 0;

    const { earlyRegistration, groupEnrollment } = calcEditTutoringAutoOptions();
    renderEditAutoBadges(earlyRegistration, groupEnrollment, false);

    if (!dateVal || duration <= 0 || students <= 0) {
        document.getElementById('edit-total-cost').value = '';
        return;
    }

    let totalCost = pricePerHour * duration * students;
    if (earlyRegistration) totalCost *= 0.90;
    if (groupEnrollment)   totalCost *= 0.85;

    document.getElementById('edit-total-cost').value =
        Math.round(totalCost).toLocaleString('ru-RU') + ' ₽';
}

function calculateEditCostValue() {
    if (!editCourseData) return null;

    const dateVal  = document.getElementById('edit-date').value;
    const timeVal  = document.getElementById('edit-time').value;
    const students = parseInt(document.getElementById('edit-students').value, 10) || 0;

    if (!dateVal || !timeVal || students <= 0) return null;

    const supplementary = document.getElementById('edit-opt-supplementary').checked;
    const personalized  = document.getElementById('edit-opt-personalized').checked;
    const excursions    = document.getElementById('edit-opt-excursions').checked;
    const assessment    = document.getElementById('edit-opt-assessment').checked;
    const interactive   = document.getElementById('edit-opt-interactive').checked;

    const totalLength = editCourseData.total_length || 0;
    const weekLength  = editCourseData.week_length  || 0;
    const feePerHour  = editCourseData.course_fee_per_hour || 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(dateVal);
    const oneMonthLater = new Date(today);
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

    const earlyRegistration = startDate >= oneMonthLater;
    const groupEnrollment   = students >= 5;
    const intensiveCourse   = weekLength >= 5;

    const durationInHours = totalLength * weekLength;
    const dayOfWeek = startDate.getDay();
    const isWeekendOrHoliday = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.5 : 1;

    const hour = parseInt(timeVal.split(':')[0], 10);
    const morningSurcharge = (hour >= 9 && hour < 12) ? 400 : 0;
    const eveningSurcharge = (hour >= 18 && hour < 20) ? 1000 : 0;

    const baseCost = (feePerHour * durationInHours * isWeekendOrHoliday)
        + morningSurcharge + eveningSurcharge;

    let totalCost = baseCost * students;

    if (intensiveCourse)   totalCost *= 1.20;
    if (excursions)        totalCost *= 1.25;
    if (interactive)       totalCost *= 1.50;
    if (supplementary)     totalCost += 2000 * students;
    if (personalized)      totalCost += 1500 * totalLength;
    if (assessment)        totalCost += 300;
    if (earlyRegistration) totalCost *= 0.90;
    if (groupEnrollment)   totalCost *= 0.85;

    return {
        price: Math.round(totalCost),
        earlyRegistration,
        groupEnrollment,
        intensiveCourse
    };
}

async function handleEditSave() {
    if (editTutorData) {
        await handleEditSaveTutor();
    } else {
        await handleEditSaveCourse();
    }
}

async function handleEditSaveCourse() {
    const orderId  = parseInt(document.getElementById('edit-order-id').value, 10);
    const courseId = parseInt(document.getElementById('edit-course-id').value, 10);
    const dateVal  = document.getElementById('edit-date').value;
    const timeVal  = document.getElementById('edit-time').value;
    const students = parseInt(document.getElementById('edit-students').value, 10);

    if (!dateVal) {
        showNotification('Пожалуйста, выберите дату начала.', 'danger');
        return;
    }
    if (!timeVal) {
        showNotification('Пожалуйста, выберите время начала.', 'danger');
        return;
    }
    if (!students || students < 1 || students > 20) {
        showNotification('Количество студентов должно быть от 1 до 20.', 'danger');
        return;
    }

    const costData = calculateEditCostValue();
    if (!costData) {
        showNotification('Не удалось рассчитать стоимость.', 'danger');
        return;
    }

    const supplementary = document.getElementById('edit-opt-supplementary').checked;
    const personalized  = document.getElementById('edit-opt-personalized').checked;
    const excursions    = document.getElementById('edit-opt-excursions').checked;
    const assessment    = document.getElementById('edit-opt-assessment').checked;
    const interactive   = document.getElementById('edit-opt-interactive').checked;

    const weekLength  = editCourseData.week_length  || 0;
    const totalLength = editCourseData.total_length || 0;

    const orderData = {
        course_id:          courseId,
        tutor_id:           0,
        date_start:         dateVal,
        time_start:         timeVal,
        duration:           totalLength * weekLength,
        persons:            students,
        price:              costData.price,
        early_registration: costData.earlyRegistration,
        group_enrollment:   costData.groupEnrollment,
        intensive_course:   costData.intensiveCourse,
        supplementary:      supplementary,
        personalized:       personalized,
        excursions:         excursions,
        assessment:         assessment,
        interactive:        interactive
    };

    await submitOrderUpdate(orderId, orderData);
}

async function handleEditSaveTutor() {
    const orderId  = parseInt(document.getElementById('edit-order-id').value, 10);
    const tutorId  = parseInt(document.getElementById('edit-tutor-id').value, 10);
    const dateVal  = document.getElementById('edit-tutor-date').value;
    const timeVal  = document.getElementById('edit-tutor-time').value;
    const duration = parseInt(document.getElementById('edit-tutor-duration').value, 10);
    const students = parseInt(document.getElementById('edit-students').value, 10);

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

    const pricePerHour = editTutorData.price_per_hour || 0;
    const { earlyRegistration, groupEnrollment } = calcEditTutoringAutoOptions();

    let totalCost = pricePerHour * duration * students;
    if (earlyRegistration) totalCost *= 0.90;
    if (groupEnrollment)   totalCost *= 0.85;

    const orderData = {
        tutor_id:            tutorId,
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

    await submitOrderUpdate(orderId, orderData);
}

async function submitOrderUpdate(orderId, orderData) {
    const saveBtn = document.getElementById('edit-save-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Сохранение...';

    try {
        const updatedOrder = await updateOrder(orderId, orderData);

        const idx = allOrders.findIndex(o => o.id === orderId);
        if (idx !== -1) {
            allOrders[idx] = {
                ...allOrders[idx],
                ...updatedOrder,
                course_name: allOrders[idx].course_name
            };
        }

        renderOrdersTable();

        bootstrap.Modal.getInstance(
            document.getElementById('editOrderModal')
        ).hide();

        showNotification('Заявка успешно обновлена!', 'success');
    } catch (error) {
        showNotification(`Ошибка при обновлении заявки: ${error.message}`, 'danger');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="bi bi-floppy me-1"></i>Сохранить';
    }
}

function openDeleteModal(orderId) {
    orderToDeleteId = orderId;
    const order = allOrders.find(o => o.id === orderId);
    document.getElementById('delete-order-info').textContent =
        order ? `Заявка #${order.id} – ${order.course_name || 'курс'}` : '';

    bootstrap.Modal.getOrCreateInstance(
        document.getElementById('deleteOrderModal')
    ).show();
}

async function handleOrderDelete() {
    if (!orderToDeleteId) return;

    const confirmBtn = document.getElementById('delete-confirm-btn');
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Удаление...';

    try {
        await deleteOrder(orderToDeleteId);

        allOrders = allOrders.filter(o => o.id !== orderToDeleteId);

        const totalPages = Math.ceil(allOrders.length / ORDERS_PER_PAGE);
        if (currentOrderPage > totalPages && totalPages > 0) {
            currentOrderPage = totalPages;
        }

        renderOrdersTable();

        bootstrap.Modal.getInstance(
            document.getElementById('deleteOrderModal')
        ).hide();

        showNotification('Заявка успешно удалена.', 'success');
    } catch (error) {
        showNotification(`Ошибка при удалении заявки: ${error.message}`, 'danger');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="bi bi-trash me-1"></i>Да';
        orderToDeleteId = null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadOrders();

    document.getElementById('edit-save-btn').addEventListener('click', handleEditSave);

    document.getElementById('delete-confirm-btn').addEventListener('click', handleOrderDelete);

    document.getElementById('edit-date').addEventListener('change', () => {
        const dateVal = document.getElementById('edit-date').value;
        updateEditTimeSelect(dateVal);
        updateEditDuration();
        updateEditCost();
    });

    document.getElementById('edit-time').addEventListener('change', updateEditCost);

    document.getElementById('edit-students').addEventListener('input', () => {
        if (editTutorData) {
            updateEditTutoringCost();
        } else {
            updateEditCost();
        }
    });

    document.querySelectorAll('.edit-option').forEach(cb => {
        cb.addEventListener('change', updateEditCost);
    });

    document.getElementById('edit-tutor-date').addEventListener('change', updateEditTutoringCost);
    document.getElementById('edit-tutor-time').addEventListener('change', updateEditTutoringCost);
    document.getElementById('edit-tutor-duration').addEventListener('input', updateEditTutoringCost);

    document.getElementById('editOrderModal').addEventListener('hidden.bs.modal', () => {
        document.getElementById('edit-order-form').reset();
        document.getElementById('edit-time').disabled = true;
        document.getElementById('edit-duration').value = '';
        document.getElementById('edit-total-cost').value = '';
        document.getElementById('edit-auto-badges').innerHTML =
            '<span class="text-muted small">Будут рассчитаны после заполнения формы</span>';
        editCourseData = null;
        editTutorData = null;
    });
});
