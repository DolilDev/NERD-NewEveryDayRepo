<script>
  import { setAuthToken, clearAuthToken, loginUser, registerUser } from './api/client.js';
  import { clearStores } from './stores/transactions.js';
  import Dashboard from './lib/Dashboard.svelte';

  let isAuthenticated = false;
  let showLogin = true;
  let username = '';
  let password = '';
  let passwordConfirm = '';
  let error = '';
  let loading = false;
  let currentUser = '';

  async function handleLogin() {
    error = '';
    loading = true;

    if (!username || !password) {
      error = 'Username and password are required';
      loading = false;
      return;
    }

    try {
      const response = await loginUser(username, password);
      setAuthToken(response.token);
      currentUser = response.username;
      isAuthenticated = true;
      username = '';
      password = '';
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  async function handleRegister() {
    error = '';
    loading = true;

    if (!username || !password || !passwordConfirm) {
      error = 'All fields are required';
      loading = false;
      return;
    }

    if (password !== passwordConfirm) {
      error = 'Passwords do not match';
      loading = false;
      return;
    }

    if (password.length < 6) {
      error = 'Password must be at least 6 characters';
      loading = false;
      return;
    }

    try {
      const response = await registerUser(username, password);
      setAuthToken(response.token);
      currentUser = response.username;
      isAuthenticated = true;
      username = '';
      password = '';
      passwordConfirm = '';
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  function handleLogout() {
    isAuthenticated = false;
    showLogin = true;
    clearAuthToken();
    clearStores();
    currentUser = '';
    username = '';
    password = '';
    passwordConfirm = '';
    error = '';
  }

  function toggleAuthMode() {
    showLogin = !showLogin;
    error = '';
    username = '';
    password = '';
    passwordConfirm = '';
  }
</script>

<style>
  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    padding: 20px;
  }

  :global(#app) {
    min-height: 100vh;
  }

  .auth-container {
    max-width: 400px;
    margin: 0 auto;
    padding: 40px 30px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    animation: slideUp 0.3s ease-out;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .auth-header {
    text-align: center;
    margin-bottom: 30px;
  }

  .auth-title {
    font-size: 28px;
    font-weight: bold;
    color: #1f2937;
    margin-bottom: 8px;
  }

  .auth-subtitle {
    font-size: 14px;
    color: #6b7280;
  }

  .form-group {
    margin-bottom: 15px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  label {
    font-weight: 600;
    color: #374151;
    font-size: 14px;
  }

  input {
    padding: 12px 14px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    font-size: 14px;
    transition: border-color 0.2s;
  }

  input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .error-message {
    color: #ef4444;
    font-size: 13px;
    padding: 10px;
    background: #fee2e2;
    border-radius: 6px;
    margin-bottom: 15px;
    border-left: 3px solid #ef4444;
  }

  .button-group {
    display: flex;
    gap: 10px;
    margin-top: 20px;
  }

  button {
    flex: 1;
    padding: 12px;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .submit-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    flex: 2;
  }

  .submit-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  .submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .toggle-btn {
    background: #f3f4f6;
    color: #374151;
  }

  .toggle-btn:hover {
    background: #e5e7eb;
  }

  .toggle-text {
    text-align: center;
    margin-top: 15px;
    font-size: 13px;
    color: #6b7280;
  }

  .toggle-link {
    color: #667eea;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
  }

  .toggle-link:hover {
    text-decoration: underline;
  }

  .user-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 15px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .user-info {
    color: #1f2937;
    font-weight: 600;
  }

  .logout-btn {
    padding: 8px 16px;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .logout-btn:hover {
    background: #dc2626;
  }

  @media (max-width: 480px) {
    .auth-container {
      padding: 30px 20px;
    }

    .button-group {
      flex-direction: column;
    }

    .submit-btn {
      flex: 1;
    }
  }
</style>

{#if isAuthenticated}
  <div class="user-header">
    <span class="user-info">👤 {currentUser}</span>
    <button class="logout-btn" on:click={handleLogout}>Logout</button>
  </div>
  <Dashboard />
{:else}
  <div class="auth-container">
    <div class="auth-header">
      <div class="auth-title">💰 Finance Tracker</div>
      <div class="auth-subtitle">
        {showLogin ? 'Welcome back' : 'Create an account'}
      </div>
    </div>

    {#if error}
      <div class="error-message">{error}</div>
    {/if}

    <form on:submit|preventDefault={showLogin ? handleLogin : handleRegister}>
      <div class="form-group">
        <label for="username">Username</label>
        <input
          id="username"
          type="text"
          bind:value={username}
          placeholder="Enter your username"
          disabled={loading}
          required
        />
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input
          id="password"
          type="password"
          bind:value={password}
          placeholder="Enter your password"
          disabled={loading}
          required
        />
      </div>

      {#if !showLogin}
        <div class="form-group">
          <label for="passwordConfirm">Confirm Password</label>
          <input
            id="passwordConfirm"
            type="password"
            bind:value={passwordConfirm}
            placeholder="Confirm your password"
            disabled={loading}
            required
          />
        </div>
      {/if}

      <div class="button-group">
        <button
          type="submit"
          class="submit-btn"
          disabled={loading}
        >
          {loading ? 'Loading...' : (showLogin ? 'Login' : 'Register')}
        </button>
      </div>
    </form>

    <div class="toggle-text">
      {showLogin ? "Don't have an account?" : 'Already have an account?'}
      <span class="toggle-link" on:click={toggleAuthMode}>
        {showLogin ? 'Register' : 'Login'}
      </span>
    </div>
  </div>
{/if}
