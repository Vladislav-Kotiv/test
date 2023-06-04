document.addEventListener('DOMContentLoaded', function() {
  const grafiksDiv = document.getElementById('grafiks');
  grafiksDiv.addEventListener('click', function() {
    fetchData();
  });
});

function fetchData() {
  Promise.all([fetchScores(), fetchAdresses()])
    .then(([scores, Adresses]) => {
      buildHistogram(scores, Adresses);
    })
    .catch(error => {
      console.error('Помилка отримання даних з сервера:', error);
    });
}

function fetchScores() {
  return fetch('/api/scores')
    .then(response => response.json());
}

function fetchAdresses() {
  const studentIds = [];

  return fetch('/api/scores')
    .then(response => response.json())
    .then(scores => {
      scores.forEach(score => {
        if (!studentIds.includes(score.student_id)) {
          studentIds.push(score.student_id);
        }
      });

      const AdressRequests = studentIds.map(studentId => {
        return fetch(`/api/students/${studentId}/Adress`)
          .then(response => response.json())
          .then(data => {
            return {
              studentId: studentId,
              Adress: data.Adress
            };
          });
      });

      return Promise.all(AdressRequests);
    });
}

function buildHistogram(scores, Adresses) {
  const histogramData = {};

  scores.forEach(score => {
    const studentId = score.student_id;
    const labScore = score.score_sum;

    const Adress = Adresses.find(item => item.studentId === studentId).Adress;

    if (histogramData.hasOwnProperty(Adress)) {
      histogramData[Adress] += labScore;
    } else {
      histogramData[Adress] = labScore;
    }
  });

  const histogramLabels = Object.keys(histogramData);
  const histogramValues = Object.values(histogramData);

  displayHistogram(histogramLabels, histogramValues);
}

function displayHistogram(labels, data) {
  const canvas = document.getElementById('histogram-container');
  const ctx = canvas.getContext('2d');

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Сума оцінок студентів',
          data: data,
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
          }
          ]
          },
          options: {
          responsive: true,
          scales: {
          y: {
          beginAtZero: true
          }
          }
          }
          });
          }
          
          fetchData();
