(function () {
  const productId = new URLSearchParams(window.location.search).get('id');
  const client = window.BelissimaAuth?.client;
  if (!productId || !client) return;

  const form = document.getElementById('review-form');
  const login = document.getElementById('review-login');
  const picker = document.getElementById('review-star-picker');
  const comment = document.getElementById('review-comment');
  const submit = document.getElementById('review-submit');
  const message = document.getElementById('review-message');
  const list = document.getElementById('reviews-list');
  let session = null;
  let selectedRating = 0;
  let reviews = [];

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));

  const stars = (rating) => `${'★'.repeat(Math.round(rating))}${'☆'.repeat(5 - Math.round(rating))}`;
  const reviewDate = (value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  function setSelectedRating(rating) {
    selectedRating = Number(rating || 0);
    picker.querySelectorAll('[data-rating]').forEach((button) => {
      const active = Number(button.dataset.rating) <= selectedRating;
      button.classList.toggle('active', active);
      button.setAttribute('aria-checked', String(Number(button.dataset.rating) === selectedRating));
    });
  }

  function renderSummary() {
    const total = reviews.length;
    const average = total ? reviews.reduce((sum, review) => sum + Number(review.rating), 0) / total : 0;
    const averageText = average.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    document.getElementById('reviews-average').textContent = averageText;
    document.getElementById('reviews-count').textContent = total ? `${total} ${total === 1 ? 'avaliação' : 'avaliações'}` : 'Nenhuma avaliação';
    const fill = document.getElementById('reviews-stars-fill');
    fill.style.width = `${(average / 5) * 100}%`;
    fill.parentElement.setAttribute('aria-label', total ? `Nota ${averageText} de 5` : 'Sem avaliações');

    const headerStars = document.getElementById('pdp-rating-stars');
    const headerCopy = document.getElementById('pdp-rating-copy');
    headerStars.textContent = total ? stars(average) : '☆☆☆☆☆';
    headerCopy.textContent = total ? `${averageText} (${total})` : 'Seja o primeiro a avaliar';

    document.getElementById('reviews-breakdown').innerHTML = [5, 4, 3, 2, 1].map((rating) => {
      const count = reviews.filter((review) => Number(review.rating) === rating).length;
      const percent = total ? (count / total) * 100 : 0;
      return `<div class="review-breakdown-row"><span>${rating} ★</span><i><b style="width:${percent}%"></b></i><small>${count}</small></div>`;
    }).join('');
  }

  function renderList() {
    if (!reviews.length) {
      list.innerHTML = '<p class="product-content-empty">Este produto ainda não recebeu avaliações.</p>';
      return;
    }
    list.innerHTML = reviews.slice(0, 12).map((review) => `
      <article class="review-card">
        <div class="review-card-head"><div><strong>Cliente Belíssima</strong><span aria-label="${review.rating} de 5 estrelas">${stars(review.rating)}</span></div><time datetime="${escapeHtml(review.created_at)}">${reviewDate(review.created_at)}</time></div>
        ${review.comment ? `<p>${escapeHtml(review.comment)}</p>` : '<p class="review-without-comment">Avaliação registrada sem comentário.</p>'}
      </article>`).join('');
  }

  async function loadReviews() {
    const { data, error } = await client.from('product_reviews').select('id,product_id,user_id,rating,comment,created_at,updated_at').eq('product_id', productId).order('created_at', { ascending: false });
    if (error) {
      list.innerHTML = '<p class="product-content-empty">Não foi possível carregar as avaliações agora.</p>';
      return;
    }
    reviews = data || [];
    renderSummary();
    renderList();

    const ownReview = session ? reviews.find((review) => review.user_id === session.user.id) : null;
    if (ownReview) {
      setSelectedRating(ownReview.rating);
      comment.value = ownReview.comment || '';
      submit.textContent = 'ATUALIZAR AVALIAÇÃO';
    }
  }

  picker.querySelectorAll('[data-rating]').forEach((button) => {
    button.addEventListener('click', () => {
      setSelectedRating(button.dataset.rating);
      message.textContent = '';
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!session) return;
    if (!selectedRating) {
      message.textContent = 'Escolha de 1 a 5 estrelas.';
      message.className = 'review-message error';
      return;
    }
    submit.disabled = true;
    submit.textContent = 'SALVANDO…';
    message.textContent = '';
    const payload = {
      product_id: productId,
      user_id: session.user.id,
      rating: selectedRating,
      comment: comment.value.trim() || null,
    };
    const { error } = await client.from('product_reviews').upsert(payload, { onConflict: 'product_id,user_id' });
    if (error) {
      message.textContent = 'Não foi possível salvar sua avaliação. Tente novamente.';
      message.className = 'review-message error';
    } else {
      message.textContent = 'Sua avaliação foi publicada.';
      message.className = 'review-message success';
      await loadReviews();
    }
    submit.disabled = false;
    if (submit.textContent === 'SALVANDO…') submit.textContent = 'PUBLICAR AVALIAÇÃO';
  });

  (async () => {
    const { data } = await client.auth.getSession();
    session = data.session;
    form.hidden = !session;
    login.hidden = Boolean(session);
    await loadReviews();
  })();
})();
