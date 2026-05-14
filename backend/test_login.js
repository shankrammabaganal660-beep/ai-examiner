const axios = require('axios');

async function testLogin() {
  try {
    const res = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'teacher@aiexaminer.com',
      password: 'teacher123'
    });
    console.log(res.data);
  } catch (err) {
    if (err.response) {
      console.log('Error Data:', err.response.data);
    } else {
      console.log('Error:', err.message);
    }
  }
}

testLogin();
