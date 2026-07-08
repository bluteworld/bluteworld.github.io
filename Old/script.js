
document.querySelectorAll('.blute-card').forEach(card => {
  const img = card.querySelector('img');

  const removeOverlay = () => {
    card.querySelectorAll('.red-overlay, .green-overlay, .black-overlay').forEach(el => el.remove());
  };

  card.querySelector('.btn.red').onclick = () => {
    removeOverlay();
    const overlay = document.createElement('div');
    overlay.className = 'red-overlay';
    card.appendChild(overlay);
  };

  card.querySelector('.btn.green').onclick = () => {
    removeOverlay();
    const overlay = document.createElement('div');
    overlay.className = 'green-overlay';
    card.appendChild(overlay);
  };

  card.querySelector('.btn.reset').onclick = () => {
    removeOverlay();
  };
});
