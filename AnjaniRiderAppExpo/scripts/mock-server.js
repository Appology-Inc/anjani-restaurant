const http = require('http');
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../assets/cloud_db.json');

// Ensure assets directory exists
if (!fs.existsSync(path.dirname(DB_FILE))) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
}

// Load DB
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    return { users: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    return { users: {} };
  }
}

// Save DB
function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url;

  if (req.method === 'POST' && url === '/sync') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const { uid, name, email, phone, addresses, selectedAddressId, previousOrders } = payload;
        
        if (!email && !phone) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Email or phone required' }));
          return;
        }

        const db = readDB();
        
        // Save under both email and phone keys for cross-device retrieval flexibility!
        const userPayload = {
          uid,
          name,
          email,
          phone,
          addresses: addresses || [],
          selectedAddressId: selectedAddressId || '',
          previousOrders: previousOrders || []
        };

        if (email) {
          db.users[email.toLowerCase().trim()] = userPayload;
        }
        if (phone) {
          db.users[phone.trim()] = userPayload;
        }
        
        writeDB(db);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, user: userPayload }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  } else if (req.method === 'GET' && url.startsWith('/user/')) {
    const key = decodeURIComponent(url.substring(6)).toLowerCase().trim();
    const db = readDB();
    const user = db.users[key];
    
    if (user) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, user }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'User not found' }));
    }
  } else {
    res.writeHead(404);
    res.end();
  }
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Cloud DB server running on http://localhost:${PORT}`);
});
