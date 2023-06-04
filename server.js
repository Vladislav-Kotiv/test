const mysql = require('mysql2');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const url = require('url');
const port = 3000;
const cors = require('cors');
const session = require('express-session');
const xl = require('excel4node');

const { google } = require('googleapis');
const { client_secret, client_id, redirect_uris } = require('./credentials.json').web;
const { OAuth2Client } = require('google-auth-library');

const oAuth2Client = new OAuth2Client({
  clientId: client_id,
  clientSecret: client_secret,
  redirectUri: redirect_uris[0],
});
const key = require('./supkey.json'); // Шлях до JSON-файлу сервісного ключа


const client = new google.auth.JWT(
  key.client_email,
  null,
  key.private_key,
  ['https://www.googleapis.com/auth/classroom.readonly'] // Додайте всі необхідні обсяги доступу тут
);

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  database: "progressdata",
  password: "",
  Promise: global.Promise // Використання глобальної обіцянки для підтримки промісів
});
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({ secret: 'secret-key', resave: true, saveUninitialized: true }));

let accessToken = null;
// Функція для отримання посилання авторизації
function getAuthUrl() {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/classroom.courses.readonly', 'https://www.googleapis.com/auth/classroom.rosters.readonly', 'https://www.googleapis.com/auth/classroom.student-submissions.students.readonly'],
  });
  return authUrl;
}
// Функція для обміну авторизаційного коду на токен доступу
async function getAccessToken(code) {
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  return tokens;
}

app.get('/auth', (req, res) => {
  const authUrl = getAuthUrl();
  res.redirect(authUrl);
});

let authorizationCode = null;
app.get('/callback', (req, res) => {
  authorizationCode = req.query.code;
  console.log('Отримано авторизаційний код:', authorizationCode);

  // Перенаправлення на головну сторінку
  res.send('<script>window.close();</script>');
});
async function handleAuthorizationCode(req, res, courseId) {
  if (authorizationCode) {
    try {
      const tokens = await getAccessToken(authorizationCode);
      const accessToken = tokens.access_token;
      console.log('Токен доступу:', accessToken);

      const auth = oAuth2Client;
      const data = await getEmailsAndGrades(auth, courseId);
      res.json(data);
    } catch (err) {
      console.error('Помилка отримання токену доступу:', err);
      res.status(500).json({ error: 'Помилка сервера' });
    }
  } else {
    setTimeout(() => handleAuthorizationCode(req, res, courseId), 1000);
  }
}



function updatescores() {
  if (authorizationCode) {
    getAccessToken(authorizationCode)
      .then((tokens) => {
        // Ваш токен доступу
        const accessToken = tokens.access_token;
        console.log('Токен доступу:', accessToken);
        // Ви можете використовувати цей токен для виклику API Classroom
        // Налаштуйте аутентифікацію і викликайте функції отримання даних
        const auth = oAuth2Client;
        getCourses(auth);
      })
      .catch((err) => {
        console.error('Помилка отримання токену доступу:', err);
      });
  } else {
    setTimeout(updatescores, 1000);
  }
}
updatescores();
// Функція для налаштування аутентифікації
//#region save to database scores



// Функція для збереження даних студентів
async function saveStudentData(sysId, fullName) {
  try {
    // Перевірка, чи студент уже існує в базі даних
    const [existingStudent] = await connection
      .promise()
      .query('SELECT * FROM students WHERE adress = ?', [fullName]);

    if (existingStudent.length > 0) {
      console.log('Студент вже існує');
      return existingStudent[0].id; // Повертаємо ідентифікатор існуючого студента
    }

    // Додавання нового студента до бази даних
    const [result] = await connection
      .promise()
      .query('INSERT INTO students (sys_id, adress) VALUES (?, ?)', [sysId, fullName]);

    const studentId = result.insertId;
    console.log('Дані студента збережено успішно');
    return studentId;

  } catch (error) {
    console.error('Помилка збереження даних студента:', error);
    return null;
  }
}


