const axios = require('axios');
const cheerio = require('cheerio');

function pinterest(query) {
        return new Promise(async(resolve, reject) => {
                try {
                        console.log(`📌 Tentando método principal do Pinterest: "${query}"`);
                        
                        // Método 1: Scraping com headers atualizados
                        const response = await axios.get(`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`, {
                                headers: {
                                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                                        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
                                        'Accept-Encoding': 'gzip, deflate, br',
                                        'Connection': 'keep-alive',
                                        'Upgrade-Insecure-Requests': '1'
                                },
                                timeout: 15000
                        });

                        const $ = cheerio.load(response.data);
                        const imageUrls = [];

                        // Procura por imagens em diferentes formatos de Pinterest
                        $('img[src*="pinimg.com"]').each((i, img) => {
                                const src = $(img).attr('src');
                                if (src && src.includes('pinimg.com') && !src.includes('avatar')) {
                                        // Converte para alta resolução
                                        const highResSrc = src.replace(/\/\d+x/g, '/736x').replace(/\/\d+X/g, '/736X');
                                        imageUrls.push(highResSrc);
                                }
                        });

                        // Remove duplicatas
                        const uniqueUrls = [...new Set(imageUrls)];

                        if (uniqueUrls.length === 0) {
                                console.log('🔄 Método principal falhou, tentando alternativo...');
                                const fallbackResults = await pinterest2(query);
                                resolve(fallbackResults);
                                return;
                        }

                        // Limita a 8 resultados para evitar spam
                        const limitedResults = uniqueUrls.slice(0, 8);
                        
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