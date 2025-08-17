import express from 'express';
import fetch from 'node-fetch';
import fs from 'fs';

const app = express();
const port = 8000;

app.get('/api/card', async (req, res) => {
	const id = req.query.id;
	if (!id) return res.status(400).send('Missing user ID');

	const apiURL = `https://www.challengersnexus.com/api/user/profile/${id}`;
	let data;
	try {
		const resp = await fetch(apiURL);
		if (!resp.ok) throw new Error("Failed to fetch profile");
		data = await resp.json();
	} catch (err) {
		return res.status(500).send('Failed to fetch data: ' + err.message);
	}

	const svg = fs.readFileSync('main.svg', 'utf8');

	res.setHeader('Content-Type', 'image/svg+xml');
	res.setHeader('Cache-Control', 'no-store');
	res.send(svg);
});

app.listen(port, () => {
	console.log(`SVG API running at http://localhost:${port}/api/card?id=761`);
});
