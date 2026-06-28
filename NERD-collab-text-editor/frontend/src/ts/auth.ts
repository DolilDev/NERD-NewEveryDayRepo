import { login, register, setToken } from "./api";

const loginTab = document.getElementById("loginTab") as HTMLButtonElement;
const registerTab = document.getElementById("registerTab") as HTMLButtonElement;
const formTitle = document.getElementById("formTitle") as HTMLHeadingElement;
const authForm = document.getElementById("authForm") as HTMLFormElement;
const usernameInput = document.getElementById("username") as HTMLInputElement;
const passwordInput = document.getElementById("password") as HTMLInputElement;
const submitButton = document.getElementById("submitButton") as HTMLButtonElement;
const toast = document.getElementById("toast") as HTMLDivElement;

let mode: "login" | "register" = "login";

function showToast(message: string) {
  toast.textContent = message;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 3000);
}

function selectMode(selected: "login" | "register") {
  mode = selected;
  loginTab.classList.toggle("active", selected === "login");
  registerTab.classList.toggle("active", selected === "register");
  formTitle.textContent = selected === "login" ? "Login" : "Register";
  submitButton.textContent = selected === "login" ? "Continue" : "Create account";
}

loginTab.addEventListener("click", () => selectMode("login"));
registerTab.addEventListener("click", () => selectMode("register"));

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  if (!username || !password) {
    showToast("Username and password are required.");
    return;
  }

  try {
    const response = mode === "login" ? await login(username, password) : await register(username, password);
    setToken(response.access_token);
    sessionStorage.setItem("nerd-jwt", response.access_token);
    window.location.href = "./editor.html";
  } catch (error: any) {
    showToast(error.body?.detail || "Authentication failed.");
  }
});

selectMode("login");
