// Отримання необхідних елементів
const addButton = document.getElementById("add-button");
const minusButtons = document.querySelectorAll(".minus-button");
const modal = document.getElementById('modal');
const closeBtn = document.querySelector('.close');
const saveButton = document.getElementById('saveButton');
const groupNameInput = document.getElementById('groupNameInput');

// Обробник події для кнопки плюс
addButton.addEventListener("click", function() {
  // Відкриваємо модальне вікно
  const modal = document.getElementById("modal");
  modal.style.display = "block";
  fetchCoursesForModal();
});
// Обробник події для кнопок мінус
minusButtons.forEach(function(button) {
  button.addEventListener("click", function() {
      // Отримуємо батьківський елемент кнопки мінус (групу)
      const group = button.parentElement;
      
      // Видаляємо групу зі списку груп
      group.remove();
  });
});
// Обробник натискання на кнопку "Закрити"
closeBtn.addEventListener('click', () => {
    // Закриваємо модальне вікно
    const modal = document.getElementById("modal");
    modal.style.display = "none";
});

// Обробник натискання на кнопку "Зберегти"
saveButton.addEventListener('click', () => {
  const groupName = groupNameInput.value; // Отримати значення назви групи з поля введення
  if (!groupName) return; // Перевірити, що назва групи не є порожньою
  
  // Отримати вибрані курси
  const selectedCourses = Array.from(document.querySelectorAll('.course-checkbox:checked'))
    .map(checkbox => checkbox.value);
  
  // Виконати запит на створення нової групи
  const data = { name: groupName, courses: selectedCourses };
  
  fetch('http://localhost:3000/create-group', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
    .then(response => response.json())
    .then(result => {
      console.log(result.message);
      modal.style.display = 'none'; // Після успішного збереження, сховати модальне вікно
      fetchGroups(); // Оновити список груп
    })
    .catch(error => console.error('Помилка створення групи:', error));
});

// Функція для отримання курсів для модального вікна
function fetchCoursesForModal() {
  fetch('http://localhost:3000/courses-get')
    .then(response => response.json())
    .then(courses => {
      const coursesContainer = document.getElementById('coursesContainer');
      coursesContainer.innerHTML = ''; // Очистити контейнер перед заповненням

      courses.forEach(course => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = course.id;
        checkbox.classList.add('course-checkbox');

        const label = document.createElement('label');
        label.textContent = course.name;
        label.appendChild(checkbox);

        coursesContainer.appendChild(label);
      });
    })
    .catch(error => console.error('Помилка отримання даних курсів:', error));
}



const mainDiv = document.getElementById('main');
mainDiv.addEventListener('click', () => {
  location.reload();
});




