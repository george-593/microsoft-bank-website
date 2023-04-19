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

window.onpopstate = () => updateRoute();
updateRoute();
