const axios = require('axios');
const cheerio = require('cheerio');

function pinterest(query) {
        return new Promise(async(resolve, reject) => {
                try {
                        console.log(`📌 Buscando imagens no Pinterest: "${query}"`);
                        
                        const { data } = await axios.get('https://id.pinterest.com/search/pins/?autologin=true&q=' + query, {
                                headers: {
                                        "cookie": "_auth=1; _b=\"AVna7S1p7l1C5I9u0+nR3YzijpvXOPc6d09SyCzO+DcwpersQH36SmGiYfymBKhZcGg=\"; _pinterest_sess=TWc9PSZHamJOZ0JobUFiSEpSN3Z4a2NsMk9wZ3gxL1NSc2k2NkFLaUw5bVY5cXR5alZHR0gxY2h2MVZDZlNQalNpUUJFRVR5L3NlYy9JZkthekp3bHo5bXFuaFZzVHJFMnkrR3lTbm56U3YvQXBBTW96VUgzVUhuK1Z4VURGKzczUi9hNHdDeTJ5Y2pBTmxhc2owZ2hkSGlDemtUSnYvVXh5dDNkaDN3TjZCTk8ycTdHRHVsOFg2b2NQWCtpOWxqeDNjNkk3cS85MkhhSklSb0hwTnZvZVFyZmJEUllwbG9UVnpCYVNTRzZxOXNJcmduOVc4aURtM3NtRFo3STlmWjJvSjlWTU5ITzg0VUg1NGhOTEZzME9kV2c9PSZlZGZlM2Y=; _ir=0",
                                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                                },
                                timeout: 10000
                        });

                        const $ = cheerio.load(data);
                        const result = [];
                        const hasil = [];

                        $('div > a').get().map(b => {
                                const link = $(b).find('img').attr('src');
                                result.push(link);
                        });

                        result.forEach(v => {
                                if(v == undefined) return;
                                hasil.push(v.replace(/236/g,'736')); // Muda resolução para melhor qualidade
                        });

                        hasil.shift(); // Remove primeiro elemento vazio

                        if (hasil.length === 0) {
                                console.log('❌ Pinterest: Nenhuma imagem encontrada');
                                resolve([]);
                                return;
                        }

                        // Limita a 8 resultados para evitar spam
                        const limitedResults = hasil.slice(0, 8);
                        
                        // Converte para formato esperado pelo bot
                        const formattedResults = limitedResults.map((imageUrl, index) => ({
                                upload_by: 'Pinterest User',
                                fullname: 'Usuário Pinterest',
                                followers: 0,
                                caption: `Imagem ${index + 1} para: ${query}`,
                                image: imageUrl,
                                source: `https://pinterest.com/search/pins/?q=${encodeURIComponent(query)}`
                        }));

                        console.log(`✅ Pinterest: ${formattedResults.length} imagens encontradas`);
                        resolve(formattedResults);

                } catch (error) {
                        console.error('❌ Pinterest Error:', error.message);
                        
                        // Fallback para função alternativa
                        try {
                                console.log('🔄 Tentando método alternativo...');
                                const fallbackResults = await pinterest2(query);
                                resolve(fallbackResults);
                        } catch (fallbackError) {
                                console.error('❌ Fallback também falhou:', fallbackError.message);
                                resolve([]);
                        }
                }
        });
}

// Função alternativa usando API oficial do Pinterest
async function pinterest2(query) {
        return new Promise(async (resolve, reject) => {
                const baseUrl = 'https://www.pinterest.com/resource/BaseSearchResource/get/';
                const queryParams = {
                        source_url: '/search/pins/?q=' + encodeURIComponent(query),
                        data: JSON.stringify({
                                options: {
                                        isPrefetch: false,
                                        query,
                                        scope: 'pins',
                                        no_fetch_context_on_resource: false
                                },
                                context: {}
                        }),
                        _: Date.now()
                };
                
                const url = new URL(baseUrl);
                Object.entries(queryParams).forEach(entry => url.searchParams.set(entry[0], entry[1]));
                
                try {
                        const response = await fetch(url.toString());
                        const json = await response.json();
                        const results = json.resource_response?.data?.results ?? [];
                        
                        if (results.length === 0) {
                                console.log('❌ Pinterest API: Nenhum resultado encontrado');
                                resolve([]);
                                return;
                        }
                        
                        const result = results.slice(0, 8).map(item => ({
                                upload_by: 'Pinterest User',
                                fullname: 'Usuário Pinterest',  
                                followers: 0,
                                caption: item.grid_title ?? `Imagem para: ${query}`,
                                image: item.images?.['736x']?.url ?? item.images?.orig?.url ?? '',
                                source: 'https://www.pinterest.com/pin/' + (item.id ?? '')
                        })).filter(item => item.image); // Remove itens sem imagem
                        
                        console.log(`✅ Pinterest API: ${result.length} imagens encontradas`);
                        resolve(result);
                } catch (e) {
                        console.error('❌ Pinterest API Error:', e.message);
                        resolve([]);
                }
        });
}

module.exports = pinterest;