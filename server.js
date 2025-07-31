const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function getPosts() {
  try {
    const data = fs.readFileSync(path.join(__dirname, 'data', 'posts.json'));
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function savePosts(posts) {
  fs.writeFileSync(path.join(__dirname, 'data', 'posts.json'), JSON.stringify(posts, null, 2));
}

app.get('/api/posts', (req, res) => {
  res.json(getPosts());
});

app.post('/api/posts', (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Eksik veri' });
  const posts = getPosts();
  posts.push({ title, content, date: Date.now() });
  savePosts(posts);
  res.status(201).json({ success: true });
});

app.listen(PORT, () => console.log('Server running on port', PORT));
