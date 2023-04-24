const routes = {
	"/login": { templateId: "login", title: "Login" },
	"/dashboard": {
		templateId: "dashboard",
		title: "Dashboard",
		init: updateDashboard,
	},
};

const BASE_URL = "//localhost:5000";

// Helper Functions

function navigate(path) {
	window.history.pushState({}, path, path);
	updateRoute();
}

function updateElement(id, textOrNode) {
	const element = document.getElementById(id);
	element.textContent = "";
	element.append(textOrNode);
}

async function sendRequest(endpoint, method = "GET", body = null) {
	try {
		const resp = await fetch(`${BASE_URL}/api/${endpoint}`, {
			method: method,
			headers: { "Content-Type": "application/json" },
			body: body,
		});
		return await resp.json();
	} catch (err) {
		return { error: err.message || "Unknown Error" };
	}
}

function createTransactionRow(transaction) {
	const template = document.getElementById("transaction");
	const transactionRow = template.content.cloneNode(true);
	const tr = transactionRow.querySelector("tr");

	tr.children[0].textContent = transaction.date;
	tr.children[1].textContent = transaction.object;
	tr.children[2].textContent = transaction.amount.toFixed(2);

	return transactionRow;
}

async function getAccount() {
	const username = localStorage.getItem("username");

	if (!username) {
		return null;
	}
	const account = await sendRequest(
		`accounts/${encodeURIComponent(username)}`
	);
	return account;
}

function setAccount(username) {
	localStorage.setItem("username", username);
}

// Other Functions

function updateRoute() {
	// Get the current path
	const path = window.location.pathname;
	const route = routes[path];
	// If the path is not defined, redirect to login
	if (!route) {
		// If the user is logged in, redirect to dashboard
		let account = getAccount();
		if (account) {
			return navigate("/dashboard");
		}

		return navigate("/login");
	}

	// Clear account cache if on login page
	if (window.location.pathname === "/login") {
		localStorage.removeItem("username");
	}

	// Render the view
	const template = document.getElementById(route.templateId);
	const view = template.content.cloneNode(true);
	const app = document.getElementById("app");
	app.innerHTML = "";
	app.appendChild(view);

	// Set the title
	document.title = route.title;

	// Call the init function if it exists
	if (typeof route.init === "function") {
		route.init();
	}
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
	const res = await sendRequest("accounts", "POST", jsonData);

	if (res.error) {
		return updateElement("registerError", res.error);
	}
	console.log("Account created!", res);

	setAccount(res.username);
	navigate("/dashboard");
}

async function login() {
	const loginForm = document.getElementById("loginForm");
	const user = loginForm.username.value;
	const data = await sendRequest(`accounts/${encodeURIComponent(user)}`);

	if (data.error) {
		return updateElement("loginError", data.error);
	}
	setAccount(data.username);
	navigate("/dashboard");
}

async function updateDashboard() {
	const account = await getAccount();
	if (!account) {
		return navigate("/login");
	}

	updateElement("username", account.username);
	updateElement("description", account.description);
	updateElement("balance", account.balance.toFixed(2));
	updateElement("currency", account.currency);

	const transactionsRows = document.createDocumentFragment();
	for (const transaction of account.transactions) {
		const transactionRow = createTransactionRow(transaction);
		transactionsRows.appendChild(transactionRow);
	}
	updateElement("transactions", transactionsRows);
}

window.onpopstate = () => updateRoute();
updateRoute();
