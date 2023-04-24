const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const package = require("./package.json");

const apiRoot = "/api";
const port = process.env.PORT || 5000;

const app = express();
// configure
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors({ origin: /http:\/\/localhost/ }));
app.options("*", cors());

// Simple DB
const db = {
	test: {
		username: "test",
		currency: "GBP",
		balance: 1000,
		description: "test account",
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
		if (isNaN(bal)) {
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
	const transaction = account.transactions[id];

	// Send 404 if account not found
	if (!account) {
		res.status(404).json({ error: `No account found for user ${user}` });
	}

	// Send 404 if ID is not a number
	if (isNaN(id)) {
		res.status(404).json({ error: `Invalid ID: ${req.params.id}` });
	}

	// Send 404 if ID is not a transaction
	if (!transaction) {
		res.status(404).json({ error: `Invalid ID: ${req.params.id}` });
	}

	return res.json(transaction);
});

// Create a new transaction
router.post("/accounts/:username/transactions", (req, res) => {
	const account = db[req.params.username];

	// Check if account exists
	if (!account) {
		return res.status(404).json({ error: "User does not exist" });
	}

	// Check mandatory params
	if (!req.body.object || !req.body.amount || !req.body.date) {
		return res.status(400).json({ error: "Missing parameters" });
	}

	// Convert amount to number if needed
	let amount = req.body.amount;
	if (amount && typeof amount !== "number") {
		amount = parseFloat(amount);
	}

	// Check that amount is a valid number
	if (amount && isNaN(amount)) {
		return res.status(400).json({ error: "Amount must be a number" });
	}

	// Generate ID
	const id = crypto
		.createHash("md5")
		.update(req.body.date + req.body.object + req.body.amount)
		.digest("hex");

	// Check that transaction does not already exist
	if (account.transactions.some((transaction) => transaction.id === id)) {
		return res.status(409).json({ error: "Transaction already exists" });
	}

	// Add transaction
	const transaction = {
		id,
		date: req.body.date,
		object: req.body.amount,
		amount,
	};
	account.transactions.push(transaction);

	// Update balance
	account.balance += transaction.amount;

	return res.status(201).json(transaction);
});

app.use(apiRoot, router);

app.listen(port, () => {
	console.log(`Server listening on port ${port}`);
});
