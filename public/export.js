$(document).ready(() => {
  $('#save-button').click(() => {
    // Відправка запиту на сервер для експорту даних
    $.ajax({
      url: '/export',
      type: 'GET',
      success: (response) => {
        console.log(response);
        alert('Дані експортовано успішно!');
      },
      error: (error) => {
        console.error('Помилка експорту даних:', error);
      }
    });
  });
});