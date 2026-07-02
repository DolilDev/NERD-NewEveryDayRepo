let authToken = null;

export const setAuthToken = (token) => {
  authToken = token;
};

export const getAuthToken = () => {
  return authToken;
};

export const clearAuthToken = () => {
  authToken = null;
};

const apiCall = async (endpoint, options = {}) => {
  const url = `/api${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    const errorMessage = error.error || 'An error occurred';
    throw new Error(errorMessage);
  }

  return response.json();
};

// Authentication endpoints
export const registerUser = (username, password) => {
  return apiCall('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
};

export const loginUser = (username, password) => {
  return apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
};

// Transaction endpoints
export const getTransactions = (filters = {}) => {
  const query = new URLSearchParams();
  if (filters.type) query.append('type', filters.type);
  if (filters.category) query.append('category', filters.category);

  const queryString = query.toString();
  const endpoint = `/transactions${queryString ? '?' + queryString : ''}`;

  return apiCall(endpoint, {
    method: 'GET'
  });
};

export const createTransaction = (transaction) => {
  return apiCall('/transactions', {
    method: 'POST',
    body: JSON.stringify(transaction)
  });
};

export const getTransaction = (id) => {
  return apiCall(`/transactions/${id}`, {
    method: 'GET'
  });
};

export const updateTransaction = (id, updates) => {
  return apiCall(`/transactions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
};

export const deleteTransaction = (id) => {
  return apiCall(`/transactions/${id}`, {
    method: 'DELETE'
  });
};

// Summary endpoint
export const getSummary = () => {
  return apiCall('/summary', {
    method: 'GET'
  });
};
