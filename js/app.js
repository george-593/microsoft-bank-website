const routes = {
	"/login": { templateId: "login", title: "Login" },
	"/dashboard": { templateId: "dashboard", title: "Dashboard" },
};

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
		return console.error(res.error);
	}
	console.log("Account created!", res);
}

async function createAccount(account) {
	try {
		const resp = await fetch("//localhost:5000/api/accounts", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: account,
		});
		return await resp.json();
	} catch (err) {
		return { error: err.message || "Unknown Error" };
	}
}

window.onpopstate = () => updateRoute();
updateRoute();
