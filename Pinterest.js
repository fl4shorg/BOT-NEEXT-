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

// Função alternativa usando diferentes métodos
async function pinterest2(query) {
        return new Promise(async (resolve, reject) => {
                try {
                        console.log(`🔄 Tentando método alternativo para: "${query}"`);
                        
                        // Método 2: Usar API de imagens similar ao Pinterest
                        const response = await axios.get(`https://api.unsplash.com/search/photos`, {
                                params: {
                                        query: query,
                                        per_page: 8,
                                        client_id: 'sPa3dUWvpnuJWGf3S3SBYgKXEQ91xkGw4kHKzqVlc7I' // Client ID público do Unsplash
                                },
                                timeout: 10000
                        });

                        const results = response.data.results || [];
                        
                        if (results.length === 0) {
                                console.log('❌ Método alternativo: Nenhum resultado encontrado');
                                // Tenta método de fallback final
                                return await pinterest3(query);
                        }
                        
                        const formattedResults = results.map((item, index) => ({
                                upload_by: item.user.name || 'Usuário Unsplash',
                                fullname: item.user.name || 'Usuário Unsplash',  
                                followers: item.user.total_likes || 0,
                                caption: item.alt_description || item.description || `Imagem ${index + 1} para: ${query}`,
                                image: item.urls.regular || item.urls.small,
                                source: item.links.html || `https://unsplash.com/s/photos/${encodeURIComponent(query)}`
                        }));
                        
                        console.log(`✅ Método alternativo: ${formattedResults.length} imagens encontradas`);
                        resolve(formattedResults);
                        
                } catch (e) {
                        console.error('❌ Método alternativo falhou:', e.message);
                        try {
                                // Fallback final
                                const finalResults = await pinterest3(query);
                                resolve(finalResults);
                        } catch (finalError) {
                                console.error('❌ Todos os métodos falharam:', finalError.message);
                                resolve([]);
                        }
                }
        });
}

// Fallback final com imagens estáticas baseadas na consulta
async function pinterest3(query) {
        return new Promise((resolve) => {
                console.log(`🔄 Usando fallback final para: "${query}"`);
                
                // Lista de imagens genéricas relacionadas a categorias comuns
                const categoryImages = {
                        'cat': 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=736',
                        'dog': 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=736',
                        'nature': 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=736',
                        'food': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=736',
                        'travel': 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=736',
                        'car': 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=736',
                        'flower': 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=736',
                        'beach': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=736'
                };
                
                // Tenta encontrar uma categoria relacionada à consulta
                const queryLower = query.toLowerCase();
                let selectedImage = null;
                
                for (const [category, imageUrl] of Object.entries(categoryImages)) {
                        if (queryLower.includes(category) || category.includes(queryLower)) {
                                selectedImage = imageUrl;
                                break;
                        }
                }
                
                // Se não encontrou categoria específica, usa uma imagem genérica
                if (!selectedImage) {
                        selectedImage = 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=736';
                }
                
                const result = [{
                        upload_by: 'Fallback Service',
                        fullname: 'Serviço de Fallback',
                        followers: 0,
                        caption: `Imagem relacionada a: ${query}`,
                        image: selectedImage,
                        source: `https://unsplash.com/s/photos/${encodeURIComponent(query)}`
                }];
                
                console.log(`✅ Fallback final: 1 imagem disponível`);
                resolve(result);
        });
}

module.exports = pinterest;