// Функція для створення елемента групи з кнопками "+" та "-"
function createGroupDiv(group) {
  const div = document.createElement('div');
  div.classList.add('group'); // Додати клас "group" до div-елемента
  const divName = document.createElement('div');
  divName.classList.add('groupName'); // Додати клас "group" до div-елемента
  const divButtons = document.createElement('div');
  divButtons.classList.add('groupButtons'); // Додати клас "group" до div-елемента
  const groupName = document.createElement('span');
  groupName.textContent = group.name;
  groupName.classList.add('namespan');
  const minusIcon = document.createElement('span');
  minusIcon.textContent = '-';
  minusIcon.classList.add('minus-icon');

  const deleteButton = document.createElement('div');
  deleteButton.classList.add('delete-button');
  deleteButton.appendChild(minusIcon);
  deleteButton.addEventListener('click', () => deleteGroup(group.id));

  const plusIcon = document.createElement('span');
  plusIcon.textContent = '+';
  plusIcon.classList.add('plus-icon');

  const addButton = document.createElement('div');
  addButton.classList.add('add-button');
  addButton.appendChild(plusIcon);
  addButton.addEventListener('click', () => openAddCourseModal(group.id));

  

  divName.appendChild(groupName);
  divButtons.appendChild(addButton);
  divButtons.appendChild(deleteButton);
  div.appendChild(divName);
  div.appendChild(divButtons);

  return div;
}
// Функція для відкриття модального вікна додавання курсів до групи
function openAddCourseModal(groupId) {
  const modal = document.getElementById('addCourseModal');
  modal.style.display = 'block'; // Показати модальне вікно

  const saveButton = document.getElementById('addCourseSaveButton');
  saveButton.addEventListener('click', () => saveSelectedCourses(groupId));

  fetchCoursesForAddModal(groupId);
}
// Функція для отримання курсів для модального вікна додавання курсів до групи
function fetchCoursesForAddModal(groupId) {
  fetch('http://localhost:3000/courses-get')
    .then(response => response.json())
    .then(courses => {
      const coursesContainer = document.getElementById('addCourseContainer');
      coursesContainer.innerHTML = ''; // Очистити контейнер перед заповненням

      courses.forEach(course => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value= course.sys_id;
        checkbox.classList.add('add-course-checkbox');
        const label = document.createElement('label');
        label.textContent = course.name;
        label.appendChild(checkbox);
    
        coursesContainer.appendChild(label);
      });
    })
    .catch(error => console.error('Помилка отримання курсів:', error));
  }

  // Функція для створення модального вікна додавання курсів до групи
  function createAddCourseModal() {
  const modal = document.createElement('div');
  modal.id = 'addCourseModal';
  modal.classList.add('modal');
  
  const modalContent = document.createElement('div');
  modalContent.classList.add('modal-content');
  
  const header = document.createElement('h2');
  header.textContent = 'Додати курси';
  
  const courseContainer = document.createElement('div');
  courseContainer.id = 'addCourseContainer';
  
  const saveButton = document.createElement('button');
  saveButton.id = 'addCourseSaveButton';
  saveButton.textContent = 'Зберегти';
  
  modalContent.appendChild(header);
  modalContent.appendChild(courseContainer);
  modalContent.appendChild(saveButton);
  
  modal.appendChild(modalContent);
  
  return modal;
  }
  
  // Додати модальне вікно до сторінки
  const body = document.querySelector('body');
  const addCourseModal = createAddCourseModal();
  body.appendChild(addCourseModal);    
