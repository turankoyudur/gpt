async function loadPosts() {
  const res = await fetch('/api/posts');
  const posts = await res.json();
  const container = document.getElementById('posts');
  container.innerHTML = '';
  posts.reverse().forEach(post => {
    const col = document.createElement('div');
    col.className = 'col-md-6';
    col.innerHTML = `
      <div class="card bg-secondary text-light h-100">
        <div class="card-body">
          <h5 class="card-title">${post.title}</h5>
          <p class="card-text">${post.content}</p>
          <p class="text-end small">${new Date(post.date).toLocaleString()}</p>
        </div>
      </div>`;
    container.appendChild(col);
  });
}
loadPosts();
