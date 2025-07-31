document.getElementById('postForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('title').value;
  const content = document.getElementById('content').value;
  const res = await fetch('/api/posts', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ title, content })
  });
  if (res.ok) {
    alert('Kayıt başarılı');
    document.getElementById('postForm').reset();
  } else {
    alert('Hata oluştu');
  }
});