// Функція для збереження вибраних курсів для групи
function saveSelectedCourses(groupId) {
  const selectedCourses = Array.from(document.querySelectorAll('.add-course-checkbox:checked'))
    .map(checkbox => checkbox.value);

  const data = { groupId, courses: selectedCourses };
  console.log(data.courses);
  fetch('http://localhost:3000/add-courses-to-group', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
    .then(response => response.json())
    .then(result => {
      console.log(result.message);
      const modal = document.getElementById('addCourseModal');
      modal.style.display = 'none'; // При успішному збереженні, сховати модальне вікно
      fetchGroups(); // Оновити список груп
    })
    .catch(error => console.error('Помилка додавання курсів:', error));
}
function deleteGroup(groupId) {
  // Виконати запит на видалення групи
  fetch(`http://localhost:3000/delete-group?id=${groupId}`, {
    method: 'DELETE'
  })
    .then(response => response.json())
    .then(data => {
      console.log(data.message); // Вивести повідомлення про успішне видалення
      // Оновити список груп
      fetchGroups();
    })
    .catch(error => console.error('Помилка видалення групи:', error));
}



// Функція для заповнення контейнера групами
function fillGroupsContainer(groups) {
  const groupsContainer = document.getElementById('groupsContainer');
  groupsContainer.innerHTML = ''; // Очистити контейнер перед заповненням

  groups.forEach(group => {
    const groupDiv = createGroupDiv(group);
    groupsContainer.appendChild(groupDiv);
  });
}

// Функція для отримання даних груп з сервера
function fetchGroups() {
  fetch('http://localhost:3000/groups')
    .then(response => response.json())
    .then(fillGroupsContainer)
    .catch(error => console.error('Помилка отримання даних груп:', error));
}

// Виклик функції для отримання даних груп з сервера
fetchGroups();
// Generate a unique ID for the groups
// Функція для створення нового елемента групи
function createNewGroup() {
  const groupName = prompt('Введіть назву нової групи:');
  if (!groupName) return;

  const data = { name: groupName };

  fetch('http://localhost:3000/create-group', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
    .then(response => response.json())
    .then(result => {
      console.log(result.message);
      fetchGroups(); // Оновити список груп після створення нової групи
    })
    .catch(error => console.error('Помилка створення групи:', error));
}



function createCourseDiv(course) {
  const div = document.createElement('div');

  div.textContent = course.name;
  div.classList.add('course');
  div.id = `course-${course.sys_id}`;

  const deleteButton = document.createElement('div');  
  deleteButton.classList.add('delete-button-course');
  deleteButton.textContent = '-';
  
  deleteButton.addEventListener('click', (event) => {
    event.stopPropagation(); // Зупинити подальше спрацювання подій
  
    // Виконати запит на зміну значення group_id на null
    const updateGroupQuery = 'UPDATE courses SET group_id = NULL WHERE sys_id = ?';
    fetch(`http://localhost:3000/update-group-id?sys_id=${course.sys_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: null })
    })
      .then(response => response.json())
      .then(result => {
        console.log(result.message);
        div.parentNode.removeChild(div); // Видалити елемент курсу з DOM
  

      })
      .catch(error => console.error('Помилка зміни значення group_id:', error));
  });
  

  div.appendChild(deleteButton);

  let doubleClick = false;
  div.addEventListener('click', () => {
    if (!doubleClick) {
      doubleClick = true;
      setTimeout(() => {
        doubleClick = false;
      }, 300);
    } else {
      div.parentNode.removeChild(div);
    }
  });

  div.addEventListener('click', () => {
    
    const courseId = course.sys_id;

    // Створіть об'єкт з даними, які потрібно відправити
    const data = { course_sys_id: courseId };
  
    fetch('http://localhost:3000/update-data-p', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    .then(response => {
      // Обробка відповіді сервера
      if (response.ok) {
        // Запит успішно виконаний
        console.log('Дані успішно відправлені на /update-data');
      } else {
        // Обробка помилки
        console.error('Помилка при відправленні даних на /update-data');
      }
    })
    .catch(error => {
      // Обробка помилки
      console.error('Помилка при відправленні запиту на /update-data:', error);
    });

    window.location.href = `http://localhost:3000/students?course_sys_id=${course.sys_id}`
    
    
    
  });

  return div;
}



// Функція для заповнення контейнера групами
function fillGroupsContainer(groups) {
  const groupsContainer = document.getElementById('groupsContainer');
  groupsContainer.innerHTML = ''; // Очистити контейнер перед заповненням

  groups.forEach(group => {
    const groupDiv = createGroupDiv(group);
    groupDiv.addEventListener('click', () => fetchCourses(group.id, groupDiv));
    groupsContainer.appendChild(groupDiv);
  });
}

function fetchCourses(groupId, parentElement) {
  const url = `http://localhost:3000/courses-g?group_id=${groupId}`;

  fetch(url)
    .then(response => response.json())
    .then(courses => {
      const existingCoursesContainer = parentElement.querySelector('.courses-container');

      // Перевірка наявності контейнера курсів
      if (existingCoursesContainer) {
        existingCoursesContainer.parentNode.removeChild(existingCoursesContainer); // Видалення існуючого контейнера курсів
      }

      const coursesContainer = document.createElement('div');
      coursesContainer.classList.add('courses-container');
      

      if (courses.length > 0) {
        courses.forEach(course => {
          const courseDiv = createCourseDiv(course);
          coursesContainer.appendChild(courseDiv);
        });
      }

      // Вставка контейнера курсів під конкретним елементом group
      const group = parentElement.querySelector('#group');
      parentElement.parentNode.insertBefore(coursesContainer, parentElement.nextSibling);
    })
    .catch(error => console.error('Помилка отримання даних:', error));
}



// Функція для отримання даних груп з сервера
fetch('http://localhost:3000/groups')
  .then(response => response.json())
  .then(fillGroupsContainer)
  .catch(error => console.error('Помилка отримання даних груп:', error));
