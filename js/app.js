const routes = {
	"/login": { templateId: "login", title: "Login" },
	"/dashboard": { templateId: "dashboard", title: "Dashboard" },
	"/register": { templateId: "register", title: "Register" },
};

const BASE_URL = "//localhost:5000";

let account = null;

function updateRoute() {
	// Get the current path
	const path = window.location.pathname;
	const route = routes[path];
	// If the path is not defined, redirect to login
	if (!route) {
		return navigate("/login");
	}

	// Render the view
	const template = document.getElementById(route.templateId);
	const view = template.content.cloneNode(true);
	const app = document.getElementById("app");
	app.innerHTML = "";
	app.appendChild(view);

	// Set the title
	document.title = route.title;
}

function navigate(path) {
	window.history.pushState({}, path, path);
	updateRoute();
}

function onLinkClick(event) {
	event.preventDefault();
	navigate(event.target.href);
}

async function register() {
	const registerForm = document.getElementById("registerForm");
	const formData = new FormData(registerForm);
	const data = Object.fromEntries(formData);
	const jsonData = JSON.stringify(data);

	const res = await createAccount(jsonData);

	if (res.error) {
		return updateElement("registerError", res.error);
	}
	console.log("Account created!", res);

	account = res;
	navigate("/dashboard");
}

async function createAccount(account) {
	try {
		const resp = await fetch(`${BASE_URL}/api/accounts`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: account,
		});
		return await resp.json();
	} catch (err) {
		return { error: err.message || "Unknown Error" };
	}
}

async function login() {
	const loginForm = document.getElementById("loginForm");
	const user = loginForm.username.value;
	const data = await getAccount(user);

	if (data.error) {
		return updateElement("loginError", data.error);
	}

	account = data;
	navigate("/dashboard");
}

async function getAccount(account) {
	try {
		const response = await fetch(
			`${BASE_URL}/api/accounts/${encodeURIComponent(account)}`
		);
		return await response.json();
	} catch (err) {
		return { error: err.message || "Unknown Error" };
	}
}

function updateElement(id, text) {
	const element = document.getElementById(id);
	element.textContent = text;
}

window.onpopstate = () => updateRoute();
updateRoute();
