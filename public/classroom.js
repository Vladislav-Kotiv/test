const importData = document.querySelector('#import');

importData.addEventListener('click', () => {
  const authWindow = window.open('/auth', '_blank', 'width=500,height=600');

  const checkAuthWindowClosed = setInterval(() => {
    if (authWindow.closed) {
      clearInterval(checkAuthWindowClosed);

      // Redirect to the import page
      window.location.href = '/import';
    }
  }, 500);
});


function fetchCoursesData() {
  axios.get('/courses')
    .then(response => {
      const coursesData = response.data;
      const coursesContainer = document.getElementById('courses-container');

      for (const courseId in coursesData) {
        const course = coursesData[courseId];
        const courseElement = document.createElement('div');
        courseElement.classList.add('course');
        courseElement.innerHTML = `
          <h3>${course.name}</h3>
          <p>ID: ${course.sys_id}</p>
          <input type="checkbox" name="selectedCourse" value="${course.sys_id}" data-name="${course.name}">
        `;
        coursesContainer.appendChild(courseElement);
      }

      const saveButton = document.createElement('button');
      saveButton.innerText = 'Save';
      saveButton.addEventListener('click', handleSaveCourses);
      coursesContainer.appendChild(saveButton);
    })
    .catch(error => {
      console.error('Error fetching courses data:', error);
    });
}

function handleSaveCourses() {
  const selectedCourses = document.querySelectorAll('input[name="selectedCourse"]:checked');

  if (selectedCourses.length === 0) {
    alert('Please select at least one course.');
    return;
  }

  const courses = Array.from(selectedCourses).map(selectedCourse => {
    const courseId = selectedCourse.value;
    const courseName = selectedCourse.getAttribute('data-name');

    return {
      sys_id: courseId,
      name: courseName
    };
  });

  axios
    .post('/save-courses', { courses })
    .then(response => {
      console.log(response.data.message);
      alert('Courses saved successfully.');

      // Redirect to the desired page
      window.location.href = 'http://localhost:3000/';
    })
    .catch(error => {
      console.error('Error saving courses:', error.response.data.error);
      alert('Failed to save courses.');
    });
}


document.addEventListener('DOMContentLoaded', fetchCoursesData);


