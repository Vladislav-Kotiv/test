const groupsTab = document.querySelector('.tab1:nth-child(2)');
const importTab = document.querySelector('.tab3');

// Обробник події для натискання на елемент "Групи"
groupsTab.addEventListener('click', () => {
  window.location.href = 'groups.html';
});