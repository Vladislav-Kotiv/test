

window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const courseSysId = urlParams.get('course_sys_id');
    const url = `http://localhost:3000/get-students?course_sys_id=${courseSysId}`;
  
    fetch(url, {
      method: 'POST',
    })
      .then((response) => response.json())
      .then((data) => {
        console.log(data);
  
        const table = document.createElement('table');
        table.classList.add('my-table');
  
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
  
        const emptyHeader = document.createElement('th');
        headerRow.appendChild(emptyHeader);
  
        const uniqueLabNames = [...new Set(data.map((result) => result.lab_name))];
        uniqueLabNames.forEach((labName) => {
          const nameHeader = document.createElement('th');
          nameHeader.textContent = labName;
          headerRow.appendChild(nameHeader);
        });
  
        const sumHeader = document.createElement('th'); // Додати заголовок для суми
        sumHeader.textContent = 'Сума';
        headerRow.appendChild(sumHeader);
  
        thead.appendChild(headerRow);
        table.appendChild(thead);
  
        const tbody = document.createElement('tbody');
        const addresses = [...new Set(data.map((result) => result.adress))];
  
        addresses.forEach((address) => {
          const row = document.createElement('tr');
  
          const addressCell = document.createElement('td');
          addressCell.textContent = address;
          row.appendChild(addressCell);
  
          const addressData = data.filter((result) => result.adress === address);
          let sum = 0; // Змінна для обчислення суми оцінок
  
          uniqueLabNames.forEach((labName) => {
            const labData = addressData.find((result) => result.lab_name === labName);
            const scoreCell = document.createElement('td');
            scoreCell.textContent = labData ? labData.lab_score : '';
            row.appendChild(scoreCell);
  
            sum += labData ? labData.lab_score : 0; // Додати оцінку до суми
          });
  
          const sumCell = document.createElement('td'); // Додати комірку з сумою
          sumCell.textContent = sum;
          row.appendChild(sumCell);
  
          tbody.appendChild(row);
        });
  
        table.appendChild(tbody);
  
        const resultsDiv = document.getElementById('results');
        resultsDiv.appendChild(table);
      })
      .catch((error) => {
        console.error('Error:', error);
      });


      const mainDiv = document.getElementById('main');
      mainDiv.addEventListener('click', () => {
        window.location.href = 'http://localhost:3000';
      });
  });
  
  
  
  
  
  
  
  
  
  
  
  

// Код для кнопки
const button = document.getElementById('get-scores-button');
button.addEventListener('click', async () => {
  const authWindow = window.open('/auth', '_blank', 'width=500,height=600');

  const checkAuthWindowClosed = setInterval(() => {
    if (authWindow.closed) {
      clearInterval(checkAuthWindowClosed);
      // Виклик ендпоінту для отримання даних студентів після закриття вікна аутентифікації
      fetch('/students/:course_sys_id')
        .then((response) => response.json())
        .then((data) => {
          // Обробка отриманих даних
          console.log('Отримані дані:', data);
          // Виконайте необхідні дії з отриманими даними
        })
        .catch((error) => {
          console.error('Помилка отримання даних студентів:', error);
          // Обробка помилки
        });
    }
  }, 500);
});

// Функція для створення динамічних елементів з даними
function createStudentElements(data) {
    // Отримання батьківського елемента, в який будуть вставлені динамічні елементи
    const container = document.getElementById('students-container');
  
    // Очищення контейнера перед відображенням даних
    container.innerHTML = '';
  
    // Перебір даних студентів
    data.forEach(student => {
      const studentId = student.studentId;
      const fullName = student.fullName;
      const labScore = student.labScore;
  
      // Створення елементів для відображення даних студента
      const studentElement = document.createElement('div');
      studentElement.classList.add('student');
  
      const idElement = document.createElement('p');
      idElement.textContent = `Student ID: ${studentId}`;
  
      const nameElement = document.createElement('p');
      nameElement.textContent = `Full Name: ${fullName}`;
  
      const scoreElement = document.createElement('p');
      scoreElement.textContent = `Lab Score: ${labScore}`;
  
      // Додавання елементів до батьківського елемента
      studentElement.appendChild(idElement);
      studentElement.appendChild(nameElement);
      studentElement.appendChild(scoreElement);
  
      container.appendChild(studentElement);
    });
  }
  
  // Функція для отримання даних студентів
  function getStudentsData() {
    fetch('/students_data')
      .then(response => response.json())
      .then(data => {
        console.log('Отримані дані студентів:', data);
        createStudentElements(data);
      })
      .catch(error => {
        console.error('Помилка отримання даних студентів:', error);
      });
  }

// Код для кнопки
const b = document.getElementById('save-button');
b.addEventListener('click', async () => {

  getStudentsData();
});



  