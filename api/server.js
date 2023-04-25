const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const winston = require("winston");
const package = require("./package.json");

const apiRoot = "/api";
const port = process.env.PORT || 5000;

const app = express();
// configure
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
//app.use(cors({ origin: /http:\/\/localhost/ }));
app.use(
	cors({ origin: "https://yellow-ground-037e8fa03.3.azurestaticapps.net" })
);
app.options("*", cors());

// Winston Logger
const logger = winston.createLogger({
	level: "info",
	format: winston.format.combine(
		winston.format.timestamp(),
		winston.format.printf(
			(info) => `${info.timestamp} ${info.level}: ${info.message}`
		)
	),
	transports: [
		new winston.transports.Console(),
		new winston.transports.File({
			filename: "logs/error.log",
			level: "error",
		}),
		new winston.transports.File({ filename: "logs/server.log" }),
	],
});

app.use((req, res, next) => {
	// Log an info message for each incoming request
	logger.info(`Received a ${req.method} request for ${req.url}`);
	next();
});

// Simple DB
const db = {
	test: {
		username: "test",
		currency: "£",
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
		logger.info(`No account found for user ${user}`);
		return;
	}
	return res.json(account);
});

// Create new account
router.post("/accounts", (req, res) => {
	const body = req.body;
	logger.info(`Account creation request for user ${body.username}`);

	// Validate required values
	if (!body.username || !body.currency) {
		logger.info(`Missing required fields for user ${body.username}`);
		res.status(400).json({ error: "Missing required fields" });
		return;
	}

	// Check that account does not exist
	if (db[body.username]) {
		res.status(400).json({
			error: `Account already exists for user ${body.username}`,
		});
		logger.info(`Account already exists for user ${body.username}`);
		return;
	}

	// Balance verification
	let bal = body.balance;
	if (bal && typeof bal !== "number") {
		bal = parseFloat(bal);
		if (isNaN(bal)) {
			logger.info(`Invalid balance value: ${body.balance}`);
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

	logger.info(`Account successfully created for user ${body.username}`);
	return res.status(201).json(account);
});

// Update account details
router.put("/accounts/:username", (req, res) => {
	const body = req.body;
	const user = req.params.username;
	const account = db[user];

	logger.info(`Account update request for user ${user}`);

	// Send 404 if account not found
	if (!account) {
		logger.info(`No account found for user ${user}`);
		res.status(404).json({ error: `No account found for user ${user}` });
		return;
	}

	// Validate only certain items editable
	if (body.username || body.balance || body.transactions) {
		res.status(400).json({
			error: "Only currency and description can be updated",
		});
		logger.info(`Immutable field update requested for user ${user}`);
		return;
	}

	// Update description and currency
	if (body.description) {
		account.description = body.description;
		logger.info(
			`Description updated for user ${user}: ${body.description}`
		);
	}

	if (body.currency) {
		account.currency = body.currency;
		logger.info(`Currency updated for user ${user}: ${body.currency}`);
	}

	return res.status(201).json(account);
});

// Delete account
router.delete("/accounts/:username", (req, res) => {
	const user = req.params.username;
	const account = db[user];

	logger.info(`Account deletion request for user ${user}`);

	// Send 404 if account not found
	if (!account) {
		logger.info(`No account found for user ${user}`);
		res.status(404).json({ error: `No account found for user ${user}` });
		return;
	}

	delete db[user];
	logger.info(`Account deleted for user ${user}`);
	return res.status(204);
});

// Get all transactions
router.get("/accounts/:username/transactions", (req, res) => {
	const user = req.params.username;
	const account = db[user];

	logger.info(`Transaction list requested for user ${user}`);

	// Send 404 if account not found
	if (!account) {
		logger.info(`No account found for user ${user}`);
		res.status(404).json({ error: `No account found for user ${user}` });
	}

	logger.info(`Transaction list sent for user ${user}`);
	return res.json(account.transactions);
});

// Get a specific transaction by ID
router.get("/accounts/:username/transactions/:id", (req, res) => {
	const user = req.params.username;
	const id = req.params.id - 1;
	const account = db[user];
	const transaction = account.transactions[id];

	logger.info(`Transaction ${id} requested for user ${user}`);

	// Send 404 if account not found
	if (!account) {
		logger.info(`No account found for user ${user}`);
		res.status(404).json({ error: `No account found for user ${user}` });
	}

	// Send 404 if ID is not a number
	if (isNaN(id)) {
		logger.info(`Invalid ID (NaN): ${req.params.id}`);
		res.status(404).json({ error: `Invalid ID: ${req.params.id}` });
		return;
	}

	// Send 404 if ID is not a transaction
	if (!transaction) {
		logger.info(`Invalid ID (Not a Transaction): ${req.params.id}`);
		res.status(404).json({ error: `Invalid ID: ${req.params.id}` });
		return;
	}

	return res.json(transaction);
});

// Create a new transaction
router.post("/accounts/:username/transactions", (req, res) => {
	const account = db[req.params.username];
	logger.info(`Transaction creation request for user ${req.params.username}`);

	// Check if account exists
	if (!account) {
		logger.info(`User does not exist: ${req.params.username}`);
		return res.status(404).json({ error: "User does not exist" });
	}

	// Check mandatory params
	if (!req.body.object || !req.body.amount || !req.body.date) {
		logger.info(`Missing required parameters: ${req.body}`);
		return res.status(400).json({ error: "Missing required parameters" });
	}

	// Convert amount to number if needed
	let amount = req.body.amount;
	if (amount && typeof amount !== "number") {
		amount = parseFloat(amount);
	}

	// Check that amount is a valid number
	if (amount && isNaN(amount)) {
		logger.info(`Amount is not a number: ${req.body.amount}`);
		return res.status(400).json({ error: "Amount must be a number" });
	}

	// Generate ID
	const id = crypto
		.createHash("md5")
		.update(req.body.date + req.body.object + req.body.amount)
		.digest("hex");

	// Check that transaction does not already exist
	if (account.transactions.some((transaction) => transaction.id === id)) {
		logger.info(`Transaction already exists: ${id}`);
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

	logger.info(
		`Transaction created for user ${req.params.username}, ID: ${id}`
	);
	return res.status(201).json(transaction);
});

app.use(apiRoot, router);

app.listen(port, () => {
	logger.log("info", `Server listening on port ${port}`);
});
