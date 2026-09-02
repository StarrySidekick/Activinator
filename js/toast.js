/* Activinator — the one line of feedback.
   Its own module because everything says something and nothing should have to
   import the table to do it. */
const toast = (msg) => {
  const t = document.getElementById('toast');
  if (!t || !msg) return;
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 1500);
};
export { toast };