async function saveScoreData(courseId, studentId, courseWorkId, labScore, labName, maxPoints) {
  try {
    console.log(courseId);
    // Отримання sys_id курсу з таблиці courses
    const [courseResult] = await connection
      .promise()
      .query('SELECT id FROM courses WHERE sys_id = ?', [courseId]);

    if (courseResult.length === 0) {
      console.log('Курс не знайдено');
      return;
    }

    const sysId = courseResult[0].id;
    console.log(sysId);

    // Перевірка наявності запису з відповідним sys_id
    const [existingScore] = await connection
      .promise()
      .query('SELECT id FROM scores WHERE sys_id = ? AND student_id = ? AND lab_score = ? AND lab_name = ? AND lab_maxscore = ?', [courseWorkId, studentId, labScore, labName, maxPoints]);

    if (existingScore.length > 0) {
      console.log('Запис з такими значеннями вже існує');
      
      // Оновлення існуючого запису
      await connection
        .promise()
        .query(
          'UPDATE scores SET lab_score = ?, lab_name = ?, lab_maxscore = ? WHERE sys_id = ? AND student_id = ?',
          [labScore, labName, maxPoints, courseWorkId, studentId]
        );

      console.log('Оцінка оновлена успішно');
      return;
    }

    // Збереження нового запису
    await connection
      .promise()
      .query(
        'INSERT INTO scores (course_id, student_id, sys_id, lab_score, lab_name, lab_maxscore) VALUES (?, ?, ?, ?, ?, ?)',
        [sysId, studentId, courseWorkId, labScore, labName, maxPoints]
      );

    console.log('Дані оцінки збережено успішно');
  } catch (error) {
    console.error('Помилка збереження даних оцінки:', error);
  }
}





  
  async function getEmailsAndGrades(auth, courseId) {
    const classroom = google.classroom({ version: 'v1', auth });
  
    try {
      console.log('Course (em) ID:', courseId);
  
      const { data } = await classroom.courses.students.list({
        courseId: courseId,
      });
  
      console.log('API Response:', data);
  
      const students = data.students;
  
      const { data: coursework } = await classroom.courses.courseWork.list({
        courseId: courseId,
      });
  
      console.log('Coursework:', coursework);
  
      for (const student of students) {
        const studentId = student.userId;
        console.log('Full Name:', student.profile.name.fullName);
  
        // Збереження даних студента
        const savedStudentId = await saveStudentData(studentId, student.profile.name.fullName);
  
        if (savedStudentId) {
          for (const work of coursework.courseWork) {
            const courseWorkId = work.id;
            const maxPoints = work.maxPoints;
            const { data: submissions } = await classroom.courses.courseWork.studentSubmissions.list({
              courseId: courseId,
              courseWorkId: courseWorkId,
              userId: studentId,
            });
  
            if (submissions && submissions.studentSubmissions) {
              for (const submission of submissions.studentSubmissions) {
                if (submission.draftGrade) {
                  const labName = work.title;
                  const labScore = submission.draftGrade;
  
                  // Збереження даних оцінки
                  await saveScoreData(courseId, savedStudentId, courseWorkId, labScore, labName, maxPoints);
                  console.log('Оцінка для користувача', studentId, ':', labScore, 'завдання:', labName, 'max', maxPoints);
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Помилка отримання даних студентів:', error);
    }
  }
  


//#endregion
function authorize(accessToken) {
  oAuth2Client.setCredentials({ access_token: accessToken });
  return oAuth2Client;
}

// Виклик функції для обробки авторизаційного коду
// handleAuthorizationCode();




// Функція для отримання списку курсів
async function getCourses(auth) {
  const classroom = google.classroom({ version: 'v1', auth });
  try {
    const response = await classroom.courses.list({});
    const courses = response.data.courses;
    console.log('Список курсів:');
    // Створення об'єкту для зберігання курсів
const coursesData = {};

courses.forEach(course => {
  console.log('Назва:', course.name);
  console.log('ID:', course.id);
  console.log('----------------------------');

  // Збереження даних курсу у об'єкті
  coursesData[course.id] = {
    name: course.name,
    sys_id: course.id
  };
});



app.post('/save-courses', (req, res) => {
  const selectedCourses = req.body.courses;

  if (!Array.isArray(selectedCourses)) {
    return res.status(400).json({ error: 'Неправильний формат даних' });
  }

  const values = selectedCourses.map(course => [course.sys_id, course.name]);
  const sysIds = selectedCourses.map(course => course.sys_id);

  const selectQuery = 'SELECT sys_id FROM courses WHERE sys_id IN (?)';
  connection.query(selectQuery, [sysIds], (selectError, selectResults) => {
    if (selectError) {
      console.error('Помилка під час перевірки наявності записів:', selectError);
      return res.status(500).json({ error: 'Помилка сервера' });
    }

    const existingSysIds = selectResults.map(result => result.sys_id);
    const newValues = values.filter(value => !existingSysIds.includes(value[0]));

    if (newValues.length === 0) {
      return res.status(200).json({ message: 'Немає нових курсів для вставки' });
    }

    const insertQuery = 'INSERT INTO courses (sys_id, name) VALUES ?';
    connection.query(insertQuery, [newValues], (insertError, insertResults) => {
      if (insertError) {
        console.error('Помилка під час вставки курсів:', insertError);
        return res.status(500).json({ error: 'Не вдалося вставити курси' });
      }

      console.log(`Вставлено ${insertResults.affectedRows} курсів у базу даних`);
      res.status(200).json({ message: 'Курси успішно вставлено' });
    });
  });
});

// Відправка даних курсів на клієнт
app.get('/courses', (req, res) => {
  res.json(coursesData);
});
} catch (error) {
  console.error('Помилка отримання списку курсів:', error);
  }
  }
  
  // Встановлення з'єднання з базою даних
  connection.connect((err) => {
  if (err) {
  console.error('Помилка підключення до бази даних:', err);
  return;
  }
  console.log('Підключено до бази даних');
  });
  
  // Маршрут для отримання списку курсів з group_id = null
  app.get('/courses-get', (req, res) => {
    const query = 'SELECT sys_id, name FROM courses WHERE group_id IS NULL';

    connection.query(query, (err, results) => {
      if (err) {
        console.error('Помилка отримання даних курсів:', err);
        res.status(500).json({ error: 'Помилка отримання даних курсів' });
        return;
      }
  
      const courses = results.map(row => ({
        sys_id: row.sys_id,
        name: row.name,
        group_id: row.group_id
      }));
  
      res.json(courses);
    });
  });

  // Маршрут для створення нової групи
app.post('/create-group', (req, res) => {
  const { name, courses } = req.body;

  // Виконати запит на створення нової групи
  const createGroupQuery = 'INSERT INTO groups (name) VALUES (?)';
  connection.query(createGroupQuery, [name], (err, result) => {
    if (err) {
      console.error('Помилка створення групи:', err);
      res.status(500).json({ error: 'Помилка створення групи' });
      return;
    }

    const groupId = result.insertId;

    // Оновити group_id для курсів
    const updateCoursesQuery = 'UPDATE courses SET group_id = ? WHERE id IN (?)';
    connection.query(updateCoursesQuery, [groupId, courses], (err, updateResult) => {
      if (err) {
        console.error('Помилка оновлення group_id для курсів:', err);
        res.status(500).json({ error: 'Помилка оновлення group_id для курсів' });
        return;
      }

      res.json({ message: 'Група створена успішно' });
    });
  });
});
// Маршрут для отримання даних груп
app.get('/groups', (req, res) => {
  const query = 'SELECT id, name FROM groups';

  connection.query(query, (error, results) => {
    if (error) {
      console.error('Помилка отримання даних груп:', error);
      res.status(500).json({ error: 'Failed to fetch group data' });
    } else {
      const groups = results.map(result => ({
        id: result.id,
        name: result.name
      }));
      res.json(groups);
    }
  });
});

// Маршрут для отримання даних курсів за group_id
app.get('/courses-g', (req, res) => {
  const { group_id } = req.query;
  const query = 'SELECT sys_id, name FROM courses WHERE group_id = ?';

  connection.query(query, [group_id], (error, results) => {
    if (error) {
      console.error('Помилка отримання даних курсів:', error);
      res.status(500).json({ error: 'Failed to fetch courses data' });
    } else {
      const courses = results.map(result => ({
        sys_id: result.sys_id,
        name: result.name
      }));
         res.json(courses);
    }
  });
});

// // Маршрут для отримання даних студентів
// app.get('/students_data', async (req, res) => {
//   try {
//     const data = await getEmailsAndGrades(accessToken);
//     res.json(data);
//   } catch (error) {
//     console.error('Помилка отримання даних студентів:', error);
//     res.status(500).json({ error: 'Помилка сервера' });
//   }
// });

async function getE(auth) {
  const classroom = google.classroom({ version: 'v1', auth });
  const courseId = '580623988853'; // Замініть на свій ідентифікатор курсу

  try {
    const { data } = await classroom.courses.students.list({
      courseId: courseId,
    });

    console.log('API Response:', data);

    const students = data.students;

    const { data: coursework } = await classroom.courses.courseWork.list({
      courseId: courseId,
    });

    console.log('Coursework:', coursework);

    for (const student of students) {
      const studentId = student.userId;
      console.log('Full Name:', student.profile.name.fullName);

      for (const work of coursework.courseWork) {
        const courseWorkId = work.id;
        const maxPoints = work.maxPoints;
        const { data: submissions } = await classroom.courses.courseWork.studentSubmissions.list({
          courseId: courseId,
          courseWorkId: courseWorkId,
          userId: studentId,
        });

        if (submissions && submissions.studentSubmissions) {
          for (const submission of submissions.studentSubmissions) {
            if (submission.draftGrade) {
              const labName = work.title;
              const labScore = submission.draftGrade;
              console.log('Оцінка для користувача', studentId, ':', labScore, 'завдання:', labName, 'id', id);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Помилка отримання даних студентів:', error);
  }
}
// Опрацювання PUT-запиту для оновлення значення group_id курсу
app.put('/update-group-id', (req, res) => {
  const sysId = req.query.sys_id;

  // Виконати SQL-запит для оновлення значення group_id курсу
  const query = 'UPDATE courses SET group_id = NULL WHERE sys_id = ?';
  connection.query(query, [sysId], (err, result) => {
    if (err) {
      console.error('Помилка зміни значення group_id:', err);
      res.status(500).json({ error: 'Помилка зміни значення group_id' });
    } else {
      console.log(`Значення group_id для курсу з sys_id ${sysId} змінено`);
      res.json({ message: `Значення group_id для курсу з sys_id ${sysId} змінено` });
    }
  });
});
app.get('/students/:course_sys_id', (req, res) => {
  const courseSysId = req.params.course_sys_id;
  console.log('Course (/students/:course_sys_id) ID:', courseSysId);
  // Виклик функції handleAuthorizationCode з передачею courseSysId
  handleAuthorizationCode(req, res,savedCourseSysId);
});
// Оголошуємо глобальну змінну для збереження course_sys_id
let savedCourseSysId = '';
app.post('/update-data-p', (req, res) => {
  const { course_sys_id } = req.body; // Отримуємо значення course_sys_id з тіла POST-запиту
  console.log('Course Sys ID:', course_sys_id);

  // Зберігаємо значення course_sys_id у змінну savedCourseSysId
  savedCourseSysId = course_sys_id;

  res.status(200).json({ message: 'Course Sys ID saved successfully.' });
});
app.get('/update-data', (req, res) => {
  const courseId = req.query.course_sys_id; // Отримуємо значення course_sys_id з запиту
  console.log('Course Sys ID get:', savedCourseSysId);

  handleAuthorizationCode(req, res, savedCourseSysId);
});


app.post('/get-students', (req,res) => {
  const { course_sys_id } = req.query; // Отримуємо значення course_sys_id з параметра запиту

  // Запит до бази даних для отримання запису course за course_sys_id
  const getCourseQuery = `SELECT id FROM courses WHERE sys_id = '${course_sys_id}' LIMIT 1`;
  connection.query(getCourseQuery, (error, courseResult) => {
    if (error) {
      console.error('Error retrieving course:', error);
      res.status(500).json({ error: 'Internal server error' });
    } else if (courseResult.length === 0) {
      res.status(404).json({ error: 'Course not found' });
    } else {
      const courseId = courseResult[0].id;

      // Запит до бази даних для отримання записів scores за course_id
      const getScoresQuery = `SELECT s.lab_score, s.lab_name, st.adress 
                              FROM scores s 
                              INNER JOIN students st ON s.student_id = st.id 
                              WHERE s.course_id = ${courseId}`;

      connection.query(getScoresQuery, (scoresError, scoresResult) => {
        if (scoresError) {
          console.error('Error retrieving scores:', scoresError);
          res.status(500).json({ error: 'Internal server error' });
        } else {
          res.status(200).json(scoresResult);
        }
      });
    }
  });
});

// Маршрут для збереження даних в базі даних
app.post('/save-scores', (req, res) => {
  const scores = req.body.scores;

  if (!Array.isArray(scores)) {
    return res.status(400).json({ error: 'Неправильний формат даних' });
  }

  const values = scores.map(score => {
    return [
      score.student_id,
      1, // Значення group_id
      score.lab_name,
      score.lab_score
    ];
  });

  const query = `
    INSERT INTO scores (student_id, group_id, lab_name, lab_score)
    VALUES ?
    ON DUPLICATE KEY UPDATE lab_score = VALUES(lab_score)
  `;

  connection.query(query, [values], (error, results) => {
    if (error) {
      console.error('Помилка під час вставки/оновлення даних:', error);
      return res.status(500).json({ error: 'Не вдалося вставити/оновити дані' });
    }

    console.log(`Вставлено/оновлено ${results.affectedRows} записів у базу даних`);
    res.status(200).json({ message: 'Дані успішно вставлено/оновлено' });
  });
});
app.delete('/delete-group', (req, res) => {
  const groupId = req.query.id; // Отримати id групи з параметрів URL-адреси

  // Оновити значення group_id на NULL у відповідних записах курсів
  const updateCoursesQuery = 'UPDATE courses SET group_id = NULL WHERE group_id = ?';
  connection.query(updateCoursesQuery, [groupId], (error, results) => {
    if (error) {
      console.error('Помилка оновлення значення group_id:', error);
      return res.status(500).json({ error: 'Помилка сервера' });
    }

    // Видалити запис про групу з бази даних
    const deleteQuery = 'DELETE FROM groups WHERE id = ?'; // Змінити запит для видалення за id
    connection.query(deleteQuery, [groupId], (error, results) => {
      if (error) {
        console.error('Помилка видалення групи:', error);
        return res.status(500).json({ error: 'Помилка сервера' });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ message: 'Група не знайдена' });
      }

      res.status(200).json({ message: 'Групу успішно видалено' });
    });
  });
});

app.get('/api/students/:id/Adress', (req, res) => {
  const studentId = req.params.id;

  const studId = 'SELECT Adress FROM students WHERE id = ?';
  connection.query(studId, [studentId], (error, results) => {
    if (error) {
      console.error('Помилка запиту до бази даних: ', error);
      res.status(500).json({ error: 'Помилка сервера' });
    } else {
      if (results.length > 0) {
        const Adress = results[0].Adress;
        res.json({ Adress });
      } else {
        res.status(404).json({ error: 'Студент не знайдений' });
      }
    }
  });
});


app.get('/api/scores', (req, res) => {
  const scor = `
    SELECT scores.student_id, students.Adress, SUM(scores.lab_score) as score_sum
    FROM scores
    JOIN students ON scores.student_id = students.id
    GROUP BY scores.student_id, students.Adress
  `;
  connection.query(scor, (error, results) => {
    if (error) {
      console.error('Помилка запиту до бази даних: ', error);
      res.status(500).json({ error: 'Помилка сервера' });
    } else {
      res.json(results);
    }
  });
});




app.post('/add-courses-to-group', (req, res) => {
  const { groupId, courses } = req.body;

  // Перевірка наявності groupId та courses в запиті
  if (!groupId || !courses || !Array.isArray(courses)) {
    return res.status(400).json({ error: 'Некоректні дані запиту' });
  }

  const updateQuery = 'UPDATE courses SET group_id = ? WHERE id IN (?)';

  connection.query(updateQuery, [groupId, courses], (error, results) => {
    if (error) {
      console.error('Помилка додавання курсів до групи:', error);
      return res.status(500).json({ error: 'Помилка сервера' });
    }

    res.status(200).json({ message: 'Курси успішно додані до групи' });
  });
});

app.post('/create-group', (req, res) => {
  const groupName = req.body.name;

  if (!groupName) {
    return res.status(400).json({ error: 'Неправильний формат даних' });
  }

  const insertQuery = 'INSERT INTO groups (name) VALUES (?)';
  connection.query(insertQuery, [groupName], (insertError, insertResults) => {
    if (insertError) {
      console.error('Помилка під час створення групи:', insertError);
      return res.status(500).json({ error: 'Не вдалося створити групу' });
    }

    console.log(`Створено нову групу з ID: ${insertResults.insertId}`);
    res.status(200).json({ message: 'Група успішно створена' });
  });
});



  // Налаштування шляху до статичних файлів
  app.use(express.static(path.join(__dirname, 'public')));
  
  // Маршрут 
  app.get('/import', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'import.html'));
  });
  
  // Маршрут 
  app.get('/students', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'students.html'));
  });

  // Закриття з'єднання з базою даних при завершенні роботи сервера
  process.on('SIGINT', () => {
  connection.end();
  process.exit();
  });
  
  // Запуск сервера
  app.listen(port, () => {
  console.log(`Сервер працює на порту ${port}`);
  });