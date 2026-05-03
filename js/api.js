const API_BASE_URL = 'http://exam-api-courses.std-900.ist.mospolytech.ru/api';
const API_KEY = 'e3474e93-2ce0-4a72-af5c-4a47e5e99c6e';

function buildUrl(endpoint, params = {}) {
    const url = new URL(API_BASE_URL + endpoint);
    url.searchParams.set('api_key', API_KEY);
    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    });
    return url.toString();
}

async function handleResponse(response) {
    if (!response.ok) {
        let errorMessage = `Ошибка ${response.status}: ${response.statusText}`;
        try {
            const errorData = await response.json();
            if (errorData.error || errorData.message) {
                errorMessage = errorData.error || errorData.message;
            }
        } catch (_) {
            // не JSON – оставляем сообщение по умолчанию
        }
        throw new Error(errorMessage);
    }
    return response.json();
}

async function fetchCourses() {
    const response = await fetch(buildUrl('/courses'));
    return handleResponse(response);
}

async function fetchCourseById(id) {
    const response = await fetch(buildUrl(`/courses/${id}`));
    return handleResponse(response);
}

async function fetchTutors() {
    const response = await fetch(buildUrl('/tutors'));
    return handleResponse(response);
}

async function fetchTutorById(id) {
    const response = await fetch(buildUrl(`/tutors/${id}`));
    return handleResponse(response);
}

async function fetchOrders() {
    const response = await fetch(buildUrl('/orders'));
    return handleResponse(response);
}

async function fetchOrderById(id) {
    const response = await fetch(buildUrl(`/orders/${id}`));
    return handleResponse(response);
}

async function createOrder(orderData) {
    const response = await fetch(buildUrl('/orders'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
    });
    return handleResponse(response);
}

async function updateOrder(id, orderData) {
    const response = await fetch(buildUrl(`/orders/${id}`), {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
    });
    return handleResponse(response);
}

async function deleteOrder(id) {
    const response = await fetch(buildUrl(`/orders/${id}`), {
        method: 'DELETE'
    });
    return handleResponse(response);
}
