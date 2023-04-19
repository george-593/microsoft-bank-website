const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const package = require("./package.json");

const apiRoot = "/api";
const port = process.env.PORT || 5000;

const app = express();
// configure app
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors({ origin: /http:\/\/localhost/ }));
app.options("*", cors());

// Simple DB
const db = {
	george: {
		username: "george",
		currency: "GBP",
		balance: 1000,
		description: "demo account",
		transactions: [
			{ id: "1", date: "2020-10-01", object: "Pocket money", amount: 50 },
			{ id: "2", date: "2020-10-03", object: "Book", amount: -10 },
			{ id: "3", date: "2020-10-04", object: "Sandwich", amount: -5 },
		],
	},
};

// configure routes
const router = express.Router();
router.get("/", (req, res) => {
	res.send(`${package.description} v${package.version}`);
});

// Get account details
router.get("/accounts/:username", (req, res) => {
	const user = req.params.username;
	const account = db[user];

	// Send 404 if account not found
	if (!account) {
		res.status(404).json({ error: `No account found for user ${user}` });
		return;
	}
	return res.json(account);
});

// Create new account
router.post("/accounts", (req, res) => {
	const body = req.body;

	// Validate required values
	if (!body.username || !body.currency) {
		res.status(400).json({ error: "Missing required fields" });
		return;
	}

	// Check that account does not exist
	if (db[body.username]) {
		res.status(400).json({
			error: `Account already exists for user ${body.username}`,
		});
		return;
	}

	// Balance verification
	let bal = body.balance;
	if (bal && typeof bal !== "number") {
		bal = parseFloat(bal);
		if (NaN(bal)) {
			res.status(400).json({
				error: `Invalid balance value: ${body.balance}`,
			});
			return;
		}
	}

	// Create account
	const account = {
		username: body.username,
		currency: body.currency,
		balance: bal || 0,
		description: body.description || `${body.username}'s account`,
		transactions: [],
	};

	db[account.username] = account;

	return res.status(201).json(account);
});

// Update account details
router.put("/accounts/:username", (req, res) => {
	const body = req.body;
	const user = req.params.username;
	const account = db[user];

	// Send 404 if account not found
	if (!account) {
		res.status(404).json({ error: `No account found for user ${user}` });
		return;
	}

	// Validate only certain items editable
	if (body.username || body.balance || body.transactions) {
		res.status(400).json({
			error: "Only currency and description can be updated",
		});
		return;
	}

	// Update description and currency
	if (body.description) {
		account.description = body.description;
	}

	if (body.currency) {
		account.currency = body.currency;
	}

	return res.status(201).json(account);
});

// Delete account
router.delete("/accounts/:username", (req, res) => {
	const user = req.params.username;
	const account = db[user];

	// Send 404 if account not found
	if (!account) {
		res.status(404).json({ error: `No account found for user ${user}` });
		return;
	}

	delete db[user];
	return res.status(204);
});

// Get all transactions
router.get("/accounts/:username/transactions", (req, res) => {
	const user = req.params.username;
	const account = db[user];

	// Send 404 if account not found
	if (!account) {
		res.status(404).json({ error: `No account found for user ${user}` });
	}

	return res.json(account.transactions);
});

// Get a specific transaction by ID
router.get("/accounts/:username/transactions/:id", (req, res) => {
	const user = req.params.username;
	const id = req.params.id - 1;
	const account = db[user];

	// Send 404 if account not found
	if (!account) {
		res.status(404).json({ error: `No account found for user ${user}` });
	}

	return res.json(account.transactions[id]);
});

// Create a new transaction
router.post("/accounts/:username/transactions", (req, res) => {});

app.use(apiRoot, router);

app.listen(port, () => {
	console.log(`Server listening on port ${port}`);
});
