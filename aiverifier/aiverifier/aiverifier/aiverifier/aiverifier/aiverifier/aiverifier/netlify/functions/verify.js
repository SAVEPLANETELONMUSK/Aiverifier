const fetch = require('node-fetch');

async function tryOEmbed(url){
  const providers = [
    {match: 'youtube.com', endpoint: 'https://www.youtube.com/oembed?format=json&url='},
    {match: 'youtu.be', endpoint: 'https://www.youtube.com/oembed?format=json&url='},
    {match: 'vimeo.com', endpoint: 'https://vimeo.com/api/oembed.json?url='},
    {match: 'dailymotion.com', endpoint: 'https://www.dailymotion.com/services/oembed?format=json&url='},
    {match: 'soundcloud.com', endpoint: 'https://soundcloud.com/oembed?format=json&url='},
    {match: 'twitter.com', endpoint: 'https://publish.twitter.com/oembed?url='}
  ];
  for(const p of providers){
    if(url.includes(p.match)){
      try{
        const r = await fetch(p.endpoint + encodeURIComponent(url), {timeout:8000, headers:{'User-Agent':'AI-Verifier/1.0'}});
        if(r.ok) { const j = await r.json(); return {ok:true,data:j}; }
      }catch(e){}
    }
  }
  return {ok:false};
}

function runHeuristics(meta, url){
  const suspicious = ['deepfake','ai-generated','ai generated','synthetic','fabricated','manipulated','altered','fake'];
  const title = (meta.title || '').toLowerCase();
  const desc = (meta.description || '').toLowerCase ? (meta.description || '').toLowerCase() : '';
  let score = 0;
  const reasons = [];

  for(const w of suspicious){
    if(title.includes(w) || desc.includes(w)) { score -= 4; reasons.push('Title/description contains suspicious keyword: ' + w); break; }
  }

  if(meta.provider_name){
    const majors = ['YouTube','Vimeo','Dailymotion','SoundCloud','Twitter'];
    if(majors.includes(meta.provider_name)) score += 1;
  }

  if(meta.thumbnail_url){
    if(meta.thumbnail_url.includes('default') || meta.thumbnail_url.includes('no-thumbnail') || meta.thumbnail_url.includes('placeholder')) { score -= 2; reasons.push('Default or missing thumbnail detected.'); }
  } else {
    score -= 1; reasons.push('No thumbnail found.');
  }

  const low = url.toLowerCase();
  const shorteners = ['bit.ly','tinyurl','t.co','short','redirect'];
  for(const s of shorteners){
    if(low.includes(s)){ score -= 2; reasons.push('Shortened/redirect link detected (origin may be hidden).'); break; }
  }

  let verdict = 'needs_review';
  if(score >= 1) verdict = 'safe';
  if(score <= -2) verdict = 'fake';

  if(reasons.length === 0) reasons.push('No obvious metadata red flags found; deeper content analysis recommended.');

  return { verdict, reason: reasons.join(' ') };
}

exports.handler = async function(event){
  try{
    const url = (event.queryStringParameters && event.queryStringParameters.url) ? event.queryStringParameters.url : '';
    if(!url) return { statusCode: 400, body: JSON.stringify({ error: 'Missing url query parameter' }) };

    // try oEmbed
    let meta = { title:'', thumbnail_url:'', provider_name:'', description:'' };
    const oe = await tryOEmbed(url);
    if(oe.ok){
      const d = oe.data;
      meta.title = d.title || '';
      meta.thumbnail_url = d.thumbnail_url || '';
      meta.provider_name = d.provider_name || '';
      meta.description = d.description || '';
    } else {
      // fallback: fetch page and scrape title/og:image
      try{
        const r = await fetch(url, {timeout:8000, headers:{'User-Agent':'AI-Verifier/1.0'}});
        const txt = await r.text();
        const t = txt.match(/<meta property=["']og:title["'] content=["']([^"']+)["']/i) || txt.match(/<title[^>]*>([^<]+)<\/title>/i);
        const og = txt.match(/<meta property=["']og:image["'] content=["']([^"']+)["']/i) || txt.match(/<meta name=["']twitter:image["'] content=["']([^"']+)["']/i);
        meta.title = t ? (t[1] || '') : '';
        meta.thumbnail_url = og ? og[1] : '';
        try { meta.provider_name = (new URL(url)).hostname; } catch(e){ meta.provider_name = url; }
      } catch(e){}
    }

    const heur = runHeuristics(meta, url);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: meta.title || '',
        thumbnail: meta.thumbnail_url || '',
        source: meta.provider_name || '',
        verdict: heur.verdict,
        reason: heur.reason
      })
    };
  } catch(err){
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error: '+ String(err) }) };
  }
};
