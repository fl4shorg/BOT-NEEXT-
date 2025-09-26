const axios = require('axios');

async function igdl(query) {
  try {
    const response = await axios.get(`https://api.siputzx.my.id/api/d/igdl?url=${query}`);
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

module.exports = { igdl };